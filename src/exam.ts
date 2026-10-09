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

function showLiveToast(text: string): void {
    const toast = document.getElementById('exam-live-toast');
    if (!toast) return;
    toast.textContent = text;
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

// INITIALIZE CONSOLE
initProfile();
startTimer();
initExamWebSocket();
fetchRemoteQuestions();
