export {};

// Purge legacy hardcoded account from browser localStorage if present
(function purgeLegacyHardcodedUser() {
    try {
        const staleValues = ['5254740', '5254740(V4.3.7)', 'NARESH S'];
        const r = localStorage.getItem('reg_no') || '';
        const n = localStorage.getItem('candidate_name') || '';
        const u = localStorage.getItem('cbt_remembered_user') || '';
        if (staleValues.some(v => r.includes(v) || n.toUpperCase() === v.toUpperCase() || u.includes(v))) {
            localStorage.removeItem('reg_no');
            localStorage.removeItem('candidate_name');
            localStorage.removeItem('candidate_id');
            localStorage.removeItem('cbt_remembered_user');
            localStorage.removeItem('access_token');
        }
    } catch (_) {}
})();

function getAuthToken(): string {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.replace('/login.html');
        return '';
    }
    return token;
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

// UI Elements
const ui = {
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    sidebarThemeToggle: document.getElementById('sidebar-theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    sidebar: document.getElementById('sidebar'),
    sidebarToggleBtn: document.getElementById('sidebar-toggle-btn'),
    headerCandAvatar: document.getElementById('header-cand-avatar'),
    headerCandName: document.getElementById('header-cand-name'),
    headerCandRole: document.getElementById('header-cand-role'),
    sidebarCandRegno: document.getElementById('sidebar-cand-regno'),
    candStatQCount: document.getElementById('cand-stat-q-count'),
    candStatStatus: document.getElementById('cand-stat-status'),
    candAttemptsBody: document.getElementById('cand-attempts-body'),
    toast: document.getElementById('toast'),
};

function showToast(msg: string): void {
    const toastEl = ui.toast;
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.className = "show";
    setTimeout(() => { 
        if (toastEl) toastEl.className = toastEl.className.replace("show", ""); 
    }, 3000);
}

// Theme handling
function initTheme(): void {
    const savedTheme = localStorage.getItem('cbt_theme') || 'light';
    applyTheme(savedTheme);
}

function applyTheme(theme: string): void {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cbt_theme', theme);
    const lightBtn = document.getElementById('dock-theme-light');
    const darkBtn = document.getElementById('dock-theme-dark');
    if (theme === 'dark') {
        lightBtn?.classList.remove('active');
        darkBtn?.classList.add('active');
    } else {
        lightBtn?.classList.add('active');
        darkBtn?.classList.remove('active');
    }
    if (ui.themeIcon) {
        ui.themeIcon.textContent = theme === 'dark' ? 'Light' : 'Dark';
    }
}
(window as any).applyTheme = applyTheme;

function switchCandTab(tabName: string): void {
    document.querySelectorAll('.fx-dock-item').forEach((item) => {
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    document.querySelectorAll('.fx-pill').forEach((pill) => {
        if (pill.getAttribute('data-tab') === tabName) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });

    document.querySelectorAll('.fx-section-view').forEach((sec) => {
        if (sec.id === `view-${tabName}`) {
            sec.classList.add('active');
        } else {
            sec.classList.remove('active');
        }
    });
}
(window as any).switchCandTab = switchCandTab;

function updateGreeting(): void {
    const el = document.getElementById('hero-greeting-title');
    if (!el) return;
    const hour = new Date().getHours();
    let timeOfDay = 'evening';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 17) timeOfDay = 'afternoon';
    const candName = localStorage.getItem('candidate_name') || 'Candidate';
    el.textContent = `Good ${timeOfDay}, ${candName}`;
}

function updateClock(): void {
    const el = document.getElementById('master-clock-time');
    if (!el) return;
    const now = new Date();
    // Format IST
    const istMs = now.getTime() + (5.5 * 3600 * 1000) + (now.getTimezoneOffset() * 60 * 1000);
    const ist = new Date(istMs);
    const h = String(ist.getHours()).padStart(2, '0');
    const m = String(ist.getMinutes()).padStart(2, '0');
    const s = String(ist.getSeconds()).padStart(2, '0');
    el.textContent = `${h}:${m}:${s} IST`;
}

function toggleTheme(): void {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    showToast(`Switched to ${nextTheme.toUpperCase()} theme`);
}

if (ui.themeToggleBtn) ui.themeToggleBtn.addEventListener('click', toggleTheme);
if (ui.sidebarThemeToggle) ui.sidebarThemeToggle.addEventListener('click', toggleTheme);

// Sidebar toggle
const sidebarEl = ui.sidebar;
const toggleBtnEl = ui.sidebarToggleBtn;
if (toggleBtnEl && sidebarEl) {
    toggleBtnEl.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebarEl.classList.toggle('mobile-open');
            let backdrop = document.getElementById('candidate-sidebar-mobile-backdrop');
            if (sidebarEl.classList.contains('mobile-open')) {
                if (!backdrop) {
                    backdrop = document.createElement('div');
                    backdrop.id = 'candidate-sidebar-mobile-backdrop';
                    backdrop.onclick = () => {
                        sidebarEl.classList.remove('mobile-open');
                        backdrop?.remove();
                    };
                    document.body.appendChild(backdrop);
                }
            } else {
                backdrop?.remove();
            }
        } else {
            sidebarEl.classList.toggle('collapsed');
            const isCollapsed = sidebarEl.classList.contains('collapsed');
            toggleBtnEl.innerHTML = isCollapsed ? '<span>&gt;</span>' : '<span>&lt;</span>';
        }
    });
}

// Load candidate profile
function loadCandidateProfile(): void {
    const name = localStorage.getItem('candidate_name') || 'Registered Candidate';
    const regNo = localStorage.getItem('reg_no') || '';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CD';

    if (ui.headerCandName) ui.headerCandName.textContent = name;
    if (ui.headerCandAvatar) ui.headerCandAvatar.textContent = initials;
    if (ui.sidebarCandRegno) ui.sidebarCandRegno.textContent = regNo;
}

// Load live questions count and attempt history from database
async function loadPortalData(): Promise<void> {
    try {
        const qRes = await fetch('/api/v1/questions/count', { headers: getHeaders() });
        if (qRes.ok) {
            const data = await qRes.json();
            if (data && data.count !== undefined && ui.candStatQCount) {
                ui.candStatQCount.textContent = `${data.count} Questions`;
            }
        }
    } catch (_) {}

    // Load dynamic exams from Cloud DB
    try {
        const examsRes = await fetch('/api/v1/exams/', { headers: getHeaders() });
        if (examsRes.ok) {
            const exams = await examsRes.json();
            if (Array.isArray(exams) && ui.candAttemptsBody) {
                if (exams.length === 0) {
                    ui.candAttemptsBody.innerHTML = `
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                                <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-heading); margin-bottom: 0.35rem;">No Active Examinations Scheduled</div>
                                <div style="font-size: 0.85rem;">Examinations scheduled by the administrator in Cloud DB will automatically appear here.</div>
                            </td>
                        </tr>
                    `;
                    if (ui.candStatStatus) {
                        ui.candStatStatus.textContent = "0 Tests Enrolled";
                    }
                    return;
                }

                let html = '';
                for (const ex of exams) {
                    const examId = ex.id;
                    const code = ex.config?.exam_code || ex.code || 'CBT-' + examId.substring(0, 6).toUpperCase();
                    const title = ex.title || 'National Assessment Examination';
                    const schedStatus = ex.schedule_status || 'active';
                    const duration = ex.duration_minutes || 180;
                    const qCount = ex.question_count || ex.config?.question_ids?.length || 0;

                    let statusBadge = '<span class="status-pill status-active">Ready to Launch</span>';
                    let actionBtn = `<a href="/instructions.html?exam_id=${encodeURIComponent(examId)}" class="btn btn-primary btn-sm">Start Exam &rarr;</a>`;

                    if (schedStatus === 'scheduled') {
                        const startText = ex.start_time ? new Date(ex.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled';
                        statusBadge = `<span class="status-pill" style="background:#fef3c7; color:#92400e;">Starts at ${startText}</span>`;
                        actionBtn = `<a href="/instructions.html?exam_id=${encodeURIComponent(examId)}" class="btn btn-outline btn-sm" style="color:#d97706; border-color:#fde68a;">Scheduled &rarr;</a>`;
                    } else if (schedStatus === 'concluded') {
                        statusBadge = `<span class="status-pill" style="background:#f1f5f9; color:#64748b;">Concluded</span>`;
                        actionBtn = `<a href="/scorecard.html?exam_id=${encodeURIComponent(examId)}" class="btn btn-outline btn-sm">View Scorecard</a>`;
                    }

                    html += `
                        <tr>
                            <td style="font-family: var(--font-mono); font-weight: 700; color: var(--brand-blue);">${code}</td>
                            <td>
                                <strong>${title}</strong>
                                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
                                    Duration: ${duration} Mins &bull; ${qCount} Questions
                                </div>
                            </td>
                            <td><span style="font-weight: 700; padding: 2px 8px; background: rgba(50, 31, 219, 0.1); border-radius: 4px;">Subject Slot ${localStorage.getItem('batch_slot') || ex.slot_batch || 'A'}</span></td>
                            <td>${statusBadge}</td>
                            <td style="text-align: right; white-space: nowrap;">
                                ${actionBtn}
                            </td>
                        </tr>
                    `;
                }
                ui.candAttemptsBody.innerHTML = html;
                if (ui.candStatStatus) {
                    ui.candStatStatus.textContent = `${exams.length} Test${exams.length > 1 ? 's' : ''} Enrolled`;
                }
                return;
            }
        }
    } catch (_) {}

    // If candidate has an active exam id stored, check their official result
    const activeExamId = localStorage.getItem('active_exam_id');
    if (activeExamId) {
        try {
            const reg = localStorage.getItem('reg_no') || '';
            const candId = localStorage.getItem('candidate_id') || '';
            const qParams = new URLSearchParams();
            if (reg) qParams.set('reg_no', reg);
            if (candId) qParams.set('candidate_id', candId);

            const resRes = await fetch(`/api/v1/exams/${encodeURIComponent(activeExamId)}/result?${qParams.toString()}`, { headers: getHeaders() });
            if (resRes.ok) {
                const resultData = await resRes.json();
                if (resultData && resultData.score !== '-- / --' && ui.candAttemptsBody) {
                    if (resultData.disqualified === true || resultData.status === 'disqualified') {
                        if (ui.candStatStatus) {
                            ui.candStatStatus.textContent = "Attempt Invalidated (Disqualified)";
                        }
                        ui.candAttemptsBody.innerHTML = `
                            <tr>
                                <td style="font-family: var(--font-mono); font-weight: 700; color: #dc2626;">${resultData.exam_code || 'EXAM'}</td>
                                <td><strong>${resultData.exam_title || 'Examination Assessment'}</strong></td>
                                <td><span style="font-weight: 700; padding: 2px 8px; background: rgba(239, 68, 68, 0.1); color: #dc2626; border-radius: 4px;">Disqualified</span></td>
                                <td>
                                    <span class="status-pill status-suspended" style="background: #fee2e2; color: #b91c1c; font-weight: 700;">
                                        Scores Annulled (Security Infraction)
                                    </span>
                                </td>
                                <td style="text-align: right; white-space: nowrap;">
                                    <a href="/scorecard.html?exam_id=${encodeURIComponent(activeExamId)}" class="btn btn-outline btn-sm">View Status</a>
                                </td>
                            </tr>
                        `;
                    } else {
                        if (ui.candStatStatus) {
                            ui.candStatStatus.textContent = "Attempt Completed";
                        }

                        ui.candAttemptsBody.innerHTML = `
                            <tr>
                                <td style="font-family: var(--font-mono); font-weight: 700; color: var(--brand-blue);">${resultData.exam_code || 'EXAM'}</td>
                                <td><strong>${resultData.exam_title || 'Examination Assessment'}</strong></td>
                                <td><span style="font-weight: 700; padding: 2px 8px; background: rgba(50, 31, 219, 0.1); border-radius: 4px;">Subject Slot A</span></td>
                                <td>
                                    <span class="status-pill status-active" style="background: #ecfdf5; color: #047857;">
                                        Score: ${resultData.score} ${resultData.percentage != null ? `(${resultData.percentage}%)` : ''}
                                    </span>
                                </td>
                                <td style="text-align: right; white-space: nowrap;">
                                    <a href="/scorecard.html?exam_id=${encodeURIComponent(activeExamId)}" class="btn btn-outline btn-sm" style="margin-right: 0.35rem;">View Scorecard</a>
                                    <a href="/instructions.html?exam_id=${encodeURIComponent(activeExamId)}" class="btn btn-primary btn-sm">Retake Exam</a>
                                </td>
                            </tr>
                        `;
                    }
                }
            }
        } catch (_) {}
    }
}

// Admit Card Modal Wiring
const btnViewAdmit = document.getElementById('btn-view-admit-card');
const modalAdmit = document.getElementById('modal-admit-card');
const btnCloseAdmit = document.getElementById('btn-close-admit');
const admitName = document.getElementById('admit-name');
const admitReg = document.getElementById('admit-reg');

if (btnViewAdmit && modalAdmit) {
    btnViewAdmit.addEventListener('click', async () => {
        const name = localStorage.getItem('candidate_name') || 'Candidate Name';
        const reg = localStorage.getItem('reg_no') || '';
        if (admitName) admitName.textContent = name;
        if (admitReg) admitReg.textContent = reg;

        try {
            const token = localStorage.getItem('access_token') || '';
            const res = await fetch('/api/v1/exams/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const s = await res.json();
                const elAgency = document.getElementById('admit-cand-agency');
                const elExam = document.getElementById('admit-cand-exam');
                const elVenue = document.getElementById('admit-cand-venue');
                const elCenterLab = document.getElementById('admit-cand-center-lab');
                const elController = document.getElementById('admit-cand-controller');
                const elTerminal = document.getElementById('admit-cand-terminal');

                if (elAgency && (s.admit_card?.institution_name || s.institution_name)) {
                    elAgency.textContent = s.admit_card?.institution_name || s.institution_name;
                }
                if (elExam && (s.admit_card?.examination_title || s.examination_title)) {
                    elExam.textContent = s.admit_card?.examination_title || s.examination_title;
                }
                if (elVenue && (s.admit_card?.test_venue_name || s.test_venue_name)) {
                    elVenue.textContent = s.admit_card?.test_venue_name || s.test_venue_name;
                }
                if (elCenterLab) {
                    elCenterLab.textContent = `Center: ${s.admit_card?.test_center_code || s.test_center_code || 'SSEC-TN-042'} | Room: ${s.admit_card?.default_lab_room || s.default_lab_room || 'LAB-01'}`;
                }
                if (elController && (s.admit_card?.controller_name || s.controller_name)) {
                    elController.textContent = s.admit_card?.controller_name || s.controller_name;
                }
                if (elTerminal) {
                    elTerminal.textContent = `${s.admit_card?.terminal_prefix || s.terminal_prefix || 'T-A-'}0004`;
                }

                const admitCard = s.admit_card || {};
                const elSubtitle = document.getElementById('admit-cand-subtitle');
                if (elSubtitle && admitCard.header_subtitle) {
                    elSubtitle.textContent = admitCard.header_subtitle;
                }

                // Instructions
                const elInstBlock = document.getElementById('admit-cand-instructions-block');
                const elInstText = document.getElementById('admit-cand-instructions-text');
                if (elInstBlock) {
                    elInstBlock.style.display = admitCard.show_instructions !== false ? 'block' : 'none';
                }
                if (elInstText && admitCard.instructions_text) {
                    elInstText.textContent = admitCard.instructions_text;
                }

                // Barcode block
                const elBarcode = document.getElementById('admit-cand-barcode-block');
                const elMainGrid = document.getElementById('admit-cand-main-grid');
                if (elBarcode) {
                    const showBarcode = admitCard.show_barcode !== false;
                    elBarcode.style.display = showBarcode ? 'flex' : 'none';
                    if (elMainGrid) {
                        elMainGrid.style.gridTemplateColumns = showBarcode ? '1fr 130px' : '1fr';
                    }
                }

                // Slots block
                const elSlot1 = document.getElementById('admit-cand-slot-block-1');
                const elSlot2 = document.getElementById('admit-cand-slot-block-2');
                const showSlots = admitCard.show_slot_timings !== false;
                if (elSlot1) elSlot1.style.display = showSlots ? 'block' : 'none';
                if (elSlot2) elSlot2.style.display = showSlots ? 'block' : 'none';

                // Venue block
                const elVenue1 = document.getElementById('admit-cand-venue-block-1');
                const elVenue2 = document.getElementById('admit-cand-venue-block-2');
                const elVenue3 = document.getElementById('admit-cand-venue-block-3');
                const showVenue = admitCard.show_venue_details !== false;
                if (elVenue1) elVenue1.style.display = showVenue ? 'block' : 'none';
                if (elVenue2) elVenue2.style.display = showVenue ? 'block' : 'none';
                if (elVenue3) elVenue3.style.display = showVenue ? 'block' : 'none';

                // Signature block
                const elSig = document.getElementById('admit-cand-sig-block');
                if (elSig) {
                    elSig.style.display = admitCard.show_signature_block !== false ? 'flex' : 'none';
                }
            }
        } catch (_) {}

        modalAdmit.style.display = 'flex';
    });
}

if (btnCloseAdmit && modalAdmit) {
    btnCloseAdmit.addEventListener('click', () => {
        modalAdmit.style.display = 'none';
    });
}

initTheme();
updateGreeting();
updateClock();
setInterval(updateClock, 1000);
setInterval(updateGreeting, 60000);
loadCandidateProfile();
loadPortalData();

