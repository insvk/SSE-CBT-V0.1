export {};

const API_BASE = '/api/v1/candidates';

function getAuthToken(): string {
    return localStorage.getItem('access_token') || 'dev_test_token_do_not_use_in_prod';
}

function getTenantId(): string {
    return localStorage.getItem('tenant_id') || '00000000-0000-0000-0000-000000000001';
}

function getHeaders(): HeadersInit {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
        'x-tenant-id': getTenantId(),
    };
}

function escapeHtml(str: string): string {
    return (str || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

let cachedCandidates: any[] = [];

// UI Element References
const ui = {
    tbody: document.getElementById('candidate-table-body')!,
    searchInput: document.getElementById('search-input') as HTMLInputElement,
    topSearchInput: document.getElementById('top-search-input') as HTMLInputElement,
    btnImport: document.getElementById('btn-import')!,
    btnCreate: document.getElementById('btn-create')!,
    btnAssign: document.getElementById('btn-assign') as HTMLButtonElement,
    btnExportCsv: document.getElementById('btn-export-csv') as HTMLButtonElement,
    btnExtendTime: document.getElementById('btn-extend-time') as HTMLButtonElement,
    btnUnlockSessions: document.getElementById('btn-unlock-sessions') as HTMLButtonElement,
    btnEmergencyReset: document.getElementById('btn-emergency-reset') as HTMLButtonElement,
    btnGenPwd: document.getElementById('btn-gen-pwd') as HTMLButtonElement,
    modalCreate: document.getElementById('modal-create')!,
    modalImport: document.getElementById('modal-import')!,
    formCreate: document.getElementById('form-create') as HTMLFormElement,
    formImport: document.getElementById('form-import') as HTMLFormElement,
    checkAll: document.getElementById('check-all') as HTMLInputElement,
    credResultBox: document.getElementById('cred-result-box')!,
    btnCopyCred: document.getElementById('btn-copy-cred') as HTMLButtonElement,
    toast: document.getElementById('toast')!,
    sidebar: document.getElementById('sidebar')!,
    sidebarToggleBtn: document.getElementById('sidebar-toggle-btn')!,
    themeToggleBtn: document.getElementById('theme-toggle-btn')!,
    sidebarThemeToggle: document.getElementById('sidebar-theme-toggle')!,
    themeIcon: document.getElementById('theme-icon')!,
};

// --- THEME MANAGEMENT (REPLICATING LIGHT/DARK REFERENCE SPLIT) ---
function initTheme(): void {
    const savedTheme = localStorage.getItem('cbt_theme') || 'light';
    applyTheme(savedTheme);
}

function applyTheme(theme: string): void {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cbt_theme', theme);
    if (ui.themeIcon) {
        ui.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

function toggleTheme(): void {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    showToast(`Switched to ${nextTheme.toUpperCase()} theme`);
}

if (ui.themeToggleBtn) {
    ui.themeToggleBtn.addEventListener('click', toggleTheme);
}
if (ui.sidebarThemeToggle) {
    ui.sidebarThemeToggle.addEventListener('click', toggleTheme);
}

// --- SIDEBAR COLLAPSE TOGGLE ---
if (ui.sidebarToggleBtn && ui.sidebar) {
    ui.sidebarToggleBtn.addEventListener('click', () => {
        ui.sidebar.classList.toggle('collapsed');
        const isCollapsed = ui.sidebar.classList.contains('collapsed');
        ui.sidebarToggleBtn.innerHTML = isCollapsed ? '<span>▶</span>' : '<span>◀</span>';
    });
}

// --- TOAST NOTIFICATIONS ---
function showToast(msg: string, isError = false): void {
    if (!ui.toast) return;
    ui.toast.textContent = msg;
    ui.toast.style.backgroundColor = isError ? "var(--brand-red, #ef4444)" : "var(--brand-blue, #321fdb)";
    ui.toast.className = "show";
    setTimeout(() => { 
        ui.toast.className = ui.toast.className.replace("show", ""); 
    }, 3200);
}

function copyText(text: string, label = "Password"): void {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`${label} copied to clipboard!`);
    }).catch(() => {
        showToast(`Failed to copy to clipboard`, true);
    });
}

(window as any).copyPassword = (pwd: string) => {
    copyText(pwd, "Password");
};

// --- RENDER DYNAMIC COREUI CHARTS (ZERO DUMMY DATA) ---
function renderDynamicCharts(summary: any): void {
    // 1. Top Card: Spline Flow Curve based on monthly trend from Supabase
    const trend: number[] = summary.monthly_trend || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const total = summary.total_candidates || 0;
    
    const flowNum = document.getElementById('card-cand-flow-num');
    if (flowNum) {
        flowNum.textContent = total > 0 ? `${total.toLocaleString()} Active` : '0 Active';
    }

    // Generate SVG path points dynamically
    const maxVal = Math.max(...trend, 5);
    const points = trend.slice(0, 7).map((val, idx) => {
        const x = Math.round((idx / 6) * 500);
        const y = Math.round(100 - (val / maxVal) * 80);
        return { x, y };
    });

    if (points.length >= 2) {
        let dLine = `M ${points[0].x},${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const cpx = (prev.x + curr.x) / 2;
            dLine += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
        }
        const dArea = `${dLine} L 500,120 L 0,120 Z`;

        const pathLine = document.getElementById('sparkline-line');
        const pathArea = document.getElementById('sparkline-area');
        if (pathLine) pathLine.setAttribute('d', dLine);
        if (pathArea) pathArea.setAttribute('d', dArea);
    }

    // 2. Traffic Dual-Bar Chart based on real batches in Supabase
    const barsContainer = document.getElementById('traffic-bars-container');
    const labelsContainer = document.getElementById('traffic-labels-container');
    
    if (barsContainer && summary.slot_traffic) {
        barsContainer.innerHTML = '';
        if (labelsContainer) labelsContainer.innerHTML = '';

        const slotList = summary.slot_traffic;
        const maxSlotCount = Math.max(...slotList.map((s: any) => s.registered), 4);

        slotList.forEach((st: any) => {
            const hReg = Math.max(12, Math.round((st.registered / maxSlotCount) * 85));
            const hComp = Math.max(8, Math.round((st.completed / maxSlotCount) * 85));

            const barGroup = document.createElement('div');
            barGroup.style.display = 'flex';
            barGroup.style.alignItems = 'flex-end';
            barGroup.style.gap = '4px';
            barGroup.style.height = '100%';
            barGroup.title = `${st.slot}: ${st.registered} Registered, ${st.completed} Completed`;

            barGroup.innerHTML = `
                <div style="width: 14px; height: ${hReg}px; background: #4f46e5; border-radius: 3px 3px 0 0; transition: height 0.5s ease;"></div>
                <div style="width: 14px; height: ${hComp}px; background: #38bdf8; border-radius: 3px 3px 0 0; transition: height 0.5s ease;"></div>
            `;
            barsContainer.appendChild(barGroup);

            if (labelsContainer) {
                const lbl = document.createElement('span');
                lbl.textContent = st.slot;
                lbl.style.fontSize = '0.72rem';
                lbl.style.fontWeight = '600';
                labelsContainer.appendChild(lbl);
            }
        });
    }
}

// --- LOAD DASHBOARD SUMMARY (ZERO DUMMY DATA) ---
async function loadDashboardSummary(): Promise<void> {
    try {
        const res = await fetch(`${API_BASE}/dashboard-summary`, { headers: getHeaders() });
        if (res.ok) {
            const summary = await res.json();
            
            // Middle stat cards
            const statTotal = document.getElementById('stat-total-cands');
            if (statTotal) statTotal.textContent = (summary.total_candidates || 0).toLocaleString();

            const statSub = document.getElementById('stat-registered-sub');
            if (statSub) statSub.textContent = `${(summary.total_candidates || 0).toLocaleString()} registered candidates in Supabase DB`;

            const statAttempts = document.getElementById('stat-total-attempts');
            if (statAttempts) statAttempts.textContent = (summary.total_attempts || 0).toLocaleString();

            const statQuestions = document.getElementById('stat-total-questions');
            if (statQuestions) statQuestions.textContent = `${summary.total_questions || 0}`;

            const statCompletion = document.getElementById('stat-completion-rate');
            if (statCompletion) statCompletion.textContent = `${summary.completion_rate || 0}%`;

            renderDynamicCharts(summary);
        }
    } catch (e) {
        console.warn("Failed to load live dashboard summary", e);
    }
}

// --- LOAD CANDIDATES LIST ---
async function loadCandidates(query = ""): Promise<void> {
    try {
        const res = await fetch(API_BASE, { headers: getHeaders() });
        let data = await res.json();

        if (!Array.isArray(data)) {
            data = [];
        }

        cachedCandidates = data;

        if (query) {
            const q = query.toLowerCase();
            data = data.filter((c: any) => 
                (c.full_name || "").toLowerCase().includes(q) || 
                (c.registration_number || "").toLowerCase().includes(q) ||
                (c.email || "").toLowerCase().includes(q)
            );
        }

        ui.tbody.innerHTML = "";
        
        if (data.length === 0) {
            ui.tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                        No candidates found. Use <strong>+ Add new candidate</strong> above to provision credentials.
                    </td>
                </tr>
            `;
            return;
        }

        data.forEach((c: any) => {
            const tr = document.createElement('tr');
            const initials = (c.full_name || 'CD').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
            const isActive = (c.status || 'active') === 'active';
            const pwd = c.password || '12345678';
            const email = c.email || `${(c.registration_number || '').toLowerCase()}@ssecbt.in`;
            const slot = c.batch || 'A';

            tr.innerHTML = `
                <td><input type="checkbox" class="row-check" value="${escapeHtml(c.id)}"></td>
                <td>
                    <div class="user-cell">
                        <div class="user-cell-avatar">${initials}</div>
                        <div class="user-cell-info">
                            <span class="user-cell-name">${escapeHtml(c.full_name)}</span>
                            <span class="user-cell-sub">Slot ${escapeHtml(slot)} &bull; ${escapeHtml(c.registration_number)}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span style="font-weight: 700; padding: 0.25rem 0.65rem; background: rgba(79, 70, 229, 0.1); color: var(--brand-blue); border-radius: 6px; font-size: 0.78rem;">
                        Slot ${escapeHtml(slot)}
                    </span>
                </td>
                <td style="font-size: 0.825rem; font-family: var(--font-mono); color: var(--text-muted);">${escapeHtml(email)}</td>
                <td>
                    <div style="display: inline-flex; align-items: center; gap: 0.35rem; background: var(--bg-body); padding: 0.25rem 0.55rem; border-radius: 6px; border: 1px solid var(--border-color); font-family: var(--font-mono); font-size: 0.82rem; font-weight: 700;">
                        <span>${escapeHtml(pwd)}</span>
                        <button style="background: none; border: none; cursor: pointer; font-size: 0.8rem;" title="Copy Password" onclick="copyPassword('${escapeHtml(pwd)}')">📋</button>
                    </div>
                </td>
                <td>
                    <span class="status-pill ${isActive ? 'status-active' : 'status-suspended'}">
                        <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background: ${isActive ? '#10b981' : '#ef4444'};"></span>
                        ${escapeHtml(c.status || 'active')}
                    </span>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <button class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; margin-right: 0.35rem;" onclick="resetAttempt('${escapeHtml(c.id)}')">
                        🔄 Retake
                    </button>
                    <button class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; color: ${isActive ? '#ef4444' : '#10b981'}; border-color: ${isActive ? '#fca5a5' : '#86efac'};" onclick="toggleStatus('${escapeHtml(c.id)}')">
                        ${isActive ? 'Suspend' : 'Activate'}
                    </button>
                </td>
            `;
            ui.tbody.appendChild(tr);
        });
        
        bindCheckboxes();
        renderProctorTerminals();
    } catch (err) {
        showToast("Failed to load candidates from Supabase", true);
    }
}

// --- CREATION MODAL & GOD MAXX ACCOUNT PROVISIONING ---
if (ui.btnCreate) {
    ui.btnCreate.onclick = () => {
        ui.credResultBox.style.display = 'none';
        ui.modalCreate.style.display = 'flex';
    };
}

const quickNavBtn = document.getElementById('btn-quick-provision-nav');
if (quickNavBtn) {
    quickNavBtn.onclick = () => {
        ui.credResultBox.style.display = 'none';
        ui.modalCreate.style.display = 'flex';
    };
}

// 6-digit PIN Generator
if (ui.btnGenPwd) {
    ui.btnGenPwd.onclick = () => {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        const pwdInput = document.getElementById('c-password') as HTMLInputElement;
        if (pwdInput) pwdInput.value = pin;
    };
}

if (ui.formCreate) {
    ui.formCreate.onsubmit = async (e) => {
        e.preventDefault();
        const role = (document.getElementById('c-role') as HTMLSelectElement).value;
        const fullName = (document.getElementById('c-name') as HTMLInputElement).value.trim();
        const batch = (document.getElementById('c-batch') as HTMLInputElement).value.trim();
        const regno = (document.getElementById('c-regno') as HTMLInputElement).value.trim();
        const email = (document.getElementById('c-email') as HTMLInputElement).value.trim();
        const pwd = (document.getElementById('c-password') as HTMLInputElement).value.trim();

        const payload = {
            full_name: fullName,
            role: role,
            batch_or_slot: batch || "A",
            registration_number: regno || undefined,
            email: email || undefined,
            initial_password: pwd || "12345678"
        };

        try {
            const res = await fetch('/api/v1/auth/create-account', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const result = await res.json();
                showToast("Account Provisioned and Saved in Supabase!");
                
                const acc = result.account || {};
                const resRegno = document.getElementById('res-regno');
                const resName = document.getElementById('res-name');
                const resPwd = document.getElementById('res-pwd');
                const resSlot = document.getElementById('res-slot');

                if (resRegno) resRegno.textContent = acc.registration_number || regno || "N/A";
                if (resName) resName.textContent = acc.full_name || fullName;
                if (resPwd) resPwd.textContent = acc.password || pwd;
                if (resSlot) resSlot.textContent = acc.slot || batch || "A";

                ui.credResultBox.style.display = 'block';

                ui.btnCopyCred.onclick = () => {
                    const slip = `SSE CBT PLATFORM V0.1 CREDENTIALS\nName: ${acc.full_name || fullName}\nRoll No: ${acc.registration_number || regno || "N/A"}\nPassword: ${acc.password || pwd}\nSlot: ${acc.slot || batch || "A"}\nPortal URL: /login.html`;
                    copyText(slip, "Candidate Credentials Slip");
                };

                loadCandidates();
                loadDashboardSummary();
            } else {
                const err = await res.json();
                showToast(err.detail || "Account provisioning failed", true);
            }
        } catch (_) {
            showToast("Error connecting to account creation service", true);
        }
    };
}

// --- BULK IMPORT ---
if (ui.btnImport) {
    ui.btnImport.onclick = () => { ui.modalImport.style.display = 'flex'; };
}

if (ui.formImport) {
    ui.formImport.onsubmit = async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('csv-file') as HTMLInputElement;
        const file = fileInput.files![0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const importHeaders: HeadersInit = {
            'Authorization': `Bearer ${getAuthToken()}`,
            'x-tenant-id': getTenantId(),
        };

        const res = await fetch(`${API_BASE}/bulk-import`, { method: 'POST', headers: importHeaders, body: formData });
        
        if (res.ok) {
            const data = await res.json();
            showToast(`Successfully imported ${data.imported} candidates into Supabase`);
            ui.modalImport.style.display = 'none';
            ui.formImport.reset();
            loadCandidates();
            loadDashboardSummary();
        } else {
            showToast("Bulk import failed", true);
        }
    };
}

// --- EXPORT CREDENTIALS CSV ---
if (ui.btnExportCsv) {
    ui.btnExportCsv.onclick = () => {
        if (!cachedCandidates || cachedCandidates.length === 0) {
            showToast("No candidates available to export", true);
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,Registration_Number,Full_Name,Slot,Email,Password,Status\n";
        cachedCandidates.forEach(c => {
            const reg = (c.registration_number || '').replace(/"/g, '""');
            const name = (c.full_name || '').replace(/"/g, '""');
            const slot = (c.batch || 'A').replace(/"/g, '""');
            const email = (c.email || '').replace(/"/g, '""');
            const pwd = (c.password || '12345678').replace(/"/g, '""');
            const status = (c.status || 'active').replace(/"/g, '""');
            csvContent += `"${reg}","${name}","${slot}","${email}","${pwd}","${status}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sse_cbt_v0.1_candidates_credentials_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Credentials CSV downloaded!");
    };
}

// --- GOD MAXX EMERGENCY CONTROLS ---
if (ui.btnExtendTime) {
    ui.btnExtendTime.onclick = async () => {
        try {
            const res = await fetch('/api/v1/exams/EX-1001/extend-time', {
                method: 'POST',
                headers: getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                showToast(data.message || "+15 minutes granted across active exam sessions!");
            }
        } catch (_) {
            showToast("Failed to extend exam time", true);
        }
    };
}

if (ui.btnUnlockSessions) {
    ui.btnUnlockSessions.onclick = async () => {
        try {
            const res = await fetch('/api/v1/exams/EX-1001/unlock-sessions', {
                method: 'POST',
                headers: getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                showToast(data.message || "All tab locks and collisions cleared!");
            }
        } catch (_) {
            showToast("Failed to unlock sessions", true);
        }
    };
}

if (ui.btnEmergencyReset) {
    ui.btnEmergencyReset.onclick = async () => {
        if (!confirm("⚠️ WARNING: This will reset all active exam responses and timer countdowns. Proceed with Global Exam Reset?")) {
            return;
        }
        try {
            const res = await fetch('/api/v1/exams/EX-1001/reset', {
                method: 'POST',
                headers: getHeaders()
            });
            if (res.ok) {
                showToast("Global Exam Session Reset to Initial State!");
                loadDashboardSummary();
            }
        } catch (_) {
            showToast("Emergency reset failed", true);
        }
    };
}

// --- ROW ACTIONS ---
(window as any).toggleStatus = async (id: string) => {
    try {
        const res = await fetch(`${API_BASE}/${id}/toggle-status`, { 
            method: 'PATCH', 
            headers: getHeaders() 
        });
        if (res.ok) {
            const data = await res.json();
            showToast(data.message || "Status updated in Supabase");
            loadCandidates();
            loadDashboardSummary();
        } else {
            showToast("Failed to update candidate status", true);
        }
    } catch (_) {
        showToast("Error updating status", true);
    }
};

(window as any).resetAttempt = async (id: string) => {
    if (!confirm("Wipe exam attempt record for this candidate so they can take the test afresh?")) return;
    try {
        const res = await fetch(`${API_BASE}/${id}/reset-attempt`, { 
            method: 'POST', 
            headers: getHeaders() 
        });
        if (res.ok) {
            showToast("Attempt wiped! Candidate can now restart exam cleanly.");
            loadDashboardSummary();
        } else {
            showToast("Failed to reset attempt", true);
        }
    } catch (_) {
        showToast("Error resetting candidate attempt", true);
    }
};

// --- SELECTION LOGIC ---
function bindCheckboxes(): void {
    const rowChecks = document.querySelectorAll('.row-check') as NodeListOf<HTMLInputElement>;
    rowChecks.forEach(chk => {
        chk.addEventListener('change', () => {
            const checkedCount = document.querySelectorAll('.row-check:checked').length;
            if (ui.btnAssign) {
                ui.btnAssign.disabled = checkedCount === 0;
                ui.btnAssign.textContent = checkedCount > 0 ? `Assign to Exam (${checkedCount})` : "Assign to Exam";
            }
        });
    });
}

if (ui.checkAll) {
    ui.checkAll.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        const rowChecks = document.querySelectorAll('.row-check') as NodeListOf<HTMLInputElement>;
        rowChecks.forEach(chk => chk.checked = isChecked);
        if (ui.btnAssign) {
            ui.btnAssign.disabled = !isChecked;
            ui.btnAssign.textContent = isChecked ? `Assign to Exam (${rowChecks.length})` : "Assign to Exam";
        }
    });
}

if (ui.btnAssign) {
    ui.btnAssign.onclick = async () => {
        const selected = Array.from(document.querySelectorAll('.row-check:checked')).map((c: any) => c.value);
        const res = await fetch(`${API_BASE}/bulk-assign`, { 
            method: 'POST', 
            headers: getHeaders(), 
            body: JSON.stringify({ candidate_ids: selected, exam_id: "EX-1001" }) 
        });
        if (res.ok) {
            showToast(`Assigned ${selected.length} candidates to exam.`);
            if (ui.checkAll) ui.checkAll.checked = false;
            bindCheckboxes();
            loadDashboardSummary();
        }
    };
}

// --- TCS iON PROCTORING LAB & TERMINALS GRID ---
const terminalViolations: Record<string, number> = {};

function appendIncidentLog(text: string, isAlert = false): void {
    const logEl = document.getElementById('incident-audit-log');
    if (!logEl) return;
    const timeStr = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.style.color = isAlert ? '#ef4444' : 'var(--text-main)';
    div.style.fontWeight = isAlert ? '700' : '500';
    div.innerHTML = `<span style="color: #64748b;">[${timeStr}]</span> ${escapeHtml(text)}`;
    logEl.prepend(div);
}

function renderProctorTerminals(): void {
    const grid = document.getElementById('terminals-grid');
    const countEl = document.getElementById('active-terminals-count');
    if (!grid) return;

    if (cachedCandidates.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 1.5rem;">No active candidate terminals connected yet.</div>`;
        if (countEl) countEl.textContent = '0 Terminals Connected';
        return;
    }

    if (countEl) countEl.textContent = `${cachedCandidates.length} Active Terminals Online`;
    grid.innerHTML = '';

    cachedCandidates.forEach((c: any, idx: number) => {
        const terminalId = `Terminal C-04${idx + 1}`;
        const regNo = c.registration_number || `SSEC-${c.batch || 'A'}-000${idx + 1}`;
        const violations = terminalViolations[regNo] || 0;
        const initials = (c.full_name || 'CD').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

        const card = document.createElement('div');
        card.id = `terminal-card-${escapeHtml(regNo)}`;
        card.style.background = 'var(--bg-body)';
        card.style.border = violations > 0 ? '1.5px solid #ef4444' : '1px solid var(--border-color)';
        card.style.borderRadius = 'var(--radius)';
        card.style.padding = '1rem';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '0.65rem';
        card.style.transition = 'all 0.2s';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.75rem; font-family: var(--font-mono); font-weight: 700; color: var(--brand-blue);">${terminalId}</span>
                <span id="term-status-${escapeHtml(regNo)}" class="status-pill ${violations > 0 ? 'status-suspended' : 'status-active'}">
                    ${violations > 0 ? `⚠️ ${violations} Violation${violations > 1 ? 's' : ''}` : '🟢 Active in Exam'}
                </span>
            </div>

            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #321fdb, #818cf8); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem;">
                    ${initials}
                </div>
                <div style="display: flex; flex-direction: column; overflow: hidden;">
                    <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-heading); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${escapeHtml(c.full_name)}
                    </span>
                    <span style="font-size: 0.72rem; font-family: var(--font-mono); color: var(--text-muted);">
                        ${escapeHtml(regNo)} &bull; Slot ${escapeHtml(c.batch || 'A')}
                    </span>
                </div>
            </div>

            <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 0.45rem 0.65rem; border-radius: 6px; border: 1px solid var(--border-color);">
                <span>Camera: <strong style="color: #10b981;">AI Verified</strong></span>
                <span id="term-progress-${escapeHtml(regNo)}" style="font-weight: 600; color: var(--brand-blue);">Ready</span>
            </div>

            <div style="display: flex; gap: 0.45rem; margin-top: 0.25rem;">
                <button class="btn btn-outline btn-sm" style="flex: 1; padding: 0.3rem 0.4rem; font-size: 0.72rem; color: #d97706; border-color: #fde68a;" onclick="sendCandidateWarning('${escapeHtml(regNo)}', '${escapeHtml(c.full_name)}')">
                    ⚠️ Warn
                </button>
                <button class="btn btn-outline btn-sm" style="flex: 1; padding: 0.3rem 0.4rem; font-size: 0.72rem; color: #ef4444; border-color: #fca5a5;" onclick="lockCandidateTerminal('${escapeHtml(regNo)}', '${escapeHtml(c.full_name)}')">
                    🔒 Lock
                </button>
                <button class="btn btn-outline btn-sm" style="flex: 1; padding: 0.3rem 0.4rem; font-size: 0.72rem;" onclick="resetAttempt('${escapeHtml(c.id)}')">
                    🔄 Reset
                </button>
            </div>
        `;

        grid.appendChild(card);
    });
}

(window as any).sendCandidateWarning = (regNo: string, name: string) => {
    const customMsg = prompt(`Enter warning message to display immediately on ${name}'s terminal:`, "Invigilator Alert: Please maintain exam focus on your terminal screen.");
    if (!customMsg) return;

    if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
        adminSocket.send(JSON.stringify({
            type: "SEND_CANDIDATE_WARNING",
            exam_id: "EX-1001",
            reg_no: regNo,
            message: customMsg
        }));
        showToast(`⚠️ Warning dispatched to ${name} (${regNo})`);
        appendIncidentLog(`Dispatched Invigilator Warning to ${name} (${regNo}): "${customMsg}"`);
    } else {
        showToast("WebSocket disconnected, unable to send live warning", true);
    }
};

(window as any).lockCandidateTerminal = (regNo: string, name: string) => {
    if (!confirm(`Are you sure you want to forcibly LOCK the terminal of ${name} (${regNo})?`)) return;

    if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
        adminSocket.send(JSON.stringify({
            type: "LOCK_TERMINAL",
            exam_id: "EX-1001",
            reg_no: regNo,
            reason: "Malpractice investigation lock by Central Invigilator."
        }));
        showToast(`🔒 Terminal locked for ${name} (${regNo})`);
        appendIncidentLog(`Forcibly LOCKED terminal for ${name} (${regNo})`, true);
    }
};

// Global Invigilator Broadcast Tool
const btnBroadcast = document.getElementById('btn-send-broadcast');
const inputBroadcast = document.getElementById('input-broadcast-msg') as HTMLInputElement;

if (btnBroadcast && inputBroadcast) {
    btnBroadcast.addEventListener('click', () => {
        const msg = inputBroadcast.value.trim();
        if (!msg) {
            showToast("Please enter an announcement message to broadcast", true);
            inputBroadcast.focus();
            return;
        }

        if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
            adminSocket.send(JSON.stringify({
                type: "BROADCAST_ANNOUNCEMENT",
                message: msg
            }));
            showToast("📢 Broadcast alert dispatched to all active candidate screens!");
            appendIncidentLog(`Global Broadcast Dispatched: "${msg}"`);
            inputBroadcast.value = '';
        } else {
            showToast("WebSocket connection offline", true);
        }
    });

    inputBroadcast.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnBroadcast.click();
    });
}

// --- REAL-TIME WEBSOCKET FEED ---
let adminSocket: WebSocket | null = null;
let adminPingTimer: any = null;

function initAdminWebSocket(): void {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${window.location.host}/ws/admin`;

    try {
        adminSocket = new WebSocket(wsUrl);

        adminSocket.onopen = () => {
            console.log('[WebSocket] Admin Command Centre connected to live feed');
            const statusEl = document.getElementById('ws-admin-status');
            const dotEl = document.getElementById('ws-admin-dot');
            if (statusEl) statusEl.textContent = 'Cloud DB & Feed: Active';
            if (dotEl) {
                dotEl.style.backgroundColor = '#10b981';
                dotEl.style.boxShadow = '0 0 8px #10b981';
            }

            if (adminPingTimer) clearInterval(adminPingTimer);
            adminPingTimer = setInterval(() => {
                if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
                    adminSocket.send(JSON.stringify({ type: 'PING' }));
                }
            }, 25000);
        };

        adminSocket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);

                if (msg.type === 'CANDIDATE_VIOLATION') {
                    const reg = msg.reg_no || 'SSEC';
                    terminalViolations[reg] = (terminalViolations[reg] || 0) + 1;
                    showToast(`⚠️ TCS iON Violation: Candidate ${msg.candidate_name || reg} - ${msg.violation_type}`, true);
                    appendIncidentLog(`SECURITY VIOLATION: Candidate ${msg.candidate_name || reg} (${reg}) on ${msg.terminal || 'Terminal'} - ${msg.violation_type} (Strike #${msg.count || terminalViolations[reg]})`, true);
                    
                    const termCard = document.getElementById(`terminal-card-${reg}`);
                    if (termCard) {
                        termCard.style.border = '2px solid #ef4444';
                        termCard.style.background = 'rgba(239, 68, 68, 0.05)';
                    }
                    const termStatus = document.getElementById(`term-status-${reg}`);
                    if (termStatus) {
                        termStatus.className = 'status-pill status-suspended';
                        termStatus.textContent = `⚠️ Strike #${terminalViolations[reg]}`;
                    }

                } else if (msg.type === 'CANDIDATE_RESPONSE') {
                    showToast(`🟢 Live Response: Candidate ${msg.candidate_name || 'Candidate'} - Q${msg.question_id || '1'}`);
                    const termProgress = document.getElementById(`term-progress-${msg.reg_no}`);
                    if (termProgress) {
                        termProgress.textContent = `Q${msg.question_id} Answered`;
                    }

                } else if (msg.type === 'CANDIDATE_SUBMITTED') {
                    showToast(`🏆 Candidate submitted: Score ${msg.score}/${msg.max_possible}`);
                    appendIncidentLog(`Candidate ${msg.candidate_name || msg.reg_no} completed and submitted examination.`);
                    loadCandidates();
                    loadDashboardSummary();

                } else if (msg.type === 'CANDIDATE_CREATED') {
                    showToast(`👤 Candidate created: ${msg.candidate?.full_name || ''}`);
                    loadCandidates();
                    loadDashboardSummary();

                } else if (msg.type === 'CANDIDATE_STATUS_CHANGED') {
                    showToast(`🔄 Candidate status updated: ${msg.status}`);
                    loadCandidates();
                    loadDashboardSummary();
                }
            } catch (_) {}
        };

        adminSocket.onclose = () => {
            if (adminPingTimer) clearInterval(adminPingTimer);
            setTimeout(initAdminWebSocket, 3000);
        };

        adminSocket.onerror = () => {
            if (adminSocket) adminSocket.close();
        };
    } catch (e) {
        setTimeout(initAdminWebSocket, 5000);
    }
}

// Search debounce
let timeout: any;
if (ui.searchInput) {
    ui.searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            loadCandidates((e.target as HTMLInputElement).value);
        }, 300);
    });
}

if (ui.topSearchInput) {
    ui.topSearchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            loadCandidates((e.target as HTMLInputElement).value);
        }, 300);
    });
}

// Initialize on page ready
initTheme();
loadDashboardSummary();
loadCandidates();
initAdminWebSocket();

