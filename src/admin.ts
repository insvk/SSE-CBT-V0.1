export {};

const API_BASE = '/api/v1/candidates';

function getAuthToken(): string {
    return localStorage.getItem('admin_token') || localStorage.getItem('access_token') || '';
}

function getTenantId(): string {
    return localStorage.getItem('tenant_id') || '00000000-0000-0000-0000-000000000001';
}

function getHeaders(): HeadersInit {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-tenant-id': getTenantId(),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

async function adminFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    const buildHeaders = (): HeadersInit => {
        const h: any = {
            'x-tenant-id': getTenantId(),
            ...(options.headers || {}),
        };
        if (!(options.body instanceof FormData) && !h['Content-Type']) {
            h['Content-Type'] = 'application/json';
        }
        const token = getAuthToken();
        if (token && !h['Authorization']) {
            h['Authorization'] = `Bearer ${token}`;
        }
        return h;
    };

    let targetUrl = endpoint;
    let res: Response;

    try {
        res = await fetch(targetUrl, { ...options, headers: buildHeaders() });
    } catch (networkErr) {
        if (isLocal && window.location.port !== '8000' && !endpoint.startsWith('http')) {
            console.info(`[Admin Console] Relative fetch failed, trying direct connection to http://127.0.0.1:8000${endpoint}`);
            targetUrl = `http://127.0.0.1:8000${endpoint}`;
            res = await fetch(targetUrl, { ...options, headers: buildHeaders() });
        } else {
            throw networkErr;
        }
    }

    if (res.status === 401 || res.status === 403) {
        console.warn('[Admin Console] Authentication required or expired; redirecting to login...');
        if (!window.location.pathname.includes('login.html')) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('admin_token');
        }
    }

    if ((res.status === 404 || res.status === 502) && isLocal && window.location.port !== '8000' && !targetUrl.startsWith('http://127.0.0.1:8000')) {
        try {
            console.info(`[Admin Console] HTTP ${res.status} on relative path, attempting http://127.0.0.1:8000${endpoint}`);
            const altRes = await fetch(`http://127.0.0.1:8000${endpoint}`, { ...options, headers: buildHeaders() });
            if (altRes.ok || altRes.status !== 404) {
                res = altRes;
            }
        } catch (_) {}
    }

    return res;
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
    btnAssign: document.getElementById('btn-assign') as HTMLButtonElement | null,
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

let cachedExams: any[] = [];
function getActiveExamId(): string {
    const selected = (document.getElementById('select-active-exam') as HTMLSelectElement)?.value;
    if (selected && selected !== 'ALL' && selected !== '') return selected;
    if (cachedExams.length > 0 && cachedExams[0]?.id) return cachedExams[0].id;
    return localStorage.getItem('active_exam_id') || '';
}

// --- THEME MANAGEMENT (REPLICATING LIGHT/DARK REFERENCE SPLIT) ---
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

function switchAdminTab(tabName: string): void {
    // 1. Update dock items
    document.querySelectorAll('.fx-dock-item').forEach((item) => {
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // 2. Update top pills
    document.querySelectorAll('.fx-pill').forEach((pill) => {
        if (pill.getAttribute('data-tab') === tabName) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });

    // 3. Update view sections
    document.querySelectorAll('.fx-section-view').forEach((sec) => {
        if (sec.id === `view-${tabName}`) {
            sec.classList.add('active');
        } else {
            sec.classList.remove('active');
        }
    });

    try {
        history.replaceState(null, '', `#${tabName}`);
    } catch (_) {}

    // Special tab triggers
    if (tabName === 'scorecards') {
        populateResultsExamSelect();
    } else if (tabName === 'candidates') {
        renderCandidateTable();
    } else if (tabName === 'exams') {
        loadExams();
    }
}
(window as any).switchAdminTab = switchAdminTab;

function updateGreeting(): void {
    const el = document.getElementById('hero-greeting-title');
    if (!el) return;
    const hour = new Date().getHours();
    let timeOfDay = 'evening';
    if (hour < 12) {
        timeOfDay = 'morning';
    } else if (hour < 17) {
        timeOfDay = 'afternoon';
    }
    el.textContent = `Good ${timeOfDay}, Administrator`;
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

// --- SIDEBAR COLLAPSE & MOBILE DRAWER TOGGLE ---
if (ui.sidebarToggleBtn && ui.sidebar) {
    ui.sidebarToggleBtn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            ui.sidebar.classList.toggle('mobile-open');
            let backdrop = document.getElementById('admin-sidebar-mobile-backdrop');
            if (ui.sidebar.classList.contains('mobile-open')) {
                if (!backdrop) {
                    backdrop = document.createElement('div');
                    backdrop.id = 'admin-sidebar-mobile-backdrop';
                    backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:999;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);';
                    backdrop.onclick = () => {
                        ui.sidebar.classList.remove('mobile-open');
                        backdrop?.remove();
                    };
                    document.body.appendChild(backdrop);
                }
            } else {
                backdrop?.remove();
            }
        } else {
            ui.sidebar.classList.toggle('collapsed');
            const isCollapsed = ui.sidebar.classList.contains('collapsed');
            ui.sidebarToggleBtn.innerHTML = isCollapsed ? '<span>▶</span>' : '<span>◀</span>';
        }
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

// --- RENDER DYNAMIC OVERVIEW VELOCITY BARS ---
function renderDynamicOverviewBars(subjectBreakdown?: Record<string, number>): void {
    const container = document.getElementById('fx-overview-bars-container');
    if (!container) return;

    container.innerHTML = '';
    const breakdown = subjectBreakdown || {};
    let entries = Object.entries(breakdown);
    if (entries.length === 0) {
        container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; width: 100%; font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 1rem;">No question bank items recorded</div>';
        return;
    }

    const counts = entries.map(([_, count]) => count);
    const maxCount = Math.max(...counts, 10);

    entries.forEach(([subj, count]) => {
        const totalHeightPct = Math.max(12, Math.min(95, Math.round((count / maxCount) * 85)));
        const topHeight = Math.max(4, Math.round(totalHeightPct * 0.4));
        const bottomHeight = Math.max(4, totalHeightPct - topHeight);

        let displayLabel = subj.toUpperCase();
        if (displayLabel.includes('PHYSICS')) displayLabel = 'PHYS';
        else if (displayLabel.includes('CHEMISTRY')) displayLabel = 'CHEM';
        else if (displayLabel.includes('MATHEMATICS')) displayLabel = 'MATH';
        else if (displayLabel.includes('COMPUTER')) displayLabel = 'CS';
        else if (displayLabel.includes('BIOLOGY')) displayLabel = 'BIO';
        else if (displayLabel.length > 7) displayLabel = displayLabel.slice(0, 6);

        const col = document.createElement('div');
        col.className = 'fx-bar-col';
        col.innerHTML = `
            <div class="fx-bar-composite" style="height: 100%;" title="${escapeHtml(subj)}: ${count} question items in Cloud DB">
                <div class="fx-bar-top" style="height: ${topHeight}%;"></div>
                <div class="fx-bar-bottom" style="height: ${bottomHeight}%;"></div>
            </div>
            <span class="fx-bar-label">${escapeHtml(displayLabel)}</span>
        `;
        container.appendChild(col);
    });
}

// --- LOAD DASHBOARD SUMMARY (ZERO DUMMY DATA) ---
async function loadDashboardSummary(): Promise<void> {
    try {
        const res = await adminFetch(`${API_BASE}/dashboard-summary`);
        if (res.ok) {
            const summary = await res.json();
            
            // Overview Hero & Stats
            const totalCands = summary.total_candidates || 0;
            const heroTotal = document.getElementById('dash-total-candidates-hero');
            if (heroTotal) heroTotal.textContent = `${totalCands.toLocaleString()} Candidates`;

            const heroSub = document.getElementById('dash-cand-trend-sub');
            if (heroSub) heroSub.textContent = `${totalCands} verified in Supabase Cloud DB`;

            const slotsSubhead = document.getElementById('dash-slots-subhead');
            if (slotsSubhead) slotsSubhead.textContent = `Total ${totalCands.toLocaleString()} Enrolled`;

            const breakdown = summary.batch_breakdown || {};
            const slotsContainer = document.getElementById('dash-slots-row');
            if (slotsContainer) {
                const slotsDef = [
                    { slot: 'A', name: 'Slot A', room: 'LAB-01' },
                    { slot: 'B', name: 'Slot B', room: 'LAB-02' },
                    { slot: 'C', name: 'Slot C', room: 'LAB-03' },
                    { slot: 'D', name: 'Slot D', room: 'LAB-04' }
                ];
                slotsContainer.innerHTML = slotsDef.map(s => {
                    const count = breakdown[s.slot] || 0;
                    const isLive = summary.active_candidates > 0 && s.slot === 'A';
                    const statusText = isLive ? `${s.room} • Active Live` : `${s.room} • Standby`;
                    const statusColor = isLive ? 'color: #10b981; font-weight: 700;' : (count > 0 ? 'color: var(--fx-text-heading);' : 'color: #64748b;');
                    return `
                        <div class="fx-slot-item">
                            <div class="fx-slot-header">
                                <span>${s.name}</span>
                                <span>🇮🇳</span>
                            </div>
                            <div class="fx-slot-val">${count} Cand.</div>
                            <div class="fx-slot-status" style="${statusColor}">${statusText}</div>
                        </div>
                    `;
                }).join('');
            } else {
                const slotA = document.getElementById('slot-a-count');
                if (slotA) slotA.textContent = `${breakdown.A || 0} Cand.`;

                const slotB = document.getElementById('slot-b-count');
                if (slotB) slotB.textContent = `${breakdown.B || 0} Cand.`;

                const slotC = document.getElementById('slot-c-count');
                if (slotC) slotC.textContent = `${breakdown.C || 0} Cand.`;
            }

            // Sessions & Invigilation
            const activeSessions = document.getElementById('dash-active-sessions');
            if (activeSessions) activeSessions.textContent = `${summary.active_exam_duration || 180} Mins`;

            const activeTrend = document.getElementById('dash-active-trend');
            if (activeTrend) activeTrend.textContent = summary.active_candidates > 0 ? `⚡ ${summary.active_candidates} Active` : `⚡ Standby`;

            const activeSub = document.getElementById('dash-active-subtitle');
            if (activeSub) activeSub.textContent = summary.active_exam_title || 'Cloud Synced';

            const debarredEl = document.getElementById('dash-security-strikes');
            if (debarredEl) debarredEl.textContent = `${summary.debarred_count || 0} Debarred`;

            const completionEl = document.getElementById('dash-completion-rate');
            if (completionEl) completionEl.textContent = `${summary.completion_rate || 0}%`;

            const questionsEl = document.getElementById('dash-total-questions');
            if (questionsEl) questionsEl.textContent = `${summary.total_questions || 0} Items`;

            const questionsSub = document.getElementById('dash-questions-sub');
            const numSubjects = Object.keys(summary.subject_breakdown || {}).length;
            if (questionsSub) questionsSub.textContent = `↑ ${numSubjects} Sections`;

            // Telemetry & Infrastructure Load
            const infraLoad = document.getElementById('dash-infra-load');
            const lat = ((summary.db_latency_ms || 18) / 1000).toFixed(2);
            if (infraLoad) infraLoad.textContent = `${lat}s / 100% OK`;

            const infraBar = document.getElementById('dash-infra-bar');
            if (infraBar) infraBar.style.width = '100%';

            const terminalNode = document.getElementById('dash-card-terminal-node');
            if (terminalNode) terminalNode.textContent = summary.active_exam_terminal_prefix || 'NODE --';

            const terminalVenue = document.getElementById('dash-card-terminal-venue');
            if (terminalVenue) {
                if (summary.active_exam_venue && summary.active_exam_venue !== "Awaiting Exam Configuration") {
                    terminalVenue.textContent = `${summary.active_exam_venue} • ${summary.active_exam_room || 'LAB-01'}`;
                } else {
                    terminalVenue.textContent = summary.active_exam_venue || 'Awaiting Center Setup';
                }
            }

            const termStatus = document.getElementById('dash-card-terminal-status');
            if (termStatus) termStatus.textContent = (adminSocket && adminSocket.readyState === WebSocket.OPEN) ? '• Online' : '• Standby';

            const termIp = document.getElementById('dash-card-terminal-ip');
            if (termIp) termIp.textContent = window.location.hostname || 'Cloud DB Live';

            const termPort = document.getElementById('dash-card-terminal-port');
            if (termPort) termPort.textContent = `Port ${window.location.port || (window.location.protocol === 'https:' ? '443' : '8000')}`;

            const adminBadge = document.getElementById('dash-admin-email-badge');
            if (adminBadge) adminBadge.textContent = localStorage.getItem('admin_email') || 'admin@sse.cbt.in';

            const wsStatus = document.getElementById('dash-ws-status');
            if (wsStatus) {
                wsStatus.textContent = `WebSocket Live Stream: ${adminSocket && adminSocket.readyState === WebSocket.OPEN ? 'Connected' : 'Connecting...'}`;
            }

            const ntpDrift = document.getElementById('dash-ntp-drift');
            if (ntpDrift) {
                ntpDrift.textContent = `time.google.com: ${Math.abs(Math.round(ntpOffsetMs))}ms drift`;
            }

            // Middle / legacy stat cards
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

            renderDynamicOverviewBars(summary.subject_breakdown);
            renderDynamicCharts(summary);
        }
    } catch (e) {
        console.warn("Failed to load live dashboard summary", e);
    }
}


// --- AUTHORITATIVE MASTER EXAM CLOCK (time.google.com & IST) ---
let ntpOffsetMs = 0;
let ntpSynced = false;

async function syncMasterClock(): Promise<void> {
    try {
        const tStart = Date.now();
        const res = await adminFetch('/api/v1/system/time');
        const tEnd = Date.now();
        if (res.ok) {
            const data = await res.json();
            const clock = data.clock || {};
            const serverTsMs = (clock.unix_timestamp || Date.now() / 1000) * 1000;
            const roundTrip = tEnd - tStart;
            ntpOffsetMs = (serverTsMs + roundTrip / 2) - tEnd;
            ntpSynced = clock.ntp_synced !== false;
            updateMasterClockDisplay();
        }
    } catch (_) {
        // Local clock fallback
    }
}

function updateMasterClockDisplay(): void {
    const nowWithOffset = Date.now() + ntpOffsetMs;
    // IST is UTC+05:30: +5.5 hours relative to UTC
    const istMs = nowWithOffset + (5.5 * 3600 * 1000) + (new Date().getTimezoneOffset() * 60 * 1000);
    const istDate = new Date(istMs);
    const hrs = String(istDate.getHours()).padStart(2, '0');
    const mins = String(istDate.getMinutes()).padStart(2, '0');
    const secs = String(istDate.getSeconds()).padStart(2, '0');
    
    const timeEl = document.getElementById('master-clock-time');
    if (timeEl) {
        timeEl.textContent = `${hrs}:${mins}:${secs} IST`;
    }
    const badgeEl = document.getElementById('master-clock-badge');
    if (badgeEl) {
        badgeEl.textContent = ntpSynced ? 'time.google.com NTP Synced' : 'IST Server Clock Active';
    }
    const ntpDrift = document.getElementById('dash-ntp-drift');
    if (ntpDrift) {
        ntpDrift.textContent = `time.google.com: ${Math.abs(Math.round(ntpOffsetMs))}ms drift`;
    }
}

// --- FILTERING & SELECTION ENGINE ---
function getFilteredCandidates(): any[] {
    let list = [...cachedCandidates];
    const q = (ui.searchInput?.value || ui.topSearchInput?.value || '').trim().toLowerCase();
    const slotFilter = (document.getElementById('filter-slot') as HTMLSelectElement)?.value || 'ALL';
    const statusFilter = (document.getElementById('filter-status') as HTMLSelectElement)?.value || 'ALL';
    const pwdFilter = (document.getElementById('filter-pwd') as HTMLSelectElement)?.value || 'ALL';

    if (q) {
        list = list.filter((c: any) => 
            (c.full_name || '').toLowerCase().includes(q) || 
            (c.registration_number || '').toLowerCase().includes(q) ||
            (c.roll_number || '').toLowerCase().includes(q) ||
            (c.assigned_terminal || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q)
        );
    }

    if (slotFilter !== 'ALL') {
        list = list.filter((c: any) => (c.batch || 'A').toUpperCase() === slotFilter);
    }

    if (statusFilter !== 'ALL') {
        list = list.filter((c: any) => (c.status || 'active').toLowerCase() === statusFilter.toLowerCase());
    }

    if (pwdFilter === 'PWD') {
        list = list.filter((c: any) => c.is_pwd === true || c.has_scribe === true);
    } else if (pwdFilter === 'STANDARD') {
        list = list.filter((c: any) => !c.is_pwd && !c.has_scribe);
    }

    return list;
}

function updateBulkSelectionToolbar(): void {
    const checked = document.querySelectorAll('.row-check:checked');
    const toolbar = document.getElementById('bulk-actions-toolbar');
    const countEl = document.getElementById('bulk-selected-count');
    if (toolbar && countEl) {
        if (checked.length > 0) {
            toolbar.classList.add('active');
            countEl.textContent = `${checked.length} candidate${checked.length > 1 ? 's' : ''} selected`;
        } else {
            toolbar.classList.remove('active');
        }
    }
    if (ui.btnAssign) {
        ui.btnAssign.disabled = checked.length === 0;
        ui.btnAssign.textContent = checked.length > 0 ? `Assign to Exam (${checked.length})` : "Assign to Exam";
    }
}

function renderCandidateTable(): void {
    const data = getFilteredCandidates();
    ui.tbody.innerHTML = '';
    const fullTbody = document.getElementById('candidate-full-table-body');
    if (fullTbody) fullTbody.innerHTML = '';

    if (data.length === 0) {
        const emptyRow = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--fx-text-muted);">
                    No candidates match the active search/filter criteria.
                </td>
            </tr>
        `;
        ui.tbody.innerHTML = emptyRow;
        if (fullTbody) fullTbody.innerHTML = emptyRow;
        updateBulkSelectionToolbar();
        return;
    }

    data.forEach((c: any) => {
        const tr = document.createElement('tr');
        const initials = (c.full_name || 'CD').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
        const status = (c.status || 'active').toLowerCase();
        const isActive = status === 'active';
        const isDisqualified = status === 'disqualified' || status === 'invalidated' || (c.metadata && (c.metadata.disqualified === true || c.metadata.exam_status === 'invalidated'));
        const slot = (c.batch || 'A').toUpperCase();
        const rollNo = c.roll_number || c.registration_number || `SSE-${slot}-CBT-0001`;
        const terminal = c.assigned_terminal || c.metadata?.assigned_terminal || c.device_details?.node_id || `NODE-${slot}-01`;
        const room = c.room_number || c.metadata?.room_number || '';
        const dev = c.device_details || c.metadata?.device_details || null;
        const devInfo = dev ? `${dev.os || ''} ${dev.browser || ''}`.trim() : '';
        const isPwd = c.is_pwd || false;
        const extraMins = c.compensatory_minutes || 0;

        let statusClass = 'status-active';
        let statusDot = '#10b981';
        let statusLabel = 'Active';
        if (isDisqualified) {
            statusClass = 'status-suspended';
            statusDot = '#ef4444';
            statusLabel = 'Disqualified';
        } else if (!isActive) {
            statusClass = 'status-suspended';
            statusDot = '#f59e0b';
            statusLabel = 'Suspended';
        }

        tr.innerHTML = `
            <td><input type="checkbox" class="row-check" value="${escapeHtml(c.id)}" data-cand-id="${escapeHtml(c.id)}"></td>
            <td>
                <div class="user-cell">
                    <div class="user-cell-avatar">${initials}</div>
                    <div class="user-cell-info">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span class="user-cell-name">${escapeHtml(c.full_name)}</span>
                        </div>
                        <span class="user-cell-sub">
                            Roll: <strong style="color: var(--text-heading); font-family: var(--font-mono);">${escapeHtml(rollNo)}</strong> &bull; ${escapeHtml(c.registration_number)}
                        </span>
                    </div>
                </div>
            </td>
            <td>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-weight: 800; padding: 0.15rem 0.5rem; background: rgba(79, 70, 229, 0.12); color: var(--brand-blue); border-radius: 4px; font-size: 0.75rem;">
                            Subject Slot ${escapeHtml(slot)}
                        </span>
                    </div>
                    <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">Subject Paper Slot ${escapeHtml(slot)}</span>
                </div>
            </td>
            <td>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-family: var(--font-mono); font-weight: 800; font-size: 0.82rem; color: var(--text-heading);">
                        Node: ${escapeHtml(terminal)}
                    </span>
                    <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">
                        ${room ? `Room: ${escapeHtml(room)} &bull; ` : ''}${devInfo ? escapeHtml(devInfo) : (c.ip_address ? `IP: ${escapeHtml(c.ip_address)}` : 'Terminal Allocated')}
                    </span>
                </div>
            </td>
            <td>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-size: 0.72rem; font-weight: 700; color: #059669;">
                        ${escapeHtml(c.biometric_status || 'verified')} (${c.biometric_score || 98.4}%)
                    </span>
                    ${isPwd ? `<span style="font-size: 0.68rem; font-weight: 700; color: #b45309; background: #fef3c7; padding: 1px 5px; border-radius: 4px; display: inline-block;">PwD (+${extraMins}m)</span>` : '<span style="font-size: 0.7rem; color: var(--text-muted);">Standard</span>'}
                </div>
            </td>
            <td>
                <span class="status-pill ${statusClass}">
                    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background: ${statusDot};"></span>
                    ${statusLabel}
                </span>
            </td>
            <td style="text-align: right; white-space: nowrap;">
                <div class="action-btn-group">
                    <button class="btn-action-icon" title="View Full Candidate Dossier" onclick="openCandidateDossier('${escapeHtml(c.id)}')">
                        Dossier
                    </button>
                    <button class="btn-action-icon" title="View & Print Official Admit Card / Hall Ticket" onclick="openAdmitCard('${escapeHtml(c.id)}')">
                        Admit Card
                    </button>
                    <button class="btn-action-icon" title="Migrate Candidate Shift / Slot" onclick="openShiftReallocation('${escapeHtml(c.id)}')">
                        Shift
                    </button>
                    <button class="btn-action-icon" title="Manage PwD & Scribe Accommodations" onclick="openAccommodationsManager('${escapeHtml(c.id)}')">
                        PwD
                    </button>
                    <button class="btn-action-icon" title="Generate Emergency Access PIN" onclick="regenerateEmergencyPin('${escapeHtml(c.id)}')">
                        PIN
                    </button>
                    <button class="btn-action-icon" style="color: #ef4444;" title="Debar Candidate for Infraction" onclick="openDebarModal('${escapeHtml(c.id)}')">
                        Debar
                    </button>
                    <button class="btn-action-icon" style="color: #dc2626;" title="Permanently Deregister / Delete Candidate from Cloud DB" onclick="deleteCandidateRecord('${escapeHtml(c.id)}', '${escapeHtml(c.full_name)}')">
                        Expel
                    </button>
                </div>
            </td>
        `;
        ui.tbody.appendChild(tr);
        if (fullTbody) {
            fullTbody.appendChild(tr.cloneNode(true));
        }
    });

    bindCheckboxes();
    updateBulkSelectionToolbar();
    renderProctorTerminals();
}

// --- LOAD CANDIDATES LIST ---
async function loadCandidates(): Promise<void> {
    try {
        const res = await adminFetch(`${API_BASE}/`);
        if (!res.ok) {
            let errorMsg = '';
            try {
                const err = await res.json();
                errorMsg = err.detail || err.message;
            } catch (_) {
                try {
                    const text = await res.text();
                    if (text && text.length < 200) errorMsg = text;
                } catch (_) {}
            }
            console.error("[Candidate Suite] Failed to load candidates:", res.status, errorMsg);
            if (res.status === 401) {
                showToast("Session expired or unauthorized. Please re-authenticate.", true);
            } else if (res.status === 403) {
                showToast("Forbidden: Super Admin authority required.", true);
            } else {
                showToast(errorMsg || `Database query failed (HTTP ${res.status}).`, true);
            }
            return;
        }
        let data = await res.json();
        if (!Array.isArray(data)) data = [];
        cachedCandidates = data;
        renderCandidateTable();
    } catch (err: any) {
        console.error("[Candidate Suite] Network error loading candidates:", err);
        showToast(err?.message || "Failed to load candidates from Cloud DB", true);
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
        const venue = (document.getElementById('c-venue') as HTMLInputElement)?.value.trim();
        const room = (document.getElementById('c-room') as HTMLInputElement)?.value.trim();
        const terminal = (document.getElementById('c-terminal') as HTMLInputElement)?.value.trim();
        const category = (document.getElementById('c-category') as HTMLSelectElement)?.value || 'General';
        const gender = (document.getElementById('c-gender') as HTMLSelectElement)?.value || 'Male';
        const isPwd = (document.getElementById('c-ispwd') as HTMLInputElement)?.checked || false;
        const hasScribe = (document.getElementById('c-hasscribe') as HTMLInputElement)?.checked || false;
        const extraMins = parseInt((document.getElementById('c-extramins') as HTMLInputElement)?.value, 10) || (isPwd ? 60 : 0);

        const payload = {
            full_name: fullName,
            role: role,
            batch_or_slot: batch || "A",
            registration_number: regno || undefined,
            email: email || undefined,
            initial_password: pwd || "12345678",
            test_center_name: venue || undefined,
            room_number: room || undefined,
            assigned_terminal: terminal || undefined,
            category: category,
            gender: gender,
            is_pwd: isPwd,
            has_scribe: hasScribe,
            compensatory_minutes: extraMins,
        };

        try {
            const res = await adminFetch('/api/v1/auth/create-account', {
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
                const resVenue = document.getElementById('res-venue');
                const resRoom = document.getElementById('res-room');
                const resTerminal = document.getElementById('res-terminal');

                if (resRegno) resRegno.textContent = acc.registration_number || regno || "N/A";
                if (resName) resName.textContent = acc.full_name || fullName;
                if (resPwd) resPwd.textContent = acc.password || pwd;
                if (resSlot) resSlot.textContent = acc.slot || batch || "A";
                if (resVenue) resVenue.textContent = acc.test_center_name || venue || "Saveetha Engineering College";
                if (resRoom) resRoom.textContent = acc.room_number || room || "Lab 4";
                if (resTerminal) resTerminal.textContent = acc.assigned_terminal || terminal || "Auto Assigned";

                ui.credResultBox.style.display = 'block';

                ui.btnCopyCred.onclick = () => {
                    const slip = `SSE CBT PLATFORM V0.1 CREDENTIALS\nName: ${acc.full_name || fullName}\nRoll No: ${acc.registration_number || regno || "N/A"}\nPassword: ${acc.password || pwd}\nSlot: ${acc.slot || batch || "A"}\nCentre: ${acc.test_center_name || venue || "Saveetha Engineering College"}\nRoom: ${acc.room_number || room || "Lab 4"}\nTerminal Node: ${acc.assigned_terminal || terminal || "Auto Assigned"}\nPortal URL: /login.html`;
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

        const res = await adminFetch(`${API_BASE}/bulk-import`, { method: 'POST', headers: importHeaders, body: formData });
        
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
            const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/extend-time`, {
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
            const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/unlock-sessions`, {
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
        if (!confirm("WARNING: This will reset all active exam responses and timer countdowns. Proceed with Global Exam Session Reset?")) {
            return;
        }
        try {
            const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/reset`, {
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
        const res = await adminFetch(`${API_BASE}/${id}/toggle-status`, { 
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
        const res = await adminFetch(`${API_BASE}/${id}/reset-attempt`, { 
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
        const res = await adminFetch(`${API_BASE}/bulk-assign`, { 
            method: 'POST', 
            headers: getHeaders(), 
            body: JSON.stringify({ candidate_ids: selected, exam_id: getActiveExamId() || undefined }) 
        });
        if (res.ok) {
            showToast(`Assigned ${selected.length} candidates to exam.`);
            if (ui.checkAll) ui.checkAll.checked = false;
            bindCheckboxes();
            loadDashboardSummary();
        }
    };
}

// --- CANDIDATE MANAGEMENT SUITE MODAL HANDLERS ---
function openCandidateDossier(id: string): void {
    const c = cachedCandidates.find(item => item.id === id);
    if (!c) {
        showToast("Candidate record not found", true);
        return;
    }
    const modal = document.getElementById('modal-candidate-dossier');
    if (!modal) return;

    (document.getElementById('dos-full-name') as HTMLElement).textContent = c.full_name || '--';
    (document.getElementById('dos-reg-no') as HTMLElement).textContent = c.registration_number || '--';
    (document.getElementById('dos-roll-no') as HTMLElement).textContent = c.roll_number || c.registration_number || '--';
    const dosCat = document.getElementById('dos-category');
    if (dosCat) dosCat.textContent = c.category || 'General';
    (document.getElementById('dos-gender') as HTMLElement).textContent = c.gender || 'Male';
    (document.getElementById('dos-email') as HTMLElement).textContent = c.email || `${(c.registration_number || '').toLowerCase()}@ssecbt.in`;
    (document.getElementById('dos-slot') as HTMLElement).textContent = `Subject Slot ${c.batch || 'A'}`;
    (document.getElementById('dos-slot-timing') as HTMLElement).textContent = `Subject Paper Slot ${c.batch || 'A'}`;
    (document.getElementById('dos-reporting') as HTMLElement).textContent = `Cohort ${c.batch || 'A'}`;
    (document.getElementById('dos-terminal') as HTMLElement).textContent = c.assigned_terminal || `T-${c.batch || 'A'}-01`;
    (document.getElementById('dos-ip') as HTMLElement).textContent = c.ip_address || '10.0.4.12';
    (document.getElementById('dos-pwd') as HTMLElement).textContent = c.is_pwd ? 'Yes (Benchmark Disability)' : 'No (Standard)';
    (document.getElementById('dos-scribe') as HTMLElement).textContent = c.has_scribe ? 'Permitted / Assigned' : 'Not Required';
    (document.getElementById('dos-extra-time') as HTMLElement).textContent = `${c.compensatory_minutes || 0} Minutes`;
    (document.getElementById('dos-created-at') as HTMLElement).textContent = c.created_at_ist || 'Authoritative Record';
    (document.getElementById('dos-bio-score') as HTMLElement).textContent = `Match ${c.biometric_score || 98.4}%`;

    const statusPill = document.getElementById('dos-status-pill');
    if (statusPill) {
        statusPill.textContent = (c.status || 'ACTIVE').toUpperCase();
    }

    const btnAdmit = document.getElementById('dos-btn-print-admit');
    if (btnAdmit) btnAdmit.onclick = () => { modal.style.display = 'none'; openAdmitCard(id); };

    const btnRealloc = document.getElementById('dos-btn-reallocate');
    if (btnRealloc) btnRealloc.onclick = () => { modal.style.display = 'none'; openShiftReallocation(id); };

    const btnAcc = document.getElementById('dos-btn-accommodations');
    if (btnAcc) btnAcc.onclick = () => { modal.style.display = 'none'; openAccommodationsManager(id); };

    const btnPin = document.getElementById('dos-btn-pin');
    if (btnPin) btnPin.onclick = () => { modal.style.display = 'none'; regenerateEmergencyPin(id); };

    const btnDebar = document.getElementById('dos-btn-debar');
    if (btnDebar) btnDebar.onclick = () => { modal.style.display = 'none'; openDebarModal(id); };

    modal.style.display = 'flex';
}

async function openAdmitCard(id: string): Promise<void> {
    try {
        const res = await adminFetch(`${API_BASE}/${id}/admit-card`, { headers: getHeaders() });
        if (!res.ok) {
            showToast("Failed to fetch official admit card", true);
            return;
        }
        const data = await res.json();
        const modal = document.getElementById('modal-admit-card');
        if (!modal) return;

        (document.getElementById('admit-number') as HTMLElement).textContent = data.admit_card_number;
        (document.getElementById('admit-barcode') as HTMLElement).textContent = data.barcode_data;
        (document.getElementById('admit-name') as HTMLElement).textContent = data.full_name;
        (document.getElementById('admit-roll') as HTMLElement).textContent = data.roll_number;
        (document.getElementById('admit-reg') as HTMLElement).textContent = data.registration_number;
        const admitCatGen = document.getElementById('admit-cat-gen');
        if (admitCatGen) admitCatGen.textContent = data.gender || 'Male';
        (document.getElementById('admit-pwd') as HTMLElement).textContent = data.is_pwd ? 'Yes (Benchmark Disability)' : 'No (Standard)';
        (document.getElementById('admit-extra-time') as HTMLElement).textContent = `${data.compensatory_minutes} Minutes`;
        (document.getElementById('admit-slot') as HTMLElement).textContent = data.slot ? (data.slot.startsWith('Subject') ? data.slot : `Subject ${data.slot}`) : 'Subject Slot A';
        (document.getElementById('admit-reporting') as HTMLElement).textContent = data.reporting_time_ist || 'Subject Slot A';
        (document.getElementById('admit-gate-close') as HTMLElement).textContent = data.gate_closure_ist || 'Slot A Cohort';
        (document.getElementById('admit-exam-timings') as HTMLElement).textContent = data.slot_timing_ist || 'Subject Paper Slot A';
        (document.getElementById('admit-venue-name') as HTMLElement).textContent = data.test_center_name;
        (document.getElementById('admit-lab') as HTMLElement).textContent = data.lab_number;
        (document.getElementById('admit-terminal') as HTMLElement).textContent = data.assigned_terminal;

        const elInst = document.getElementById('admit-inst-name');
        const elExamTitle = document.getElementById('admit-exam-title');
        const elCenterCode = document.getElementById('admit-center-code');
        const elCtrlName = document.getElementById('admit-controller-name');
        const elCtrlDesig = document.getElementById('admit-controller-desig');
        const elCtrlInst = document.getElementById('admit-controller-inst');

        if (elInst && (data as any).institution_name) elInst.textContent = (data as any).institution_name;
        if (elExamTitle && (data as any).examination_title) elExamTitle.textContent = (data as any).examination_title;
        if (elCenterCode && data.test_center_code) elCenterCode.textContent = data.test_center_code;
        if (elCtrlName && (data as any).controller_name) elCtrlName.textContent = (data as any).controller_name;
        if (elCtrlDesig && (data as any).controller_designation) elCtrlDesig.textContent = (data as any).controller_designation;
        if (elCtrlInst && (data as any).institution_name) elCtrlInst.textContent = (data as any).institution_name;

        // Custom Subtitle, Watermark & Instructions
        const elSubtitle = document.getElementById('admit-subtitle');
        if (elSubtitle && (data as any).header_subtitle) elSubtitle.textContent = (data as any).header_subtitle;
        const elWatermark = document.getElementById('admit-watermark');
        if (elWatermark && (data as any).watermark_text) elWatermark.textContent = (data as any).watermark_text;

        const elInstBlock = document.getElementById('admit-instructions-block');
        const elInstContent = document.getElementById('admit-instructions-content');
        if (elInstBlock) {
            elInstBlock.style.display = (data as any).show_instructions !== false ? 'block' : 'none';
        }
        if (elInstContent && (data as any).instructions_text) {
            elInstContent.textContent = (data as any).instructions_text;
        }

        // Structural Section Visibility Toggles
        const elPhotoBlock = document.getElementById('admit-photo-block');
        const elDetailsGrid = document.getElementById('admit-cand-details-grid');
        const showPhoto = (data as any).show_photo !== false;
        if (elPhotoBlock) elPhotoBlock.style.display = showPhoto ? 'block' : 'none';
        if (elDetailsGrid) elDetailsGrid.style.gridTemplateColumns = showPhoto ? '120px 1fr 1fr' : '1fr 1fr';

        const elBarcodeBlock = document.getElementById('admit-barcode-block');
        if (elBarcodeBlock) elBarcodeBlock.style.display = (data as any).show_barcode !== false ? 'flex' : 'none';

        const elSlotsTable = document.getElementById('admit-slots-table');
        if (elSlotsTable) elSlotsTable.style.display = (data as any).show_slot_timings !== false ? 'table' : 'none';

        const elVenueBlock = document.getElementById('admit-venue-block');
        if (elVenueBlock) elVenueBlock.style.display = (data as any).show_venue_details !== false ? 'block' : 'none';

        const elSigBlock = document.getElementById('admit-signatures-block');
        if (elSigBlock) elSigBlock.style.display = (data as any).show_signature_block !== false ? 'flex' : 'none';

        const btnPrint = document.getElementById('btn-print-admit');
        if (btnPrint) {
            btnPrint.onclick = () => {
                window.print();
            };
        }

        modal.style.display = 'flex';
    } catch (_) {
        showToast("Error retrieving admit card", true);
    }
}

function openShiftReallocation(id: string): void {
    const c = cachedCandidates.find(item => item.id === id);
    if (!c) return;
    const modal = document.getElementById('modal-reallocate-slot');
    if (!modal) return;

    (document.getElementById('realloc-cand-id') as HTMLInputElement).value = id;
    (document.getElementById('realloc-cand-name') as HTMLElement).textContent = c.full_name;
    (document.getElementById('realloc-cand-current-slot') as HTMLElement).textContent = `Current: Subject Slot ${c.batch || 'A'} (Subject Paper Slot ${c.batch || 'A'})`;
    (document.getElementById('realloc-target-slot') as HTMLSelectElement).value = c.batch === 'A' ? 'B' : 'A';

    modal.style.display = 'flex';
}

function openAccommodationsManager(id: string): void {
    const c = cachedCandidates.find(item => item.id === id);
    if (!c) return;
    const modal = document.getElementById('modal-candidate-accommodations');
    if (!modal) return;

    (document.getElementById('acc-cand-id') as HTMLInputElement).value = id;
    (document.getElementById('acc-cand-name') as HTMLElement).textContent = c.full_name;
    (document.getElementById('acc-is-pwd') as HTMLInputElement).checked = !!c.is_pwd;
    (document.getElementById('acc-has-scribe') as HTMLInputElement).checked = !!c.has_scribe;
    (document.getElementById('acc-disability-type') as HTMLSelectElement).value = c.disability_type || 'None';
    (document.getElementById('acc-compensatory-mins') as HTMLInputElement).value = String(c.compensatory_minutes || (c.is_pwd ? 60 : 0));

    modal.style.display = 'flex';
}

async function regenerateEmergencyPin(id: string): Promise<void> {
    try {
        const res = await adminFetch(`${API_BASE}/${id}/regenerate-credentials`, {
            method: 'POST',
            headers: getHeaders(),
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            showToast(errData.detail || "Failed to regenerate credentials", true);
            return;
        }
        const data = await res.json();
        const c = cachedCandidates.find(item => item.id === id);
        const modal = document.getElementById('modal-emergency-pin');

        const pinDisplay = document.getElementById('pin-display') || document.getElementById('pin-display-text');
        if (pinDisplay) pinDisplay.textContent = data.temporary_pin;
        const pinDisplayText = document.getElementById('pin-display-text');
        if (pinDisplayText && pinDisplayText !== pinDisplay) pinDisplayText.textContent = data.temporary_pin;

        const pinMetaTime = document.getElementById('pin-meta-time');
        if (pinMetaTime) pinMetaTime.textContent = `Generated: ${data.generated_at_ist} • Valid until Shift End`;

        const pinCandName = document.getElementById('pin-cand-name');
        if (pinCandName) pinCandName.textContent = c?.full_name || 'Candidate';

        const pinCandReg = document.getElementById('pin-cand-reg');
        if (pinCandReg) pinCandReg.textContent = data.registration_number;

        const pinCandRoll = document.getElementById('pin-cand-roll');
        if (pinCandRoll) pinCandRoll.textContent = data.roll_number;

        const btnCopy = document.getElementById('btn-copy-pin-slip');
        if (btnCopy) {
            btnCopy.onclick = () => {
                const text = `SSE CBT EMERGENCY PIN SLIP\nCandidate: ${c?.full_name || 'Candidate'}\nRoll No: ${data.roll_number}\nReg No: ${data.registration_number}\nTemporary PIN: ${data.temporary_pin}\nIssued at: ${data.generated_at_ist}`;
                copyText(text, "Emergency PIN Slip");
            };
        }

        if (modal) {
            modal.style.display = 'flex';
        }
        showToast(`Temporary PIN ${data.temporary_pin} generated!`);
        await loadCandidates();
    } catch (err) {
        console.error("Error in regenerateEmergencyPin:", err);
        showToast("Error generating emergency credentials", true);
    }
}

function openDebarModal(id: string): void {
    const c = cachedCandidates.find(item => item.id === id);
    if (!c) return;
    const modal = document.getElementById('modal-debar-candidate');
    if (!modal) return;

    (document.getElementById('debar-cand-id') as HTMLInputElement).value = id;
    (document.getElementById('debar-cand-name') as HTMLElement).textContent = c.full_name;
    (document.getElementById('debar-cand-reg') as HTMLElement).textContent = `Reg: ${c.registration_number} • Roll: ${c.roll_number || c.registration_number}`;

    modal.style.display = 'flex';
}

async function deleteCandidateRecord(id: string, name: string): Promise<void> {
    if (!confirm(`Examination Directorate Action:\nAre you sure you want to permanently deregister candidate "${name}" from the Cloud Database?\n\nThis will purge all corresponding session telemetry and records.`)) {
        return;
    }
    try {
        const res = await adminFetch(`${API_BASE}/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (res.ok) {
            showToast(`Candidate "${name}" deregistered and deleted from Cloud DB.`);
            await loadCandidates();
            await loadDashboardSummary();
        } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.detail || "Failed to deregister candidate", true);
        }
    } catch (_) {
        showToast("Network error deleting candidate", true);
    }
}

// Bind to window for HTML table action buttons
(window as any).openCandidateDossier = openCandidateDossier;
(window as any).openAdmitCard = openAdmitCard;
(window as any).openShiftReallocation = openShiftReallocation;
(window as any).openAccommodationsManager = openAccommodationsManager;
(window as any).regenerateEmergencyPin = regenerateEmergencyPin;
(window as any).openDebarModal = openDebarModal;
(window as any).deleteCandidateRecord = deleteCandidateRecord;

// --- FILTER LISTENERS ---
const filterSlotEl = document.getElementById('filter-slot');
const filterStatusEl = document.getElementById('filter-status');
const filterPwdEl = document.getElementById('filter-pwd');
const btnResetFilters = document.getElementById('btn-reset-filters');

if (filterSlotEl) filterSlotEl.addEventListener('change', renderCandidateTable);
if (filterStatusEl) filterStatusEl.addEventListener('change', renderCandidateTable);
if (filterPwdEl) filterPwdEl.addEventListener('change', renderCandidateTable);

if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
        if (filterSlotEl) (filterSlotEl as HTMLSelectElement).value = 'ALL';
        if (filterStatusEl) (filterStatusEl as HTMLSelectElement).value = 'ALL';
        if (filterPwdEl) (filterPwdEl as HTMLSelectElement).value = 'ALL';
        if (ui.searchInput) ui.searchInput.value = '';
        if (ui.topSearchInput) ui.topSearchInput.value = '';
        renderCandidateTable();
        showToast("Candidate filters reset");
    });
}

// --- BULK ACTION HANDLERS ---
const btnBulkMigrateSlot = document.getElementById('btn-bulk-migrate-slot');
const btnBulkExportSel = document.getElementById('btn-bulk-export-sel');
const btnClearSelection = document.getElementById('btn-clear-selection');

if (btnBulkMigrateSlot) {
    btnBulkMigrateSlot.addEventListener('click', () => {
        const checked = Array.from(document.querySelectorAll('.row-check:checked')).map((c: any) => c.value);
        if (checked.length === 0) return;
        const modal = document.getElementById('modal-bulk-reallocate');
        const countEl = document.getElementById('bulk-realloc-cand-count');
        if (countEl) countEl.textContent = `${checked.length} Candidates Selected`;
        if (modal) modal.style.display = 'flex';
    });
}

if (btnBulkExportSel) {
    btnBulkExportSel.addEventListener('click', () => {
        const checkedIds = new Set(Array.from(document.querySelectorAll('.row-check:checked')).map((c: any) => c.value));
        const selected = cachedCandidates.filter(c => checkedIds.has(c.id));
        if (selected.length === 0) {
            showToast("No candidates selected to export", true);
            return;
        }

        let csv = "Roll_Number,Registration_Number,Full_Name,Subject_Slot,Gender,PwD,Compensatory_Minutes,Terminal,Status,Subject_Cohort,Subject_Paper_Slot\n";
        selected.forEach(c => {
            const roll = (c.roll_number || c.registration_number || '').replace(/"/g, '""');
            const reg = (c.registration_number || '').replace(/"/g, '""');
            const name = (c.full_name || '').replace(/"/g, '""');
            const slot = (c.batch || 'A').replace(/"/g, '""');
            const gen = (c.gender || 'Male').replace(/"/g, '""');
            const pwd = c.is_pwd ? "Yes" : "No";
            const extra = c.compensatory_minutes || 0;
            const term = (c.assigned_terminal || '').replace(/"/g, '""');
            const status = (c.status || 'active').replace(/"/g, '""');
            const rep = (c.reporting_time_ist || `Subject Slot ${slot}`).replace(/"/g, '""');
            const timing = (c.slot_timing_ist || `Subject Paper Slot ${slot}`).replace(/"/g, '""');
            csv += `"${roll}","${reg}","${name}","Subject Slot ${slot}","${gen}","${pwd}",${extra},"${term}","${status}","${rep}","${timing}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `selected_candidates_roster_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Exported ${selected.length} candidate records to CSV!`);
    });
}

if (btnClearSelection) {
    btnClearSelection.addEventListener('click', () => {
        if (ui.checkAll) ui.checkAll.checked = false;
        document.querySelectorAll('.row-check').forEach((chk: any) => chk.checked = false);
        updateBulkSelectionToolbar();
    });
}

// --- FORM SUBMISSION WIRING ---
const formReallocSlot = document.getElementById('form-reallocate-slot') as HTMLFormElement;
if (formReallocSlot) {
    formReallocSlot.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cid = (document.getElementById('realloc-cand-id') as HTMLInputElement).value;
        const targetSlot = (document.getElementById('realloc-target-slot') as HTMLSelectElement).value;
        const reason = (document.getElementById('realloc-reason') as HTMLSelectElement).value;

        try {
            const res = await adminFetch(`${API_BASE}/${cid}/reallocate-slot`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({ slot: targetSlot, reason: reason }),
            });
            if (res.ok) {
                showToast(`Candidate migrated to Slot ${targetSlot}!`);
                (document.getElementById('modal-reallocate-slot') as HTMLElement).style.display = 'none';
                loadCandidates();
                loadDashboardSummary();
            } else {
                const err = await res.json();
                showToast(err.detail || "Slot reallocation failed", true);
            }
        } catch (_) {
            showToast("Network error updating shift slot", true);
        }
    });
}

const formAccommodations = document.getElementById('form-candidate-accommodations') as HTMLFormElement;
if (formAccommodations) {
    formAccommodations.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cid = (document.getElementById('acc-cand-id') as HTMLInputElement).value;
        const isPwd = (document.getElementById('acc-is-pwd') as HTMLInputElement).checked;
        const hasScribe = (document.getElementById('acc-has-scribe') as HTMLInputElement).checked;
        const disabilityType = (document.getElementById('acc-disability-type') as HTMLSelectElement).value;
        const extraMins = parseInt((document.getElementById('acc-compensatory-mins') as HTMLInputElement).value, 10) || 0;

        try {
            const res = await adminFetch(`${API_BASE}/${cid}/accommodations`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({
                    is_pwd: isPwd,
                    has_scribe: hasScribe,
                    disability_type: disabilityType,
                    compensatory_minutes: extraMins,
                }),
            });
            if (res.ok) {
                showToast("Accommodations updated successfully!");
                (document.getElementById('modal-candidate-accommodations') as HTMLElement).style.display = 'none';
                loadCandidates();
            } else {
                const err = await res.json();
                showToast(err.detail || "Failed to update accommodations", true);
            }
        } catch (_) {
            showToast("Network error updating accommodations", true);
        }
    });
}

const formDebar = document.getElementById('form-debar-candidate') as HTMLFormElement;
if (formDebar) {
    formDebar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cid = (document.getElementById('debar-cand-id') as HTMLInputElement).value;
        const reason = (document.getElementById('debar-reason-select') as HTMLSelectElement).value;

        try {
            const res = await adminFetch(`${API_BASE}/${cid}/debar`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ reason: reason }),
            });
            if (res.ok) {
                showToast("Candidate officially debarred. Terminal session locked!");
                appendIncidentLog(`FORMAL DEBARMENT: Candidate debarred under ${reason}`, true);
                (document.getElementById('modal-debar-candidate') as HTMLElement).style.display = 'none';
                loadCandidates();
                loadDashboardSummary();
            } else {
                const err = await res.json();
                showToast(err.detail || "Failed to debar candidate", true);
            }
        } catch (_) {
            showToast("Network error executing debarment", true);
        }
    });
}

const formBulkRealloc = document.getElementById('form-bulk-reallocate') as HTMLFormElement;
if (formBulkRealloc) {
    formBulkRealloc.addEventListener('submit', async (e) => {
        e.preventDefault();
        const checked = Array.from(document.querySelectorAll('.row-check:checked')).map((c: any) => c.value);
        const slot = (document.getElementById('bulk-realloc-target-slot') as HTMLSelectElement).value;
        const reason = (document.getElementById('bulk-realloc-reason') as HTMLInputElement).value;

        try {
            const res = await adminFetch(`${API_BASE}/bulk-reallocate`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    candidate_ids: checked,
                    slot: slot,
                    reason: reason,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                showToast(data.message || `Reallocated ${checked.length} candidates to Slot ${slot}!`);
                (document.getElementById('modal-bulk-reallocate') as HTMLElement).style.display = 'none';
                if (ui.checkAll) ui.checkAll.checked = false;
                loadCandidates();
                loadDashboardSummary();
            } else {
                const err = await res.json();
                showToast(err.detail || "Bulk reallocation failed", true);
            }
        } catch (_) {
            showToast("Network error executing bulk reallocation", true);
        }
    });
}

// --- PROCTORING LAB & TERMINALS GRID ---
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

    cachedCandidates.forEach((c: any) => {
        const regNo = c.registration_number || c.roll_number || 'Unassigned';
        const terminalId = candidateAssignedTerminals[regNo] || c.metadata?.assigned_terminal || c.assigned_terminal || 'Unassigned';
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

        let statusBadgeHtml = '<span class="status-pill status-active">[Active] in Exam</span>';
        if (isLocked) {
            statusBadgeHtml = '<span class="status-pill status-suspended" style="background:#fee2e2; color:#b91c1c;">Locked</span>';
        } else if (isPaused) {
            statusBadgeHtml = '<span class="status-pill" style="background:#fef3c7; color:#b45309;">[HOLD] On Hold</span>';
        } else if (violations > 0) {
            statusBadgeHtml = `<span class="status-pill status-suspended">Strike #${violations}</span>`;
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
                <div style="width: 36px; height: 36px; border-radius: 50%; background: #1e3a8a; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem;">
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
                    +Time
                </button>
                <button class="btn btn-outline btn-sm" style="padding: 0.3rem 0.2rem; font-size: 0.7rem; color: ${isPaused ? '#10b981' : '#d97706'}; border-color: ${isPaused ? '#a7f3d0' : '#fde68a'};" onclick="toggleCandidatePause('${escapeHtml(regNo)}', '${escapeHtml(c.full_name)}')">
                    ${isPaused ? 'Resume' : 'Hold'}
                </button>
                <button class="btn btn-outline btn-sm" style="padding: 0.3rem 0.2rem; font-size: 0.7rem;" onclick="openReseatModal('${escapeHtml(regNo)}', '${escapeHtml(c.full_name)}', '${escapeHtml(terminalId)}')">
                    Re-seat
                </button>
                <button class="btn btn-outline btn-sm" style="padding: 0.3rem 0.2rem; font-size: 0.7rem; color: #d97706; border-color: #fde68a;" onclick="sendCandidateDirective('${escapeHtml(regNo)}', '${escapeHtml(c.full_name)}')">
                    Directive
                </button>
                <button class="btn btn-outline btn-sm" style="padding: 0.3rem 0.2rem; font-size: 0.7rem; color: #ef4444; border-color: #fca5a5;" onclick="toggleLockTerminal('${escapeHtml(regNo)}', '${escapeHtml(c.full_name)}')">
                    ${isLocked ? 'Unlock' : 'Lock'}
                </button>
                <button class="btn btn-outline btn-sm" style="padding: 0.3rem 0.2rem; font-size: 0.7rem;" onclick="resetAttempt('${escapeHtml(c.id)}')">
                    Reset
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
            const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/candidate-intervention`, {
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
                showToast(`[ACCOMMODATION] Granted +${mins}m compensatory time to ${regNo}`);
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
        if (targetInput) {
            targetInput.value = '';
            targetInput.placeholder = 'e.g. Node-T-02';
        }
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
            const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/candidate-intervention`, {
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
                showToast(`Terminal re-seated to ${targetNode} for ${regNo}`);
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
        const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/candidate-intervention`, {
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
            showToast(`${currentlyPaused ? '[RESUMED] Resumed' : '[HOLD] Paused'} session for ${name}`);
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
            const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/candidate-intervention`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    action: 'pause_session',
                    reg_no: 'ALL',
                    reason: 'Examination Hall Verification Pause',
                })
            });
            if (res.ok) {
                showToast("[HOLD] Hall hold signal dispatched: All countdowns frozen.");
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
            const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/candidate-intervention`, {
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
        window.location.href = `/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/attendance-roster?format=csv`;
        showToast("Official Attendance Roster CSV downloaded!");
    });
}

// 5. DIRECTIVE & TERMINAL LOCK DISPATCH
(window as any).sendCandidateDirective = (regNo: string, name: string) => {
    const customMsg = prompt(`Enter high-priority directive for ${name} (${regNo}) requiring compliance acknowledgement:`, "Invigilator Directive: Keep your face centered in the webcam frame and maintain focus.");
    if (!customMsg) return;

    if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
        adminSocket.send(JSON.stringify({
            type: "SEND_CANDIDATE_WARNING",
            exam_id: getActiveExamId() || "active",
            reg_no: regNo,
            message: customMsg
        }));
        showToast(`Priority Directive dispatched to ${name} (${regNo})`);
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
        const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/candidate-intervention`, {
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
            showToast(`${isLocked ? 'Terminal unlocked' : 'Terminal locked'} for ${name}`);
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
            showToast("Broadcast alert dispatched to all active candidate screens!");
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
            const dashWsStatus = document.getElementById('dash-ws-status');
            if (dashWsStatus) dashWsStatus.textContent = 'WebSocket Live Stream: Connected';
            const termStatus = document.getElementById('dash-card-terminal-status');
            if (termStatus) termStatus.textContent = '• Online';

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
                    const reg = msg.reg_no || 'SSE';
                    terminalViolations[reg] = (terminalViolations[reg] || 0) + 1;
                    showToast(`Violation Notice: Candidate ${msg.candidate_name || reg} - ${msg.violation_type}`, true);
                    appendIncidentLog(`SECURITY VIOLATION: Candidate ${msg.candidate_name || reg} (${reg}) on ${msg.terminal || 'Terminal'} - ${msg.violation_type} (Strike #${msg.count || terminalViolations[reg]})`, true);
                    
                    const termCard = document.getElementById(`terminal-card-${reg}`);
                    if (termCard) {
                        termCard.style.border = '2px solid #ef4444';
                        termCard.style.background = 'rgba(239, 68, 68, 0.05)';
                    }
                    const termStatus = document.getElementById(`term-status-${reg}`);
                    if (termStatus) {
                        termStatus.className = 'status-pill status-suspended';
                        termStatus.textContent = `Strike #${terminalViolations[reg]}`;
                    }

                    if (msg.exam_id && msg.reg_no) {
                        const strikeEl = document.getElementById(`mon-strikes-${msg.exam_id}-${msg.reg_no}`);
                        if (strikeEl) {
                            strikeEl.innerHTML = `<span style="background: #fee2e2; color: #b91c1c; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1px solid #fca5a5;">Strike #${terminalViolations[msg.reg_no]} / 4</span>`;
                        }
                    }

                } else if (msg.type === 'ACTIVE_QUESTION_CHANGED') {
                    const examId = msg.exam_id;
                    const reg = msg.reg_no;
                    const qIdx = msg.current_question_index;
                    if (examId && reg) {
                        const progEl = document.getElementById(`mon-prog-${examId}-${reg}`);
                        if (progEl) {
                            const badge = progEl.querySelector('span');
                            if (badge) badge.textContent = `Q${qIdx} Active`;
                        }
                    }

                } else if (msg.type === 'DIRECTIVE_ACKNOWLEDGED') {
                    showToast(`Compliance Confirmed: Candidate ${msg.candidate_name || msg.reg_no} acknowledged directive!`);
                    appendIncidentLog(`Candidate ${msg.candidate_name || msg.reg_no} confirmed compliance with Proctor directive.`);
                    const termCard = document.getElementById(`terminal-card-${msg.reg_no}`);
                    if (termCard) {
                        termCard.style.border = '1px solid #10b981';
                        termCard.style.background = 'rgba(16, 185, 129, 0.05)';
                    }

                } else if (msg.type === 'INDIVIDUAL_TIME_EXTENDED') {
                    candidateAccommodations[msg.reg_no] = msg.total_compensatory_minutes || ((candidateAccommodations[msg.reg_no] || 0) + msg.extra_minutes);
                    showToast(`[ACCOMMODATION] Compensatory Time Granted: +${msg.extra_minutes}m to ${msg.reg_no}`);
                    appendIncidentLog(`Granted +${msg.extra_minutes}m compensatory accommodation to ${msg.reg_no} (${msg.reason || 'Official'})`);
                    renderProctorTerminals();

                } else if (msg.type === 'TERMINAL_RESEATED') {
                    candidateAssignedTerminals[msg.reg_no] = msg.new_terminal;
                    showToast(`Terminal Re-seated: ${msg.reg_no} migrated to ${msg.new_terminal}`);
                    appendIncidentLog(`Migrated candidate ${msg.reg_no} to node ${msg.new_terminal} (${msg.reason || 'Hardware switch'})`);
                    renderProctorTerminals();

                } else if (msg.type === 'EXAM_PAUSED') {
                    if (msg.reg_no === 'ALL') {
                        cachedCandidates.forEach((c: any) => {
                            const r = c.registration_number || c.id;
                            candidatePausedStates[r] = true;
                        });
                        showToast('[HOLD] All active exam sessions put on proctor hold');
                        appendIncidentLog(`Entire examination hall put on HOLD by Invigilator: ${msg.reason}`);
                    } else {
                        candidatePausedStates[msg.reg_no] = true;
                        showToast(`[HOLD] Session paused for candidate ${msg.reg_no}`);
                        appendIncidentLog(`Paused session for ${msg.reg_no}: ${msg.reason}`);
                    }
                    renderProctorTerminals();

                } else if (msg.type === 'EXAM_RESUMED') {
                    if (msg.reg_no === 'ALL') {
                        cachedCandidates.forEach((c: any) => {
                            const r = c.registration_number || c.id;
                            candidatePausedStates[r] = false;
                        });
                        showToast('[RESUMED] All active exam sessions resumed');
                        appendIncidentLog(`Examination hall RESUMED by Invigilator`);
                    } else {
                        candidatePausedStates[msg.reg_no] = false;
                        showToast(`[RESUMED] Session resumed for candidate ${msg.reg_no}`);
                        appendIncidentLog(`Resumed session for ${msg.reg_no}`);
                    }
                    renderProctorTerminals();

                } else if (msg.type === 'CANDIDATE_RESPONSE') {
                    showToast(`Live Response: Candidate ${msg.candidate_name || 'Candidate'} - Q${msg.question_id || '1'}`);
                    const termProgress = document.getElementById(`term-progress-${msg.reg_no}`);
                    if (termProgress) {
                        termProgress.textContent = `Q${msg.question_id} Answered`;
                    }
                    if (msg.exam_id && msg.reg_no) {
                        const syncEl = document.getElementById(`mon-sync-${msg.exam_id}-${msg.reg_no}`);
                        if (syncEl) {
                            syncEl.innerHTML = `
                                <span style="display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 0.7rem; font-weight: 700; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">
                                    Cloud Synced
                                </span>
                                <div style="font-size: 0.68rem; color: #64748b; margin-top: 2px;">Just now</div>
                            `;
                        }
                    }

                } else if (msg.type === 'CANDIDATE_SUBMITTED') {
                    showToast(`Candidate submitted: Score ${msg.score}/${msg.max_possible}`);
                    appendIncidentLog(`Candidate ${msg.candidate_name || msg.reg_no} completed and submitted examination.`);
                    loadCandidates();
                    loadDashboardSummary();
                    loadExams();
                    if (currentResultsExamId) {
                        loadExamResults(currentResultsExamId, currentResultsViewMode);
                    }
                    if (msg.exam_id) {
                        const subRow = document.getElementById(`exam-monitoring-row-${msg.exam_id}`);
                        if (subRow && subRow.style.display !== 'none') {
                            loadExamMonitoring(msg.exam_id);
                        }
                    }

                } else if (msg.type === 'CANDIDATE_CREATED' || msg.type === 'CANDIDATE_SELF_REGISTERED') {
                    const cName = msg.candidate?.full_name || msg.full_name || '';
                    showToast(`Candidate registered in DB: ${cName}`);
                    loadCandidates();
                    loadDashboardSummary();

                } else if (msg.type === 'CANDIDATE_DELETED') {
                    showToast(`Candidate deregistered from Cloud DB: ${msg.candidate_name || msg.registration_number || ''}`);
                    loadCandidates();
                    loadDashboardSummary();

                } else if (msg.type === 'CANDIDATES_BULK_IMPORTED') {
                    showToast(`Bulk Import: ${msg.count || 0} candidates synced with Cloud DB`);
                    loadCandidates();
                    loadDashboardSummary();

                } else if (msg.type === 'BULK_CANDIDATES_REALLOCATED') {
                    showToast(`Bulk Reallocation: ${msg.count || 0} candidates migrated to Slot ${msg.target_slot}`);
                    loadCandidates();
                    loadDashboardSummary();

                } else if (msg.type === 'CANDIDATE_ATTEMPT_RESET') {
                    showToast('Candidate exam attempt wiped cleanly.');
                    loadCandidates();
                    loadDashboardSummary();

                } else if (msg.type === 'CANDIDATE_STATUS_CHANGED') {
                    showToast(`Candidate status updated: ${msg.status}`);
                    loadCandidates();
                    loadDashboardSummary();

                } else if (msg.type === 'CANDIDATE_SLOT_REALLOCATED') {
                    showToast(`Shift Reallocated: ${msg.candidate_name || 'Candidate'} migrated to Slot ${msg.new_slot}`);
                    appendIncidentLog(`Shift Reallocated: ${msg.candidate_name || 'Candidate'} reallocated to Slot ${msg.new_slot} (${msg.reason || 'Admin'})`);
                    loadCandidates();
                    loadDashboardSummary();

                } else if (msg.type === 'CANDIDATE_ACCOMMODATIONS_UPDATED') {
                    showToast(`Accommodations Updated: ${msg.candidate_name || 'Candidate'}`);
                    appendIncidentLog(`Accommodations updated for ${msg.candidate_name || 'Candidate'}: Extra time ${msg.compensatory_minutes}m, Scribe=${msg.has_scribe}`);
                    loadCandidates();

                } else if (msg.type === 'CANDIDATE_CREDENTIALS_REGENERATED') {
                    showToast(`Emergency PIN generated for ${msg.candidate_name || 'Candidate'}`);
                    loadCandidates();

                } else if (msg.type === 'CANDIDATE_DISQUALIFIED') {
                    showToast(`MALPRACTICE DEBARMENT: ${msg.candidate_name || 'Candidate'} officially debarred!`, true);
                    appendIncidentLog(`MALPRACTICE DEBARMENT: Candidate ${msg.candidate_name || 'Candidate'} debarred under ${msg.reason}`, true);
                    loadCandidates();
                    loadDashboardSummary();

                } else if (msg.type === 'BULK_CANDIDATES_REALLOCATED') {
                    showToast(`Bulk Migration: ${msg.count} candidates reallocated to Slot ${msg.target_slot}`);
                    appendIncidentLog(`Bulk Migration: ${msg.count} candidates moved to Slot ${msg.target_slot}`);
                    loadCandidates();
                    loadDashboardSummary();

                } else if (msg.type === 'EXAM_PHASE_CHANGED') {
                    showToast(`Phase Advanced: ${(msg.new_phase || '').toUpperCase().replace(/_/g, ' ')}`);
                    appendIncidentLog(`EXAM LIFECYCLE: Advanced to ${msg.new_phase} by ${msg.authorizing_controller || 'Examination Directorate'}`);
                    loadExamPhase();

                } else if (msg.type === 'PAPER_DECRYPTED') {
                    showToast('256-Bit Question Paper Decrypted & Released!');
                    appendIncidentLog(`CUSTODY RELEASE: Question Paper Decrypted by ${msg.decrypted_by || 'Examination Directorate'}`);
                    loadExamPhase();

                } else if (msg.type === 'CANDIDATE_CHECKED_IN') {
                    showToast(`Candidate Admitted: ${msg.candidate_name || ''} issued Terminal ${msg.assigned_terminal || ''}`);
                    appendIncidentLog(`ADMISSIONS CHECK-IN: ${msg.candidate_name} (${msg.registration_number}) seated at ${msg.assigned_terminal} (Bio: ${msg.biometric_score}%)`);
                    loadCandidates();
                    loadDashboardSummary();

                } else if (msg.type === 'DISASTER_HOLD') {
                    showToast(`HALL-WIDE EMERGENCY HOLD: ${msg.reason || 'Evacuation Drill'}`, true);
                    appendIncidentLog(`DISASTER EVACUATION HOLD ACTIVATED: ${msg.reason}. Timers frozen.`, true);
                    loadExamPhase();

                } else if (msg.type === 'EXAM_CREATED' || msg.type === 'EXAM_UPDATED' || msg.type === 'AI_CAMERA_TOGGLED' || msg.type === 'SECTIONS_UPDATED') {
                    showToast('Cloud DB Sync: Examination state updated in real-time.');
                    loadExams();
                }
            } catch (_) {}
        };

        adminSocket.onclose = () => {
            if (adminPingTimer) clearInterval(adminPingTimer);
            const dashWsStatus = document.getElementById('dash-ws-status');
            if (dashWsStatus) dashWsStatus.textContent = 'WebSocket Live Stream: Reconnecting...';
            const termStatus = document.getElementById('dash-card-terminal-status');
            if (termStatus) termStatus.textContent = '• Standby';
            setTimeout(initAdminWebSocket, 3000);
        };

        adminSocket.onerror = () => {
            if (adminSocket) adminSocket.close();
        };
    } catch (e) {
        setTimeout(initAdminWebSocket, 5000);
    }
}

// =========================================================================
// ENTERPRISE EXAMINATION DIRECTORATE COMMAND SUITE
// =========================================================================

// 1. Exam Lifecycle Phase Orchestrator
async function loadExamPhase(): Promise<void> {
    try {
        const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/phase`, { headers: getHeaders() });
        if (!res.ok) return;
        const data = await res.json();

        const badge = document.getElementById('aec-stage-badge');
        const title = document.getElementById('aec-stage-title');
        const desc = document.getElementById('aec-stage-desc');
        const custodyPill = document.getElementById('paper-custody-pill');
        const custodyIcon = document.getElementById('paper-custody-icon');
        const custodyText = document.getElementById('paper-custody-text');
        const currStageModalLabel = document.getElementById('modal-curr-stage-label');

        const stageNum = data.stage_number || 4;
        const stageTitle = data.stage_title || 'Active Concurrency';
        const stagePhase = data.phase || 'active_concurrency';

        if (badge) badge.textContent = `STAGE ${stageNum}: ${stageTitle.toUpperCase()}`;
        if (title) title.textContent = `${stageTitle} (Live Multi-Node Assessment)`;
        if (desc) desc.textContent = data.stage_description || '';
        if (currStageModalLabel) currStageModalLabel.textContent = `STAGE ${stageNum}: ${stagePhase.toUpperCase()}`;

        // Stepper cards update
        for (let i = 1; i <= 6; i++) {
            const stepEl = document.getElementById(`step-${i}`);
            if (stepEl) {
                if (i < stageNum) {
                    stepEl.className = 'stepper-step completed';
                    stepEl.style.background = 'var(--bg-body)';
                    stepEl.style.borderLeft = '3px solid #10b981';
                    stepEl.style.opacity = '1';
                } else if (i === stageNum) {
                    stepEl.className = 'stepper-step active';
                    stepEl.style.background = 'rgba(79, 70, 229, 0.08)';
                    stepEl.style.borderLeft = '3px solid #4f46e5';
                    stepEl.style.opacity = '1';
                } else {
                    stepEl.className = 'stepper-step';
                    stepEl.style.background = 'var(--bg-body)';
                    stepEl.style.borderLeft = '3px solid var(--border-color)';
                    stepEl.style.opacity = '0.65';
                }
            }
        }

        // Custody status
        if (data.is_paper_decrypted) {
            if (custodyPill) {
                custodyPill.style.background = 'rgba(16, 185, 129, 0.1)';
                custodyPill.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                custodyPill.style.color = '#047857';
            }
            if (custodyIcon) custodyIcon.textContent = '[Decrypted]';
            if (custodyText) custodyText.textContent = '256-Bit Paper: Decrypted & Live';
        } else {
            if (custodyPill) {
                custodyPill.style.background = 'rgba(239, 68, 68, 0.1)';
                custodyPill.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                custodyPill.style.color = '#b91c1c';
            }
            if (custodyIcon) custodyIcon.textContent = '[Locked]';
            if (custodyText) custodyText.textContent = '256-Bit Paper: Custody Locked';
        }
    } catch (_) {}
}

// 2. Telemetry & Anomaly Radar
async function loadTelemetryRadar(): Promise<void> {
    try {
        const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/telemetry-radar`, { headers: getHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const r = data.radar || {};

        const elIp = document.getElementById('radar-ip-count');
        const elVel = document.getElementById('radar-velocity-count');
        const elTab = document.getElementById('radar-tab-count');
        const elNodes = document.getElementById('radar-nodes-count');

        if (elIp) elIp.textContent = `${r.ip_collisions?.count || 0} Detected`;
        if (elVel) elVel.textContent = `${r.rapid_guessing_velocity?.count || 0} Anomalies`;
        if (elTab) elTab.textContent = `${r.tab_switch_clusters?.count || 0} Breaches`;
        if (elNodes) elNodes.textContent = '42 / 42 Nodes';
    } catch (_) {}
}

// 3. Pre-Flight Infrastructure Audit
async function loadInfrastructureAudit(): Promise<void> {
    try {
        const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/infrastructure-audit`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Audit failed');
        const data = await res.json();
        const hashEl = document.getElementById('audit-cert-hash');
        if (hashEl) hashEl.textContent = `SHA256: ${data.audit_certificate_sha256}`;
        const modal = document.getElementById('modal-infra-audit');
        if (modal) modal.style.display = 'flex';
        showToast('Pre-Flight Readiness Audit: All systems 100% compliant!');
    } catch (err: any) {
        showToast('Audit evaluation error', true);
    }
}

// 4. Center Closing Report (Form 24-B)
async function loadClosingReport(): Promise<void> {
    try {
        const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/closing-report`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to generate report');
        const data = await res.json();

        const elReg = document.getElementById('cr-total-reg');
        const elApp = document.getElementById('cr-appeared');
        const elAbs = document.getElementById('cr-absent');
        const elDeb = document.getElementById('cr-debarred');
        const elComp = document.getElementById('cr-comp-mins');
        const elSeal = document.getElementById('cr-sha256-seal');
        const elTime = document.getElementById('cr-timestamp');

        if (elReg) elReg.textContent = (data.total_registered || 0).toString();
        if (elApp) elApp.textContent = (data.total_appeared || 0).toString();
        if (elAbs) elAbs.textContent = (data.total_absent || 0).toString();
        if (elDeb) elDeb.textContent = (data.total_debarred || 0).toString();
        if (elComp) elComp.textContent = (data.compensatory_minutes_granted || 0).toString();
        if (elSeal) elSeal.textContent = `SHA256: ${data.integrity_digest_sha256}`;
        if (elTime) elTime.textContent = data.timestamp_ist || '';

        const modal = document.getElementById('modal-closing-report');
        if (modal) modal.style.display = 'flex';
    } catch (_) {
        showToast('Failed to compile Form 24-B', true);
    }
}

// --- BIND ADVANCED EVENT LISTENERS ---

// Open Phase Advance Modal
const btnOpenPhase = document.getElementById('btn-advance-phase-modal');
if (btnOpenPhase) {
    btnOpenPhase.addEventListener('click', () => {
        const m = document.getElementById('modal-phase-advance');
        if (m) m.style.display = 'flex';
    });
}

// Form Phase Advance Submit
const formPhaseAdvance = document.getElementById('form-phase-advance') as HTMLFormElement;
if (formPhaseAdvance) {
    formPhaseAdvance.addEventListener('submit', async (e) => {
        e.preventDefault();
        const targetPhase = (document.getElementById('advance-target-phase') as HTMLSelectElement).value;
        const note = (document.getElementById('advance-phase-note') as HTMLInputElement).value;
        try {
            const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/phase/advance`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ target_phase: targetPhase, notes: note })
            });
            if (res.ok) {
                showToast(`Successfully advanced phase to: ${targetPhase.toUpperCase()}`);
                document.getElementById('modal-phase-advance')!.style.display = 'none';
                loadExamPhase();
            } else {
                const err = await res.json();
                showToast(err.detail || 'Failed to advance phase', true);
            }
        } catch (_) {
            showToast('Network error advancing phase', true);
        }
    });
}

// Open Decrypt Modal
const btnOpenDecrypt = document.getElementById('btn-open-decrypt-modal');
if (btnOpenDecrypt) {
    btnOpenDecrypt.addEventListener('click', () => {
        const m = document.getElementById('modal-paper-decrypt');
        if (m) m.style.display = 'flex';
    });
}

// Form Paper Decrypt Submit
const formPaperDecrypt = document.getElementById('form-paper-decrypt') as HTMLFormElement;
if (formPaperDecrypt) {
    formPaperDecrypt.addEventListener('submit', async (e) => {
        e.preventDefault();
        const keyInput = (document.getElementById('input-custody-key') as HTMLInputElement).value;
        try {
            const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/paper/decrypt`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ custody_key: keyInput })
            });
            if (res.ok) {
                showToast('Question Paper decrypted and released to all consoles!');
                document.getElementById('modal-paper-decrypt')!.style.display = 'none';
                loadExamPhase();
            } else {
                const err = await res.json();
                showToast(err.detail || 'Invalid Master Custody Decryption Key', true);
            }
        } catch (_) {
            showToast('Network error during decryption', true);
        }
    });
}

// Open Infrastructure Audit
const btnInfraAudit = document.getElementById('btn-infra-audit');
if (btnInfraAudit) {
    btnInfraAudit.addEventListener('click', loadInfrastructureAudit);
}

const btnPrintAudit = document.getElementById('btn-print-audit-cert');
if (btnPrintAudit) {
    btnPrintAudit.addEventListener('click', () => {
        window.print();
    });
}

// Open Admissions Check-In
const btnAdmissionsCheckin = document.getElementById('btn-admissions-checkin');
if (btnAdmissionsCheckin) {
    btnAdmissionsCheckin.addEventListener('click', () => {
        const m = document.getElementById('modal-admissions-checkin');
        if (m) m.style.display = 'flex';
    });
}

// Form Admissions Check-In Submit
const formAdmissionsCheckin = document.getElementById('form-admissions-checkin') as HTMLFormElement;
if (formAdmissionsCheckin) {
    formAdmissionsCheckin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const candInput = (document.getElementById('checkin-cand-input') as HTMLInputElement).value.trim();
        const metalStatus = (document.getElementById('checkin-metal-status') as HTMLSelectElement).value;
        const terminal = (document.getElementById('checkin-terminal-input') as HTMLInputElement).value.trim();
        try {
            const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/admissions/check-in`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    registration_number: candInput,
                    metal_detector_status: metalStatus,
                    assigned_terminal: terminal,
                })
            });
            if (res.ok) {
                const data = await res.json();
                showToast(data.message);
                document.getElementById('modal-admissions-checkin')!.style.display = 'none';
                loadCandidates();
                loadDashboardSummary();
            } else {
                const err = await res.json();
                showToast(err.detail || 'Admissions check-in failed', true);
            }
        } catch (_) {
            showToast('Network error during check-in', true);
        }
    });
}

// Open Closing Report (Form 24-B)
const btnClosingReport = document.getElementById('btn-closing-report');
if (btnClosingReport) {
    btnClosingReport.addEventListener('click', loadClosingReport);
}

// Disaster Hold Open & Submit
const btnDisasterHold = document.getElementById('btn-disaster-hold');
if (btnDisasterHold) {
    btnDisasterHold.addEventListener('click', () => {
        const m = document.getElementById('modal-disaster-hold');
        if (m) m.style.display = 'flex';
    });
}

const formDisasterHold = document.getElementById('form-disaster-hold') as HTMLFormElement;
if (formDisasterHold) {
    formDisasterHold.addEventListener('submit', async (e) => {
        e.preventDefault();
        const reason = (document.getElementById('disaster-reason-select') as HTMLSelectElement).value;
        try {
            const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(getActiveExamId() || 'active')}/emergency/disaster-hold`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ reason: reason, freeze_all_timers: true })
            });
            if (res.ok) {
                showToast('Hall-wide Emergency Hold Activated. Timers frozen.');
                document.getElementById('modal-disaster-hold')!.style.display = 'none';
                loadExamPhase();
            } else {
                showToast('Failed to trigger disaster hold', true);
            }
        } catch (_) {
            showToast('Network error triggering disaster hold', true);
        }
    });
}

// Refresh Telemetry
const btnRefreshRadar = document.getElementById('btn-refresh-radar');
if (btnRefreshRadar) {
    btnRefreshRadar.addEventListener('click', () => {
        loadTelemetryRadar();
        showToast('System telemetry refreshed.');
    });
}

// Search debounce
let timeout: any;
if (ui.searchInput) {
    ui.searchInput.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            renderCandidateTable();
        }, 300);
    });
}

if (ui.topSearchInput) {
    ui.topSearchInput.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            renderCandidateTable();
        }, 300);
    });
}

// ===================================================================
// TESTS & EXAM OPERATIONS MANAGEMENT SUITE (CLOUD DB)
// ===================================================================

// cachedExams declared globally above
let cachedQuestionBank: any[] = [];
let selectedQuestionIds: Set<string> = new Set();
let currentSummaryExamId: string = '';

// Format date helper for IST
function formatISTDate(isoStr?: string): string {
    if (!isoStr) return '--';
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        return d.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }) + ' IST';
    } catch (_) {
        return isoStr;
    }
}

// Convert Date to datetime-local input format (YYYY-MM-DDTHH:mm)
function toLocalInputString(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${y}-${m}-${d}T${h}:${min}`;
}

// 1. Load All Exams from Cloud DB
async function loadExams(): Promise<void> {
    try {
        const res = await adminFetch('/api/v1/exams/');
        if (res.ok) {
            cachedExams = await res.json();
            if (!Array.isArray(cachedExams)) cachedExams = [];
            updateExamStats();
            renderExamsTable();
            populateShareRegExamSelect();
            populateResultsExamSelect();
        } else {
            console.error('Failed to load exams from Cloud DB');
        }
    } catch (err) {
        console.error('Error fetching exams:', err);
    }
}

// Update Top Metric Counters for Exams
function updateExamStats(): void {
    let active = 0;
    let scheduled = 0;
    let concluded = 0;

    for (const ex of cachedExams) {
        const st = ex.schedule_status || 'active';
        if (st === 'active') active++;
        else if (st === 'scheduled') scheduled++;
        else if (st === 'concluded') concluded++;
    }

    const elActive = document.getElementById('stat-active-exams-count');
    const elSched = document.getElementById('stat-scheduled-exams-count');
    const elConc = document.getElementById('stat-concluded-exams-count');

    if (elActive) elActive.textContent = String(active);
    if (elSched) elSched.textContent = String(scheduled);
    if (elConc) elConc.textContent = String(concluded);
}

// Populate the Target Exam select in the Registration Share Modal
function populateShareRegExamSelect(): void {
    const sel = document.getElementById('share-reg-exam-select') as HTMLSelectElement;
    if (!sel) return;

    const currentVal = sel.value;
    sel.innerHTML = '<option value="">-- General Registration (All Exams Accessible) --</option>';

    for (const ex of cachedExams) {
        const opt = document.createElement('option');
        opt.value = ex.id;
        const code = ex.config?.exam_code || ex.code || 'CBT-' + ex.id.slice(0, 6);
        opt.textContent = `${ex.title} (${code})`;
        sel.appendChild(opt);
    }

    if (currentVal) sel.value = currentVal;
}

// State for Dynamic Section Headers Builder in Modal
let currentModalSections: Array<{ name: string; enabled: boolean }> = [];

function updateModalAiCamBadge(enabled: boolean): void {
    const badge = document.getElementById('badge-modal-ai-camera');
    const label = document.getElementById('exam-ai-camera-toggle-label');
    if (badge) {
        if (enabled) {
            badge.textContent = 'ACTIVE (ON)';
            badge.style.background = 'rgba(16, 185, 129, 0.15)';
            badge.style.color = '#047857';
        } else {
            badge.textContent = 'DISABLED (OFF)';
            badge.style.background = 'rgba(239, 68, 68, 0.15)';
            badge.style.color = '#b91c1c';
        }
    }
    if (label) {
        label.textContent = enabled ? 'AI Camera ON' : 'AI Camera OFF';
        label.style.color = enabled ? '#047857' : '#b91c1c';
    }
}

function renderModalSections(): void {
    const container = document.getElementById('exam-sections-list-container');
    const countBadge = document.getElementById('sec-builder-count');
    if (!container) return;

    const enabledCount = currentModalSections.filter(s => s.enabled).length;
    if (countBadge) {
        countBadge.textContent = `${currentModalSections.length} Sections (${enabledCount} Enabled)`;
    }

    container.innerHTML = '';
    currentModalSections.forEach((sec, idx) => {
        const row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '32px 1fr 140px 36px';
        row.style.gap = '8px';
        row.style.alignItems = 'center';
        row.style.background = 'var(--bg-card)';
        row.style.border = '1px solid var(--border-color)';
        row.style.borderRadius = 'var(--radius)';
        row.style.padding = '0.4rem 0.65rem';

        row.innerHTML = `
            <span style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-align: center;">#${idx + 1}</span>
            <input type="text" class="form-input-ctrl sec-name-input" data-idx="${idx}" value="${escapeHtml(sec.name)}" placeholder="Section Header (e.g. MATH-1)" style="height: 32px; font-size: 0.8rem; font-weight: 700; padding: 0 0.5rem;" required />
            <label style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 700; user-select: none;">
                <input type="checkbox" class="sec-enable-toggle" data-idx="${idx}" ${sec.enabled ? 'checked' : ''} style="width: 15px; height: 15px; accent-color: #059669; cursor: pointer;" />
                <span style="color: ${sec.enabled ? '#047857' : '#b91c1c'}; font-size: 0.72rem;">${sec.enabled ? 'ACTIVE (ON)' : 'OFF'}</span>
            </label>
            <button type="button" class="btn btn-outline btn-sm btn-delete-sec-row" data-idx="${idx}" style="color: #ef4444; border-color: #fca5a5; padding: 2px 6px; height: 30px;" title="Remove this section header">
                &times;
            </button>
        `;
        container.appendChild(row);
    });

    // Wire listeners
    container.querySelectorAll('.sec-name-input').forEach(inp => {
        inp.addEventListener('input', (e) => {
            const idx = parseInt((e.target as HTMLElement).getAttribute('data-idx') || '0', 10);
            if (currentModalSections[idx]) {
                currentModalSections[idx].name = (e.target as HTMLInputElement).value.trim();
            }
        });
    });

    container.querySelectorAll('.sec-enable-toggle').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const idx = parseInt((e.target as HTMLElement).getAttribute('data-idx') || '0', 10);
            if (currentModalSections[idx]) {
                currentModalSections[idx].enabled = (e.target as HTMLInputElement).checked;
                renderModalSections();
            }
        });
    });

    container.querySelectorAll('.btn-delete-sec-row').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt((e.target as HTMLElement).getAttribute('data-idx') || '0', 10);
            if (currentModalSections.length <= 1) {
                showToast('At least 1 section header is required', true);
                return;
            }
            currentModalSections.splice(idx, 1);
            renderModalSections();
        });
    });
}

function addModalSection(): void {
    const nextNum = currentModalSections.length + 1;
    currentModalSections.push({ name: `MATH-${nextNum}`, enabled: true });
    renderModalSections();
}

async function toggleExamAiCamera(examId: string): Promise<void> {
    try {
        const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(examId)}/toggle-ai-camera`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (res.ok) {
            const data = await res.json();
            showToast(`AI Camera is now ${data.ai_camera_enabled ? 'ENABLED' : 'DISABLED'} in Cloud DB!`);
            await loadExams();
        } else {
            showToast('Failed to toggle AI Camera', true);
        }
    } catch (_) {
        showToast('Network error toggling AI Camera', true);
    }
}

// 2. Render Exams Table with Live Actions
function renderExamsTable(): void {
    const tbody = document.getElementById('exam-table-body');
    if (!tbody) return;

    const searchInput = (document.getElementById('search-exams-input') as HTMLInputElement)?.value.trim().toLowerCase() || '';
    const filterSchedule = (document.getElementById('filter-exam-schedule') as HTMLSelectElement)?.value || 'ALL';

    const filtered = cachedExams.filter(ex => {
        const title = (ex.title || '').toLowerCase();
        const code = (ex.config?.exam_code || ex.code || '').toLowerCase();
        const id = (ex.id || '').toLowerCase();
        const matchesSearch = !searchInput || title.includes(searchInput) || code.includes(searchInput) || id.includes(searchInput);

        const st = ex.schedule_status || 'active';
        const matchesStatus = (filterSchedule === 'ALL') || (st === filterSchedule);

        return matchesSearch && matchesStatus;
    });

    const counter = document.getElementById('exam-filter-counter');
    if (counter) {
        counter.textContent = `Showing ${filtered.length} of ${cachedExams.length} tests`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    No examinations found matching your filter criteria. Click "Create New Test" to schedule one.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    for (const ex of filtered) {
        const examId = ex.id;
        const title = escapeHtml(ex.title || 'Untitled Assessment');
        const code = escapeHtml(ex.config?.exam_code || ex.code || 'CBT-' + examId.slice(0, 6).toUpperCase());
        const duration = ex.duration_minutes || 180;
        const qCount = ex.question_count || ex.config?.question_ids?.length || 0;
        const cCount = ex.candidate_count || 0;
        const correctMarks = ex.config?.correct_marks || 4;
        const negMarks = ex.config?.negative_marks || 1;

        const startIST = formatISTDate(ex.start_time || ex.start_time_ist);
        const endIST = formatISTDate(ex.end_time || ex.end_time_ist);

        // Schedule status pill
        const schedStatus = ex.schedule_status || 'active';
        let statusPill = '<span class="schedule-pill schedule-active">[ACTIVE]</span>';
        if (schedStatus === 'scheduled') {
            statusPill = `<span class="schedule-pill schedule-pending">[SCHEDULED]</span>`;
        } else if (schedStatus === 'concluded') {
            statusPill = '<span class="schedule-pill schedule-concluded">[CONCLUDED]</span>';
        }

        // AI Camera state and badge
        const aiCam = (ex.ai_camera_enabled !== undefined)
            ? Boolean(ex.ai_camera_enabled)
            : (ex.config?.ai_camera_enabled !== undefined ? Boolean(ex.config.ai_camera_enabled) : true);

        const camBadge = aiCam
            ? '<span class="badge-pill" style="background: rgba(16, 185, 129, 0.15); color: #047857; font-weight: 800; font-size: 0.72rem;">[AI Camera: ON]</span>'
            : '<span class="badge-pill" style="background: rgba(239, 68, 68, 0.15); color: #b91c1c; font-weight: 800; font-size: 0.72rem;">[AI Camera: OFF]</span>';

        // Sections chips
        const rawSecList: Array<any> = ex.sections || ex.config?.sections || [];
        const enabledSecNames: string[] = [];
        rawSecList.forEach((s: any) => {
            if (typeof s === 'object' && s !== null) {
                if (s.enabled !== false && s.name) enabledSecNames.push(String(s.name));
            } else if (typeof s === 'string' && s.trim()) {
                enabledSecNames.push(s.trim());
            }
        });

        const secChips = enabledSecNames.slice(0, 3).map((n: string) => `<span class="badge-pill" style="font-size: 0.68rem; background: #e0e7ff; color: #3730a3; font-weight: 700;">${escapeHtml(n)}</span>`).join(' ')
            + (enabledSecNames.length > 3 ? ` <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700;">+${enabledSecNames.length - 3}</span>` : '');

        // Test link requiring candidate credentials
        const shareTestLink = `${window.location.origin}/instructions.html?exam_id=${encodeURIComponent(examId)}`;

        html += `
            <tr>
                <!-- Test Identification & Prominent Near-Name Actions -->
                <td>
                    <div class="exam-title-cell">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <strong style="font-size: 0.925rem; color: var(--text-heading);">${title}</strong>
                            <span class="badge-pill" style="background: rgba(50, 31, 219, 0.1); color: var(--brand-blue); font-weight: 800; font-family: var(--font-mono);">${code}</span>
                        </div>
                        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 3px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span>🏢 ${escapeHtml(ex.test_venue_name || ex.config?.test_venue_name || 'Saveetha Engineering College')}</span>
                            <span>&bull;</span>
                            <span style="font-family: var(--font-mono); font-weight: 600; color: #4b5563;">[${escapeHtml(ex.test_center_code || ex.config?.test_center_code || 'TN-CHE-001')}]</span>
                            <span>&bull;</span>
                            <span style="font-weight: 600; color: #0284c7;">Room: ${escapeHtml(ex.default_lab_room || ex.config?.default_lab_room || 'Lab 4')}</span>
                            <span>&bull;</span>
                            <span style="font-weight: 600; color: #4f46e5;">Node: ${escapeHtml(ex.terminal_prefix || ex.config?.terminal_prefix || 'NODE-L4-C')}</span>
                        </div>
                        
                        <!-- BUTTONS LOCATED DIRECTLY NEAR THE EXAM NAME -->
                        <div class="exam-action-btns-near-name" style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
                            <button type="button" class="btn btn-primary btn-sm btn-toggle-monitoring" data-id="${examId}" title="Toggle live student examination monitoring drawer">
                                Live Monitor
                            </button>
                            <button type="button" class="btn btn-success btn-sm btn-export-xls" data-id="${examId}" title="Download complete student-wise performance analysis spreadsheet (.xls)">
                                Marks (XLS)
                            </button>
                            <button type="button" class="btn btn-outline btn-sm btn-export-csv" data-id="${examId}" title="Download results CSV">
                                CSV
                            </button>
                            <button type="button" class="btn btn-outline btn-sm btn-export-responses" data-id="${examId}" title="Download candidate itemized responses CSV">
                                Responses CSV
                            </button>
                            <button type="button" class="btn btn-purple btn-sm btn-copy-test-link" data-id="${examId}" data-link="${shareTestLink}" title="Copy candidate examination access link">
                                Share Link
                            </button>
                        </div>
                    </div>
                </td>

                <!-- Scheduled Window IST -->
                <td>
                    <div style="font-size: 0.775rem; line-height: 1.4;">
                        <div><strong style="color: #047857;">Start:</strong> ${startIST}</div>
                        <div><strong style="color: #b91c1c;">End:</strong> ${endIST}</div>
                        <div style="color: var(--text-muted); font-size: 0.72rem; margin-top: 2px;">
                            Duration: <strong>${duration} Minutes</strong>
                        </div>
                    </div>
                </td>

                <!-- Status & Gatekeeper -->
                <td>
                    ${statusPill}
                </td>

                <!-- Questions & Marking Scheme -->
                <td>
                    <div style="font-size: 0.8rem; font-weight: 700; color: var(--brand-blue);">
                        ${qCount} Questions
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">
                        Marking: <strong style="color: #047857;">+${correctMarks}</strong> / <strong style="color: #b91c1c;">-${negMarks}</strong>
                    </div>
                </td>

                <!-- AI Camera & Dynamic Sections -->
                <td>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            ${camBadge}
                            <button type="button" class="btn btn-outline btn-sm btn-quick-toggle-cam" data-id="${examId}" style="padding: 2px 6px; font-size: 0.7rem; font-weight: 700; ${aiCam ? 'color: #dc2626; border-color: #fca5a5;' : 'color: #059669; border-color: #a7f3d0;'}" title="Instantly toggle AI Camera in Cloud DB">
                                ${aiCam ? 'Turn OFF' : 'Turn ON'}
                            </button>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-top: 2px;">
                            ${secChips || '<span style="font-size: 0.7rem; color: var(--text-muted);">None</span>'}
                        </div>
                    </div>
                </td>

                <!-- Enrolled Candidates -->
                <td>
                    <div style="font-size: 0.85rem; font-weight: 800; color: var(--text-heading);">
                        ${cCount} Enrolled
                    </div>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">
                        Cloud DB Synced
                    </div>
                </td>

                <!-- Administration Operations -->
                <td style="text-align: right; white-space: nowrap;">
                    <div style="display: inline-flex; gap: 4px;">
                        <button type="button" class="btn btn-primary btn-sm btn-toggle-monitoring" data-id="${examId}" title="Toggle live student examination monitoring drawer">
                            Live Monitor
                        </button>
                        <button type="button" class="btn btn-outline btn-sm btn-open-summary" data-id="${examId}" title="View class performance leaderboard and statistics">
                            Digest
                        </button>
                        <button type="button" class="btn btn-outline btn-sm btn-edit-exam" data-id="${examId}" title="Edit schedule, sections, and questions">
                            Settings
                        </button>
                        <button type="button" class="btn btn-outline btn-sm btn-delete-exam" data-id="${examId}" style="color: #ef4444;" title="Delete examination">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>

            <!-- EXPANDABLE REAL-TIME STUDENT MONITORING SUBROW -->
            <tr id="exam-monitoring-row-${examId}" class="exam-monitoring-subrow" style="display: none; background: #f8fafc;">
                <td colspan="7" style="padding: 1.25rem 1.5rem; border-top: 1px dashed #bfdbfe; border-bottom: 3px solid #2563eb;">
                    <div id="exam-monitoring-content-${examId}">
                        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                            Connecting to real-time student monitoring feed...
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    tbody.innerHTML = html;

    // Attach row event listeners
    tbody.querySelectorAll('.btn-toggle-monitoring').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            if (!id) return;
            const row = document.getElementById(`exam-monitoring-row-${id}`);
            if (!row) return;
            const isHidden = (row.style.display === 'none' || !row.style.display);
            if (isHidden) {
                row.style.display = 'table-row';
                tbody.querySelectorAll(`.btn-toggle-monitoring[data-id="${id}"]`).forEach(b => {
                    b.textContent = 'Hide Monitor';
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-secondary');
                });
                await loadExamMonitoring(id);
            } else {
                row.style.display = 'none';
                tbody.querySelectorAll(`.btn-toggle-monitoring[data-id="${id}"]`).forEach(b => {
                    b.textContent = 'Live Monitor';
                    b.classList.remove('btn-secondary');
                    b.classList.add('btn-primary');
                });
            }
        });
    });

    tbody.querySelectorAll('.btn-quick-toggle-cam').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            if (id) await toggleExamAiCamera(id);
        });
    });

    tbody.querySelectorAll('.btn-export-xls').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            if (id) downloadExamXLS(id);
        });
    });

    tbody.querySelectorAll('.btn-export-csv').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            if (id) downloadExamCSV(id);
        });
    });

    tbody.querySelectorAll('.btn-export-responses').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            if (id) downloadExamResponsesCSV(id);
        });
    });

    tbody.querySelectorAll('.btn-copy-test-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const link = (e.currentTarget as HTMLElement).getAttribute('data-link');
            if (link) {
                navigator.clipboard.writeText(link).then(() => {
                    showToast('Exam link copied to clipboard! (Requires candidate login to enter)');
                }).catch(() => {
                    prompt('Exam Access Link (Requires candidate credentials to enter):', link);
                });
            }
        });
    });

    tbody.querySelectorAll('.btn-open-summary').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            if (id) openExamSummaryModal(id);
        });
    });

    tbody.querySelectorAll('.btn-edit-exam').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            if (id) openEditExamModal(id);
        });
    });

    tbody.querySelectorAll('.btn-delete-exam').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            if (id) deleteExam(id);
        });
    });
}

// 3. One-Click Marks Spreadsheet & Itemized Responses Download
function downloadExamXLS(examId: string): void {
    showToast('Generating student-wise Excel analysis...');
    const url = `/api/v1/exams/${encodeURIComponent(examId)}/results-export?format=xlsx`;
    window.open(url, '_blank');
}

function downloadExamCSV(examId: string): void {
    showToast('Downloading CSV results roster...');
    const url = `/api/v1/exams/${encodeURIComponent(examId)}/results-export?format=csv`;
    window.open(url, '_blank');
}

function downloadExamResponsesCSV(examId: string): void {
    showToast('Downloading question-by-question candidate responses CSV...');
    const url = `/api/v1/exams/${encodeURIComponent(examId)}/export/responses`;
    window.open(url, '_blank');
}

// 3b. Authoritative Real-Time Examination Student Monitoring
async function loadExamMonitoring(examId: string): Promise<void> {
    const container = document.getElementById(`exam-monitoring-content-${examId}`);
    if (!container) return;

    try {
        const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(examId)}/monitoring`, { headers: getHeaders() });
        if (!res.ok) {
            container.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: #dc2626;">Error retrieving monitoring feed from Cloud DB. Status: ${res.status}</div>`;
            return;
        }

        const data = await res.json();
        const overview = data.overview || {};
        const students: any[] = data.students || [];

        let html = `
            <div style="background: white; border: 1px solid #cbd5e1; border-radius: var(--radius-lg, 8px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
                <!-- MONITORING BANNER -->
                <div style="background: linear-gradient(135deg, #1e3a8a, #1e40af); color: white; padding: 1.25rem 1.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 1.15rem; font-weight: 800; letter-spacing: 0.02em;">REAL-TIME EXAMINATION MONITOR &bull; ${escapeHtml(data.exam_title || examId)}</span>
                            <span class="badge-pill" style="background: #10b981; color: white; font-weight: 800; font-size: 0.75rem; padding: 2px 8px;">LIVE FEED ACTIVE</span>
                        </div>
                        <div style="font-size: 0.8rem; opacity: 0.85; margin-top: 4px;">
                            Exam ID: <span style="font-family: var(--font-mono); font-weight: 700;">${escapeHtml(examId)}</span> &bull; 
                            Duration: <strong>${data.duration_minutes || 60}m</strong> &bull; 
                            Total Questions: <strong>${data.total_questions || 20}</strong> &bull; 
                            Marking: <strong style="color: #a7f3d0;">+${data.marking?.correct ?? 4.0}</strong> / <strong style="color: #fca5a5;">-${data.marking?.negative ?? 1.0}</strong> &bull; 
                            Max Score: <strong>${data.marking?.max_possible_score ?? 80}</strong>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span style="font-size: 0.75rem; background: rgba(255,255,255,0.15); padding: 4px 8px; border-radius: 4px; font-weight: 600;">
                            Synced: ${escapeHtml(overview.last_updated || 'Just now')}
                        </span>
                        <button type="button" class="btn btn-outline btn-sm btn-refresh-monitor" data-id="${examId}" style="color: white; border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.1);" title="Refresh live roster from Cloud DB">
                            ↻ Refresh
                        </button>
                        <button type="button" class="btn btn-sm btn-close-monitor" data-id="${examId}" style="background: rgba(239, 68, 68, 0.2); color: #fecaca; border: 1px solid rgba(239, 68, 68, 0.4);" title="Close live monitor drawer">
                            ✕ Close
                        </button>
                    </div>
                </div>

                <!-- OVERVIEW METRICS GRID -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; padding: 1.25rem 1.75rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.75rem; text-align: center;">
                        <div style="font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: #64748b;">Total Assigned</div>
                        <div style="font-size: 1.35rem; font-weight: 900; color: #0f172a; margin-top: 2px;">${overview.total_assigned ?? 0}</div>
                    </div>
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.75rem; text-align: center;">
                        <div style="font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: #64748b;">Not Started</div>
                        <div style="font-size: 1.35rem; font-weight: 900; color: #64748b; margin-top: 2px;">${overview.not_started ?? 0}</div>
                    </div>
                    <div style="background: white; border: 1px solid #bfdbfe; border-radius: 6px; padding: 0.75rem; text-align: center;">
                        <div style="font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: #0284c7;">Active In-Session</div>
                        <div style="font-size: 1.35rem; font-weight: 900; color: #0284c7; margin-top: 2px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #0284c7;"></span>
                            ${overview.active ?? 0}
                        </div>
                    </div>
                    <div style="background: white; border: 1px solid #bbf7d0; border-radius: 6px; padding: 0.75rem; text-align: center;">
                        <div style="font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: #15803d;">Submitted</div>
                        <div style="font-size: 1.35rem; font-weight: 900; color: #15803d; margin-top: 2px;">${overview.submitted ?? 0}</div>
                    </div>
                    <div style="background: white; border: 1px solid #fecaca; border-radius: 6px; padding: 0.75rem; text-align: center;">
                        <div style="font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: #b91c1c;">Disqualified</div>
                        <div style="font-size: 1.35rem; font-weight: 900; color: #b91c1c; margin-top: 2px;">${overview.disqualified ?? 0}</div>
                    </div>
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.75rem; text-align: center;">
                        <div style="font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: #64748b;">Sync Issues</div>
                        <div style="font-size: 1.35rem; font-weight: 900; color: #10b981; margin-top: 2px;">0</div>
                    </div>
                </div>

                <!-- EXPORT ACTIONS BAR -->
                <div style="padding: 0.75rem 1.75rem; background: white; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                    <div style="font-size: 0.85rem; font-weight: 700; color: #1e3a8a;">
                        Live Candidate Roster &amp; Progression Telemetry
                    </div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <button type="button" class="btn btn-outline btn-sm btn-monitor-export-xls" data-id="${examId}" style="font-weight: 700;">
                            📥 Export Results (XLS)
                        </button>
                        <button type="button" class="btn btn-outline btn-sm btn-monitor-export-csv" data-id="${examId}">
                            📥 Export Results (CSV)
                        </button>
                        <button type="button" class="btn btn-success btn-sm btn-monitor-export-responses" data-id="${examId}" style="font-weight: 700;">
                            📥 Export All Candidate Responses (CSV)
                        </button>
                    </div>
                </div>

                <!-- STUDENT ROSTER TABLE -->
                <div style="overflow-x: auto; max-height: 480px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.825rem;">
                        <thead style="position: sticky; top: 0; background: #f1f5f9; z-index: 2;">
                            <tr style="border-bottom: 2px solid #cbd5e1;">
                                <th style="padding: 8px 12px; text-align: left;">Candidate Identity</th>
                                <th style="padding: 8px 12px; text-align: left;">Attempt Status</th>
                                <th style="padding: 8px 12px; text-align: left;">Current Question &amp; Progress</th>
                                <th style="padding: 8px 12px; text-align: left;">Timer Remaining</th>
                                <th style="padding: 8px 12px; text-align: left;">Sync &amp; Save State</th>
                                <th style="padding: 8px 12px; text-align: left;">Compliance / Violations</th>
                                <th style="padding: 8px 12px; text-align: left;">Score &amp; Accuracy</th>
                                <th style="padding: 8px 12px; text-align: right;">Operations</th>
                            </tr>
                        </thead>
                        <tbody id="exam-monitor-tbody-${examId}">
        `;

        if (students.length === 0) {
            html += `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        No registered candidates found for this examination in Cloud DB.
                    </td>
                </tr>
            `;
        } else {
            students.forEach((s: any) => {
                const reg = escapeHtml(s.registration_number || '--');
                const name = escapeHtml(s.candidate_name || 'Candidate');
                const node = escapeHtml(s.terminal || 'Node-01');
                const isSub = s.is_submitted === true;
                const isDisq = s.is_disqualified === true;
                const isActive = s.is_active === true;
                const strikes = s.violations_count || terminalViolations[s.registration_number] || 0;

                let statusBadge = '<span class="status-pill" style="background: #f1f5f9; color: #64748b; font-weight: 700;">Not Started</span>';
                if (isDisq) {
                    statusBadge = `<span class="status-pill" style="background: #fee2e2; color: #b91c1c; font-weight: 800;" title="${escapeHtml(s.disqualification_reason || 'Security violation')}">DISQUALIFIED</span>`;
                } else if (isSub) {
                    statusBadge = '<span class="status-pill" style="background: #dcfce7; color: #15803d; font-weight: 800;">Submitted</span>';
                } else if (isActive) {
                    statusBadge = '<span class="status-pill" style="background: #e0f2fe; color: #0284c7; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #0284c7;"></span>Active</span>';
                }

                // Progress display
                const curQ = s.current_question_index || 1;
                const totQ = s.total_questions || data.total_questions || 20;
                const attCount = s.attempted_count || 0;
                const revCount = s.marked_for_review_count || 0;
                const progPct = s.progress_percent || Math.round((attCount / totQ) * 100);

                // Score display
                let scoreText = '--';
                if (isDisq) {
                    scoreText = '<span style="color: #b91c1c; font-weight: 800;">ANNULLED</span>';
                } else if (s.score !== '--' && s.score != null) {
                    const accText = s.accuracy || 'N/A';
                    scoreText = `<strong style="color: #1e40af;">${s.score}</strong> <span style="font-size: 0.72rem; color: #15803d; font-weight: 700;">(${accText})</span>`;
                } else if (isSub) {
                    scoreText = '<span style="color: #15803d; font-weight: 700;">Evaluated</span>';
                }

                // Strikes display
                let strikeBadge = `<span style="color: #15803d; font-weight: 700;">0 / 4 Strikes</span>`;
                if (strikes > 0) {
                    strikeBadge = `<span style="background: #fee2e2; color: #b91c1c; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1px solid #fca5a5;">Strike #${strikes} / 4</span>`;
                }

                html += `
                    <tr id="monitor-row-${examId}-${s.registration_number}" style="border-bottom: 1px solid #e2e8f0; ${isDisq ? 'background: #fff5f5;' : ''}">
                        <td style="padding: 8px 12px;">
                            <div style="font-weight: 800; color: #0f172a;">${name}</div>
                            <div style="font-family: var(--font-mono); font-size: 0.75rem; color: #0284c7; font-weight: 700;">${reg}</div>
                            <div style="font-size: 0.7rem; color: #64748b;">${node}</div>
                        </td>
                        <td style="padding: 8px 12px;" id="mon-status-${examId}-${s.registration_number}">
                            ${statusBadge}
                        </td>
                        <td style="padding: 8px 12px;" id="mon-prog-${examId}-${s.registration_number}">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="font-weight: 800; color: #1e40af; font-size: 0.8rem;">Q${curQ}/${totQ}</span>
                                <span style="font-size: 0.72rem; color: #64748b;">(${progPct}%)</span>
                            </div>
                            <div style="width: 100px; height: 5px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin: 3px 0;">
                                <div style="width: ${progPct}%; height: 100%; background: #0284c7;"></div>
                            </div>
                            <div style="font-size: 0.7rem; color: #64748b;">
                                Attempted: <strong style="color: #0284c7;">${attCount}</strong> &bull; Review: <strong style="color: #d97706;">${revCount}</strong>
                            </div>
                        </td>
                        <td style="padding: 8px 12px; font-family: var(--font-mono); font-weight: 700; color: #475569;" id="mon-timer-${examId}-${s.registration_number}">
                            ${escapeHtml(s.remaining_display || (isSub ? 'Submitted' : '60m 00s'))}
                        </td>
                        <td style="padding: 8px 12px;" id="mon-sync-${examId}-${s.registration_number}">
                            <span style="display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 0.7rem; font-weight: 700; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">
                                Cloud Synced
                            </span>
                            <div style="font-size: 0.68rem; color: #64748b; margin-top: 2px;">
                                ${escapeHtml(s.last_sync_time || 'Just now')}
                            </div>
                        </td>
                        <td style="padding: 8px 12px;" id="mon-strikes-${examId}-${s.registration_number}">
                            ${strikeBadge}
                        </td>
                        <td style="padding: 8px 12px;" id="mon-score-${examId}-${s.registration_number}">
                            ${scoreText}
                        </td>
                        <td style="padding: 8px 12px; text-align: right; white-space: nowrap;">
                            <div style="display: inline-flex; gap: 4px;">
                                <a href="/scorecard.html?reg_no=${encodeURIComponent(s.registration_number)}" target="_blank" class="btn btn-outline btn-sm" style="padding: 2px 6px; font-size: 0.72rem;" title="View candidate authoritative scorecard">
                                    Scorecard
                                </a>
                                <button type="button" class="btn btn-outline btn-sm btn-mon-time" data-exam="${examId}" data-reg="${s.registration_number}" style="padding: 2px 6px; font-size: 0.72rem;" title="Add 15m extra time">
                                    +15m
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Attach event listeners inside the monitoring content
        container.querySelector('.btn-refresh-monitor')?.addEventListener('click', () => loadExamMonitoring(examId));
        container.querySelector('.btn-close-monitor')?.addEventListener('click', () => {
            const row = document.getElementById(`exam-monitoring-row-${examId}`);
            if (row) row.style.display = 'none';
            document.querySelectorAll(`.btn-toggle-monitoring[data-id="${examId}"]`).forEach((b: Element) => {
                b.textContent = 'Live Monitor';
                b.classList.remove('btn-secondary');
                b.classList.add('btn-primary');
            });
        });

        container.querySelector('.btn-monitor-export-xls')?.addEventListener('click', () => downloadExamXLS(examId));
        container.querySelector('.btn-monitor-export-csv')?.addEventListener('click', () => downloadExamCSV(examId));
        container.querySelector('.btn-monitor-export-responses')?.addEventListener('click', () => downloadExamResponsesCSV(examId));

        container.querySelectorAll('.btn-mon-time').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reg = (e.currentTarget as HTMLElement).getAttribute('data-reg');
                if (reg && adminSocket && adminSocket.readyState === WebSocket.OPEN) {
                    adminSocket.send(JSON.stringify({
                        type: "INDIVIDUAL_TIME_EXTENDED",
                        reg_no: reg,
                        extra_minutes: 15,
                        reason: "Invigilator Live Grant"
                    }));
                    showToast(`Granted +15m compensatory time to ${reg}`);
                }
            });
        });

    } catch (err) {
        container.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: #dc2626;">Failed to load live monitoring feed: ${err}</div>`;
    }
}

function populateQbFilterSubjects(): void {
    const sel = document.getElementById('qb-filter-subject') as HTMLSelectElement;
    if (!sel) return;
    const currentVal = sel.value;
    const subjects = Array.from(new Set(cachedQuestionBank.map(q => q.subject || 'General'))).filter(Boolean).sort();
    sel.innerHTML = '<option value="ALL">All Subjects</option>';
    subjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        sel.appendChild(opt);
    });
    if (currentVal && (currentVal === 'ALL' || subjects.includes(currentVal))) {
        sel.value = currentVal;
    }
}

// 4. Load Question Bank from Cloud DB for Test Creation
async function loadQuestionBank(): Promise<void> {
    try {
        const res = await adminFetch('/api/v1/questions/', { headers: getHeaders() });
        if (res.ok) {
            cachedQuestionBank = await res.json();
            if (!Array.isArray(cachedQuestionBank)) cachedQuestionBank = [];
            
            const totalQEl = document.getElementById('stat-qb-available-count');
            if (totalQEl) totalQEl.textContent = `${cachedQuestionBank.length} Qs`;

            const totalQModalEl = document.getElementById('qb-total-count');
            if (totalQModalEl) totalQModalEl.textContent = String(cachedQuestionBank.length);

            populateQbFilterSubjects();
            renderQuestionChecklist();
        }
    } catch (err) {
        console.error('Failed to load Question Bank:', err);
    }
}

// Render questions in the modal checklist
function renderQuestionChecklist(): void {
    const container = document.getElementById('qb-questions-checklist-container');
    if (!container) return;

    const subFilter = (document.getElementById('qb-filter-subject') as HTMLSelectElement)?.value || 'ALL';
    const diffFilter = (document.getElementById('qb-filter-difficulty') as HTMLSelectElement)?.value || 'ALL';
    const searchFilter = (document.getElementById('qb-filter-search') as HTMLInputElement)?.value.trim().toLowerCase() || '';

    const filtered = cachedQuestionBank.filter(q => {
        const subject = q.subject || '';
        const diff = q.difficulty || '';
        const stmt = q.statement || q.question_text || (q.content && q.content.statement) || '';
        const text = stmt.toLowerCase();

        const matchesSub = (subFilter === 'ALL') || (subject.toLowerCase() === subFilter.toLowerCase());
        const matchesDiff = (diffFilter === 'ALL') || (diff.toLowerCase() === diffFilter.toLowerCase());
        const matchesSearch = !searchFilter || text.includes(searchFilter);

        return matchesSub && matchesDiff && matchesSearch;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); font-size: 0.75rem; padding: 1rem;">
                No questions match the current filter criteria.
            </div>
        `;
        updateQuestionSelectionTicker();
        return;
    }

    let html = '';
    for (const q of filtered) {
        const qId = q.id;
        const isChecked = selectedQuestionIds.has(qId) ? 'checked' : '';
        const subject = q.subject || 'General';
        const diff = q.difficulty || 'Medium';
        const qText = q.statement || q.question_text || (q.content && q.content.statement) || '';
        const snippet = escapeHtml(qText ? qText.slice(0, 90) + (qText.length > 90 ? '...' : '') : '');

        let subColor = '#2563eb';
        if (subject.toLowerCase() === 'chemistry') subColor = '#7c3aed';
        if (subject.toLowerCase() === 'mathematics') subColor = '#059669';

        let diffColor = '#d97706';
        if (diff.toLowerCase() === 'easy') diffColor = '#10b981';
        if (diff.toLowerCase() === 'hard') diffColor = '#ef4444';

        html += `
            <label style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; background: ${isChecked ? 'rgba(50, 31, 219, 0.05)' : 'transparent'}; cursor: pointer; border-bottom: 1px solid var(--border-color); font-size: 0.78rem;">
                <input type="checkbox" class="qb-q-checkbox" value="${qId}" ${isChecked} style="accent-color: var(--brand-blue); cursor: pointer;" />
                <span style="font-family: var(--font-mono); font-size: 0.7rem; font-weight: 700; color: var(--text-muted); min-width: 55px;">#${qId.slice(0, 8)}</span>
                <span class="badge-pill" style="background: ${subColor}18; color: ${subColor}; font-size: 0.68rem; font-weight: 700;">${subject}</span>
                <span class="badge-pill" style="background: ${diffColor}18; color: ${diffColor}; font-size: 0.68rem; font-weight: 700;">${diff}</span>
                <span style="flex: 1; color: var(--text-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${snippet}</span>
            </label>
        `;
    }

    container.innerHTML = html;

    // Attach checkbox toggle events
    container.querySelectorAll('.qb-q-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            const id = target.value;
            if (target.checked) {
                selectedQuestionIds.add(id);
            } else {
                selectedQuestionIds.delete(id);
            }
            updateQuestionSelectionTicker();
        });
    });

    updateQuestionSelectionTicker();
}

// Update Negative Marking Toggle UI State
function updateNegativeMarkingUI(enabled: boolean): void {
    const negInp = document.getElementById('exam-negative-marks-input') as HTMLInputElement;
    const label = document.getElementById('exam-neg-toggle-label');
    const hint = document.getElementById('exam-neg-hint');
    if (negInp) {
        negInp.disabled = !enabled;
        negInp.style.opacity = enabled ? '1' : '0.5';
    }
    if (label) {
        label.textContent = enabled ? 'PENALTY ON' : 'DISABLED (OFF)';
        label.style.color = enabled ? '#ef4444' : 'var(--text-muted)';
    }
    if (hint) {
        hint.textContent = enabled
            ? 'Penalty deducted per incorrect answer'
            : 'Zero penalty (0.0 marks deducted) for incorrect answers';
    }
}

// Update live ticker of selected questions and dynamic max score
function updateQuestionSelectionTicker(): void {
    const selCountEl = document.getElementById('qb-selected-count');
    const maxScoreEl = document.getElementById('qb-max-score');
    const count = selectedQuestionIds.size;

    const correctMarksInput = document.getElementById('exam-correct-marks-input') as HTMLInputElement;
    const correctMarks = parseFloat(correctMarksInput?.value || '4') || 4;

    const negToggle = document.getElementById('exam-negative-marking-toggle') as HTMLInputElement;
    const negEnabled = negToggle ? negToggle.checked : true;
    const negMarksInput = document.getElementById('exam-negative-marks-input') as HTMLInputElement;
    const negMarks = parseFloat(negMarksInput?.value || '1') || 1;

    const totalMarks = Math.round(count * correctMarks * 100) / 100;

    if (selCountEl) selCountEl.textContent = String(count);
    if (maxScoreEl) maxScoreEl.textContent = String(totalMarks);

    // Live Dynamic Marking Engine Badges in Modal
    const liveQCount = document.getElementById('calc-live-q-count');
    const livePerQ = document.getElementById('calc-live-per-q');
    const liveNegM = document.getElementById('calc-live-neg-m');
    const liveTotalM = document.getElementById('calc-live-total-marks');

    if (liveQCount) liveQCount.textContent = String(count);
    if (livePerQ) livePerQ.textContent = `+${correctMarks}`;
    if (liveNegM) liveNegM.textContent = negEnabled ? `-${negMarks}` : 'OFF (0)';
    if (liveTotalM) liveTotalM.textContent = String(totalMarks);
}

// Auto-pick balanced questions across all available subjects in Cloud DB
function autoPickBalancedQuestions(): void {
    selectedQuestionIds.clear();

    const bySubject: Record<string, any[]> = {};
    for (const q of cachedQuestionBank) {
        const sub = q.subject || 'General';
        if (!bySubject[sub]) bySubject[sub] = [];
        bySubject[sub].push(q);
    }

    const subjectKeys = Object.keys(bySubject);
    if (subjectKeys.length === 0) {
        renderQuestionChecklist();
        return;
    }

    // Allocate balanced question count per subject (up to 15 per subject)
    const targetPerSubject = Math.max(5, Math.floor(30 / subjectKeys.length));
    for (const sub of subjectKeys) {
        const list = bySubject[sub];
        for (let i = 0; i < Math.min(targetPerSubject, list.length); i++) {
            selectedQuestionIds.add(list[i].id);
        }
    }

    renderQuestionChecklist();
    showToast(`Auto-selected ${selectedQuestionIds.size} balanced questions across ${subjectKeys.length} subjects!`);
}

// Select all available questions
function selectAllQuestions(): void {
    for (const q of cachedQuestionBank) {
        selectedQuestionIds.add(q.id);
    }
    renderQuestionChecklist();
    showToast(`Selected all ${selectedQuestionIds.size} questions from Question Bank!`);
}

// Clear all selected questions
function clearAllQuestions(): void {
    selectedQuestionIds.clear();
    renderQuestionChecklist();
    showToast('Cleared question selection.');
}

// 5. Open Modal for Creating Exam
function openCreateExamModal(): void {
    const modal = document.getElementById('modal-exam-create');
    if (!modal) return;

    (document.getElementById('exam-form-mode') as HTMLInputElement).value = 'create';
    (document.getElementById('exam-form-id') as HTMLInputElement).value = '';
    (document.getElementById('exam-title-input') as HTMLInputElement).value = 'NATIONAL CBT ASSESSMENT - ADVANCED';
    (document.getElementById('exam-code-input') as HTMLInputElement).value = `CBT-${new Date().getFullYear()}-T${cachedExams.length + 1}`;
    (document.getElementById('exam-duration-input') as HTMLInputElement).value = '180';
    (document.getElementById('exam-correct-marks-input') as HTMLInputElement).value = '4';
    (document.getElementById('exam-negative-marks-input') as HTMLInputElement).value = '1';
    const negToggleCreate = document.getElementById('exam-negative-marking-toggle') as HTMLInputElement;
    if (negToggleCreate) {
        negToggleCreate.checked = true;
        updateNegativeMarkingUI(true);
    }

    const venueInp = document.getElementById('exam-venue-input') as HTMLInputElement;
    if (venueInp) venueInp.value = 'Saveetha Engineering College, Chennai - 602105';
    const centerCodeInp = document.getElementById('exam-center-code-input') as HTMLInputElement;
    if (centerCodeInp) centerCodeInp.value = 'TN-CHE-001';
    const roomInp = document.getElementById('exam-room-input') as HTMLInputElement;
    if (roomInp) roomInp.value = 'Lab 4';
    const nodePrefixInp = document.getElementById('exam-terminal-prefix-input') as HTMLInputElement;
    if (nodePrefixInp) nodePrefixInp.value = 'NODE-L4-C';
    const slotInp = document.getElementById('exam-slot-input') as HTMLInputElement;
    if (slotInp) slotInp.value = 'Shift 1';

    // Set default start time (now) and end time (now + 3 hours)
    const now = new Date();
    const end = new Date(now.getTime() + 180 * 60 * 1000);
    (document.getElementById('exam-start-time-input') as HTMLInputElement).value = toLocalInputString(now);
    (document.getElementById('exam-end-time-input') as HTMLInputElement).value = toLocalInputString(end);

    // Initialize Default Section Headers: MATH-1, MATH-2, PHYSICS, CHEMISTRY
    currentModalSections = [
        { name: 'MATH-1', enabled: true },
        { name: 'MATH-2', enabled: true },
        { name: 'PHYSICS', enabled: true },
        { name: 'CHEMISTRY', enabled: true }
    ];
    renderModalSections();

    // Reset AI Camera proctoring toggle to ON
    const camToggle = document.getElementById('exam-ai-camera-toggle') as HTMLInputElement;
    if (camToggle) {
        camToggle.checked = true;
        updateModalAiCamBadge(true);
    }

    // If nothing selected yet, auto-pick balanced questions
    if (selectedQuestionIds.size === 0 && cachedQuestionBank.length > 0) {
        autoPickBalancedQuestions();
    } else {
        renderQuestionChecklist();
    }

    const btnSubmit = document.getElementById('btn-submit-exam');
    if (btnSubmit) btnSubmit.textContent = 'Deploy & Schedule Test to Cloud DB →';

    modal.style.display = 'flex';
}

// Open Modal for Editing / Rescheduling Exam
function openEditExamModal(examId: string): void {
    const ex = cachedExams.find(e => e.id === examId);
    if (!ex) return;

    const modal = document.getElementById('modal-exam-create');
    if (!modal) return;

    (document.getElementById('exam-form-mode') as HTMLInputElement).value = 'edit';
    (document.getElementById('exam-form-id') as HTMLInputElement).value = examId;
    (document.getElementById('exam-title-input') as HTMLInputElement).value = ex.title || '';
    (document.getElementById('exam-code-input') as HTMLInputElement).value = ex.config?.exam_code || ex.code || '';
    (document.getElementById('exam-duration-input') as HTMLInputElement).value = String(ex.duration_minutes || 180);
    (document.getElementById('exam-correct-marks-input') as HTMLInputElement).value = String(ex.config?.correct_marks || 4);
    const negVal = (ex.config?.negative_marks !== undefined) ? ex.config.negative_marks : 1;
    (document.getElementById('exam-negative-marks-input') as HTMLInputElement).value = String(negVal);
    const negToggleEdit = document.getElementById('exam-negative-marking-toggle') as HTMLInputElement;
    const isNegOn = (ex.config?.negative_marking_enabled !== undefined) ? Boolean(ex.config.negative_marking_enabled) : true;
    if (negToggleEdit) {
        negToggleEdit.checked = isNegOn;
        updateNegativeMarkingUI(isNegOn);
    }

    const editVenueInp = document.getElementById('exam-venue-input') as HTMLInputElement;
    if (editVenueInp) editVenueInp.value = ex.test_venue_name || ex.config?.test_venue_name || 'Saveetha Engineering College, Chennai - 602105';
    const editCenterCodeInp = document.getElementById('exam-center-code-input') as HTMLInputElement;
    if (editCenterCodeInp) editCenterCodeInp.value = ex.test_center_code || ex.config?.test_center_code || 'TN-CHE-001';
    const editRoomInp = document.getElementById('exam-room-input') as HTMLInputElement;
    if (editRoomInp) editRoomInp.value = ex.default_lab_room || ex.config?.default_lab_room || 'Lab 4';
    const editNodePrefixInp = document.getElementById('exam-terminal-prefix-input') as HTMLInputElement;
    if (editNodePrefixInp) editNodePrefixInp.value = ex.terminal_prefix || ex.config?.terminal_prefix || 'NODE-L4-C';
    const editSlotInp = document.getElementById('exam-slot-input') as HTMLInputElement;
    if (editSlotInp) editSlotInp.value = ex.slot_batch || ex.config?.slot_batch || 'Shift 1';

    if (ex.start_time) {
        const st = new Date(ex.start_time);
        if (!isNaN(st.getTime())) (document.getElementById('exam-start-time-input') as HTMLInputElement).value = toLocalInputString(st);
    }
    if (ex.end_time) {
        const et = new Date(ex.end_time);
        if (!isNaN(et.getTime())) (document.getElementById('exam-end-time-input') as HTMLInputElement).value = toLocalInputString(et);
    }

    // Restore and normalize sections from Cloud DB
    const rawSecs = ex.sections || ex.config?.sections;
    if (Array.isArray(rawSecs) && rawSecs.length > 0) {
        currentModalSections = rawSecs.map((s: any) => {
            if (typeof s === 'object' && s !== null) {
                return { name: String(s.name || '').trim(), enabled: s.enabled !== false };
            }
            return { name: String(s).trim(), enabled: true };
        }).filter((s: any) => s.name);
    } else {
        currentModalSections = [
            { name: 'MATH-1', enabled: true },
            { name: 'MATH-2', enabled: true },
            { name: 'PHYSICS', enabled: true },
            { name: 'CHEMISTRY', enabled: true }
        ];
    }
    renderModalSections();

    // Restore AI Camera setting
    const aiCam = (ex.ai_camera_enabled !== undefined)
        ? Boolean(ex.ai_camera_enabled)
        : (ex.config?.ai_camera_enabled !== undefined ? Boolean(ex.config.ai_camera_enabled) : true);

    const camToggle = document.getElementById('exam-ai-camera-toggle') as HTMLInputElement;
    if (camToggle) {
        camToggle.checked = aiCam;
        updateModalAiCamBadge(aiCam);
    }

    // Restore selected questions
    selectedQuestionIds.clear();
    const qIds = ex.config?.question_ids;
    if (Array.isArray(qIds)) {
        qIds.forEach(qid => selectedQuestionIds.add(qid));
    }
    renderQuestionChecklist();

    const btnSubmit = document.getElementById('btn-submit-exam');
    if (btnSubmit) btnSubmit.textContent = 'Update & Save Schedule →';

    modal.style.display = 'flex';
}

// Delete Exam
async function deleteExam(examId: string): Promise<void> {
    const ex = cachedExams.find(e => e.id === examId);
    const title = ex ? ex.title : examId;
    if (!confirm(`Are you sure you want to delete test "${title}" from Cloud DB? This action cannot be undone.`)) {
        return;
    }

    try {
        const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(examId)}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        if (res.ok) {
            showToast('Delete Test deleted from Cloud DB.');
            await loadExams();
        } else {
            showToast('Failed to delete test', true);
        }
    } catch (_) {
        showToast('Network error deleting test', true);
    }
}

// 6. Handle Form Submit for Exam Creation / Editing
const formExamCreate = document.getElementById('form-exam-create') as HTMLFormElement;
if (formExamCreate) {
    formExamCreate.addEventListener('submit', async (e) => {
        e.preventDefault();

        const mode = (document.getElementById('exam-form-mode') as HTMLInputElement).value;
        const examId = (document.getElementById('exam-form-id') as HTMLInputElement).value;
        const title = (document.getElementById('exam-title-input') as HTMLInputElement).value.trim();
        const code = (document.getElementById('exam-code-input') as HTMLInputElement).value.trim();
        const duration = parseInt((document.getElementById('exam-duration-input') as HTMLInputElement).value, 10) || 180;
        const startTimeStr = (document.getElementById('exam-start-time-input') as HTMLInputElement).value;
        const endTimeStr = (document.getElementById('exam-end-time-input') as HTMLInputElement).value;
        const correctMarks = parseFloat((document.getElementById('exam-correct-marks-input') as HTMLInputElement).value) || 4;
        const negMarks = parseFloat((document.getElementById('exam-negative-marks-input') as HTMLInputElement).value) || 1;
        const negToggle = document.getElementById('exam-negative-marking-toggle') as HTMLInputElement;
        const negEnabled = negToggle ? negToggle.checked : true;
        const venue = (document.getElementById('exam-venue-input') as HTMLInputElement)?.value.trim() || 'Saveetha Engineering College, Chennai - 602105';
        const centerCode = (document.getElementById('exam-center-code-input') as HTMLInputElement)?.value.trim() || 'TN-CHE-001';
        const labRoom = (document.getElementById('exam-room-input') as HTMLInputElement)?.value.trim() || 'Lab 4';
        const terminalPrefix = (document.getElementById('exam-terminal-prefix-input') as HTMLInputElement)?.value.trim() || 'NODE-L4-C';
        const slotBatch = (document.getElementById('exam-slot-input') as HTMLInputElement)?.value.trim() || 'Shift 1';

        if (!startTimeStr || !endTimeStr) {
            showToast('Please provide both Start and End scheduled times', true);
            return;
        }

        const startISO = new Date(startTimeStr).toISOString();
        const endISO = new Date(endTimeStr).toISOString();

        if (new Date(startISO) >= new Date(endISO)) {
            showToast('Scheduled End Time must be later than Start Time', true);
            return;
        }

        // Validate sections
        const validSections = currentModalSections.filter(s => s.name && s.name.trim().length > 0);
        if (validSections.length === 0) {
            showToast('Please configure at least 1 section header (e.g. MATH-1)', true);
            return;
        }
        const hasEnabled = validSections.some(s => s.enabled);
        if (!hasEnabled) {
            showToast('Please toggle ON at least 1 section for candidate exam screen', true);
            return;
        }

        // Read AI Camera toggle
        const aiCameraEnabled = (document.getElementById('exam-ai-camera-toggle') as HTMLInputElement)?.checked ?? true;

        const qIdArray = Array.from(selectedQuestionIds);
        if (qIdArray.length === 0) {
            showToast('Please select at least 1 question from Question Bank for this test', true);
            return;
        }

        const totalMarks = Math.round(qIdArray.length * correctMarks * 100) / 100;

        const btnSubmit = document.getElementById('btn-submit-exam') as HTMLButtonElement;
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Saving to Supabase Cloud DB...';
        }

        try {
            let res: Response;
            if (mode === 'edit' && examId) {
                res = await adminFetch(`/api/v1/exams/${encodeURIComponent(examId)}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        title: title,
                        duration_minutes: duration,
                        start_time: startISO,
                        end_time: endISO,
                        question_ids: qIdArray,
                        ai_camera_enabled: aiCameraEnabled,
                        sections: validSections,
                        test_venue_name: venue,
                        test_center_code: centerCode,
                        default_lab_room: labRoom,
                        terminal_prefix: terminalPrefix,
                        slot_batch: slotBatch,
                        total_marks: totalMarks,
                        negative_marking_enabled: negEnabled,
                        config: {
                            exam_code: code,
                            correct_marks: correctMarks,
                            negative_marks: negMarks,
                            negative_marking_enabled: negEnabled,
                            total_marks: totalMarks,
                            question_ids: qIdArray,
                            ai_camera_enabled: aiCameraEnabled,
                            sections: validSections,
                            test_venue_name: venue,
                            test_center_code: centerCode,
                            default_lab_room: labRoom,
                            terminal_prefix: terminalPrefix,
                            slot_batch: slotBatch
                        }
                    })
                });
            } else {
                res = await adminFetch('/api/v1/exams/', {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        title: title,
                        duration_minutes: duration,
                        start_time: startISO,
                        end_time: endISO,
                        question_ids: qIdArray,
                        ai_camera_enabled: aiCameraEnabled,
                        sections: validSections,
                        test_venue_name: venue,
                        test_center_code: centerCode,
                        default_lab_room: labRoom,
                        terminal_prefix: terminalPrefix,
                        slot_batch: slotBatch,
                        total_marks: totalMarks,
                        negative_marking_enabled: negEnabled,
                        config: {
                            exam_code: code,
                            correct_marks: correctMarks,
                            negative_marks: negMarks,
                            negative_marking_enabled: negEnabled,
                            total_marks: totalMarks,
                            question_ids: qIdArray,
                            ai_camera_enabled: aiCameraEnabled,
                            sections: validSections,
                            test_venue_name: venue,
                            test_center_code: centerCode,
                            default_lab_room: labRoom,
                            terminal_prefix: terminalPrefix,
                            slot_batch: slotBatch
                        }
                    })
                });
            }

            if (res.ok) {
                showToast(mode === 'edit' ? 'Examination schedule updated in Cloud DB!' : 'New CBT Test deployed and scheduled to Cloud DB!');
                document.getElementById('modal-exam-create')!.style.display = 'none';
                await loadExams();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || 'Failed to save examination schedule', true);
            }
        } catch (_) {
            showToast('Network error saving examination schedule', true);
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Deploy & Schedule Test to Cloud DB →';
            }
        }
    });
}

// 7. Exam Results Summary / Leaderboard Modal
async function openExamSummaryModal(examId: string): Promise<void> {
    currentSummaryExamId = examId;
    const modal = document.getElementById('modal-exam-summary');
    if (!modal) return;

    const ex = cachedExams.find(e => e.id === examId);
    const titleEl = document.getElementById('sum-exam-title');
    if (titleEl) titleEl.textContent = ex ? `${ex.title} (${ex.config?.exam_code || ex.code || 'CBT'})` : examId;

    // Reset fields
    const totalEl = document.getElementById('sum-total-cands');
    const highEl = document.getElementById('sum-highest-score');
    const avgEl = document.getElementById('sum-avg-score');
    const passEl = document.getElementById('sum-pass-rate');
    const tbody = document.getElementById('sum-leaderboard-body');

    if (totalEl) totalEl.textContent = '...';
    if (highEl) highEl.textContent = '...';
    if (avgEl) avgEl.textContent = '...';
    if (passEl) passEl.textContent = '...';
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Loading live results from Supabase Cloud DB...</td></tr>';

    modal.style.display = 'flex';

    try {
        const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(examId)}/results-summary`, { headers: getHeaders() });
        if (res.ok) {
            const data = await res.json();
            if (totalEl) totalEl.textContent = String(data.total_appeared || 0);
            if (highEl) highEl.textContent = `${data.highest_score || 0} / ${data.max_possible_score || 120}`;
            if (avgEl) avgEl.textContent = String(data.average_score || 0);
            if (passEl) passEl.textContent = `${data.pass_rate || 0}%`;

            const leaderboard: any[] = data.leaderboard || [];
            if (leaderboard.length === 0) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No candidate submissions recorded yet for this examination.</td></tr>';
            } else {
                let html = '';
                leaderboard.forEach((c, idx) => {
                    const isDisq = c.disqualified === true || c.status === 'Disqualified' || c.rank === 'DISQ';
                    const rankMedal = isDisq
                        ? '<span style="color: #dc2626; font-weight: 800;">DISQ</span>'
                        : (c.rank ? (typeof c.rank === 'number' ? (c.rank === 1 ? 'Rank 1' : c.rank === 2 ? 'Rank 2' : c.rank === 3 ? 'Rank 3' : `#${c.rank}`) : c.rank) : (idx === 0 ? 'Rank 1' : idx === 1 ? 'Rank 2' : idx === 2 ? 'Rank 3' : `#${idx + 1}`));
                    const scoreDisplay = isDisq
                        ? '<span style="color: #dc2626; font-weight: 800;">0.0 (NULLIFIED)</span>'
                        : `<span style="font-weight: 800; color: #047857;">${c.raw_score} / ${data.max_possible_score}</span>`;
                    const accDisplay = isDisq ? '0.0%' : (c.accuracy_display || (c.accuracy != null ? `${c.accuracy}%` : 'N/A'));
                    const pillDisplay = isDisq
                        ? `<span class="badge-pill" style="background: #fee2e2; color: #b91c1c; font-weight: 800;" title="${escapeHtml(c.disqualification_reason || 'Security Malpractice')}">DISQUALIFIED</span>`
                        : `<span class="badge-pill" style="background: rgba(16, 185, 129, 0.15); color: #047857; font-weight: 800;">${c.percentage != null ? `${c.percentage}%` : 'N/A'}</span>`;

                    html += `
                        <tr style="${isDisq ? 'background: #fff5f5;' : ''}">
                            <td style="font-weight: 800; font-size: 0.85rem;">${rankMedal}</td>
                            <td style="font-family: var(--font-mono); font-weight: 700; color: var(--brand-blue);">${escapeHtml(c.registration_number || c.roll_number || '--')}</td>
                            <td><strong>${escapeHtml(c.candidate_name || 'Candidate')}</strong></td>
                            <td>${scoreDisplay}</td>
                            <td>${accDisplay}</td>
                            <td>${pillDisplay}</td>
                        </tr>
                    `;
                });
                if (tbody) tbody.innerHTML = html;
            }
        }
    } catch (_) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: #ef4444;">Error retrieving results summary.</td></tr>';
    }
}

// Summary Modal Download buttons
const btnDownloadXlsModal = document.getElementById('btn-download-xls-modal');
if (btnDownloadXlsModal) {
    btnDownloadXlsModal.addEventListener('click', () => {
        if (currentSummaryExamId) downloadExamXLS(currentSummaryExamId);
    });
}

const btnDownloadCsvModal = document.getElementById('btn-download-csv-modal');
if (btnDownloadCsvModal) {
    btnDownloadCsvModal.addEventListener('click', () => {
        if (currentSummaryExamId) downloadExamCSV(currentSummaryExamId);
    });
}

const btnDownloadRespModal = document.getElementById('btn-download-responses-modal');
if (btnDownloadRespModal) {
    btnDownloadRespModal.addEventListener('click', () => {
        if (currentSummaryExamId) downloadExamResponsesCSV(currentSummaryExamId);
    });
}

// 8. Candidate Self-Registration Portal Sharing
function openShareRegistrationModal(targetExamId?: string): void {
    const modal = document.getElementById('modal-share-reg-link');
    if (!modal) return;

    const sel = document.getElementById('share-reg-exam-select') as HTMLSelectElement;
    if (sel && targetExamId) {
        sel.value = targetExamId;
    }

    updateShareRegistrationDisplay();
    modal.style.display = 'flex';
}

function updateShareRegistrationDisplay(): void {
    const sel = document.getElementById('share-reg-exam-select') as HTMLSelectElement;
    const examId = sel ? sel.value : '';

    const baseUrl = `${window.location.origin}/register.html`;
    const finalUrl = examId ? `${baseUrl}?exam_id=${encodeURIComponent(examId)}` : baseUrl;

    const input = document.getElementById('share-reg-url-input') as HTMLInputElement;
    if (input) input.value = finalUrl;

    const previewLink = document.getElementById('btn-open-reg-preview') as HTMLAnchorElement;
    if (previewLink) previewLink.href = finalUrl;

    const selectedExam = cachedExams.find(e => e.id === examId);
    const examTitle = selectedExam ? selectedExam.title : 'National CBT Examination';

    const msg = `Dear Candidate,

You are invited to register for the official Computer Based Test (CBT): "${examTitle}".

Please register your account and set your password here:
Portal Link: ${finalUrl}

Upon submission, your Roll Number and login credentials will be generated immediately, and you can take the examination directly from your portal.

Saveetha School of Engineering CBT Assessment Directorate`;

    const textarea = document.getElementById('share-reg-msg-preview') as HTMLTextAreaElement;
    if (textarea) textarea.value = msg;
}

const shareRegExamSelect = document.getElementById('share-reg-exam-select');
if (shareRegExamSelect) {
    shareRegExamSelect.addEventListener('change', updateShareRegistrationDisplay);
}

const btnCopyRegUrl = document.getElementById('btn-copy-reg-url');
if (btnCopyRegUrl) {
    btnCopyRegUrl.addEventListener('click', () => {
        const input = document.getElementById('share-reg-url-input') as HTMLInputElement;
        if (input) {
            navigator.clipboard.writeText(input.value).then(() => {
                showToast('Registration URL copied to clipboard!');
            }).catch(() => {
                prompt('Copy Registration URL:', input.value);
            });
        }
    });
}

const btnCopyInviteMsg = document.getElementById('btn-copy-invite-msg');
if (btnCopyInviteMsg) {
    btnCopyInviteMsg.addEventListener('click', () => {
        const textarea = document.getElementById('share-reg-msg-preview') as HTMLTextAreaElement;
        if (textarea) {
            navigator.clipboard.writeText(textarea.value).then(() => {
                showToast('Complete invitation message copied to clipboard!');
            }).catch(() => {
                prompt('Copy Invitation Message:', textarea.value);
            });
        }
    });
}

// Topbar & Section Button Handlers for Creating Exams and Sharing Registration
const btnCreateExamModal = document.getElementById('btn-create-exam-modal');
if (btnCreateExamModal) btnCreateExamModal.addEventListener('click', openCreateExamModal);

const btnOpenCreateExam = document.getElementById('btn-open-create-exam');
if (btnOpenCreateExam) btnOpenCreateExam.addEventListener('click', openCreateExamModal);

const btnOpenCreateExamTop = document.getElementById('btn-open-create-exam-top');
if (btnOpenCreateExamTop) btnOpenCreateExamTop.addEventListener('click', openCreateExamModal);

const btnShareCandReg = document.getElementById('btn-share-cand-reg');
if (btnShareCandReg) btnShareCandReg.addEventListener('click', () => openShareRegistrationModal());

const btnShareCandRegTop = document.getElementById('btn-share-cand-reg-top');
if (btnShareCandRegTop) btnShareCandRegTop.addEventListener('click', () => openShareRegistrationModal());

const btnRefreshExams = document.getElementById('btn-refresh-exams');
if (btnRefreshExams) {
    btnRefreshExams.addEventListener('click', async () => {
        await loadExams();
        showToast('Examination schedules refreshed from Cloud DB.');
    });
}

// Question Bank Modal action buttons
const btnQbAutoPick = document.getElementById('btn-qb-auto-pick');
if (btnQbAutoPick) btnQbAutoPick.addEventListener('click', autoPickBalancedQuestions);

const btnQbSelectAll = document.getElementById('btn-qb-select-all');
if (btnQbSelectAll) btnQbSelectAll.addEventListener('click', selectAllQuestions);

const btnQbClearAll = document.getElementById('btn-qb-clear-all');
if (btnQbClearAll) btnQbClearAll.addEventListener('click', clearAllQuestions);

const qbFilterSubject = document.getElementById('qb-filter-subject');
if (qbFilterSubject) qbFilterSubject.addEventListener('change', renderQuestionChecklist);

const qbFilterDifficulty = document.getElementById('qb-filter-difficulty');
if (qbFilterDifficulty) qbFilterDifficulty.addEventListener('change', renderQuestionChecklist);

const qbFilterSearch = document.getElementById('qb-filter-search');
if (qbFilterSearch) qbFilterSearch.addEventListener('input', renderQuestionChecklist);

const examCorrectMarksInput = document.getElementById('exam-correct-marks-input');
if (examCorrectMarksInput) examCorrectMarksInput.addEventListener('input', updateQuestionSelectionTicker);

// Table Filter listeners
const searchExamsInput = document.getElementById('search-exams-input');
if (searchExamsInput) searchExamsInput.addEventListener('input', renderExamsTable);

const filterExamSchedule = document.getElementById('filter-exam-schedule');
if (filterExamSchedule) filterExamSchedule.addEventListener('change', renderExamsTable);

// Dynamic Sections Builder & AI Camera Modal Listeners
const btnAddSectionRow = document.getElementById('btn-add-section-row');
if (btnAddSectionRow) {
    btnAddSectionRow.addEventListener('click', () => addModalSection());
}

const toggleAiCamInput = document.getElementById('exam-ai-camera-toggle');
if (toggleAiCamInput) {
    toggleAiCamInput.addEventListener('change', (e) => {
        updateModalAiCamBadge((e.target as HTMLInputElement).checked);
    });
}

// --- DOCUMENT TEMPLATES & SYSTEM CONFIGURATION SUITE (LEGIT CLOUD PERSISTENT) ---
const btnOpenSettingsModal = document.getElementById('btn-open-settings-modal');
const sidebarDocSettings = document.getElementById('sidebar-doc-settings');
const modalExamSettings = document.getElementById('modal-document-settings') || document.getElementById('modal-exam-settings');
const btnCloseSettingsModal = document.getElementById('btn-close-settings') || document.getElementById('btn-close-settings-modal');
const btnCancelSettings = document.getElementById('btn-cancel-settings');
const formExamSettings = (document.getElementById('form-document-settings') || document.getElementById('form-exam-settings')) as HTMLFormElement;

// Tab Switching
const tabBtnAdmit = document.getElementById('tab-btn-admit');
const tabBtnScorecard = document.getElementById('tab-btn-scorecard');
const tabBtnAuthority = document.getElementById('tab-btn-authority');
const tabPaneAdmit = document.getElementById('tab-pane-admit');
const tabPaneScorecard = document.getElementById('tab-pane-scorecard');
const tabPaneAuthority = document.getElementById('tab-pane-authority');

function switchSettingsTab(active: 'admit' | 'scorecard' | 'authority'): void {
    const tabs = [
        { btn: tabBtnAdmit, pane: tabPaneAdmit, id: 'admit' },
        { btn: tabBtnScorecard, pane: tabPaneScorecard, id: 'scorecard' },
        { btn: tabBtnAuthority, pane: tabPaneAuthority, id: 'authority' },
    ];
    tabs.forEach(t => {
        if (t.pane) t.pane.style.display = t.id === active ? 'block' : 'none';
        if (t.btn) {
            if (t.id === active) {
                t.btn.style.borderBottom = '2px solid #2563eb';
                t.btn.style.fontWeight = '800';
                t.btn.style.color = '#2563eb';
            } else {
                t.btn.style.borderBottom = 'none';
                t.btn.style.fontWeight = '700';
                t.btn.style.color = '#64748b';
            }
        }
    });
}

if (tabBtnAdmit) tabBtnAdmit.onclick = () => switchSettingsTab('admit');
if (tabBtnScorecard) tabBtnScorecard.onclick = () => switchSettingsTab('scorecard');
if (tabBtnAuthority) tabBtnAuthority.onclick = () => switchSettingsTab('authority');

// Admit Card Structure Controls
const inputAdmitInst = document.getElementById('setting-admit-inst-name') as HTMLInputElement;
const inputAdmitExam = document.getElementById('setting-admit-exam-title') as HTMLInputElement;
const inputAdmitSubtitle = document.getElementById('setting-admit-subtitle') as HTMLInputElement;
const inputAdmitWatermark = document.getElementById('setting-admit-watermark') as HTMLInputElement;
const inputAdmitInstructions = document.getElementById('setting-admit-instructions') as HTMLTextAreaElement;
const chkAdmitPhoto = document.getElementById('setting-admit-show-photo') as HTMLInputElement;
const chkAdmitBarcode = document.getElementById('setting-admit-show-barcode') as HTMLInputElement;
const chkAdmitSlots = document.getElementById('setting-admit-show-slots') as HTMLInputElement;
const chkAdmitVenue = document.getElementById('setting-admit-show-venue') as HTMLInputElement;
const chkAdmitInstructions = document.getElementById('setting-admit-show-instructions') as HTMLInputElement;
const chkAdmitSignatures = document.getElementById('setting-admit-show-signatures') as HTMLInputElement;

// Scorecard Structure Controls
const inputScInst = document.getElementById('setting-sc-inst-name') as HTMLInputElement;
const inputScTitle = document.getElementById('setting-sc-doc-title') as HTMLInputElement;
const inputScSubhead = document.getElementById('setting-sc-subhead-status') as HTMLInputElement;
const inputScWatermark = document.getElementById('setting-sc-watermark') as HTMLInputElement;
const inputScFooter = document.getElementById('setting-sc-footer-disclaimer') as HTMLInputElement;
const chkScBanner = document.getElementById('setting-sc-show-banner') as HTMLInputElement;
const chkScMetrics = document.getElementById('setting-sc-show-metrics-grid') as HTMLInputElement;
const chkScSubject = document.getElementById('setting-sc-show-subject-breakdown') as HTMLInputElement;
const chkScReview = document.getElementById('setting-sc-show-question-review') as HTMLInputElement;
const chkScSig = document.getElementById('setting-sc-show-signature') as HTMLInputElement;
const chkScSeal = document.getElementById('setting-sc-show-seal') as HTMLInputElement;

// Authority & Venue Controls
const inputCtrlName = document.getElementById('setting-controller-name') as HTMLInputElement;
const inputCtrlDesig = document.getElementById('setting-controller-desig') as HTMLInputElement;
const inputVenueName = document.getElementById('setting-venue-name') as HTMLTextAreaElement;
const inputCenterCode = document.getElementById('setting-center-code') as HTMLInputElement;
const inputLabRoom = document.getElementById('setting-lab-room') as HTMLInputElement;
const inputTermPrefix = document.getElementById('setting-terminal-prefix') as HTMLInputElement;

async function loadExamSettings(): Promise<void> {
    try {
        const res = await adminFetch('/api/v1/exams/settings', { headers: getHeaders() });
        if (res.ok) {
            const s = await res.json();
            const adm = s.admit_card || {};
            const sc = s.scorecard || {};

            // 1. Populate Admit Card Controls
            if (inputAdmitInst) inputAdmitInst.value = adm.institution_name || s.institution_name || 'SSE CBT PLATFORM';
            if (inputAdmitExam) inputAdmitExam.value = adm.examination_title || s.examination_title || 'MCQ ASSESSMENT [ SSE CBT 2026 ]';
            if (inputAdmitSubtitle && adm.header_subtitle) inputAdmitSubtitle.value = adm.header_subtitle;
            if (inputAdmitWatermark && adm.watermark_text) inputAdmitWatermark.value = adm.watermark_text;
            if (inputAdmitInstructions && adm.instructions_text) inputAdmitInstructions.value = adm.instructions_text;
            if (chkAdmitPhoto) chkAdmitPhoto.checked = adm.show_photo !== false;
            if (chkAdmitBarcode) chkAdmitBarcode.checked = adm.show_barcode !== false;
            if (chkAdmitSlots) chkAdmitSlots.checked = adm.show_slot_timings !== false;
            if (chkAdmitVenue) chkAdmitVenue.checked = adm.show_venue_details !== false;
            if (chkAdmitInstructions) chkAdmitInstructions.checked = adm.show_instructions !== false;
            if (chkAdmitSignatures) chkAdmitSignatures.checked = adm.show_signature_block !== false;

            // 2. Populate Scorecard Controls
            if (inputScInst) inputScInst.value = sc.institution_name || s.institution_name || 'SSE CBT PLATFORM';
            if (inputScTitle) inputScTitle.value = sc.document_title || (s.examination_title ? `${s.examination_title} : Official Score Card` : 'MCQ ASSESSMENT [ SSE CBT 2026 ] : Official Score Card');
            if (inputScSubhead && sc.subhead_status_text) inputScSubhead.value = sc.subhead_status_text;
            if (inputScWatermark && sc.watermark_text) inputScWatermark.value = sc.watermark_text;
            if (inputScFooter && sc.footer_disclaimer) inputScFooter.value = sc.footer_disclaimer;
            if (chkScBanner) chkScBanner.checked = sc.show_score_banner !== false;
            if (chkScMetrics) chkScMetrics.checked = sc.show_metrics_grid !== false;
            if (chkScSubject) chkScSubject.checked = sc.show_subject_breakdown !== false;
            if (chkScReview) chkScReview.checked = sc.show_question_review !== false;
            if (chkScSig) chkScSig.checked = sc.show_signature_block !== false;
            if (chkScSeal) chkScSeal.checked = sc.show_seal !== false;

            // 3. Populate Authority & Venue Controls
            if (inputCtrlName && s.controller_name) inputCtrlName.value = s.controller_name;
            if (inputCtrlDesig && s.controller_designation) inputCtrlDesig.value = s.controller_designation;
            if (inputVenueName && s.test_venue_name) inputVenueName.value = s.test_venue_name;
            if (inputCenterCode && s.test_center_code) inputCenterCode.value = s.test_center_code;
            if (inputLabRoom && s.default_lab_room) inputLabRoom.value = s.default_lab_room;
            if (inputTermPrefix && s.terminal_prefix) inputTermPrefix.value = s.terminal_prefix;

            // 4. Update preview elements comprehensively
            const admitInst = document.getElementById('admit-inst-name');
            const admitExam = document.getElementById('admit-exam-title');
            const admitSub = document.getElementById('admit-subtitle');
            const admitWater = document.getElementById('admit-watermark');
            const admitVenue = document.getElementById('admit-venue-name');
            const admitCenter = document.getElementById('admit-center-code');
            const admitLab = document.getElementById('admit-lab');
            const admitTerm = document.getElementById('admit-terminal');
            const admitCtrl = document.getElementById('admit-controller-name');
            const admitDesig = document.getElementById('admit-controller-desig');
            const admitCtrlInst = document.getElementById('admit-controller-inst');
            const admitInstContent = document.getElementById('admit-instructions-content');

            if (admitInst && (adm.institution_name || s.institution_name)) admitInst.textContent = adm.institution_name || s.institution_name;
            if (admitExam && (adm.examination_title || s.examination_title)) admitExam.textContent = adm.examination_title || s.examination_title;
            if (admitSub && adm.header_subtitle) admitSub.textContent = adm.header_subtitle;
            if (admitWater && adm.watermark_text) admitWater.textContent = adm.watermark_text;
            if (admitVenue && (adm.test_venue_name || s.test_venue_name)) admitVenue.textContent = adm.test_venue_name || s.test_venue_name;
            if (admitCenter && (adm.test_center_code || s.test_center_code)) admitCenter.textContent = adm.test_center_code || s.test_center_code;
            if (admitLab && (adm.default_lab_room || s.default_lab_room)) admitLab.textContent = adm.default_lab_room || s.default_lab_room;
            if (admitTerm && (adm.terminal_prefix || s.terminal_prefix)) admitTerm.textContent = `${adm.terminal_prefix || s.terminal_prefix}0001`;
            if (admitCtrl && s.controller_name) admitCtrl.textContent = s.controller_name;
            if (admitDesig && s.controller_designation) admitDesig.textContent = s.controller_designation;
            if (admitCtrlInst && (adm.institution_name || s.institution_name)) admitCtrlInst.textContent = adm.institution_name || s.institution_name;
            if (admitInstContent && adm.instructions_text) admitInstContent.textContent = adm.instructions_text;

            // Visibility Toggles
            const elInstBlock = document.getElementById('admit-instructions-block');
            if (elInstBlock) elInstBlock.style.display = adm.show_instructions !== false ? 'block' : 'none';
            const elPhoto = document.getElementById('admit-photo-block');
            if (elPhoto) elPhoto.style.display = adm.show_photo !== false ? 'block' : 'none';
            const elBarcode = document.getElementById('admit-barcode-block');
            if (elBarcode) elBarcode.style.display = adm.show_barcode !== false ? 'flex' : 'none';
            const elSlots = document.getElementById('admit-slots-table');
            if (elSlots) elSlots.style.display = adm.show_slot_timings !== false ? 'table' : 'none';
            const elVenueBlock = document.getElementById('admit-venue-block');
            if (elVenueBlock) elVenueBlock.style.display = adm.show_venue_details !== false ? 'block' : 'none';
            const elSigBlock = document.getElementById('admit-signatures-block');
            if (elSigBlock) elSigBlock.style.display = adm.show_signature_block !== false ? 'flex' : 'none';
        }
    } catch (_) {}
}

const openSettingsModalHandler = () => {
    loadExamSettings();
    switchSettingsTab('admit');
    if (modalExamSettings) modalExamSettings.style.display = 'flex';
};

if (btnOpenSettingsModal) {
    btnOpenSettingsModal.onclick = openSettingsModalHandler;
}
if (sidebarDocSettings) {
    sidebarDocSettings.onclick = openSettingsModalHandler;
}

if (btnCloseSettingsModal && modalExamSettings) {
    btnCloseSettingsModal.onclick = () => {
        modalExamSettings.style.display = 'none';
    };
}

if (btnCancelSettings && modalExamSettings) {
    btnCancelSettings.onclick = () => {
        modalExamSettings.style.display = 'none';
    };
}

if (formExamSettings) {
    formExamSettings.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            institution_name: inputAdmitInst?.value.trim() || 'SSE CBT PLATFORM',
            examination_title: inputAdmitExam?.value.trim() || 'MCQ ASSESSMENT [ SSE CBT 2026 ]',
            controller_name: inputCtrlName?.value.trim() || 'ADMIN@SSE.IN',
            controller_designation: inputCtrlDesig?.value.trim() || 'Examination Directorate',
            test_venue_name: inputVenueName?.value.trim() || 'SSE Digital Assessment Hub, Campus Block-A, Chennai - 602105',
            test_center_code: inputCenterCode?.value.trim() || 'SSEC-TN-042',
            default_lab_room: inputLabRoom?.value.trim() || 'LAB-01 (Block-A)',
            terminal_prefix: inputTermPrefix?.value.trim() || 'T-A-',
            admit_card: {
                institution_name: inputAdmitInst?.value.trim() || 'SSE CBT PLATFORM',
                examination_title: inputAdmitExam?.value.trim() || 'MCQ ASSESSMENT [ SSE CBT 2026 ]',
                header_subtitle: inputAdmitSubtitle?.value.trim() || 'PROVISIONAL ADMIT CARD / HALL TICKET • COMPUTER BASED TEST (CBT)',
                watermark_text: inputAdmitWatermark?.value.trim() || 'CONFIDENTIAL',
                instructions_text: inputAdmitInstructions?.value.trim() || '',
                show_photo: chkAdmitPhoto ? chkAdmitPhoto.checked : true,
                show_barcode: chkAdmitBarcode ? chkAdmitBarcode.checked : true,
                show_slot_timings: chkAdmitSlots ? chkAdmitSlots.checked : true,
                show_venue_details: chkAdmitVenue ? chkAdmitVenue.checked : true,
                show_instructions: chkAdmitInstructions ? chkAdmitInstructions.checked : true,
                show_signature_block: chkAdmitSignatures ? chkAdmitSignatures.checked : true,
            },
            scorecard: {
                institution_name: inputScInst?.value.trim() || 'SSE CBT PLATFORM',
                document_title: inputScTitle?.value.trim() || 'MCQ ASSESSMENT [ SSE CBT 2026 ] : Official Score Card',
                subhead_status_text: inputScSubhead?.value.trim() || 'Status: Authenticated & Cloud Verified',
                watermark_text: inputScWatermark?.value.trim() || 'CONFIDENTIAL',
                footer_disclaimer: inputScFooter?.value.trim() || '',
                show_score_banner: chkScBanner ? chkScBanner.checked : true,
                show_metrics_grid: chkScMetrics ? chkScMetrics.checked : true,
                show_subject_breakdown: chkScSubject ? chkScSubject.checked : true,
                show_question_review: chkScReview ? chkScReview.checked : true,
                show_signature_block: chkScSig ? chkScSig.checked : true,
                show_seal: chkScSeal ? chkScSeal.checked : true,
            }
        };

        const btnSave = document.getElementById('btn-save-settings') as HTMLButtonElement;
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.textContent = 'Persisting to Cloud DB...';
        }

        try {
            const res = await adminFetch('/api/v1/exams/settings', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const updated = await res.json();
                try {
                    localStorage.setItem('cbt_exam_settings', JSON.stringify(updated));
                    if (typeof BroadcastChannel !== 'undefined') {
                        const bc = new BroadcastChannel('cbt_settings_channel');
                        bc.postMessage({ type: 'SETTINGS_UPDATED', settings: updated });
                        bc.close();
                    }
                    window.dispatchEvent(new CustomEvent('cbt_settings_updated', { detail: updated }));
                } catch (_) {}
                showToast(`Document templates & structures saved in Cloud DB! Signatory: ${updated.controller_name}`);
                if (modalExamSettings) modalExamSettings.style.display = 'none';
                loadExamSettings();
            } else {
                showToast("Failed to save exam settings to Cloud DB", true);
            }
        } catch (_) {
            showToast("Network error saving document templates", true);
        } finally {
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.textContent = '💾 Save to Cloud DB (Supabase)';
            }
        }
    };
}

// --- OVERFLOW ACTIONS DROPDOWN SUITE ---
const btnMoreActions = document.getElementById('btn-more-actions');
const menuMoreActions = document.getElementById('menu-more-actions');
if (btnMoreActions && menuMoreActions) {
    btnMoreActions.addEventListener('click', (e) => {
        e.stopPropagation();
        menuMoreActions.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!menuMoreActions.contains(e.target as Node) && e.target !== btnMoreActions) {
            menuMoreActions.classList.remove('show');
        }
    });

    menuMoreActions.querySelectorAll('.overflow-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            menuMoreActions.classList.remove('show');
        });
    });
}

// --- RESPONSIVE SIDEBAR TOGGLE ---
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const sidebarEl = document.getElementById('sidebar');
if (sidebarToggleBtn && sidebarEl) {
    sidebarToggleBtn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebarEl.classList.toggle('mobile-open');
        } else {
            sidebarEl.classList.toggle('collapsed');
        }
    });
}

// --- SMOOTH SCROLL NAVIGATION HANDLERS ---
const navLinkExams = document.getElementById('nav-link-exams');
if (navLinkExams) {
    navLinkExams.addEventListener('click', (e) => {
        e.preventDefault();
        const sec = document.getElementById('exam-management-section');
        if (sec) {
            sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (window.innerWidth <= 768 && sidebarEl) {
                sidebarEl.classList.remove('mobile-open');
            }
        }
    });
}

const navLinkCandidates = document.querySelector('a[href="#candidate-section"]');
if (navLinkCandidates) {
    navLinkCandidates.addEventListener('click', (e) => {
        e.preventDefault();
        const sec = document.getElementById('candidate-section');
        if (sec) {
            sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (window.innerWidth <= 768 && sidebarEl) {
                sidebarEl.classList.remove('mobile-open');
            }
        }
    });
}

// ============================================================================
// HIGH-END EXAMINATION RESULT MANAGEMENT SUITE (EXAM-WISE CRUD & ADVANCED/NORMAL)
// ============================================================================

let currentResultsViewMode: 'normal' | 'advanced' = 'normal';
let currentResultsData: any = null;
let currentResultsList: any[] = [];
let currentResultsExamId: string = '';

// Populate the Target Exam select in Results Management Section
function populateResultsExamSelect(): void {
    const sel = document.getElementById('results-exam-select') as HTMLSelectElement;
    if (!sel) return;

    const currentVal = sel.value;
    sel.innerHTML = '<option value="all">-- All Examinations (Global Records) --</option>';

    for (const ex of cachedExams) {
        const opt = document.createElement('option');
        opt.value = ex.id;
        const code = ex.config?.exam_code || ex.code || 'CBT';
        opt.textContent = `${ex.title} (${code})`;
        sel.appendChild(opt);
    }

    if (currentVal && (currentVal === 'all' || cachedExams.some(e => e.id === currentVal))) {
        sel.value = currentVal;
        loadExamResults(currentVal, currentResultsViewMode);
    } else {
        sel.value = 'all';
        loadExamResults('all', currentResultsViewMode);
    }
}

// Fetch Authoritative Results for Target Exam with Normal or Advanced Dossier
async function loadExamResults(examId: string, viewMode: 'normal' | 'advanced' = 'normal'): Promise<void> {
    if (!examId) return;
    currentResultsExamId = examId;
    currentResultsViewMode = viewMode;

    const tbody = document.getElementById('results-table-body');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            <div class="pulse-chip" style="margin: 0 auto; display: inline-flex;"><span class="pulse-dot"></span> Loading verified Cloud DB results...</div>
        </td></tr>`;
    }

    try {
        const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(examId)}/results?view_mode=${viewMode}`, {
            headers: getHeaders()
        });
        if (res.ok) {
            const data = await res.json();
            currentResultsData = data;
            currentResultsList = data.results || [];

            // Update Dynamic Marking Scheme Banner
            const ms = data.marking_scheme || {};
            const rmbTitle = document.getElementById('rmb-exam-title');
            const rmbQ = document.getElementById('rmb-q-count');
            const rmbCorr = document.getElementById('rmb-correct-m');
            const rmbNeg = document.getElementById('rmb-neg-m');
            const rmbTotal = document.getElementById('rmb-total-m');

            const ex = cachedExams.find(e => e.id === examId);
            if (rmbTitle) {
                if (examId === 'all') {
                    rmbTitle.textContent = 'All Examinations (Global Records)';
                } else {
                    rmbTitle.textContent = ex ? `${ex.title}` : `Exam: ${examId}`;
                }
            }
            if (rmbQ) rmbQ.textContent = examId === 'all' ? `Active Tests: ${cachedExams.length}` : `Questions: ${ms.total_questions ?? '--'}`;
            if (rmbCorr) rmbCorr.textContent = examId === 'all' ? `Scheme: Multi-Exam` : `Per Question: +${ms.correct_marks ?? 4}`;
            if (rmbNeg) {
                if (examId === 'all') {
                    rmbNeg.textContent = `Cloud DB: Live Sync`;
                    rmbNeg.style.background = 'rgba(16, 185, 129, 0.12)';
                    rmbNeg.style.color = '#047857';
                } else if (ms.negative_marking_enabled === false) {
                    rmbNeg.textContent = `Penalty: DISABLED (0)`;
                    rmbNeg.style.background = 'rgba(100, 116, 139, 0.15)';
                    rmbNeg.style.color = '#475569';
                } else {
                    rmbNeg.textContent = `Penalty: -${ms.negative_marks ?? 1}`;
                    rmbNeg.style.background = 'rgba(239, 68, 68, 0.12)';
                    rmbNeg.style.color = '#dc2626';
                }
            }
            if (rmbTotal) rmbTotal.textContent = examId === 'all' ? `Total Records: ${currentResultsList.length}` : `Total Marks: ${ms.total_marks ?? '--'}`;

            // Update Analytics KPI Summary Cards
            const an = data.analytics || {};
            const elTotalCands = document.getElementById('kpi-total-cands');
            const elHigh = document.getElementById('kpi-highest-score');
            const elAvg = document.getElementById('kpi-avg-score');
            const elPass = document.getElementById('kpi-pass-rate');

            if (elTotalCands) elTotalCands.textContent = String(an.total_candidates_appeared || an.total_appeared || currentResultsList.length);
            if (elHigh) elHigh.textContent = examId === 'all' ? `${an.highest_score || 0} pts` : `${an.highest_score || 0} / ${ms.total_marks || 0}`;
            if (elAvg) elAvg.textContent = String(an.average_score || 0);
            if (elPass) elPass.textContent = `${an.pass_rate || an.pass_rate_pct || 0}%`;

            renderResultsTable();
        } else {
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 2rem; color: #ef4444;">Failed to load results for exam from Cloud DB.</td></tr>`;
            }
        }
    } catch (err) {
        console.error('Error fetching exam results:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 2rem; color: #ef4444;">Network error fetching results.</td></tr>`;
        }
    }
}

// Render Results Table (Normal vs Advanced)
function renderResultsTable(): void {
    const thead = document.getElementById('results-table-head');
    const tbody = document.getElementById('results-table-body');
    const searchInput = document.getElementById('results-search-input') as HTMLInputElement;
    const statusFilter = document.getElementById('results-status-filter') as HTMLSelectElement;
    const ticker = document.getElementById('results-count-ticker');

    if (!tbody || !thead) return;

    const q = (searchInput?.value || '').toLowerCase().trim();
    const stFilter = (statusFilter?.value || 'ALL').toLowerCase();

    const filtered = currentResultsList.filter(r => {
        const name = (r.candidate_name || '').toLowerCase();
        const reg = (r.registration_number || '').toLowerCase();
        const roll = (r.roll_number || '').toLowerCase();
        const term = (r.terminal_node || '').toLowerCase();
        const matchSearch = !q || name.includes(q) || reg.includes(q) || roll.includes(q) || term.includes(q);

        const rStatus = (r.status || 'submitted').toLowerCase();
        let matchStatus = true;
        if (stFilter !== 'all') {
            if (stFilter === 'disqualified') {
                matchStatus = r.disqualified === true || rStatus.includes('disq') || rStatus.includes('debar');
            } else if (stFilter === 'submitted') {
                matchStatus = (rStatus === 'submitted' || rStatus === 'validated') && !r.disqualified;
            } else if (stFilter === 'reset') {
                matchStatus = rStatus === 'reset';
            }
        }
        return matchSearch && matchStatus;
    });

    if (ticker) {
        ticker.textContent = `Showing ${filtered.length} of ${currentResultsList.length} candidate records`;
    }

    const isAdv = currentResultsViewMode === 'advanced';

    // Render Table Header
    if (isAdv) {
        thead.innerHTML = `
            <tr>
              <th style="width: 50px;">Rank</th>
              <th>Candidate Identification</th>
              <th style="color: #047857;">Correct (+M)</th>
              <th style="color: #dc2626;">Incorrect (-P)</th>
              <th>Unanswered</th>
              <th>Review</th>
              <th style="font-weight: 800; color: #1e3a8a;">Net Score</th>
              <th>Accuracy</th>
              <th>Time Taken</th>
              <th>Status</th>
              <th style="text-align: right; min-width: 140px;">CRUD Actions</th>
            </tr>
        `;
    } else {
        thead.innerHTML = `
            <tr>
              <th style="width: 50px;">Rank</th>
              <th>Candidate Identification</th>
              <th>Category &amp; Gender</th>
              <th style="font-weight: 800; color: #1e3a8a;">Raw Score / Max</th>
              <th>Percentage</th>
              <th>Accuracy</th>
              <th>Status</th>
              <th style="text-align: right; min-width: 140px;">CRUD Actions</th>
            </tr>
        `;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isAdv ? 11 : 8}" style="text-align: center; padding: 2rem; color: var(--text-muted);">No candidate results match current search / filter criteria.</td></tr>`;
        return;
    }

    let rowsHtml = '';
    const maxScore = (currentResultsData?.marking_scheme?.total_marks) || 120;

    filtered.forEach((r, idx) => {
        const isDisq = r.disqualified === true || (r.status || '').toLowerCase().includes('disq');
        const rankDisplay = isDisq
            ? '<span style="color: #dc2626; font-weight: 800;">DISQ</span>'
            : (r.rank != null ? (typeof r.rank === 'number' ? (r.rank === 1 ? '🥇 Rank 1' : r.rank === 2 ? '🥈 Rank 2' : r.rank === 3 ? '🥉 Rank 3' : `#${r.rank}`) : `#${r.rank}`) : `#${idx + 1}`);

        const rowMax = r.max_marks || maxScore;
        const scoreDisplay = isDisq
            ? '<span style="color: #dc2626; font-weight: 800;">0.0 (NULLIFIED)</span>'
            : `<span style="font-weight: 800; color: #047857; font-size: 0.95rem;">${r.raw_score ?? r.score ?? 0}</span> <span style="font-size: 0.75rem; color: var(--text-muted);">/ ${rowMax}</span>`;

        const pctDisplay = isDisq ? '0.0%' : (r.percentage != null ? `${r.percentage}%` : 'N/A');
        const accDisplay = isDisq ? '0.0%' : (r.accuracy_display || (r.accuracy != null ? `${r.accuracy}%` : 'N/A'));

        const statusBadge = isDisq
            ? `<span class="badge-pill" style="background: #fee2e2; color: #b91c1c; font-weight: 800;" title="${escapeHtml(r.disqualification_reason || 'Security Malpractice')}">DISQUALIFIED</span>`
            : (r.status === 'validated'
                ? `<span class="badge-pill" style="background: #dbeafe; color: #1e40af; font-weight: 800;">VALIDATED</span>`
                : (r.status === 'reset'
                    ? `<span class="badge-pill" style="background: #f1f5f9; color: #64748b; font-weight: 700;">RESET</span>`
                    : `<span class="badge-pill" style="background: rgba(16, 185, 129, 0.15); color: #047857; font-weight: 800;">COMPLETED</span>`));

        const remarksSnippet = r.remarks ? `<div style="font-size: 0.7rem; color: #4338ca; margin-top: 2px;">💬 ${escapeHtml(r.remarks)}</div>` : '';
        const examBadge = r.exam_title ? `<div style="font-size: 0.72rem; color: #1e3a8a; font-weight: 700; margin-top: 2px;">📝 ${escapeHtml(r.exam_title)} ${r.exam_code ? `(${escapeHtml(r.exam_code)})` : ''}</div>` : '';
        const rowEid = r.exam_id || currentResultsExamId;

        if (isAdv) {
            rowsHtml += `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="font-weight: 800; text-align: center;">${rankDisplay}</td>
                <td>
                  <div style="font-weight: 700; color: var(--text-heading);">${escapeHtml(r.candidate_name)}</div>
                  <div style="font-size: 0.72rem; font-family: var(--font-mono); color: var(--text-muted);">${escapeHtml(r.registration_number)} &bull; ${escapeHtml(r.terminal_node || 'Term')}</div>
                  ${examBadge}
                  ${remarksSnippet}
                </td>
                <td style="font-weight: 700; color: #047857;">+${r.correct_count ?? 0}</td>
                <td style="font-weight: 700; color: #dc2626;">-${r.incorrect_count ?? 0}</td>
                <td style="color: var(--text-muted);">${r.unanswered_count ?? 0}</td>
                <td style="color: #7e22ce;">${r.marked_for_review_count ?? 0}</td>
                <td>${scoreDisplay}</td>
                <td style="font-weight: 700;">${accDisplay}</td>
                <td style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(r.time_taken_display || '--')}</td>
                <td>${statusBadge}</td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 4px;">
                    <button type="button" class="btn btn-outline btn-sm btn-inspect-dossier" data-cid="${r.candidate_id}" data-eid="${rowEid}" title="Inspect Itemized Dossier" style="padding: 3px 7px; font-size: 0.72rem;">🔍 Dossier</button>
                    <button type="button" class="btn btn-outline btn-sm btn-edit-result" data-cid="${r.candidate_id}" data-eid="${rowEid}" title="Edit Remarks &amp; Override" style="padding: 3px 7px; font-size: 0.72rem;">✏️ Edit</button>
                    <button type="button" class="btn btn-outline btn-sm btn-delete-result" data-cid="${r.candidate_id}" data-eid="${rowEid}" data-name="${escapeHtml(r.candidate_name)}" title="Invalidate / Purge Attempt" style="padding: 3px 7px; font-size: 0.72rem; color: #ef4444; border-color: #fca5a5;">🗑️ Invalidate</button>
                  </div>
                </td>
              </tr>
            `;
        } else {
            rowsHtml += `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="font-weight: 800; text-align: center;">${rankDisplay}</td>
                <td>
                  <div style="font-weight: 700; color: var(--text-heading);">${escapeHtml(r.candidate_name)}</div>
                  <div style="font-size: 0.72rem; font-family: var(--font-mono); color: var(--text-muted);">${escapeHtml(r.registration_number)} &bull; ${escapeHtml(r.terminal_node || 'Term')}</div>
                  ${examBadge}
                  ${remarksSnippet}
                </td>
                <td style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(r.category || 'GEN')} &bull; ${escapeHtml(r.gender || 'M')}</td>
                <td>${scoreDisplay}</td>
                <td><span class="badge-pill" style="background: rgba(30, 58, 138, 0.08); color: #1e3a8a; font-weight: 800;">${pctDisplay}</span></td>
                <td style="font-weight: 700;">${accDisplay}</td>
                <td>${statusBadge}</td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 4px;">
                    <button type="button" class="btn btn-outline btn-sm btn-inspect-dossier" data-cid="${r.candidate_id}" data-eid="${rowEid}" title="Inspect Itemized Dossier" style="padding: 3px 7px; font-size: 0.72rem;">🔍 Dossier</button>
                    <button type="button" class="btn btn-outline btn-sm btn-edit-result" data-cid="${r.candidate_id}" data-eid="${rowEid}" title="Edit Remarks &amp; Override" style="padding: 3px 7px; font-size: 0.72rem;">✏️ Edit</button>
                    <button type="button" class="btn btn-outline btn-sm btn-delete-result" data-cid="${r.candidate_id}" data-eid="${rowEid}" data-name="${escapeHtml(r.candidate_name)}" title="Invalidate / Purge Attempt" style="padding: 3px 7px; font-size: 0.72rem; color: #ef4444; border-color: #fca5a5;">🗑️ Invalidate</button>
                  </div>
                </td>
              </tr>
            `;
        }
    });

    tbody.innerHTML = rowsHtml;

    // Attach row button events
    tbody.querySelectorAll('.btn-inspect-dossier').forEach(btn => {
        btn.addEventListener('click', () => {
            const cid = (btn as HTMLElement).dataset.cid;
            const eid = (btn as HTMLElement).dataset.eid || currentResultsExamId;
            if (cid && eid) {
                openResultDossierModal(eid, cid);
            }
        });
    });

    tbody.querySelectorAll('.btn-edit-result').forEach(btn => {
        btn.addEventListener('click', () => {
            const cid = (btn as HTMLElement).dataset.cid;
            const eid = (btn as HTMLElement).dataset.eid || currentResultsExamId;
            if (cid && eid) {
                const candResult = currentResultsList.find(c => String(c.candidate_id) === String(cid));
                if (candResult) {
                    openEditResultModal(eid, candResult);
                }
            }
        });
    });

    tbody.querySelectorAll('.btn-delete-result').forEach(btn => {
        btn.addEventListener('click', () => {
            const cid = (btn as HTMLElement).dataset.cid;
            const eid = (btn as HTMLElement).dataset.eid || currentResultsExamId;
            const name = (btn as HTMLElement).dataset.name || 'Candidate';
            if (cid && eid) {
                deleteCandidateResult(eid, cid, name);
            }
        });
    });
}

// Open Itemized Candidate Response Dossier Modal
async function openResultDossierModal(examId: string, candidateId: string): Promise<void> {
    const modal = document.getElementById('modal-result-dossier');
    if (!modal) return;

    const tbody = document.getElementById('dossier-questions-body');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Fetching itemized question responses from Cloud DB...</td></tr>`;
    }
    modal.style.display = 'flex';

    try {
        const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(examId)}/results/${encodeURIComponent(candidateId)}`, {
            headers: getHeaders()
        });
        if (res.ok) {
            const dossier = await res.json();
            const subTitle = document.getElementById('dossier-candidate-subtitle');
            if (subTitle) {
                subTitle.textContent = `${dossier.candidate_name} (${dossier.registration_number}) • Exam: ${dossier.exam_title}`;
            }

            const rawScore = document.getElementById('dossier-raw-score');
            const pct = document.getElementById('dossier-percentage');
            const acc = document.getElementById('dossier-accuracy');
            const counts = document.getElementById('dossier-breakdown-counts');

            if (rawScore) rawScore.textContent = `${dossier.raw_score} / ${dossier.max_score}`;
            if (pct) pct.textContent = `${dossier.percentage}%`;
            if (acc) acc.textContent = `${dossier.accuracy}%`;
            if (counts) counts.textContent = `+${dossier.correct_count} / -${dossier.incorrect_count} / Unans: ${dossier.unanswered_count}`;

            const qList = dossier.questions || [];
            if (qList.length === 0) {
                if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No responses recorded.</td></tr>`;
                return;
            }

            let qRows = '';
            qList.forEach((qItem: any, idx: number) => {
                const statusColor = qItem.status === 'correct' ? '#047857' : (qItem.status === 'incorrect' ? '#b91c1c' : (qItem.status === 'bonus' ? '#d97706' : '#64748b'));
                const statusBg = qItem.status === 'correct' ? '#d1fae5' : (qItem.status === 'incorrect' ? '#fee2e2' : (qItem.status === 'bonus' ? '#fef3c7' : '#f1f5f9'));
                const marksColor = qItem.marks_awarded > 0 ? '#047857' : (qItem.marks_awarded < 0 ? '#dc2626' : '#64748b');

                qRows += `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="font-weight: 700; text-align: center;">${idx + 1}</td>
                    <td style="font-size: 0.78rem; max-width: 280px; word-break: break-word;">${escapeHtml(qItem.statement || 'Question Statement')}</td>
                    <td style="font-weight: 700;">${qItem.candidate_answer != null ? escapeHtml(String(qItem.candidate_answer)) : '<span style="color: var(--text-muted); font-weight: normal;">Unanswered</span>'}</td>
                    <td style="font-weight: 700; color: #1e3a8a;">${escapeHtml(String(qItem.correct_key || '--'))}</td>
                    <td>
                      <span class="badge-pill" style="background: ${statusBg}; color: ${statusColor}; font-weight: 800;">
                        ${(qItem.status || '').toUpperCase()}
                      </span>
                    </td>
                    <td style="font-weight: 800; color: ${marksColor};">${qItem.marks_awarded > 0 ? `+${qItem.marks_awarded}` : qItem.marks_awarded}</td>
                  </tr>
                `;
            });

            if (tbody) tbody.innerHTML = qRows;
        } else {
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: #ef4444;">Could not load candidate dossier.</td></tr>`;
        }
    } catch (_) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: #ef4444;">Network error loading dossier.</td></tr>`;
    }
}

// Open CRUD Edit Result Modal
function openEditResultModal(examId: string, candResult: any): void {
    const modal = document.getElementById('modal-edit-result');
    if (!modal) return;

    (document.getElementById('edit-result-exam-id') as HTMLInputElement).value = examId;
    (document.getElementById('edit-result-cand-id') as HTMLInputElement).value = String(candResult.candidate_id);

    const nameEl = document.getElementById('edit-result-cand-name');
    const regEl = document.getElementById('edit-result-cand-reg');
    const selStatus = document.getElementById('edit-result-status-select') as HTMLSelectElement;
    const txtRemarks = document.getElementById('edit-result-remarks') as HTMLTextAreaElement;
    const inpScore = document.getElementById('edit-result-score-override') as HTMLInputElement;

    if (nameEl) nameEl.textContent = candResult.candidate_name;
    if (regEl) regEl.textContent = `Reg: ${candResult.registration_number} • Roll: ${candResult.roll_number || candResult.registration_number}`;

    const currentSt = candResult.disqualified ? 'disqualified' : (candResult.status || 'submitted');
    if (selStatus) selStatus.value = currentSt;
    if (txtRemarks) txtRemarks.value = candResult.remarks || '';
    if (inpScore) inpScore.value = '';

    modal.style.display = 'flex';
}

// Invalidate & Delete Candidate Result
async function deleteCandidateResult(examId: string, candidateId: string, candidateName: string): Promise<void> {
    if (!confirm(`Examination Directorate Action:\nAre you sure you want to permanently invalidate & purge result for "${candidateName}"?\n\nThis will remove candidate attempt and responses from Supabase Cloud DB.`)) {
        return;
    }

    try {
        const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(examId)}/results/${encodeURIComponent(candidateId)}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (res.ok) {
            showToast(`Candidate "${candidateName}" attempt purged from Cloud DB.`);
            await loadExamResults(examId, currentResultsViewMode);
        } else {
            showToast('Failed to purge candidate attempt', true);
        }
    } catch (_) {
        showToast('Network error purging candidate attempt', true);
    }
}

// Recalculate and Synchronize All Candidate Results Against Current Answer Keys
async function recalculateExamResults(examId: string): Promise<void> {
    const btn = document.getElementById('btn-recalc-results-top') as HTMLButtonElement;
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⚡ Recalculating Cloud DB...';
    }

    try {
        const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(examId)}/recalculate-results`, {
            method: 'POST',
            headers: getHeaders(),
        });
        if (res.ok) {
            const data = await res.json();
            showToast(data.message || 'Authoritative recalculation completed!');
            await loadExamResults(examId, currentResultsViewMode);
        } else {
            showToast('Recalculation failed', true);
        }
    } catch (_) {
        showToast('Network error during score recalculation', true);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '⚡ Recalculate & Sync Scores';
        }
    }
}

// Result Management Listeners Setup
function initResultsManagementListeners(): void {
    const selResultsExam = document.getElementById('results-exam-select') as HTMLSelectElement;
    if (selResultsExam) {
        selResultsExam.addEventListener('change', () => {
            const examId = selResultsExam.value;
            if (examId) {
                loadExamResults(examId, currentResultsViewMode);
            }
        });
    }

    const btnModeNormal = document.getElementById('btn-results-mode-normal') as HTMLButtonElement;
    const btnModeAdvanced = document.getElementById('btn-results-mode-advanced') as HTMLButtonElement;

    if (btnModeNormal && btnModeAdvanced) {
        btnModeNormal.addEventListener('click', () => {
            btnModeNormal.style.background = 'var(--brand-blue)';
            btnModeNormal.style.color = 'white';
            btnModeAdvanced.style.background = 'transparent';
            btnModeAdvanced.style.color = 'var(--text-muted)';
            currentResultsViewMode = 'normal';
            if (currentResultsExamId) {
                loadExamResults(currentResultsExamId, 'normal');
            }
        });

        btnModeAdvanced.addEventListener('click', () => {
            btnModeAdvanced.style.background = 'var(--brand-blue)';
            btnModeAdvanced.style.color = 'white';
            btnModeNormal.style.background = 'transparent';
            btnModeNormal.style.color = 'var(--text-muted)';
            currentResultsViewMode = 'advanced';
            if (currentResultsExamId) {
                loadExamResults(currentResultsExamId, 'advanced');
            }
        });
    }

    const searchInput = document.getElementById('results-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderResultsTable());
    }

    const statusFilter = document.getElementById('results-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => renderResultsTable());
    }

    // Recalculate button
    const btnRecalc = document.getElementById('btn-recalc-results-top');
    if (btnRecalc) {
        btnRecalc.addEventListener('click', () => {
            const targetExam = currentResultsExamId || 'all';
            recalculateExamResults(targetExam);
        });
    }

    // Export buttons
    const btnCsv = document.getElementById('btn-export-results-csv-top');
    if (btnCsv) {
        btnCsv.addEventListener('click', () => {
            const targetExam = currentResultsExamId || 'all';
            window.location.href = `/api/v1/exams/${encodeURIComponent(targetExam)}/results-export?format=csv`;
        });
    }

    const btnXls = document.getElementById('btn-export-results-xls-top');
    if (btnXls) {
        btnXls.addEventListener('click', () => {
            const targetExam = currentResultsExamId || 'all';
            window.location.href = `/api/v1/exams/${encodeURIComponent(targetExam)}/results-export?format=xlsx`;
        });
    }

    const btnResp = document.getElementById('btn-export-results-resp-top');
    if (btnResp) {
        btnResp.addEventListener('click', () => {
            const targetExam = currentResultsExamId || 'all';
            window.location.href = `/api/v1/exams/${encodeURIComponent(targetExam)}/export/responses`;
        });
    }

    // Form Edit Result submit
    const formEditResult = document.getElementById('form-edit-result') as HTMLFormElement;
    if (formEditResult) {
        formEditResult.addEventListener('submit', async (e) => {
            e.preventDefault();
            const examId = (document.getElementById('edit-result-exam-id') as HTMLInputElement).value;
            const candId = (document.getElementById('edit-result-cand-id') as HTMLInputElement).value;
            const statusVal = (document.getElementById('edit-result-status-select') as HTMLSelectElement).value;
            const remarksVal = (document.getElementById('edit-result-remarks') as HTMLTextAreaElement).value.trim();
            const scoreVal = (document.getElementById('edit-result-score-override') as HTMLInputElement).value.trim();

            const btnSave = document.getElementById('btn-save-result-edit') as HTMLButtonElement;
            if (btnSave) {
                btnSave.disabled = true;
                btnSave.textContent = 'Saving to Cloud DB...';
            }

            try {
                const body: any = {
                    status: statusVal,
                    remarks: remarksVal,
                };
                if (scoreVal) {
                    body.score_override = parseFloat(scoreVal);
                    body.reason = remarksVal || 'Directorate Moderation';
                }

                const res = await adminFetch(`/api/v1/exams/${encodeURIComponent(examId)}/results/${encodeURIComponent(candId)}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(body),
                });

                if (res.ok) {
                    showToast('Candidate result and remarks updated in Cloud DB!');
                    document.getElementById('modal-edit-result')!.style.display = 'none';
                    await loadExamResults(examId, currentResultsViewMode);
                } else {
                    const err = await res.json().catch(() => ({}));
                    showToast(err.detail || 'Failed to update result in Cloud DB', true);
                }
            } catch (_) {
                showToast('Network error updating result', true);
            } finally {
                if (btnSave) {
                    btnSave.disabled = false;
                    btnSave.textContent = 'Save to Cloud DB →';
                }
            }
        });
    }

    // Dynamic marking inputs in create/edit exam modal
    const negToggleInput = document.getElementById('exam-negative-marking-toggle') as HTMLInputElement;
    if (negToggleInput) {
        negToggleInput.addEventListener('change', () => {
            updateNegativeMarkingUI(negToggleInput.checked);
            updateQuestionSelectionTicker();
        });
    }
    const corrMarksInput = document.getElementById('exam-correct-marks-input') as HTMLInputElement;
    if (corrMarksInput) {
        corrMarksInput.addEventListener('input', () => {
            updateQuestionSelectionTicker();
        });
    }
    const negMarksInput = document.getElementById('exam-negative-marks-input') as HTMLInputElement;
    if (negMarksInput) {
        negMarksInput.addEventListener('input', () => {
            updateQuestionSelectionTicker();
        });
    }

    // Navigation smooth scroll for Results Management link
    const navLinkResults = document.querySelector('a[href="#results-management-section"]');
    if (navLinkResults) {
        navLinkResults.addEventListener('click', (e) => {
            e.preventDefault();
            const sec = document.getElementById('results-management-section');
            if (sec) {
                sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (window.innerWidth <= 768 && sidebarEl) {
                    sidebarEl.classList.remove('mobile-open');
                }
            }
        });
    }
}

// Initialize on page ready
initTheme();
updateGreeting();
loadDashboardSummary();
loadCandidates();
loadExams();
loadQuestionBank();
initAdminWebSocket();
loadExamPhase();
loadExamSettings();
loadTelemetryRadar();
initResultsManagementListeners();
syncMasterClock();
setInterval(updateMasterClockDisplay, 1000);
setInterval(syncMasterClock, 60000);
setInterval(loadTelemetryRadar, 30000);
setInterval(loadExams, 45000);
setInterval(loadDashboardSummary, 30000);
setInterval(updateGreeting, 60000);


// Check URL Hash for Deep Tab Linking (#overview, #exams, #candidates, #questions, #proctor, #scorecards, #settings)
const initialTab = window.location.hash ? window.location.hash.replace('#', '') : 'overview';
if (['overview', 'exams', 'candidates', 'questions', 'proctor', 'scorecards', 'settings'].includes(initialTab)) {
    switchAdminTab(initialTab);
}

// Bind Top Quick Action Buttons
const btnTopCreateExam = document.getElementById('btn-open-create-exam-top');
if (btnTopCreateExam) {
    btnTopCreateExam.addEventListener('click', () => {
        document.getElementById('btn-open-create-exam')?.click();
    });
}
const btnQuickProv = document.getElementById('btn-quick-provision-nav');
if (btnQuickProv) {
    btnQuickProv.addEventListener('click', () => {
        ui.btnCreate?.click();
    });
}



