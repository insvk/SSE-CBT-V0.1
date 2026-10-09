const questions = [
    { id: "Q-100", text: "What is the time complexity of binary search?", type: "MCQ Single", subject: "Computer Science", diff: "Medium", status: "Approved" },
    { id: "Q-101", text: "State the first law of thermodynamics.", type: "Descriptive", subject: "Physics", diff: "Hard", status: "Draft" }
];

const list = document.getElementById('q-list')!;

questions.forEach(q => {
    const div = document.createElement('div');
    div.className = 'q-item';
    
    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
            <span style="color: var(--text-muted); font-weight: 600;">${q.id}</span>
            <span style="color: ${q.status === 'Approved' ? 'var(--success)' : 'var(--warning)'}; font-weight: 600;">${q.status}</span>
        </div>
        <div style="font-size: 1.125rem; font-weight: 500;">${q.text}</div>
        <div class="q-tags">
            <span class="tag">${q.type}</span>
            <span class="tag">${q.subject}</span>
            <span class="tag">${q.diff}</span>
        </div>
    `;
    
    list.appendChild(div);
});
