export {};

const API_BASE = '/api/v1/questions';

function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token') || 'dev_test_token_do_not_use_in_prod';
    const tenantId = localStorage.getItem('tenant_id') || '00000000-0000-0000-0000-000000000001';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId,
    };
}

function showToast(msg: string, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.backgroundColor = isError ? "var(--danger)" : "var(--success)";
    toast.className = "show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

const ui = {
    list: document.getElementById('q-list')!,
    filterSubject: document.getElementById('filter-subject') as HTMLSelectElement,
    filterStatus: document.getElementById('filter-status') as HTMLSelectElement,
    btnCreate: document.getElementById('btn-create-qb') as HTMLButtonElement,
    btnImport: document.getElementById('btn-import-qb') as HTMLButtonElement,
    modalCreate: document.getElementById('modal-create-q')!,
    modalImport: document.getElementById('modal-import-q')!,
    formCreate: document.getElementById('form-create-q') as HTMLFormElement,
    formImport: document.getElementById('form-import-q') as HTMLFormElement,
    fileInput: document.getElementById('qb-file-input') as HTMLInputElement,
    btnCancelCreate: document.getElementById('btn-cancel-create-q') as HTMLButtonElement,
    btnCancelImport: document.getElementById('btn-cancel-import-q') as HTMLButtonElement,
    btnDryRun: document.getElementById('btn-dry-run') as HTMLButtonElement,
    btnCommit: document.getElementById('btn-commit-import') as HTMLButtonElement,
    dryRunReport: document.getElementById('dry-run-report')!,
    drSummary: document.getElementById('dr-summary')!,
};

let currentJobId: string | null = null;

async function loadQuestions() {
    try {
        const subject = ui.filterSubject ? ui.filterSubject.value : 'All';
        const statusVal = ui.filterStatus ? ui.filterStatus.value : 'All';

        let url = `${API_BASE}/`;
        const params = new URLSearchParams();
        if (subject && subject !== 'All') params.append('subject', subject);
        if (statusVal && statusVal !== 'All') params.append('status', statusVal);
        if (params.toString()) url += `?${params.toString()}`;

        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Failed to load questions");

        const questions = await res.json();
        ui.list.innerHTML = '';

        if (!Array.isArray(questions) || questions.length === 0) {
            ui.list.innerHTML = `
                <div class="q-item" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                    No questions found matching the selected filters. Click "Create New Question" or "Bulk Import CSV" to add questions.
                </div>
            `;
            return;
        }

        questions.forEach((q: any) => {
            const div = document.createElement('div');
            div.className = 'q-item';

            const statusClass = q.status === 'approved' ? 'var(--success)' : 'var(--warning)';
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
                    <span style="color: var(--text-muted); font-weight: 600; font-size: 0.85rem;">ID: ${q.id.substring(0, 8)}</span>
                    <span style="color: ${statusClass}; font-weight: 600; font-size: 0.85rem; text-transform: uppercase;">${q.status}</span>
                </div>
                <div style="font-size: 1.1rem; font-weight: 500; margin-bottom: 0.75rem;">${q.statement}</div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
                    ${(q.options || []).map((opt: string, i: number) => `
                        <div style="font-size: 0.85rem; padding: 0.25rem 0.5rem; background: var(--bg-page); border-radius: 4px;">
                            <strong>${String.fromCharCode(65 + i)}:</strong> ${opt}
                        </div>
                    `).join('')}
                </div>
                <div class="q-tags">
                    <span class="tag">${q.type || 'mcq_single'}</span>
                    <span class="tag" style="background: #e0f2fe; color: #0369a1;">${q.subject || 'General'}</span>
                    <span class="tag">${q.difficulty || 'Medium'}</span>
                    ${q.correct_answer ? `<span class="tag" style="background: #dcfce7; color: #15803d;">Correct: ${q.correct_answer}</span>` : ''}
                </div>
            `;
            ui.list.appendChild(div);
        });
    } catch (err) {
        showToast("Failed to load question bank", true);
    }
}

// Filter listeners
if (ui.filterSubject) ui.filterSubject.onchange = loadQuestions;
if (ui.filterStatus) ui.filterStatus.onchange = loadQuestions;

// Modal Toggles
if (ui.btnCreate) ui.btnCreate.onclick = () => { ui.modalCreate.style.display = 'flex'; };
if (ui.btnCancelCreate) ui.btnCancelCreate.onclick = () => { ui.modalCreate.style.display = 'none'; };

if (ui.btnImport) ui.btnImport.onclick = () => {
    ui.modalImport.style.display = 'flex';
    ui.dryRunReport.style.display = 'none';
    ui.btnCommit.disabled = true;
};
if (ui.btnCancelImport) ui.btnCancelImport.onclick = () => { ui.modalImport.style.display = 'none'; };

// Create Question Form
if (ui.formCreate) {
    ui.formCreate.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            statement: (document.getElementById('q-stmt') as HTMLTextAreaElement).value,
            opt_a: (document.getElementById('q-opta') as HTMLInputElement).value,
            opt_b: (document.getElementById('q-optb') as HTMLInputElement).value,
            opt_c: (document.getElementById('q-optc') as HTMLInputElement).value,
            opt_d: (document.getElementById('q-optd') as HTMLInputElement).value,
            correct_answer: (document.getElementById('q-correct') as HTMLSelectElement).value,
            subject: (document.getElementById('q-subj') as HTMLSelectElement).value,
            difficulty: (document.getElementById('q-diff') as HTMLSelectElement).value,
            marks: parseFloat((document.getElementById('q-marks') as HTMLInputElement).value) || 4.0,
            question_type: "mcq_single",
        };

        try {
            const res = await fetch(`${API_BASE}/`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                showToast("Question created successfully");
                ui.modalCreate.style.display = 'none';
                ui.formCreate.reset();
                loadQuestions();
            } else {
                const err = await res.json();
                showToast(err.detail || "Creation failed", true);
            }
        } catch (err) {
            showToast("Network error creating question", true);
        }
    };
}

// Dry Run Verification
if (ui.btnDryRun) {
    ui.btnDryRun.onclick = async () => {
        const file = ui.fileInput.files?.[0];
        if (!file) {
            alert("Please choose a CSV or JSON file first");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('format', file.name.endsWith('.json') ? 'json' : 'csv');

        const token = localStorage.getItem('access_token') || 'dev_test_token_do_not_use_in_prod';
        const tenantId = localStorage.getItem('tenant_id') || '00000000-0000-0000-0000-000000000001';

        ui.btnDryRun.textContent = "Verifying...";
        try {
            const res = await fetch(`${API_BASE}/import/dry-run`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-tenant-id': tenantId,
                },
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                currentJobId = data.job_id;
                ui.dryRunReport.style.display = 'block';

                ui.drSummary.innerHTML = `
                    <div style="margin-bottom: 0.5rem;">
                        <strong>Total rows detected:</strong> ${data.total_detected} |
                        <strong style="color: var(--success);">Valid:</strong> ${data.valid_count} |
                        <strong style="color: var(--danger);">Invalid:</strong> ${data.invalid_count}
                    </div>
                    ${data.errors.length > 0 ? `
                        <div style="color: var(--danger); max-height: 100px; overflow-y: auto; font-size: 0.8rem; background: #fff; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
                            ${data.errors.map((e: any) => `<div>Row ${e.row}: ${e.message}</div>`).join('')}
                        </div>
                    ` : '<div style="color: var(--success); font-weight: 600;">All records passed validation!</div>'}
                `;

                ui.btnCommit.disabled = data.valid_count === 0;
            } else {
                const err = await res.json();
                showToast(err.detail || "Validation failed", true);
            }
        } catch (err) {
            showToast("Network error verifying file", true);
        } finally {
            ui.btnDryRun.textContent = "Verify File (Dry Run)";
        }
    };
}

// Commit Import Form
if (ui.formImport) {
    ui.formImport.onsubmit = async (e) => {
        e.preventDefault();
        if (!currentJobId) return;

        ui.btnCommit.textContent = "Committing...";
        ui.btnCommit.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/import/commit/${currentJobId}`, {
                method: 'POST',
                headers: getAuthHeaders(),
            });

            if (res.ok) {
                const data = await res.json();
                showToast(data.message || "Questions imported successfully");
                ui.modalImport.style.display = 'none';
                ui.formImport.reset();
                currentJobId = null;
                loadQuestions();
            } else {
                const err = await res.json();
                showToast(err.detail || "Import commit failed", true);
            }
        } catch (err) {
            showToast("Network error committing import", true);
        } finally {
            ui.btnCommit.textContent = "Commit Import";
        }
    };
}

// Initialize
loadQuestions();
