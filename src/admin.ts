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

const ui = {
    tbody: document.getElementById('candidate-table-body')!,
    searchInput: document.getElementById('search-input') as HTMLInputElement,
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
    toast: document.getElementById('toast')!
};

function showToast(msg: string, isError = false) {
    ui.toast.textContent = msg;
    ui.toast.style.backgroundColor = isError ? "var(--danger)" : "var(--success)";
    ui.toast.className = "show";
    setTimeout(() => { ui.toast.className = ui.toast.className.replace("show", ""); }, 3000);
}

function copyText(text: string, label = "Password") {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`${label} copied to clipboard!`);
    }).catch(() => {
        showToast(`Failed to copy to clipboard`, true);
    });
}

(window as any).copyPassword = (pwd: string) => {
    copyText(pwd, "Password");
};

async function loadCandidates(query = "") {
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
        
        const statTotal = document.getElementById('stat-total-cands');
        if (statTotal) statTotal.textContent = data.length.toString();

        data.forEach((c: any) => {
            const tr = document.createElement('tr');
            const initials = (c.full_name || 'CD').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
            const isActive = (c.status || 'active') === 'active';
            const pwd = c.password || '12345678';
            const email = c.email || `${(c.registration_number || '').toLowerCase()}@ssecbt.in`;

            tr.innerHTML = `
                <td><input type="checkbox" class="row-check" value="${escapeHtml(c.id)}"></td>
                <td style="font-family: var(--font-mono); font-weight: 700; color: #1e3a8a;">${escapeHtml(c.registration_number)}</td>
                <td>
                    <div class="cand-avatar-pill">
                        <div class="avatar-circle">${initials}</div>
                        <span style="font-weight: 600;">${escapeHtml(c.full_name)}</span>
                    </div>
                </td>
                <td><span style="font-weight: 700; padding: 0.2rem 0.5rem; background: #f1f5f9; border-radius: 4px;">Slot ${escapeHtml(c.batch || 'A')}</span></td>
                <td style="font-size: 0.825rem; color: #64748b;">${escapeHtml(email)}</td>
                <td>
                    <div class="pwd-badge">
                        <span>${escapeHtml(pwd)}</span>
                        <button class="pwd-copy-btn" title="Copy Password" onclick="copyPassword('${escapeHtml(pwd)}')">📋</button>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${isActive ? 'active' : 'suspended'}">
                        <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background: ${isActive ? '#10b981' : '#ef4444'};"></span>
                        ${escapeHtml(c.status || 'active')}
                    </span>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <button class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; margin-right: 0.35rem;" onclick="resetAttempt('${escapeHtml(c.id)}')">
                        🔄 Retake
                    </button>
                    <button class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; color: ${isActive ? 'var(--danger)' : '#059669'}; border-color: ${isActive ? '#fca5a5' : '#86efac'};" onclick="toggleStatus('${escapeHtml(c.id)}')">
                        ${isActive ? 'Suspend' : 'Activate'}
                    </button>
                </td>
            `;
            ui.tbody.appendChild(tr);
        });
        
        bindCheckboxes();

        // Question count for dashboard
        try {
            fetch('/api/v1/questions/', { headers: getHeaders() })
                .then(r => r.json())
                .then(qs => {
                    const qStat = document.getElementById('stat-total-questions');
                    if (qStat && Array.isArray(qs)) qStat.textContent = qs.length.toString();
                });
        } catch (_) {}

    } catch (err) {
        showToast("Failed to load candidates from Supabase", true);
    }
}

// --- CREATION MODAL & GOD MAXX ACCOUNT PROVISIONING ---
ui.btnCreate.onclick = () => {
    ui.credResultBox.style.display = 'none';
    ui.modalCreate.style.display = 'flex';
};

// PIN Generator
if (ui.btnGenPwd) {
    ui.btnGenPwd.onclick = () => {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        const pwdInput = document.getElementById('c-password') as HTMLInputElement;
        if (pwdInput) pwdInput.value = pin;
    };
}

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

            // Setup copy credentials slip button
            ui.btnCopyCred.onclick = () => {
                const slip = `SSE CBT PLATFORM V0.1 CREDENTIALS\nName: ${acc.full_name || fullName}\nRoll No: ${acc.registration_number || regno || "N/A"}\nPassword: ${acc.password || pwd}\nSlot: ${acc.slot || batch || "A"}\nLogin URL: /login.html`;
                copyText(slip, "Candidate Credentials Slip");
            };

            loadCandidates();
        } else {
            const err = await res.json();
            showToast(err.detail || "Account provisioning failed", true);
        }
    } catch (_) {
        showToast("Error connecting to account creation service", true);
    }
};

// --- BULK IMPORT ---
ui.btnImport.onclick = () => { ui.modalImport.style.display = 'flex'; };

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

    ui.btnImport.textContent = "Uploading...";
    const res = await fetch(`${API_BASE}/bulk-import`, { method: 'POST', headers: importHeaders, body: formData });
    
    if (res.ok) {
        const data = await res.json();
        showToast(`Successfully imported ${data.imported} candidates`);
        ui.modalImport.style.display = 'none';
        ui.formImport.reset();
        loadCandidates();
    } else {
        showToast("Bulk import failed", true);
    }
    ui.btnImport.textContent = "Bulk Import CSV";
};

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

// --- GOD MAXX CONTROLS ---
if (ui.btnExtendTime) {
    ui.btnExtendTime.onclick = async () => {
        try {
            const res = await fetch('/api/v1/exams/EX-1001/extend-time', {
                method: 'POST',
                headers: getHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                showToast(data.message || "+15 minutes granted to active exam!");
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
                showToast(data.message || "All tab locks and collisions unlocked!");
            }
        } catch (_) {
            showToast("Failed to unlock sessions", true);
        }
    };
}

if (ui.btnEmergencyReset) {
    ui.btnEmergencyReset.onclick = async () => {
        if (!confirm("⚠️ WARNING: This will reset all responses and time countdowns for the active exam. Proceed with Global Exam Reset?")) {
            return;
        }
        try {
            const res = await fetch('/api/v1/exams/EX-1001/reset', {
                method: 'POST',
                headers: getHeaders()
            });
            if (res.ok) {
                showToast("Global Exam Session Reset to Initial State!");
            }
        } catch (_) {
            showToast("Emergency reset failed", true);
        }
    };
}

// --- CANDIDATE ROW ACTIONS ---
(window as any).toggleStatus = async (id: string) => {
    try {
        const res = await fetch(`${API_BASE}/${id}/toggle-status`, { 
            method: 'PATCH', 
            headers: getHeaders() 
        });
        if (res.ok) {
            const data = await res.json();
            showToast(data.message || "Status updated");
            loadCandidates();
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
        } else {
            showToast("Failed to reset attempt", true);
        }
    } catch (_) {
        showToast("Error resetting candidate attempt", true);
    }
};

// --- SELECTION LOGIC ---
function bindCheckboxes() {
    const rowChecks = document.querySelectorAll('.row-check') as NodeListOf<HTMLInputElement>;
    rowChecks.forEach(chk => {
        chk.addEventListener('change', () => {
            const checkedCount = document.querySelectorAll('.row-check:checked').length;
            ui.btnAssign.disabled = checkedCount === 0;
            ui.btnAssign.textContent = checkedCount > 0 ? `Assign to Exam (${checkedCount})` : "Assign to Exam";
        });
    });
}

ui.checkAll.addEventListener('change', (e) => {
    const isChecked = (e.target as HTMLInputElement).checked;
    const rowChecks = document.querySelectorAll('.row-check') as NodeListOf<HTMLInputElement>;
    rowChecks.forEach(chk => chk.checked = isChecked);
    ui.btnAssign.disabled = !isChecked;
    ui.btnAssign.textContent = isChecked ? `Assign to Exam (${rowChecks.length})` : "Assign to Exam";
});

ui.btnAssign.onclick = async () => {
    const selected = Array.from(document.querySelectorAll('.row-check:checked')).map((c: any) => c.value);
    const res = await fetch(`${API_BASE}/bulk-assign`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify({candidate_ids: selected, exam_id: "EX-1001"}) 
    });
    if (res.ok) {
        showToast(`Assigned ${selected.length} candidates to exam.`);
        ui.checkAll.checked = false;
        bindCheckboxes();
    }
};

// --- REAL-TIME PROCTORING WEBSOCKET CLIENT ---
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
                if (msg.type === 'CANDIDATE_RESPONSE') {
                    showToast(`🟢 Live Response: Candidate ${msg.candidate_name || 'NARESH S'} - Q${msg.question_id || '3'} (${msg.status})`);
                } else if (msg.type === 'CANDIDATE_SUBMITTED') {
                    showToast(`🏆 Candidate ${msg.candidate_name || 'NARESH S'} submitted! Score: ${msg.score}/${msg.max_possible} (${msg.percentile}th %ile)`);
                    loadCandidates();
                } else if (msg.type === 'CANDIDATE_CREATED') {
                    showToast(`👤 Candidate created: ${msg.candidate?.full_name || ''}`);
                    loadCandidates();
                } else if (msg.type === 'CANDIDATE_STATUS_CHANGED') {
                    showToast(`🔄 Candidate status updated: ${msg.status}`);
                    loadCandidates();
                } else if (msg.type === 'QUESTION_UPDATED') {
                    showToast(`✏️ Question updated live in database`);
                } else if (msg.type === 'TIME_EXTENDED') {
                    showToast(`⏱️ Extra +${msg.extra_minutes} minutes extended across active exams`);
                }
            } catch (_) {}
        };

        adminSocket.onclose = () => {
            console.warn('[WebSocket] Admin feed disconnected. Reconnecting in 3s...');
            const statusEl = document.getElementById('ws-admin-status');
            const dotEl = document.getElementById('ws-admin-dot');
            if (statusEl) statusEl.textContent = 'Feed Reconnecting...';
            if (dotEl) {
                dotEl.style.backgroundColor = '#f59e0b';
                dotEl.style.boxShadow = '0 0 8px #f59e0b';
            }
            if (adminPingTimer) clearInterval(adminPingTimer);
            setTimeout(initAdminWebSocket, 3000);
        };

        adminSocket.onerror = () => {
            if (adminSocket) adminSocket.close();
        };
    } catch (e) {
        console.warn('[WebSocket] Admin connection failed:', e);
        setTimeout(initAdminWebSocket, 5000);
    }
}

// Search debouncing
let timeout: any;
ui.searchInput.addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        loadCandidates((e.target as HTMLInputElement).value);
    }, 300);
});

// Init
loadCandidates();
initAdminWebSocket();
