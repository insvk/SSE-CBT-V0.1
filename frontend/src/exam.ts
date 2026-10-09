// --- CONFIG ---
const API_BASE = 'http://localhost:8000/api/v1/exams';
const EXAM_ID = 'EX-1001';

// --- MOCK QUESTIONS ---
const MOCK_QUESTIONS = [
    { id: "q_1", text: "What is the time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"] },
    { id: "q_2", text: "Which protocol is used for secure communication over a computer network?", options: ["HTTP", "FTP", "HTTPS", "SMTP"] },
    { id: "q_3", text: "Which data structure uses LIFO (Last In First Out)?", options: ["Queue", "Stack", "Tree", "Graph"] },
    { id: "q_4", text: "What does SQL stand for?", options: ["Structured Query Language", "Strong Question Language", "Structured Question Logic", "Sequential Query Language"] },
    { id: "q_5", text: "In Python, which keyword is used to define a function?", options: ["func", "define", "def", "function"] },
];

let currentQuestionIndex = 0;
// State: 0=not visited, 1=answered, 2=review, 3=answered+review, 4=not answered (visited but cleared/skipped)
const questionState = new Array(MOCK_QUESTIONS.length).fill(0);
const responses = new Array(MOCK_QUESTIONS.length).fill(null);

const ui = {
    qText: document.getElementById('question-text')!,
    qNum: document.getElementById('question-number')!,
    optionsList: document.getElementById('options-list')!,
    palette: document.getElementById('palette-grid')!,
    btnSaveNext: document.getElementById('btn-save-next')!,
    btnMarkReview: document.getElementById('btn-mark-review')!,
    btnClear: document.getElementById('btn-clear')!,
    btnPrev: document.getElementById('btn-prev')!,
    btnSubmit: document.getElementById('btn-submit-exam')!,
    saveIndicator: document.getElementById('save-indicator')!,
    timerDisplay: document.getElementById('timer-display')!,
    modal: document.getElementById('submit-modal')!,
    modalConfirm: document.getElementById('btn-modal-confirm')!,
    modalCancel: document.getElementById('btn-modal-cancel')!
};

// --- SYNC & API ---
function generateIdempotencyKey() {
    return 'idemp_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

async function saveResponseToCloud(questionIndex: number) {
    ui.saveIndicator.textContent = "Saving...";
    ui.saveIndicator.style.color = "var(--warning)";

    const payload = {
        question_id: MOCK_QUESTIONS[questionIndex].id,
        answer: responses[questionIndex],
        state: questionState[questionIndex],
        idempotency_key: generateIdempotencyKey()
    };

    try {
        const res = await fetch(`${API_BASE}/${EXAM_ID}/responses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            ui.saveIndicator.textContent = "All changes saved";
            ui.saveIndicator.style.color = "var(--success)";
        } else {
            throw new Error("Failed to save");
        }
    } catch (err) {
        console.error("Save error:", err);
        ui.saveIndicator.textContent = "Save Failed - Retrying...";
        ui.saveIndicator.style.color = "var(--danger)";
        // Basic retry fallback
        setTimeout(() => saveResponseToCloud(questionIndex), 3000);
    }
}

async function syncTimer() {
    try {
        const res = await fetch(`${API_BASE}/${EXAM_ID}/session`);
        const data = await res.json();
        
        let timeLeft = data.time_remaining_seconds;
        
        // Setup local tick
        setInterval(() => {
            if (timeLeft <= 0) {
                ui.timerDisplay.textContent = "00:00:00";
                return; // Trigger auto-submit in real impl
            }
            timeLeft--;
            const h = Math.floor(timeLeft / 3600).toString().padStart(2, '0');
            const m = Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0');
            const s = (timeLeft % 60).toString().padStart(2, '0');
            ui.timerDisplay.textContent = `${h}:${m}:${s}`;
        }, 1000);

    } catch (err) {
        console.error("Timer sync failed", err);
    }
}

// --- UI LOGIC ---

function renderPalette() {
    ui.palette.innerHTML = '';
    MOCK_QUESTIONS.forEach((_, idx) => {
        const btn = document.createElement('button');
        btn.className = 'palette-btn';
        btn.textContent = (idx + 1).toString();
        
        const s = questionState[idx];
        if (s === 1) btn.classList.add('answered');
        else if (s === 2) btn.classList.add('review');
        else if (s === 3) btn.classList.add('answered-review');
        else if (s === 4) btn.classList.add('not-answered');
        else btn.classList.add('not-visited');

        if (idx === currentQuestionIndex) btn.classList.add('active');

        btn.onclick = () => loadQuestion(idx);
        ui.palette.appendChild(btn);
    });
}

function loadQuestion(index: number) {
    currentQuestionIndex = index;
    const q = MOCK_QUESTIONS[index];
    
    ui.qNum.textContent = `Question ${index + 1}`;
    ui.qText.textContent = q.text;
    
    ui.optionsList.innerHTML = '';
    q.options.forEach((opt, optIdx) => {
        const li = document.createElement('li');
        li.className = 'option-item';
        
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'q_option';
        radio.value = optIdx.toString();
        
        if (responses[index] === optIdx) {
            radio.checked = true;
        }

        li.appendChild(radio);
        li.appendChild(document.createTextNode(opt));
        li.onclick = () => { radio.checked = true; };
        
        ui.optionsList.appendChild(li);
    });
    
    if (questionState[index] === 0) {
        questionState[index] = 4; // Not Answered (Visited)
    }
    renderPalette();
}

function getSelectedOption(): number | null {
    const selected = document.querySelector('input[name="q_option"]:checked') as HTMLInputElement;
    return selected ? parseInt(selected.value) : null;
}

function handleSaveNext() {
    const ans = getSelectedOption();
    if (ans !== null) {
        responses[currentQuestionIndex] = ans;
        questionState[currentQuestionIndex] = 1; // Answered
    } else {
        questionState[currentQuestionIndex] = 4; // Not Answered
    }
    
    saveResponseToCloud(currentQuestionIndex);
    
    if (currentQuestionIndex < MOCK_QUESTIONS.length - 1) {
        loadQuestion(currentQuestionIndex + 1);
    } else {
        renderPalette();
    }
}

function handleMarkReview() {
    const ans = getSelectedOption();
    if (ans !== null) {
        responses[currentQuestionIndex] = ans;
        questionState[currentQuestionIndex] = 3; // Answered + Review
    } else {
        questionState[currentQuestionIndex] = 2; // Marked for Review
    }
    
    saveResponseToCloud(currentQuestionIndex);
    
    if (currentQuestionIndex < MOCK_QUESTIONS.length - 1) {
        loadQuestion(currentQuestionIndex + 1);
    } else {
        renderPalette();
    }
}

function handleClear() {
    responses[currentQuestionIndex] = null;
    questionState[currentQuestionIndex] = 4; // Visited but not answered
    saveResponseToCloud(currentQuestionIndex);
    loadQuestion(currentQuestionIndex);
}

// --- SUBMISSION LOGIC ---

function openSubmissionModal() {
    let counts = { notVisited: 0, notAnswered: 0, answered: 0, review: 0, ansRev: 0 };
    
    questionState.forEach(s => {
        if (s === 0) counts.notVisited++;
        else if (s === 1) counts.answered++;
        else if (s === 2) counts.review++;
        else if (s === 3) counts.ansRev++;
        else if (s === 4) counts.notAnswered++;
    });

    document.getElementById('sm-total')!.textContent = MOCK_QUESTIONS.length.toString();
    document.getElementById('sm-ans')!.textContent = counts.answered.toString();
    document.getElementById('sm-not-ans')!.textContent = counts.notAnswered.toString();
    document.getElementById('sm-review')!.textContent = counts.review.toString();
    document.getElementById('sm-ans-rev')!.textContent = counts.ansRev.toString();
    document.getElementById('sm-not-vis')!.textContent = counts.notVisited.toString();

    ui.modal.style.display = 'flex';
}

ui.btnSubmit.onclick = openSubmissionModal;
ui.modalCancel.onclick = () => { ui.modal.style.display = 'none'; };

ui.modalConfirm.onclick = async () => {
    ui.modalConfirm.textContent = "Submitting...";
    ui.modalConfirm.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/${EXAM_ID}/submit`, { method: 'POST' });
        if (res.ok) {
            window.location.href = '/scorecard.html';
        } else {
            alert("Submission failed. Please try again.");
            ui.modalConfirm.textContent = "Final Submit";
            ui.modalConfirm.disabled = false;
        }
    } catch (err) {
        alert("Network error during submission.");
        ui.modalConfirm.textContent = "Final Submit";
        ui.modalConfirm.disabled = false;
    }
};

// Bind Events
ui.btnSaveNext.onclick = handleSaveNext;
ui.btnMarkReview.onclick = handleMarkReview;
ui.btnClear.onclick = handleClear;
ui.btnPrev.onclick = () => {
    if (currentQuestionIndex > 0) loadQuestion(currentQuestionIndex - 1);
};

// Init
syncTimer();
loadQuestion(0);
