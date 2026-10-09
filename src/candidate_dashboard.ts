export {};

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

if (ui.themeToggleBtn) ui.themeToggleBtn.addEventListener('click', toggleTheme);
if (ui.sidebarThemeToggle) ui.sidebarThemeToggle.addEventListener('click', toggleTheme);

// Sidebar toggle
const sidebarEl = ui.sidebar;
const toggleBtnEl = ui.sidebarToggleBtn;
if (toggleBtnEl && sidebarEl) {
    toggleBtnEl.addEventListener('click', () => {
        sidebarEl.classList.toggle('collapsed');
        const isCollapsed = sidebarEl.classList.contains('collapsed');
        toggleBtnEl.innerHTML = isCollapsed ? '<span>▶</span>' : '<span>◀</span>';
    });
}

// Load candidate profile
function loadCandidateProfile(): void {
    const name = localStorage.getItem('candidate_name') || 'Candidate';
    const regNo = localStorage.getItem('reg_no') || 'SSEC-A-0001';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CD';

    if (ui.headerCandName) ui.headerCandName.textContent = name;
    if (ui.headerCandAvatar) ui.headerCandAvatar.textContent = initials;
    if (ui.sidebarCandRegno) ui.sidebarCandRegno.textContent = regNo;
}

// Load live questions count and attempt history from database
async function loadPortalData(): Promise<void> {
    try {
        const qRes = await fetch('/api/v1/questions/', { headers: getHeaders() });
        if (qRes.ok) {
            const questions = await qRes.json();
            if (Array.isArray(questions) && ui.candStatQCount) {
                ui.candStatQCount.textContent = `${questions.length} Questions`;
            }
        }
    } catch (_) {}

    // Check for previous or latest completed attempt
    try {
        const resRes = await fetch('/api/v1/exams/EX-1001/result', { headers: getHeaders() });
        if (resRes.ok) {
            const resultData = await resRes.json();
            if (resultData && resultData.score !== '-- / --' && ui.candAttemptsBody) {
                if (ui.candStatStatus) {
                    ui.candStatStatus.textContent = "Attempt Completed";
                }

                ui.candAttemptsBody.innerHTML = `
                    <tr>
                        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--brand-blue);">EX-1001</td>
                        <td><strong>${resultData.exam_title || 'JEE MAIN 2026 MOCK TEST'}</strong></td>
                        <td><span style="font-weight: 700; padding: 2px 8px; background: rgba(50, 31, 219, 0.1); border-radius: 4px;">Slot A</span></td>
                        <td>
                            <span class="status-pill status-active" style="background: #ecfdf5; color: #047857;">
                                Score: ${resultData.score} (${resultData.percentile} PR)
                            </span>
                        </td>
                        <td style="text-align: right; white-space: nowrap;">
                            <a href="/scorecard.html" class="btn btn-outline btn-sm" style="margin-right: 0.35rem;">🏆 View Scorecard</a>
                            <a href="/instructions.html" class="btn btn-primary btn-sm">Retake Exam</a>
                        </td>
                    </tr>
                `;
            }
        }
    } catch (_) {}
}

initTheme();
loadCandidateProfile();
loadPortalData();
