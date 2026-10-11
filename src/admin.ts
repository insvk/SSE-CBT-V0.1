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

// --- CREATION MODAL & AUTHORITATIVE ACCOUNT PROVISIONING ---
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

// --- CENTRAL CONTROLLER OPERATIONS CONTROLS ---
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
                showToast(data.message || "All concurrency locks and tab collisions cleared!");
            }
        } catch (_) {
            showToast("Failed to unlock sessions", true);
        }
    };
}

if (ui.btnEmergencyReset) {
    ui.btnEmergencyReset.onclick = async () => {
        if (!confirm("⚠️ WARNING: This will reset all active exam responses and timer countdowns. Proceed with Global Exam Session Reset?")) {
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

interface IncidentAuditRecord {
    timestamp: string;
    details: string;
    severity: string;
}

const incidentAuditRecords: IncidentAuditRecord[] = [
    { timestamp: new Date().toLocaleTimeString(), details: "Central Invigilator Proctoring Engine initialized • Awaiting candidate telemetry.", severity: "INFO" }
];

function appendIncidentLog(text: string, isAlert = false): void {
    const timeStr = new Date().toLocaleTimeString();
    incidentAuditRecords.unshift({
        timestamp: timeStr,
        details: text,
        severity: isAlert ? "MALPRACTICE_ALERT" : "OPERATIONAL_EVENT"
    });
    const logEl = document.getElementById('incident-audit-log');
    if (!logEl) return;
    const div = document.createElement('div');
    div.style.color = isAlert ? '#ef4444' : 'var(--text-main)';
    div.style.fontWeight = isAlert ? '700' : '500';
    div.innerHTML = `<span style="color: #64748b;">[${timeStr}]</span> ${escapeHtml(text)}`;
    logEl.prepend(div);
}

const btnExportIncidents = document.getElementById('btn-export-incidents');
if (btnExportIncidents) {
    btnExportIncidents.addEventListener('click', () => {
        let csv = "Timestamp,Severity,Details\n";
        incidentAuditRecords.forEach(rec => {
            const cleanDetails = rec.details.replace(/"/g, '""');
            csv += `"${rec.timestamp}","${rec.severity}","${cleanDetails}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `incident_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Incident Audit Log exported to CSV!");
    });
}

const candidateAccommodations: Record<string, number> = {};
const candidatePausedStates: Record<string, boolean> = {};
const candidateAssignedTerminals: Record<string, string> = {};
const candidateLockedStates: Record<string, boolean> = {};

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
        const fallbackTerm = `Terminal C-04${idx + 1}`;
        const regNo = c.registration_number || `SSEC-${c.batch || 'A'}-000${idx + 1}`;
        const terminalId = candidateAssignedTerminals[regNo] || c.metadata?.assigned_terminal || fallbackTerm;
        const violations = terminalViolations[regNo] || 0;
        const isPaused = candidatePausedStates[regNo] || false;
        const isLocked = candidateLockedStates[regNo] || false;
        const extraMins = candidateAccommodations[regNo] || 0;
        const initials = (c.full_name || 'CD').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

        const card = document.createElement('div');
        card.id = `terminal-card-${escapeHtml(regNo)}`;
        card.style.background = 'var(--bg-body)';
        card.style.border = isLocked ? '2px solid #ef4444' : violations > 0 ? '1.5px solid #ef4444' : isPaused ? '1.5px solid #d97706' : '1px solid var(--border-color)';
        card.style.borderRadius = 'var(--radius)';
        card.style.padding = '1rem';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '0.65rem';
        card.style.transition = 'all 0.2s';

        let statusBadgeHtml = '<span class="status-pill status-active">🟢 Active in Exam</span>';
        if (isLocked) {
            statusBadgeHtml = '<span class="status-pill status-suspended" style="background:#fee2e2; color:#b91c1c;">🔒 Locked</span>';
        } else if (isPaused) {
            statusBadgeHtml = '<span class="status-pill" style="background:#fef3c7; color:#b45309;">⏸️ On Hold</span>';
        } else if (violations > 0) {
            statusBadgeHtml = `<span class="status-pill status-suspended">⚠️ Strike #${violations}</span>`;
        }

        const accommodationBadge = extraMins > 0
            ? `<span style="font-size: 0.72rem; color: #166534; background: #dcfce7; padding: 2px 6px; border-radius: 4px; font-weight: 700;">+${extraMins}m PwD/Glitch</span>`
            : '';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span id="term-label-${escapeHtml(regNo)}" style="font-size: 0.75rem; font-family: var(--font-mono); font-weight: 700; color: var(--brand-blue);">${escapeHtml(terminalId)}</span>
                <div style="display: flex; align-items: center; gap: 4px;">
                    ${accommodationBadge}
                    <span id="term-status-${escapeHtml(regNo)}">${statusBadgeHtml}</span>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #321fdb, #818cf8); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem;">
                    ${initials}
                </div>
                <div style="display: flex; flex-direction: column; overflow: hidden; flex: 1;">
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

            <!-- Enterprise Action Suite -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.35rem; margin-top: 0.25rem;">
                <button class="btn btn-outline btn-sm" style="padding: 0.3rem 0.2rem; font-size: 0.7rem;" onclick="openCompensatoryModal('${escapeHtml(regNo)}', '${escapeHtml(c.full_name)}')">
                    ⏱️ +Time
                </button>
                <button class="btn btn-outline btn-sm" style="padding: 0.3rem 0.2rem; font-size: 0.7rem; color: ${isPaused ? '#10b981' : '#d97706'}; border-color: ${isPaused ? '#a7f3d0' : '#fde68a'};" onclick="toggleCandidatePause('${escapeHtml(regNo)}', '${escapeHtml(c.full_name)}')">
                    ${isPaused ? '▶️ Resume' : '⏸️ Hold'}
                </button>
                <button class="btn btn-outline btn-sm" style="padding: 0.3rem 0.2rem; font-size: 0.7rem;" onclick="openReseatModal('${escapeHtml(regNo)}', '${escapeHtml(c.full_name)}', '${escapeHtml(terminalId)}')">
                    💺 Re-seat
                </button>
                <button class="btn btn-outline btn-sm" style="padding: 0.3rem 0.2rem; font-size: 0.7rem; color: #d97706; border-color: #fde68a;" onclick="sendCandidateDirective('${escapeHtml(regNo)}', '${escapeHtml(c.full_name)}')">
                    ⚠️ Directive
                </button>
                <button class="btn btn-outline btn-sm" style="padding: 0.3rem 0.2rem; font-size: 0.7rem; color: #ef4444; border-color: #fca5a5;" onclick="toggleLockTerminal('${escapeHtml(regNo)}', '${escapeHtml(c.full_name)}')">
                    ${isLocked ? '🔓 Unlock' : '🔒 Lock'}
                </button>
                <button class="btn btn-outline btn-sm" style="padding: 0.3rem 0.2rem; font-size: 0.7rem;" onclick="resetAttempt('${escapeHtml(c.id)}')">
                    🔄 Reset
                </button>
            </div>
        `;

        grid.appendChild(card);
    });
}

// 1. COMPENSATORY TIME GRANT MODAL LOGIC
(window as any).openCompensatoryModal = (regNo: string, name: string) => {
    const modal = document.getElementById('modal-extend-candidate-time');
    const inputReg = document.getElementById('ext-cand-reg') as HTMLInputElement;
    const labelName = document.getElementById('ext-cand-name');
    const labelReg = document.getElementById('ext-cand-reg-label');
    const customInput = document.getElementById('ext-custom-mins') as HTMLInputElement;

    if (modal && inputReg && labelName && labelReg) {
        inputReg.value = regNo;
        labelName.textContent = name;
        labelReg.textContent = `Registration Number: ${regNo}`;
        if (customInput) customInput.value = '15';
        modal.style.display = 'flex';
    }
};

document.querySelectorAll('.ext-quick-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const mins = (e.currentTarget as HTMLElement).getAttribute('data-mins') || '15';
        const customInput = document.getElementById('ext-custom-mins') as HTMLInputElement;
        if (customInput) customInput.value = mins;
        document.querySelectorAll('.ext-quick-btn').forEach(b => b.className = 'btn btn-outline btn-sm ext-quick-btn');
        (e.currentTarget as HTMLElement).className = 'btn btn-primary btn-sm ext-quick-btn';
    });
});

const formExtendCandidateTime = document.getElementById('form-extend-candidate-time') as HTMLFormElement;
if (formExtendCandidateTime) {
    formExtendCandidateTime.addEventListener('submit', async (e) => {
        e.preventDefault();
        const regNo = (document.getElementById('ext-cand-reg') as HTMLInputElement).value;
        const mins = parseInt((document.getElementById('ext-custom-mins') as HTMLInputElement).value) || 15;
        const reason = (document.getElementById('ext-reason-select') as HTMLSelectElement).value;

        try {
            const res = await fetch(`/api/v1/exams/EX-1001/candidate-intervention`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    action: 'extend_time',
                    reg_no: regNo,
                    extra_minutes: mins,
                    reason: reason,
                })
            });

            if (res.ok) {
                candidateAccommodations[regNo] = (candidateAccommodations[regNo] || 0) + mins;
                showToast(`⏱️ Granted +${mins}m compensatory time to ${regNo}`);
                appendIncidentLog(`Granted +${mins}m accommodation to ${regNo} (${reason})`);
                document.getElementById('modal-extend-candidate-time')!.style.display = 'none';
                renderProctorTerminals();
            } else {
                showToast("Failed to grant compensatory time", true);
            }
        } catch (_) {
            showToast("Network error while granting time", true);
        }
    });
}

// 2. EMERGENCY TERMINAL RE-SEATING MODAL LOGIC
(window as any).openReseatModal = (regNo: string, name: string, currentTerm: string) => {
    const modal = document.getElementById('modal-reseat-candidate');
    const inputReg = document.getElementById('reseat-cand-reg') as HTMLInputElement;
    const labelName = document.getElementById('reseat-cand-name');
    const labelTerm = document.getElementById('reseat-cand-current-term');
    const targetInput = document.getElementById('reseat-target-node') as HTMLInputElement;

    if (modal && inputReg && labelName && labelTerm) {
        inputReg.value = regNo;
        labelName.textContent = name;
        labelTerm.textContent = `Current Active Node: ${currentTerm}`;
        if (targetInput) targetInput.value = 'Terminal C-049';
        modal.style.display = 'flex';
    }
};

const formReseatCandidate = document.getElementById('form-reseat-candidate') as HTMLFormElement;
if (formReseatCandidate) {
    formReseatCandidate.addEventListener('submit', async (e) => {
        e.preventDefault();
        const regNo = (document.getElementById('reseat-cand-reg') as HTMLInputElement).value;
        const targetNode = (document.getElementById('reseat-target-node') as HTMLInputElement).value.trim();
        const reason = (document.getElementById('reseat-reason') as HTMLSelectElement).value;

        try {
            const res = await fetch(`/api/v1/exams/EX-1001/candidate-intervention`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    action: 'reseat_terminal',
                    reg_no: regNo,
                    target_terminal: targetNode,
                    reason: reason,
                })
            });

            if (res.ok) {
                candidateAssignedTerminals[regNo] = targetNode;
                showToast(`💺 Terminal re-seated to ${targetNode} for ${regNo}`);
                appendIncidentLog(`Migrated session for ${regNo} to ${targetNode} (${reason})`);
                document.getElementById('modal-reseat-candidate')!.style.display = 'none';
                renderProctorTerminals();
            } else {
                showToast("Failed to re-seat terminal", true);
            }
        } catch (_) {
            showToast("Network error while re-seating terminal", true);
        }
    });
}

// 3. CANDIDATE & HALL REMOTE PAUSE / RESUME LOGIC
(window as any).toggleCandidatePause = async (regNo: string, name: string) => {
    const currentlyPaused = candidatePausedStates[regNo] || false;
    const action = currentlyPaused ? 'resume_session' : 'pause_session';
    const reason = currentlyPaused ? 'Proctor inspection cleared' : 'Central Invigilator verification hold';

    try {
        const res = await fetch(`/api/v1/exams/EX-1001/candidate-intervention`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                action: action,
                reg_no: regNo,
                reason: reason,
            })
        });

        if (res.ok) {
            candidatePausedStates[regNo] = !currentlyPaused;
            showToast(`${currentlyPaused ? '▶️ Resumed' : '⏸️ Paused'} session for ${name}`);
            appendIncidentLog(`${currentlyPaused ? 'Resumed' : 'Paused'} test session for ${name} (${regNo})`);
            renderProctorTerminals();
        } else {
            showToast("Failed to toggle session hold", true);
        }
    } catch (_) {
        showToast("Network error toggling session hold", true);
    }
};

const btnHallPause = document.getElementById('btn-hall-pause');
if (btnHallPause) {
    btnHallPause.addEventListener('click', async () => {
        if (!confirm("Are you sure you want to PAUSE examination countdown for ALL connected test-takers?")) return;
        try {
            const res = await fetch(`/api/v1/exams/EX-1001/candidate-intervention`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    action: 'pause_session',
                    reg_no: 'ALL',
                    reason: 'Examination Hall Verification Pause',
                })
            });
            if (res.ok) {
                showToast("⏸️ Hall hold signal dispatched: All countdowns frozen.");
                appendIncidentLog("Central Invigilator placed the entire examination hall on HOLD.");
            }
        } catch (_) {
            showToast("Network error dispatching hall hold", true);
        }
    });
}

const btnHallResume = document.getElementById('btn-hall-resume');
if (btnHallResume) {
    btnHallResume.addEventListener('click', async () => {
        if (!confirm("Resume examination countdown for all connected candidates?")) return;
        try {
            const res = await fetch(`/api/v1/exams/EX-1001/candidate-intervention`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    action: 'resume_session',
                    reg_no: 'ALL',
                    reason: 'Verification completed - Resuming exam',
                })
            });
            if (res.ok) {
                showToast("▶️ Hall resumed: All candidate countdown timers restarted.");
                appendIncidentLog("Central Invigilator RESUMED all examination sessions.");
            }
        } catch (_) {
            showToast("Network error resuming hall", true);
        }
    });
}

// 4. ATTENDANCE ROSTER DOWNLOAD
const btnExportAttendance = document.getElementById('btn-export-attendance');
if (btnExportAttendance) {
    btnExportAttendance.addEventListener('click', () => {
        window.location.href = '/api/v1/exams/EX-1001/attendance-roster?format=csv';
        showToast("📋 Official Attendance Roster CSV downloaded!");
    });
}

// 5. DIRECTIVE & TERMINAL LOCK DISPATCH
(window as any).sendCandidateDirective = (regNo: string, name: string) => {
    const customMsg = prompt(`Enter high-priority directive for ${name} (${regNo}) requiring compliance acknowledgement:`, "Invigilator Directive: Keep your face centered in the webcam frame and maintain focus.");
    if (!customMsg) return;

    if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
        adminSocket.send(JSON.stringify({
            type: "SEND_CANDIDATE_WARNING",
            exam_id: "EX-1001",
            reg_no: regNo,
            message: customMsg
        }));
        showToast(`⚠️ Priority Directive dispatched to ${name} (${regNo})`);
        appendIncidentLog(`Dispatched Invigilator Directive to ${name} (${regNo}): "${customMsg}"`);
    } else {
        showToast("WebSocket disconnected, unable to send directive", true);
    }
};

(window as any).toggleLockTerminal = async (regNo: string, name: string) => {
    const isLocked = candidateLockedStates[regNo] || false;
    const action = isLocked ? 'unlock_terminal' : 'lock_terminal';
    const reason = isLocked ? 'Terminal unlocked by Invigilator' : 'Malpractice investigation lock by Central Invigilator';

    if (!isLocked && !confirm(`Are you sure you want to forcibly LOCK the terminal of ${name} (${regNo})?`)) return;

    try {
        const res = await fetch(`/api/v1/exams/EX-1001/candidate-intervention`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                action: action,
                reg_no: regNo,
                reason: reason,
            })
        });

        if (res.ok) {
            candidateLockedStates[regNo] = !isLocked;
            showToast(`${isLocked ? '🔓 Terminal unlocked' : '🔒 Terminal locked'} for ${name}`);
            appendIncidentLog(`${isLocked ? 'Unlocked' : 'Forcibly LOCKED'} terminal for ${name} (${regNo})`, !isLocked);
            renderProctorTerminals();
        } else {
            showToast("Failed to update terminal lock status", true);
        }
    } catch (_) {
        showToast("Network error updating terminal lock", true);
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

                } else if (msg.type === 'DIRECTIVE_ACKNOWLEDGED') {
                    showToast(`✅ Compliance Confirmed: Candidate ${msg.candidate_name || msg.reg_no} acknowledged directive!`);
                    appendIncidentLog(`✅ Candidate ${msg.candidate_name || msg.reg_no} confirmed compliance with Proctor directive.`);
                    const termCard = document.getElementById(`terminal-card-${msg.reg_no}`);
                    if (termCard) {
                        termCard.style.border = '1px solid #10b981';
                        termCard.style.background = 'rgba(16, 185, 129, 0.05)';
                    }

                } else if (msg.type === 'INDIVIDUAL_TIME_EXTENDED') {
                    candidateAccommodations[msg.reg_no] = msg.total_compensatory_minutes || ((candidateAccommodations[msg.reg_no] || 0) + msg.extra_minutes);
                    showToast(`⏱️ Compensatory Time Granted: +${msg.extra_minutes}m to ${msg.reg_no}`);
                    appendIncidentLog(`Granted +${msg.extra_minutes}m compensatory accommodation to ${msg.reg_no} (${msg.reason || 'Official'})`);
                    renderProctorTerminals();

                } else if (msg.type === 'TERMINAL_RESEATED') {
                    candidateAssignedTerminals[msg.reg_no] = msg.new_terminal;
                    showToast(`💺 Terminal Re-seated: ${msg.reg_no} migrated to ${msg.new_terminal}`);
                    appendIncidentLog(`Migrated candidate ${msg.reg_no} to node ${msg.new_terminal} (${msg.reason || 'Hardware switch'})`);
                    renderProctorTerminals();

                } else if (msg.type === 'EXAM_PAUSED') {
                    if (msg.reg_no === 'ALL') {
                        cachedCandidates.forEach((c: any) => {
                            const r = c.registration_number || c.id;
                            candidatePausedStates[r] = true;
                        });
                        showToast('⏸️ All active exam sessions put on proctor hold');
                        appendIncidentLog(`Entire examination hall put on HOLD by Invigilator: ${msg.reason}`);
                    } else {
                        candidatePausedStates[msg.reg_no] = true;
                        showToast(`⏸️ Session paused for candidate ${msg.reg_no}`);
                        appendIncidentLog(`Paused session for ${msg.reg_no}: ${msg.reason}`);
                    }
                    renderProctorTerminals();

                } else if (msg.type === 'EXAM_RESUMED') {
                    if (msg.reg_no === 'ALL') {
                        cachedCandidates.forEach((c: any) => {
                            const r = c.registration_number || c.id;
                            candidatePausedStates[r] = false;
                        });
                        showToast('▶️ All active exam sessions resumed');
                        appendIncidentLog(`Examination hall RESUMED by Invigilator`);
                    } else {
                        candidatePausedStates[msg.reg_no] = false;
                        showToast(`▶️ Session resumed for candidate ${msg.reg_no}`);
                        appendIncidentLog(`Resumed session for ${msg.reg_no}`);
                    }
                    renderProctorTerminals();

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

