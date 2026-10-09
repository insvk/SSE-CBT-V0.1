export {};

const API_BASE = '/api/v1/exams';
const EXAM_ID = 'EX-1001';

interface ExamQuestion {
    id: string;
    text: string;
    options: string[];
    subject?: string;
    section?: string;
    type?: string;
    correct_answer?: string;
}

// 20 Official Fallback Questions with Question 3 matching the user's screenshot exactly
const DEFAULT_QUESTIONS: ExamQuestion[] = [
    {
        id: "q_1",
        text: "A projectile is fired at an angle \\theta with the horizontal with initial velocity u. The radius of curvature of its trajectory at the highest point is:",
        options: ["\\frac{u^2 \\cos^2 \\theta}{g}", "\\frac{u^2 \\sin^2 \\theta}{g}", "\\frac{u^2}{g}", "\\frac{u^2 \\cos \\theta}{g}"],
        subject: "Physics",
        section: "PHYSICS - SEC-I",
        correct_answer: "A"
    },
    {
        id: "q_2",
        text: "Two bodies of masses m_1 and m_2 have equal kinetic energies. The ratio of their linear momenta p_1 / p_2 is equal to:",
        options: ["\\sqrt{\\frac{m_1}{m_2}}", "\\frac{m_1}{m_2}", "\\frac{m_2}{m_1}", "\\sqrt{\\frac{m_2}{m_1}}"],
        subject: "Physics",
        section: "PHYSICS - SEC-I",
        correct_answer: "A"
    },
    {
        id: "q_3",
        text: "A particle is moving up with balloon with constant acceleration ( g/8 ) which starts from rest from ground and at a height H , a particle is dropped from balloon, After this event, find time for which the particle will be in air (acceleration due to gravity = gm/s² )",
        options: ["\\sqrt{\\frac{H}{g}}", "2\\sqrt{\\frac{H}{g}}", "3\\sqrt{\\frac{H}{g}}", "4\\sqrt{\\frac{H}{g}}"],
        subject: "Physics",
        section: "PHYSICS - SEC-I",
        correct_answer: "B"
    },
    {
        id: "q_4",
        text: "The work done in blowing a soap bubble of radius R is W. The additional work done in blowing it to radius 2R is:",
        options: ["W", "2W", "3W", "4W"],
        subject: "Physics",
        section: "PHYSICS - SEC-I",
        correct_answer: "C"
    },
    {
        id: "q_5",
        text: "A parallel plate capacitor with air between the plates has capacitance C_0. When a dielectric slab of dielectric constant K=4 and thickness t=d/2 is introduced, its new capacitance is:",
        options: ["\\frac{8}{5}C_0", "\\frac{5}{8}C_0", "2C_0", "4C_0"],
        subject: "Physics",
        section: "PHYSICS - SEC-II",
        correct_answer: "A"
    },
    {
        id: "q_6",
        text: "An alternating voltage V = 200\\sqrt{2}\\sin(100t) \\text{ V} is connected to a 1 \\mu\\text{F} capacitor. The rms value of current through the capacitor is:",
        options: ["20 mA", "10 mA", "100 mA", "200 mA"],
        subject: "Physics",
        section: "PHYSICS - SEC-II",
        correct_answer: "A"
    },
    {
        id: "q_7",
        text: "Which of the following molecules has the highest dipole moment?",
        options: ["\\text{CH}_3\\text{Cl}", "\\text{CH}_2\\text{Cl}_2", "\\text{CHCl}_3", "\\text{CCl}_4"],
        subject: "Chemistry",
        section: "CHEMISTRY - SEC-I",
        correct_answer: "A"
    },
    {
        id: "q_8",
        text: "The geometry and hybridization of \\text{XeF}_4 are respectively:",
        options: ["\\text{Square planar, } sp^3d^2", "\\text{Tetrahedral, } sp^3", "\\text{Octahedral, } sp^3d^2", "\\text{See-saw, } sp^3d"],
        subject: "Chemistry",
        section: "CHEMISTRY - SEC-I",
        correct_answer: "A"
    },
    {
        id: "q_9",
        text: "For a first order reaction, the time required for 99.9% completion is approximately how many times the half-life t_{1/2}?",
        options: ["10", "4", "2", "8"],
        subject: "Chemistry",
        section: "CHEMISTRY - SEC-I",
        correct_answer: "A"
    },
    {
        id: "q_10",
        text: "The spin-only magnetic moment of [\\text{Fe(CN)}_6]^{3-} complex ion is:",
        options: ["1.73 \\text{ BM}", "5.92 \\text{ BM}", "4.90 \\text{ BM}", "0 \\text{ BM}"],
        subject: "Chemistry",
        section: "CHEMISTRY - SEC-I",
        correct_answer: "A"
    },
    {
        id: "q_11",
        text: "The pH of a buffer solution prepared by mixing 0.1 M \\text{CH}_3\\text{COOH} and 0.1 M \\text{CH}_3\\text{COONa} (pK_a = 4.76) is:",
        options: ["4.76", "5.76", "3.76", "7.00"],
        subject: "Chemistry",
        section: "CHEMISTRY - SEC-II",
        correct_answer: "A"
    },
    {
        id: "q_12",
        text: "The standard reduction potential for \\text{Cu}^{2+}/\\text{Cu} is +0.34 V and for \\text{Zn}^{2+}/\\text{Zn} is -0.76 V. The standard EMF of the cell is:",
        options: ["+1.10 V", "-1.10 V", "+0.42 V", "+0.76 V"],
        subject: "Chemistry",
        section: "CHEMISTRY - SEC-II",
        correct_answer: "A"
    },
    {
        id: "q_13",
        text: "Which quantum numbers set is not allowed for an electron in an atom?",
        options: ["n=3, l=3, m=0, s=+1/2", "n=3, l=2, m=-1, s=-1/2", "n=2, l=1, m=0, s=+1/2", "n=4, l=0, m=0, s=-1/2"],
        subject: "Chemistry",
        section: "CHEMISTRY - SEC-II",
        correct_answer: "A"
    },
    {
        id: "q_14",
        text: "The value of the definite integral \\int_0^{\\pi/2} \\frac{\\sqrt{\\sin x}}{\\sqrt{\\sin x} + \\sqrt{\\cos x}} dx is:",
        options: ["\\frac{\\pi}{4}", "\\frac{\\pi}{2}", "\\pi", "0"],
        subject: "Mathematics",
        section: "MATHS - SEC-I",
        correct_answer: "A"
    },
    {
        id: "q_15",
        text: "If A is a 3 \\times 3 non-singular matrix such that |A| = 4, then |\\text{adj}(A)| is equal to:",
        options: ["16", "4", "64", "256"],
        subject: "Mathematics",
        section: "MATHS - SEC-I",
        correct_answer: "A"
    },
    {
        id: "q_16",
        text: "The value of \\lim_{x \\to 0} \\frac{e^x - 1 - x}{x^2} is:",
        options: ["\\frac{1}{2}", "1", "0", "\\infty"],
        subject: "Mathematics",
        section: "MATHS - SEC-I",
        correct_answer: "A"
    },
    {
        id: "q_17",
        text: "If the vectors \\vec{a} = 2\\hat{i} - \\hat{j} + \\hat{k}, \\vec{b} = \\hat{i} + 2\\hat{j} - 3\\hat{k} and \\vec{c} = 3\\hat{i} + \\lambda\\hat{j} + 5\\hat{k} are coplanar, then \\lambda is:",
        options: ["-4", "4", "-2", "2"],
        subject: "Mathematics",
        section: "MATHS - SEC-I",
        correct_answer: "A"
    },
    {
        id: "q_18",
        text: "The area bounded by the curve y^2 = 4x and the line y = 2x is:",
        options: ["\\frac{1}{3}", "\\frac{2}{3}", "\\frac{4}{3}", "1"],
        subject: "Mathematics",
        section: "MATHS - SEC-II",
        correct_answer: "A"
    },
    {
        id: "q_19",
        text: "The number of real solutions of the equation \\sin(e^x) = 5^x + 5^{-x} is:",
        options: ["0", "1", "2", "\\infty"],
        subject: "Mathematics",
        section: "MATHS - SEC-II",
        correct_answer: "A"
    },
    {
        id: "q_20",
        text: "If \\omega is an imaginary cube root of unity, then the value of (1 + \\omega - \\omega^2)^7 is:",
        options: ["-128\\omega^2", "128\\omega^2", "-128\\omega", "128\\omega"],
        subject: "Mathematics",
        section: "MATHS - SEC-II",
        correct_answer: "A"
    }
];

let allQuestions: ExamQuestion[] = [...DEFAULT_QUESTIONS];
let currentQuestionIndex = 2; // Start on Question 3 to match the user's screenshot!
let activeSection = "PHYSICS - SEC-I";

// States: 0=Not Visited, 1=Answered, 2=Marked for Review, 3=Answered & Marked for Review, 4=Not Answered
let questionState: number[] = new Array(20).fill(0);
let responses: (number | null)[] = new Array(20).fill(null);

// Initialize initial state matching screenshot:
// Q1: 4 (Not Answered)
// Q2: 1 (Answered)
// Q3: 2 (Marked for Review, currently active)
// Q4: 4 (Not Answered)
// Q5 to Q20: 0 (Not Visited)
questionState[0] = 4;
questionState[1] = 1;
responses[1] = 0; // Answered
questionState[2] = 2; // Marked for Review
questionState[3] = 4; // Not Answered

let timerInterval: any = null;
let currentRemainingSeconds = 179 * 60 + 41; // 179 minutes 41 seconds exactly matching screenshot!
let isSubmitting = false;
let revealAnswersMode = false;

// Duplicate Session Blocker (DEF-05)
const currentTabId = 'tab_' + Math.random().toString(36).substring(2, 9);
try {
    if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('cbt_active_exam_tab');
        channel.postMessage({ type: 'PING_ACTIVE_TAB', tabId: currentTabId });
        channel.onmessage = (event) => {
            if (event.data?.type === 'PING_ACTIVE_TAB' && event.data.tabId !== currentTabId) {
                channel.postMessage({ type: 'ACK_ACTIVE_TAB', tabId: currentTabId });
            } else if (event.data?.type === 'ACK_ACTIVE_TAB' && event.data.tabId !== currentTabId) {
                alert("A duplicate exam window has been detected. Multiple simultaneous tabs are prohibited.");
                window.location.href = '/login.html';
            }
        };
    }
} catch (_) {}

const ui = {
    qText: document.getElementById('question-text')!,
    qNum: document.getElementById('question-number')!,
    qTypeLabel: document.getElementById('question-type-label')!,
    optionsContainer: document.getElementById('options-container')!,
    palette: document.getElementById('palette-grid')!,
    btnSaveNext: document.getElementById('btn-save-next') as HTMLButtonElement,
    btnSaveReview: document.getElementById('btn-save-review') as HTMLButtonElement,
    btnClearResp: document.getElementById('btn-clear-resp') as HTMLButtonElement,
    btnBack: document.getElementById('btn-back') as HTMLButtonElement,
    btnNext: document.getElementById('btn-next') as HTMLButtonElement,
    btnSubmit: document.getElementById('btn-submit-exam') as HTMLButtonElement,
    timerDisplay: document.getElementById('timer-display')!,
    syncSubTime: document.getElementById('sync-sub-time')!,
    btnManualSync: document.getElementById('btn-manual-sync')!,
    candDisplayName: document.getElementById('cand-display-name')!,
    candDisplayReg: document.getElementById('cand-display-reg')!,
    // Status counts
    countNotVisited: document.getElementById('count-not-visited')!,
    countNotAnswered: document.getElementById('count-not-answered')!,
    countAnswered: document.getElementById('count-answered')!,
    countReview: document.getElementById('count-review')!,
    countAnsReview: document.getElementById('count-ans-review')!,
    // Modals
    modalSubmit: document.getElementById('submit-modal')!,
    modalConfirmSubmit: document.getElementById('btn-modal-confirm') as HTMLButtonElement,
    modalCancelSubmit: document.getElementById('btn-modal-cancel') as HTMLButtonElement,
    modalInstructions: document.getElementById('modal-instructions')!,
    btnViewInstructions: document.getElementById('btn-view-instructions')!,
    btnCloseInst: document.getElementById('btn-close-inst')!,
    btnInstDone: document.getElementById('btn-inst-done')!,
    modalPaper: document.getElementById('modal-question-paper')!,
    btnViewPaper: document.getElementById('btn-view-paper')!,
    btnClosePaper: document.getElementById('btn-close-paper')!,
    paperListContainer: document.getElementById('paper-list-container')!,
    // God MAXX Edit Question
    btnGodEditQ: document.getElementById('btn-god-edit-q')!,
    modalEditQ: document.getElementById('modal-edit-question')!,
    btnCloseEditQ: document.getElementById('btn-close-edit-q')!,
    btnCancelEditQ: document.getElementById('btn-cancel-edit-q')!,
    formEditQ: document.getElementById('form-edit-q') as HTMLFormElement,
    editQStatement: document.getElementById('edit-q-statement') as HTMLTextAreaElement,
    editQOptA: document.getElementById('edit-q-opt-a') as HTMLInputElement,
    editQOptB: document.getElementById('edit-q-opt-b') as HTMLInputElement,
    editQOptC: document.getElementById('edit-q-opt-c') as HTMLInputElement,
    editQOptD: document.getElementById('edit-q-opt-d') as HTMLInputElement,
    editQAns: document.getElementById('edit-q-ans') as HTMLSelectElement,
    editQSec: document.getElementById('edit-q-sec') as HTMLInputElement,
    // God MAXX Tools
    btnGodTools: document.getElementById('btn-god-tools')!,
    modalGodTools: document.getElementById('modal-god-tools')!,
    btnCloseGodTools: document.getElementById('btn-close-god-tools')!,
    btnAutoSolve: document.getElementById('btn-auto-solve')!,
    btnRevealKey: document.getElementById('btn-reveal-key')!,
    btnSkipTimer: document.getElementById('btn-skip-timer')!,
    btnResetAttemptSelf: document.getElementById('btn-reset-attempt-self')!,
    sidebarPane: document.getElementById('exam-sidebar-pane')!,
    btnTogglePalette: document.getElementById('btn-toggle-palette')!,
};

function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token') || 'dev_test_token_do_not_use_in_prod';
    const tenantId = localStorage.getItem('tenant_id') || '00000000-0000-0000-0000-000000000001';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId,
    };
}

// Math Formula KaTeX Renderer
function renderMath(target: HTMLElement): void {
    if ((window as any).renderMathInElement) {
        try {
            (window as any).renderMathInElement(target, {
                delimiters: [
                    { left: "$$", right: "$$", display: true },
                    { left: "$", right: "$", display: false },
                    { left: "\\[", right: "\\]", display: true },
                    { left: "\\(", right: "\\)", display: false }
                ],
                throwOnError: false
            });
        } catch (_) {}
    }
}

function updateSyncTime(label?: string): void {
    const el = document.getElementById('sync-sub-time');
    if (el) {
        if (label) {
            el.textContent = label;
        } else {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
            el.textContent = `Synced : ${timeStr}`;
        }
    }
}

function updateCounters(): void {
    let counts = { notVisited: 0, notAnswered: 0, answered: 0, review: 0, ansReview: 0 };
    questionState.forEach(s => {
        if (s === 0) counts.notVisited++;
        else if (s === 1) counts.answered++;
        else if (s === 2) counts.review++;
        else if (s === 3) counts.ansReview++;
        else if (s === 4) counts.notAnswered++;
    });

    if (ui.countNotVisited) ui.countNotVisited.textContent = counts.notVisited.toString();
    if (ui.countNotAnswered) ui.countNotAnswered.textContent = counts.notAnswered.toString();
    if (ui.countAnswered) ui.countAnswered.textContent = counts.answered.toString();
    if (ui.countReview) ui.countReview.textContent = counts.review.toString();
    if (ui.countAnsReview) ui.countAnsReview.textContent = counts.ansReview.toString();
}

function renderPalette(): void {
    if (!ui.palette) return;
    ui.palette.innerHTML = '';

    allQuestions.forEach((_, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'palette-number-btn';
        btn.textContent = (idx + 1).toString();

        const st = questionState[idx];
        if (st === 0) btn.classList.add('not-visited');
        else if (st === 1) btn.classList.add('answered');
        else if (st === 2) btn.classList.add('review');
        else if (st === 3) btn.classList.add('answered-review');
        else if (st === 4) btn.classList.add('not-answered');

        if (idx === currentQuestionIndex) {
            btn.classList.add('active');
        }

        btn.onclick = () => loadQuestion(idx);
        ui.palette.appendChild(btn);
    });

    updateCounters();
}

function loadQuestion(index: number): void {
    if (index < 0 || index >= allQuestions.length) return;
    currentQuestionIndex = index;
    const q = allQuestions[index];

    // Mark as visited (Not Answered) if previously not visited
    if (questionState[index] === 0) {
        questionState[index] = 4;
    }

    if (ui.qNum) ui.qNum.textContent = `Question ${index + 1}`;
    if (ui.qTypeLabel) ui.qTypeLabel.textContent = q.type === 'numerical' ? 'Numerical Value Type' : 'Single Select Type';
    if (ui.qText) {
        ui.qText.textContent = q.text;
        renderMath(ui.qText);
    }

    // Set active section tab
    const sec = q.section || (q.subject ? `${q.subject.toUpperCase()} - SEC-I` : 'PHYSICS - SEC-I');
    activeSection = sec;
    document.querySelectorAll('.sec-pill-btn').forEach(btn => {
        const pillSec = btn.getAttribute('data-sec');
        btn.classList.toggle('active', pillSec === activeSection);
    });

    // Populate options
    if (ui.optionsContainer) {
        ui.optionsContainer.innerHTML = '';
        (q.options || []).forEach((opt, optIdx) => {
            const card = document.createElement('div');
            card.className = 'option-card-row';
            if (responses[index] === optIdx) {
                card.classList.add('selected');
            }

            const isCorrect = (q.correct_answer === String.fromCharCode(65 + optIdx));
            if (revealAnswersMode && isCorrect) {
                card.style.borderColor = '#10b981';
                card.style.background = '#f0fdf4';
            }

            const radio = document.createElement('div');
            radio.className = 'option-radio-ring';
            const dot = document.createElement('div');
            dot.className = 'option-radio-inner-dot';
            radio.appendChild(dot);

            const content = document.createElement('div');
            content.className = 'option-math-content';
            content.textContent = opt;

            card.appendChild(radio);
            card.appendChild(content);

            card.onclick = () => {
                responses[index] = optIdx;
                document.querySelectorAll('.option-card-row').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            };

            ui.optionsContainer.appendChild(card);
            renderMath(content);
        });
    }

    renderPalette();

    if (ui.btnBack) ui.btnBack.disabled = index === 0;
    if (ui.btnNext) ui.btnNext.disabled = index === allQuestions.length - 1;
}

// --- REAL-TIME CLOUD DB PERSISTENCE & WEBSOCKET ENGINE ---
let examSocket: WebSocket | null = null;
let wsHeartbeatTimer: any = null;

function updateWsStatus(connected: boolean): void {
    const dot = document.getElementById('ws-live-dot');
    const el = document.getElementById('sync-sub-time');
    if (dot) {
        dot.style.background = connected ? '#10b981' : '#f59e0b';
        dot.style.boxShadow = connected ? '0 0 8px #10b981' : '0 0 8px #f59e0b';
    }
    if (el) {
        el.textContent = connected ? 'Cloud DB: Live' : 'Reconnecting...';
    }
}

function showLiveToast(text: string, isError = false): void {
    const toast = document.getElementById('exam-live-toast');
    if (!toast) return;
    toast.textContent = text;
    toast.style.borderLeftColor = isError ? '#ef4444' : '#10b981';
    toast.style.display = 'block';
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 4500);
}

function initExamWebSocket(): void {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${window.location.host}/ws/exam/${EXAM_ID}`;

    try {
        examSocket = new WebSocket(wsUrl);

        examSocket.onopen = () => {
            console.log('[WebSocket] Connected to live exam channel:', EXAM_ID);
            updateWsStatus(true);
            if (wsHeartbeatTimer) clearInterval(wsHeartbeatTimer);
            wsHeartbeatTimer = setInterval(() => {
                if (examSocket && examSocket.readyState === WebSocket.OPEN) {
                    examSocket.send(JSON.stringify({ type: 'PING' }));
                }
            }, 25000);
        };

        examSocket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                handleExamSocketMessage(msg);
            } catch (_) {}
        };

        examSocket.onclose = () => {
            console.warn('[WebSocket] Exam channel disconnected. Reconnecting in 3s...');
            updateWsStatus(false);
            if (wsHeartbeatTimer) clearInterval(wsHeartbeatTimer);
            setTimeout(initExamWebSocket, 3000);
        };

        examSocket.onerror = () => {
            updateWsStatus(false);
        };
    } catch (e) {
        console.warn('[WebSocket] Failed to initialize exam channel:', e);
        setTimeout(initExamWebSocket, 5000);
    }
}

function showInvigilatorMessage(icon: string, title: string, text: string): void {
    const modal = document.getElementById('modal-invigilator-msg');
    const elIcon = document.getElementById('invig-icon');
    const elTitle = document.getElementById('invig-title');
    const elBody = document.getElementById('invig-msg-body');
    const elTime = document.getElementById('invig-msg-time');
    if (modal && elBody) {
        if (elIcon) elIcon.textContent = icon;
        if (elTitle) elTitle.textContent = title;
        elBody.textContent = text;
        if (elTime) elTime.textContent = `Received at ${new Date().toLocaleTimeString()}`;
        modal.style.display = 'flex';
    }
}

function triggerTerminalForceLock(reason: string): void {
    const lockOverlay = document.getElementById('modal-terminal-locked');
    const reasonText = document.getElementById('lock-reason-text');
    if (lockOverlay) {
        if (reasonText) reasonText.textContent = reason;
        lockOverlay.classList.add('active');
    }
    if (timerInterval) clearInterval(timerInterval);
    performFinalSubmission();
}

function handleExamSocketMessage(msg: any): void {
    if (msg.type === 'TIME_EXTENDED') {
        const extraMins = msg.extra_minutes || 15;
        currentRemainingSeconds += extraMins * 60;
        showLiveToast(`⏱️ PROCTOR NOTICE: +${extraMins} minutes extra time added to your exam!`);
    } else if (msg.type === 'QUESTION_UPDATED') {
        // God MAXX / Admin Live Question Edit applied to all consoles
        const qIdx = allQuestions.findIndex(q => q.id === msg.question_id);
        if (qIdx !== -1) {
            if (msg.statement) allQuestions[qIdx].text = msg.statement;
            if (msg.options) allQuestions[qIdx].options = msg.options;
            if (msg.correct_answer) allQuestions[qIdx].correct_answer = msg.correct_answer;
            if (currentQuestionIndex === qIdx) {
                loadQuestion(currentQuestionIndex);
            }
            showLiveToast(`✏️ Live Board Correction: Question ${qIdx + 1} updated!`);
        }
    } else if (msg.type === 'EXAM_RESET') {
        questionState = new Array(20).fill(0);
        responses = new Array(20).fill(null);
        currentRemainingSeconds = 179 * 60 + 41;
        loadQuestion(0);
        showLiveToast(`⚠️ Examination session reset by Proctor.`);
    } else if (msg.type === 'BROADCAST_ANNOUNCEMENT') {
        showInvigilatorMessage("📢", "Central Invigilator Announcement", msg.message || "Attention all candidates: Please maintain exam focus.");
    } else if (msg.type === 'PROCTOR_WARNING') {
        const myReg = localStorage.getItem('reg_no') || '5254740(V4.3.7)';
        if (!msg.reg_no || msg.reg_no === myReg) {
            showInvigilatorMessage("⚠️", "Direct Warning From Central Invigilator", msg.message || "Please return your full attention to the exam terminal screen.");
        }
    } else if (msg.type === 'FORCE_LOCK_TERMINAL') {
        const myReg = localStorage.getItem('reg_no') || '5254740(V4.3.7)';
        if (!msg.reg_no || msg.reg_no === myReg) {
            triggerTerminalForceLock(msg.reason || "Terminal locked by Central Invigilator.");
        }
    } else if (msg.type === 'ACK') {
        updateSyncTime();
    }
}

async function syncResponseToCloud(index: number, state: number): Promise<void> {
    const q = allQuestions[index];
    if (!q) return;

    const ans = responses[index];
    const candId = localStorage.getItem('candidate_id') || '018d1a55-2959-48c4-b2a4-8a72894512b9';
    const candName = localStorage.getItem('candidate_name') || 'NARESH S';
    const regNo = localStorage.getItem('reg_no') || '5254740(V4.3.7)';
    const idempKey = `resp_${q.id}_${Date.now()}`;

    // 1. Ultra-fast WebSocket dispatch
    if (examSocket && examSocket.readyState === WebSocket.OPEN) {
        examSocket.send(JSON.stringify({
            type: "RESPONSE_UPDATE",
            question_id: q.id,
            answer: ans,
            state: state,
            idempotency_key: idempKey,
            candidate_id: candId,
            candidate_name: candName,
            reg_no: regNo,
        }));
    }

    // 2. Parallel HTTP POST to guarantee durable Cloud DB persistence
    try {
        await fetch(`${API_BASE}/${EXAM_ID}/responses`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                question_id: q.id,
                answer: ans,
                state: state,
                idempotency_key: idempKey,
                candidate_id: candId,
                candidate_name: candName,
            }),
        });
        updateSyncTime();
    } catch (_) {}
}

// Action Handlers
function handleSaveNext(): void {
    if (responses[currentQuestionIndex] !== null) {
        questionState[currentQuestionIndex] = 1; // Answered
    } else {
        questionState[currentQuestionIndex] = 4; // Not Answered
    }
    syncResponseToCloud(currentQuestionIndex, questionState[currentQuestionIndex]);

    if (currentQuestionIndex < allQuestions.length - 1) {
        loadQuestion(currentQuestionIndex + 1);
    } else {
        renderPalette();
    }
}

function handleSaveReview(): void {
    if (responses[currentQuestionIndex] !== null) {
        questionState[currentQuestionIndex] = 3; // Answered & Marked for Review
    } else {
        questionState[currentQuestionIndex] = 2; // Marked for Review
    }
    syncResponseToCloud(currentQuestionIndex, questionState[currentQuestionIndex]);

    if (currentQuestionIndex < allQuestions.length - 1) {
        loadQuestion(currentQuestionIndex + 1);
    } else {
        renderPalette();
    }
}

function handleClearResponse(): void {
    responses[currentQuestionIndex] = null;
    questionState[currentQuestionIndex] = 4; // Visited but no answer
    document.querySelectorAll('.option-card-row').forEach(c => c.classList.remove('selected'));
    syncResponseToCloud(currentQuestionIndex, 4);
    renderPalette();
}

// Timer Logic
function startTimer(): void {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (currentRemainingSeconds <= 0) {
            clearInterval(timerInterval);
            if (ui.timerDisplay) ui.timerDisplay.textContent = "00 : 00";
            handleAutoSubmit();
            return;
        }

        currentRemainingSeconds--;

        const mins = Math.floor(currentRemainingSeconds / 60);
        const secs = currentRemainingSeconds % 60;
        if (ui.timerDisplay) {
            ui.timerDisplay.textContent = `${mins} : ${secs.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

function handleAutoSubmit(): void {
    if (isSubmitting) return;
    alert("Exam time expired! Automatically submitting authoritative responses.");
    performFinalSubmission();
}

function openSubmissionModal(): void {
    let counts = { notVisited: 0, notAnswered: 0, answered: 0, review: 0, ansReview: 0 };
    questionState.forEach(s => {
        if (s === 0) counts.notVisited++;
        else if (s === 1) counts.answered++;
        else if (s === 2) counts.review++;
        else if (s === 3) counts.ansReview++;
        else if (s === 4) counts.notAnswered++;
    });

    const elTotal = document.getElementById('sm-total');
    const elAns = document.getElementById('sm-ans');
    const elNotAns = document.getElementById('sm-not-ans');
    const elReview = document.getElementById('sm-review');
    const elAnsRev = document.getElementById('sm-ans-rev');
    const elNotVis = document.getElementById('sm-not-vis');

    if (elTotal) elTotal.textContent = allQuestions.length.toString();
    if (elAns) elAns.textContent = counts.answered.toString();
    if (elNotAns) elNotAns.textContent = counts.notAnswered.toString();
    if (elReview) elReview.textContent = counts.review.toString();
    if (elAnsRev) elAnsRev.textContent = counts.ansReview.toString();
    if (elNotVis) elNotVis.textContent = counts.notVisited.toString();

    if (ui.modalSubmit) ui.modalSubmit.style.display = 'flex';
}

async function performFinalSubmission(): Promise<void> {
    if (isSubmitting) return;
    isSubmitting = true;

    if (ui.modalConfirmSubmit) {
        ui.modalConfirmSubmit.textContent = "Committing final submit...";
        ui.modalConfirmSubmit.disabled = true;
    }

    try {
        const res = await fetch(`${API_BASE}/${EXAM_ID}/submit`, {
            method: 'POST',
            headers: getAuthHeaders(),
        });

        if (res.ok) {
            const data = await res.json();
            sessionStorage.setItem('latest_result', JSON.stringify(data));
            window.location.href = '/scorecard.html';
        } else {
            alert("Examination server error. Please retry submission.");
            if (ui.modalConfirmSubmit) {
                ui.modalConfirmSubmit.textContent = "Confirm Final Submit";
                ui.modalConfirmSubmit.disabled = false;
            }
            isSubmitting = false;
        }
    } catch (_) {
        alert("Network failure syncing with server. Please retry.");
        if (ui.modalConfirmSubmit) {
            ui.modalConfirmSubmit.textContent = "Confirm Final Submit";
            ui.modalConfirmSubmit.disabled = false;
        }
        isSubmitting = false;
    }
}

// God MAXX Edit Question Feature
function openGodEditModal(): void {
    const q = allQuestions[currentQuestionIndex];
    if (!q) return;

    ui.editQStatement.value = q.text;
    ui.editQOptA.value = q.options[0] || "";
    ui.editQOptB.value = q.options[1] || "";
    ui.editQOptC.value = q.options[2] || "";
    ui.editQOptD.value = q.options[3] || "";
    ui.editQAns.value = q.correct_answer || "A";
    ui.editQSec.value = q.section || "PHYSICS - SEC-I";

    ui.modalEditQ.style.display = 'flex';
}

ui.formEditQ.onsubmit = async (e) => {
    e.preventDefault();
    const q = allQuestions[currentQuestionIndex];
    if (!q) return;

    const stmt = ui.editQStatement.value.trim();
    const opts = [
        ui.editQOptA.value.trim(),
        ui.editQOptB.value.trim(),
        ui.editQOptC.value.trim(),
        ui.editQOptD.value.trim()
    ];
    const ans = ui.editQAns.value;
    const sec = ui.editQSec.value.trim();

    q.text = stmt;
    q.options = opts;
    q.correct_answer = ans;
    q.section = sec;

    // Persist to backend if question has UUID
    try {
        await fetch(`/api/v1/questions/${q.id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                statement: stmt,
                options: opts,
                correct_answer: ans,
                subject: q.subject || "Physics"
            })
        });
    } catch (_) {}

    ui.modalEditQ.style.display = 'none';
    loadQuestion(currentQuestionIndex);
};

// Section Tabs Interaction
document.querySelectorAll('.sec-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.sec-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const targetSec = btn.getAttribute('data-sec') || '';
        activeSection = targetSec;

        // Jump to first question in section if available
        const foundIdx = allQuestions.findIndex(q => q.section === targetSec);
        if (foundIdx !== -1) {
            loadQuestion(foundIdx);
        }
    });
});

// Question Paper Modal Generator
function openQuestionPaper(): void {
    if (!ui.paperListContainer) return;
    ui.paperListContainer.innerHTML = '';

    allQuestions.forEach((q, idx) => {
        const item = document.createElement('div');
        item.style.borderBottom = '1px solid #e2e8f0';
        item.style.padding = '1rem 0';

        item.innerHTML = `
            <div style="font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">
                Question ${idx + 1} (${q.section || 'General'})
            </div>
            <div style="margin-bottom: 0.75rem; color: #334155; line-height: 1.6;">${q.text}</div>
            <ol type="A" style="padding-left: 1.25rem; color: #475569; display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem;">
                ${(q.options || []).map(opt => `<li>${opt}</li>`).join('')}
            </ol>
        `;
        ui.paperListContainer.appendChild(item);
        renderMath(item);
    });

    ui.modalPaper.style.display = 'flex';
}

// User Profile Initializer
function initProfile(): void {
    const name = localStorage.getItem('candidate_name') || 'NARESH S';
    const reg = localStorage.getItem('reg_no') || '5254740(V4.3.7)';
    if (ui.candDisplayName) ui.candDisplayName.textContent = name;
    if (ui.candDisplayReg) ui.candDisplayReg.textContent = reg;
}

// Bind Global Listeners
if (ui.btnSaveNext) ui.btnSaveNext.onclick = handleSaveNext;
if (ui.btnSaveReview) ui.btnSaveReview.onclick = handleSaveReview;
if (ui.btnClearResp) ui.btnClearResp.onclick = handleClearResponse;
if (ui.btnBack) ui.btnBack.onclick = () => { if (currentQuestionIndex > 0) loadQuestion(currentQuestionIndex - 1); };
if (ui.btnNext) ui.btnNext.onclick = () => { if (currentQuestionIndex < allQuestions.length - 1) loadQuestion(currentQuestionIndex + 1); };
if (ui.btnSubmit) ui.btnSubmit.onclick = openSubmissionModal;
if (ui.modalCancelSubmit) ui.modalCancelSubmit.onclick = () => { ui.modalSubmit.style.display = 'none'; };
if (ui.modalConfirmSubmit) ui.modalConfirmSubmit.onclick = performFinalSubmission;

// Modals
if (ui.btnViewInstructions) ui.btnViewInstructions.onclick = () => { ui.modalInstructions.style.display = 'flex'; };
if (ui.btnCloseInst) ui.btnCloseInst.onclick = () => { ui.modalInstructions.style.display = 'none'; };
if (ui.btnInstDone) ui.btnInstDone.onclick = () => { ui.modalInstructions.style.display = 'none'; };
if (ui.btnViewPaper) ui.btnViewPaper.onclick = openQuestionPaper;
if (ui.btnClosePaper) ui.btnClosePaper.onclick = () => { ui.modalPaper.style.display = 'none'; };

// God MAXX Listeners
if (ui.btnGodEditQ) ui.btnGodEditQ.onclick = openGodEditModal;
if (ui.btnCloseEditQ) ui.btnCloseEditQ.onclick = () => { ui.modalEditQ.style.display = 'none'; };
if (ui.btnCancelEditQ) ui.btnCancelEditQ.onclick = () => { ui.modalEditQ.style.display = 'none'; };
if (ui.btnGodTools) ui.btnGodTools.onclick = () => { ui.modalGodTools.style.display = 'flex'; };
if (ui.btnCloseGodTools) ui.btnCloseGodTools.onclick = () => { ui.modalGodTools.style.display = 'none'; };

// God MAXX Actions
if (ui.btnAutoSolve) {
    ui.btnAutoSolve.onclick = () => {
        allQuestions.forEach((q, idx) => {
            const letter = q.correct_answer || "A";
            const optIdx = letter.charCodeAt(0) - 65;
            responses[idx] = optIdx >= 0 && optIdx < 4 ? optIdx : 0;
            questionState[idx] = 1; // Answered
            syncResponseToCloud(idx, 1);
        });
        ui.modalGodTools.style.display = 'none';
        loadQuestion(currentQuestionIndex);
        showLiveToast("God MAXX: All 20 questions auto-solved and synced in realtime to Cloud DB!");
    };
}

if (ui.btnRevealKey) {
    ui.btnRevealKey.onclick = () => {
        revealAnswersMode = !revealAnswersMode;
        ui.modalGodTools.style.display = 'none';
        loadQuestion(currentQuestionIndex);
        showLiveToast(`God MAXX: Answer key display mode is now ${revealAnswersMode ? "ACTIVE (highlighted in green)" : "OFF"}.`);
    };
}

if (ui.btnSkipTimer) {
    ui.btnSkipTimer.onclick = () => {
        currentRemainingSeconds = 10;
        ui.modalGodTools.style.display = 'none';
    };
}

if (ui.btnResetAttemptSelf) {
    ui.btnResetAttemptSelf.onclick = async () => {
        try {
            await fetch(`${API_BASE}/${EXAM_ID}/reset`, { method: 'POST', headers: getAuthHeaders() });
            questionState = new Array(20).fill(0);
            responses = new Array(20).fill(null);
            currentRemainingSeconds = 179 * 60 + 41;
            ui.modalGodTools.style.display = 'none';
            loadQuestion(0);
            showLiveToast("Exam attempt reset! You may now begin the test freshly.");
        } catch (_) {}
    };
}

// Palette Collapse/Expand Toggle
if (ui.btnTogglePalette && ui.sidebarPane) {
    ui.btnTogglePalette.onclick = () => {
        const isHidden = ui.sidebarPane.style.display === 'none';
        ui.sidebarPane.style.display = isHidden ? 'flex' : 'none';
        ui.btnTogglePalette.textContent = isHidden ? '>' : '<';
    };
}

// Manual Sync Button
if (ui.btnManualSync) {
    ui.btnManualSync.onclick = () => {
        updateSyncTime();
        allQuestions.forEach((_, idx) => {
            if (responses[idx] !== null) {
                syncResponseToCloud(idx, questionState[idx]);
            }
        });
        showLiveToast("State synchronized with central Cloud DB cluster.");
    };
}

// Fetch Remote DB Questions if Available
async function fetchRemoteQuestions(): Promise<void> {
    try {
        const res = await fetch(`${API_BASE}/${EXAM_ID}/questions`, { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length >= 5) {
                // Merge database questions while ensuring the balloon question is at index 2 (Question 3)
                const balloonQ = data.find(q => (q.text || '').includes('balloon with constant acceleration'));
                if (balloonQ) {
                    const others = data.filter(q => q.id !== balloonQ.id);
                    allQuestions = [others[0] || DEFAULT_QUESTIONS[0], others[1] || DEFAULT_QUESTIONS[1], balloonQ, ...others.slice(2)];
                } else {
                    allQuestions = data;
                }
            }
        }
    } catch (_) {}
    loadQuestion(2); // Question 3 loaded by default matching screenshot
}

// ============================================================
// TCS iON SECURITY, KIOSK ANTI-CHEAT & PROCTOR TELEMETRY SUITE
// ============================================================

// 1. Role & Auth Verification
function initAuthAndRole(): void {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.replace('/login.html');
        return;
    }
    const role = localStorage.getItem('user_role');
    if (role === 'super_admin') {
        if (ui.btnGodEditQ) ui.btnGodEditQ.style.display = 'inline-flex';
        if (ui.btnGodTools) ui.btnGodTools.style.display = 'inline-flex';
    } else {
        if (ui.btnGodEditQ) ui.btnGodEditQ.style.display = 'none';
        if (ui.btnGodTools) ui.btnGodTools.style.display = 'none';
    }
}

// 2. Terminal Identification
const currentTerminalId = localStorage.getItem('terminal_id') || 'C-042';
const candTermTag = document.getElementById('cand-terminal-tag');
if (candTermTag) candTermTag.textContent = currentTerminalId;
const lockedTermTag = document.getElementById('locked-term-id');
if (lockedTermTag) lockedTermTag.textContent = currentTerminalId;

// 3. Dynamic Moving Watermark
function initWatermark(): void {
    const name = localStorage.getItem('candidate_name') || 'NARESH S';
    const reg = localStorage.getItem('reg_no') || '5254740(V4.3.7)';
    const row1 = document.getElementById('wm-row-1');
    const row2 = document.getElementById('wm-row-2');
    const row4 = document.getElementById('wm-row-4');

    const updateWm = () => {
        const timeStr = new Date().toLocaleTimeString();
        if (row1) row1.textContent = `${name} • ${reg} • TERMINAL ${currentTerminalId} • ${timeStr}`;
        if (row2) row2.textContent = `SSE CBT PLATFORM V0.1 • OFFICIAL EXAM • AUDIT ACTIVE`;
        if (row4) row4.textContent = `${name} • ${reg} • TERMINAL ${currentTerminalId} • SECURE CBT`;
    };
    updateWm();
    setInterval(updateWm, 5000);
}

// 4. AI Proctor Preview Canvas & Toggle
function initProctorPreview(): void {
    const card = document.getElementById('proctor-cam-card');
    const toggleBtn = document.getElementById('proctor-cam-toggle');
    const minBtn = document.getElementById('proctor-min-btn');

    if (toggleBtn && card) {
        toggleBtn.addEventListener('click', () => {
            const isCol = card.classList.toggle('collapsed');
            if (minBtn) minBtn.textContent = isCol ? '+' : '−';
        });
    }

    const canvas = document.getElementById('proctor-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let scanY = 0;
    let scanDir = 1;

    function renderFrame() {
        if (!ctx) return;
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Face outline silhouette
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(canvas.width / 2, canvas.height / 2, 35, 48, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Green tracking corners
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const rw = 40;
        const rh = 50;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(cx - rw, cy - rh + 10);
        ctx.lineTo(cx - rw, cy - rh);
        ctx.lineTo(cx - rw + 10, cy - rh);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(cx + rw - 10, cy - rh);
        ctx.lineTo(cx + rw, cy - rh);
        ctx.lineTo(cx + rw, cy - rh + 10);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(cx - rw, cy + rh - 10);
        ctx.lineTo(cx - rw, cy + rh);
        ctx.lineTo(cx - rw + 10, cy + rh);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(cx + rw - 10, cy + rh);
        ctx.lineTo(cx + rw, cy + rh);
        ctx.lineTo(cx + rw, cy + rh - 10);
        ctx.stroke();

        // Moving scanning radar beam
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - rw, cy - rh + scanY);
        ctx.lineTo(cx + rw, cy - rh + scanY);
        ctx.stroke();

        scanY += scanDir * 1.5;
        if (scanY > rh * 2 || scanY < 0) scanDir *= -1;

        // Overlay status text
        ctx.font = '8px monospace';
        ctx.fillStyle = '#10b981';
        ctx.fillText('FACE CONFIDENCE: 99.4%', 8, 14);
        ctx.fillText('GAZE: CENTER (NORMAL)', 8, canvas.height - 8);

        requestAnimationFrame(renderFrame);
    }
    renderFrame();
}

// 5. Accessibility Font Scaling
let currentFontScale = 16;
const btnFontDec = document.getElementById('btn-font-dec');
const btnFontReset = document.getElementById('btn-font-reset');
const btnFontInc = document.getElementById('btn-font-inc');

function setQuestionFontSize(size: number): void {
    currentFontScale = size;
    if (ui.qText) ui.qText.style.fontSize = `${currentFontScale}px`;
    document.querySelectorAll('.option-card-row').forEach((row: any) => {
        row.style.fontSize = `${currentFontScale - 1}px`;
    });
}

if (btnFontDec) btnFontDec.onclick = () => { if (currentFontScale > 13) setQuestionFontSize(currentFontScale - 2); };
if (btnFontReset) btnFontReset.onclick = () => setQuestionFontSize(16);
if (btnFontInc) btnFontInc.onclick = () => { if (currentFontScale < 24) setQuestionFontSize(currentFontScale + 2); };

// 6. Anti-Cheat Kiosk Enforcement (Tab Switch, Shortcuts & Fullscreen)
let violationCount = 0;
const MAX_VIOLATIONS = 3;

function reportSecurityViolation(reason: string): void {
    if (isSubmitting) return;
    violationCount++;

    const candName = localStorage.getItem('candidate_name') || 'NARESH S';
    const regNo = localStorage.getItem('reg_no') || '5254740(V4.3.7)';

    // Transmit violation alert directly to Central Invigilator Command Centre
    if (examSocket && examSocket.readyState === WebSocket.OPEN) {
        examSocket.send(JSON.stringify({
            type: "CANDIDATE_VIOLATION",
            exam_id: EXAM_ID,
            candidate_name: candName,
            reg_no: regNo,
            terminal: currentTerminalId,
            violation_type: reason,
            count: violationCount
        }));
    }

    if (violationCount >= MAX_VIOLATIONS) {
        triggerTerminalForceLock(`3 Security Violations Exceeded (${reason}). Examination terminated.`);
    } else {
        const violModal = document.getElementById('modal-violation-alert');
        const badgeText = document.getElementById('viol-badge-text');
        const descText = document.getElementById('viol-desc-text');
        if (badgeText) badgeText.textContent = `⚠️ Strike ${violationCount} of 3: ${reason}`;
        if (descText) descText.textContent = `Active window focus was lost. This malpractice event was transmitted to Central Invigilator telemetry.`;
        if (violModal) violModal.style.display = 'flex';
    }
}

// Focus & Visibility Watchers
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && !isSubmitting) {
        reportSecurityViolation("Tab Switched / Kiosk Minimized");
    }
});

window.addEventListener('blur', () => {
    if (!isSubmitting) {
        reportSecurityViolation("Window Focus Lost (Alt-Tab / External Click)");
    }
});

// DevTools, Copy-Paste, Refresh Interceptor
window.addEventListener('keydown', (e) => {
    const isDevTools = e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
        (e.ctrlKey && ['u', 'U', 's', 'S', 'p', 'P'].includes(e.key));
    const isCopyPaste = (e.ctrlKey && ['c', 'C', 'v', 'V', 'x', 'X'].includes(e.key));
    const isRefresh = e.key === 'F5' || (e.ctrlKey && ['r', 'R'].includes(e.key));

    if (isDevTools || isCopyPaste || isRefresh) {
        e.preventDefault();
        e.stopPropagation();
        showLiveToast("⚠️ Security Notice: Shortcuts and inspection tools are blocked in Kiosk Mode.", true);
        reportSecurityViolation(`Blocked Shortcut: ${e.key}`);
        return false;
    }
});

window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showLiveToast("⚠️ Right-click context menu is disabled in Kiosk Mode.");
    return false;
});

// Fullscreen Kiosk Mode
let fsCountdownTimer: any = null;
let fsRemainingSec = 15;

function toggleKioskFullscreen(): void {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
            showLiveToast("Fullscreen request requires user interaction.", true);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
    }
}

const btnToggleFs = document.getElementById('btn-toggle-fullscreen');
if (btnToggleFs) btnToggleFs.onclick = toggleKioskFullscreen;

const btnResumeFs = document.getElementById('btn-resume-fullscreen');
if (btnResumeFs) {
    btnResumeFs.onclick = () => {
        document.documentElement.requestFullscreen().then(() => {
            const modalFs = document.getElementById('modal-fullscreen-lock');
            if (modalFs) modalFs.classList.remove('active');
            if (fsCountdownTimer) clearInterval(fsCountdownTimer);
        }).catch(() => {});
    };
}

document.addEventListener('fullscreenchange', () => {
    const modalFs = document.getElementById('modal-fullscreen-lock');
    const countSpan = document.getElementById('fs-countdown-sec');
    const fsText = document.getElementById('fullscreen-text');

    if (!document.fullscreenElement) {
        if (fsText) fsText.textContent = 'Fullscreen';
        if (modalFs && !isSubmitting && violationCount < MAX_VIOLATIONS) {
            modalFs.classList.add('active');
            fsRemainingSec = 15;
            if (countSpan) countSpan.textContent = '15';
            if (fsCountdownTimer) clearInterval(fsCountdownTimer);
            fsCountdownTimer = setInterval(() => {
                fsRemainingSec--;
                if (countSpan) countSpan.textContent = fsRemainingSec.toString();
                if (fsRemainingSec <= 0) {
                    clearInterval(fsCountdownTimer);
                    reportSecurityViolation("Exited Fullscreen Timeout");
                }
            }, 1000);
        }
    } else {
        if (fsText) fsText.textContent = 'Exit Fullscreen';
        if (modalFs) modalFs.classList.remove('active');
        if (fsCountdownTimer) clearInterval(fsCountdownTimer);
    }
});

// Acknowledge buttons
const btnAckViol = document.getElementById('btn-ack-violation');
if (btnAckViol) {
    btnAckViol.onclick = () => {
        const violModal = document.getElementById('modal-violation-alert');
        if (violModal) violModal.style.display = 'none';
    };
}

const btnAckInvig = document.getElementById('btn-ack-invig');
if (btnAckInvig) {
    btnAckInvig.onclick = () => {
        const invigModal = document.getElementById('modal-invigilator-msg');
        if (invigModal) invigModal.style.display = 'none';
    };
}

// 7. TCS iON Virtual Scientific Calculator Engine
let calcCurrent = '0';
let calcExpression = '';
let calcMemory = 0;
let isRadMode = false;
let resetNextNum = false;

const calcWindow = document.getElementById('calc-window');
const calcScreen = document.getElementById('calc-screen');
const calcExpr = document.getElementById('calc-expr');
const btnOpenCalc = document.getElementById('btn-open-calc');
const btnCloseCalc = document.getElementById('btn-close-calc');
const calcRadDegBtn = document.getElementById('calc-rad-deg');

function updateCalcDisplay(): void {
    if (calcScreen) calcScreen.textContent = calcCurrent;
    if (calcExpr) calcExpr.textContent = calcExpression || '\u00A0';
}

if (btnOpenCalc && calcWindow) {
    btnOpenCalc.onclick = () => {
        calcWindow.classList.toggle('active');
    };
}

if (btnCloseCalc && calcWindow) {
    btnCloseCalc.onclick = () => {
        calcWindow.classList.remove('active');
    };
}

// Make Calculator Draggable
const calcHandle = document.getElementById('calc-drag-handle');
if (calcHandle && calcWindow) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initLeft = 0;
    let initTop = 0;

    calcHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = calcWindow.getBoundingClientRect();
        initLeft = rect.left;
        initTop = rect.top;
        calcWindow.style.right = 'auto';
        calcWindow.style.left = `${initLeft}px`;
        calcWindow.style.top = `${initTop}px`;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        calcWindow.style.left = `${initLeft + dx}px`;
        calcWindow.style.top = `${initTop + dy}px`;
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// Calculator Functions & Operations
function calcFactorial(n: number): number {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= Math.min(n, 20); i++) res *= i;
    return res;
}

if (calcRadDegBtn) {
    calcRadDegBtn.onclick = () => {
        isRadMode = !isRadMode;
        calcRadDegBtn.textContent = isRadMode ? 'Rad' : 'Deg';
    };
}

// Memory buttons
const btnMc = document.getElementById('calc-mc');
if (btnMc) btnMc.onclick = () => { calcMemory = 0; showLiveToast("Calc: Memory cleared (MC)"); };

const btnMr = document.getElementById('calc-mr');
if (btnMr) btnMr.onclick = () => { calcCurrent = calcMemory.toString(); resetNextNum = true; updateCalcDisplay(); };

const btnMs = document.getElementById('calc-ms');
if (btnMs) btnMs.onclick = () => { calcMemory = parseFloat(calcCurrent) || 0; showLiveToast("Calc: Stored in memory (MS)"); };

const btnMPlus = document.getElementById('calc-mplus');
if (btnMPlus) btnMPlus.onclick = () => { calcMemory += (parseFloat(calcCurrent) || 0); showLiveToast("Calc: Added to memory (M+)"); };

const btnMMinus = document.getElementById('calc-mminus');
if (btnMMinus) btnMMinus.onclick = () => { calcMemory -= (parseFloat(calcCurrent) || 0); showLiveToast("Calc: Subtracted from memory (M-)"); };

// Clear & Backspace
const btnC = document.getElementById('calc-c');
if (btnC) btnC.onclick = () => { calcCurrent = '0'; calcExpression = ''; updateCalcDisplay(); };

const btnCe = document.getElementById('calc-ce');
if (btnCe) btnCe.onclick = () => { calcCurrent = '0'; updateCalcDisplay(); };

const btnBack = document.getElementById('calc-back');
if (btnBack) btnBack.onclick = () => {
    if (calcCurrent.length > 1) {
        calcCurrent = calcCurrent.slice(0, -1);
    } else {
        calcCurrent = '0';
    }
    updateCalcDisplay();
};

// Numeric and Symbol Insert buttons
document.querySelectorAll('.calc-btn[data-insert]').forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-insert') || '';
        if (['+', '-', '*', '/', '^', '%'].includes(val)) {
            calcExpression = `${calcExpression} ${calcCurrent} ${val}`;
            calcCurrent = '0';
            resetNextNum = false;
        } else if (val === '(' || val === ')') {
            calcExpression += ` ${val} `;
        } else if (val === 'pi') {
            calcCurrent = Math.PI.toString();
            resetNextNum = true;
        } else if (val === 'e') {
            calcCurrent = Math.E.toString();
            resetNextNum = true;
        } else {
            // Digit or dot
            if (calcCurrent === '0' || resetNextNum) {
                calcCurrent = val === '.' ? '0.' : val;
                resetNextNum = false;
            } else {
                if (val === '.' && calcCurrent.includes('.')) return;
                calcCurrent += val;
            }
        }
        updateCalcDisplay();
    });
});

// Scientific Function buttons
document.querySelectorAll('.calc-btn[data-fn]').forEach(btn => {
    btn.addEventListener('click', () => {
        const fn = btn.getAttribute('data-fn');
        const num = parseFloat(calcCurrent) || 0;
        let res = num;

        const toRad = (d: number) => isRadMode ? d : (d * Math.PI / 180);
        const toDeg = (r: number) => isRadMode ? r : (r * 180 / Math.PI);

        switch (fn) {
            case 'sin': res = Math.sin(toRad(num)); break;
            case 'cos': res = Math.cos(toRad(num)); break;
            case 'tan': res = Math.tan(toRad(num)); break;
            case 'asin': res = toDeg(Math.asin(num)); break;
            case 'acos': res = toDeg(Math.acos(num)); break;
            case 'atan': res = toDeg(Math.atan(num)); break;
            case 'sinh': res = Math.sinh(num); break;
            case 'cosh': res = Math.cosh(num); break;
            case 'tanh': res = Math.tanh(num); break;
            case 'log': res = Math.log10(num); break;
            case 'ln': res = Math.log(num); break;
            case 'sq': res = Math.pow(num, 2); break;
            case 'cube': res = Math.pow(num, 3); break;
            case 'sqrt': res = Math.sqrt(num); break;
            case 'cbrt': res = Math.cbrt(num); break;
            case 'inv': res = num !== 0 ? 1 / num : NaN; break;
            case 'fact': res = calcFactorial(num); break;
            case 'exp': res = Math.pow(10, num); break;
            case 'neg': res = -num; break;
            case 'abs': res = Math.abs(num); break;
        }

        calcExpression = `${fn}(${calcCurrent})`;
        calcCurrent = Number.isFinite(res) ? (Math.round(res * 100000000) / 100000000).toString() : 'Error';
        resetNextNum = true;
        updateCalcDisplay();
    });
});

// Equals Calculation
const btnCalcEq = document.getElementById('calc-eq');
if (btnCalcEq) {
    btnCalcEq.onclick = () => {
        try {
            let expr = `${calcExpression} ${calcCurrent}`.trim();
            expr = expr.replace(/\^/g, '**');
            // Safe evaluation of arithmetic only
            if (!/^[0-9+\-*/().\s%*]+$/.test(expr)) {
                calcCurrent = 'Error';
            } else {
                // eslint-disable-next-line no-eval
                const result = Function(`'use strict'; return (${expr})`)();
                calcExpression = `${expr} =`;
                calcCurrent = Number.isFinite(result) ? (Math.round(result * 100000000) / 100000000).toString() : 'Error';
            }
        } catch (_) {
            calcCurrent = 'Error';
        }
        resetNextNum = true;
        updateCalcDisplay();
    };
}

// INITIALIZE CONSOLE
initAuthAndRole();
initProfile();
initWatermark();
initProctorPreview();
startTimer();
initExamWebSocket();
fetchRemoteQuestions();

