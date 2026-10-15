export {};

const API_BASE = '/api/v1/questions';

function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token') || localStorage.getItem('admin_token') || '';
    const tenantId = localStorage.getItem('tenant_id') || '00000000-0000-0000-0000-000000000001';
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

function showToast(msg: string, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.backgroundColor = isError ? "var(--danger, #ef4444)" : "var(--success, #10b981)";
    toast.className = "show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3200);
}

function renderMath(elem: HTMLElement) {
    if ((window as any).renderMathInElement) {
        try {
            (window as any).renderMathInElement(elem, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\(', right: '\\)', display: false },
                ],
                throwOnError: false,
            });
        } catch (_) {}
    }
}

// Global cached question list
let loadedQuestions: any[] = [];
let currentDryRunJobId: string | null = null;

const ui = {
    list: document.getElementById('q-list')!,
    filterSubject: document.getElementById('filter-subject') as HTMLSelectElement,
    filterDifficulty: document.getElementById('filter-difficulty') as HTMLSelectElement,
    filterStatus: document.getElementById('filter-status') as HTMLSelectElement,
    searchInput: document.getElementById('search-q-input') as HTMLInputElement,
    statTotalBadge: document.getElementById('stat-total-badge') as HTMLSpanElement,

    // Header buttons
    btnCreate: document.getElementById('btn-create-qb') as HTMLButtonElement,
    btnImport: document.getElementById('btn-import-qb') as HTMLButtonElement,
    btnExportCsv: document.getElementById('btn-export-csv') as HTMLButtonElement,
    btnPurgeSeeds: document.getElementById('btn-purge-seeds') as HTMLButtonElement,
    btnPurgeAll: document.getElementById('btn-purge-all') as HTMLButtonElement,

    // Modals
    modalCreate: document.getElementById('modal-create-q')!,
    modalImport: document.getElementById('modal-import-q')!,
    modalEdit: document.getElementById('modal-edit-q')!,

    btnCloseCreateModal: document.getElementById('btn-close-create-modal'),
    btnCancelCreate: document.getElementById('btn-cancel-create-q'),
    btnCloseImportModal: document.getElementById('btn-close-import-modal'),
    btnCloseEditModal: document.getElementById('btn-close-edit-modal'),
    btnCancelEdit: document.getElementById('btn-cancel-edit-q'),

    // Create Form
    formCreate: document.getElementById('form-create-q') as HTMLFormElement,

    // CSV Import Form
    formImportCsv: document.getElementById('form-import-csv') as HTMLFormElement,
    csvFileInput: document.getElementById('qb-file-input') as HTMLInputElement,
    btnDryRun: document.getElementById('btn-dry-run') as HTMLButtonElement,
    btnCommitImport: document.getElementById('btn-commit-import') as HTMLButtonElement,
    dryRunReport: document.getElementById('dry-run-report')!,
    drSummary: document.getElementById('dr-summary')!,

    // JSON Import
    jsonFileInput: document.getElementById('qb-json-file') as HTMLInputElement,
    jsonTextarea: document.getElementById('qb-json-textarea') as HTMLTextAreaElement,
    btnImportJson: document.getElementById('btn-import-json') as HTMLButtonElement,

    // NLP Paste Import
    pasteDefaultSubject: document.getElementById('paste-default-subject') as HTMLSelectElement,
    pasteDefaultDifficulty: document.getElementById('paste-default-difficulty') as HTMLSelectElement,
    pasteTextarea: document.getElementById('qb-paste-textarea') as HTMLTextAreaElement,
    btnParsePreview: document.getElementById('btn-parse-preview') as HTMLButtonElement,
    btnCommitPaste: document.getElementById('btn-commit-paste') as HTMLButtonElement,
    pastePreviewContainer: document.getElementById('paste-preview-container')!,
    pastePreviewList: document.getElementById('paste-preview-list')!,
    pastePreviewTitle: document.getElementById('paste-preview-title')!,

    // Edit Form
    formEdit: document.getElementById('form-edit-q') as HTMLFormElement,
    editId: document.getElementById('edit-q-id') as HTMLInputElement,
    editStmt: document.getElementById('edit-q-stmt') as HTMLTextAreaElement,
    editOptA: document.getElementById('edit-q-opta') as HTMLInputElement,
    editOptB: document.getElementById('edit-q-optb') as HTMLInputElement,
    editOptC: document.getElementById('edit-q-optc') as HTMLInputElement,
    editOptD: document.getElementById('edit-q-optd') as HTMLInputElement,
    editCorrect: document.getElementById('edit-q-correct') as HTMLSelectElement,
    editSubj: document.getElementById('edit-q-subj') as HTMLSelectElement,
};

async function fetchQuestionsFromUrl(targetUrl: string): Promise<any[]> {
    let res = await fetch(targetUrl, { headers: getAuthHeaders() });
    if (!res.ok) {
        if (res.status === 401 && localStorage.getItem('access_token')) {
            console.warn('[Question Bank] Auth rejected; clearing expired token from localStorage and retrying...');
            localStorage.removeItem('access_token');
            res = await fetch(targetUrl, { headers: getAuthHeaders() });
        }
    }
    if (!res.ok) {
        let errorDetail = '';
        try {
            const errJson = await res.json();
            errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
        } catch (_) {
            try {
                const errText = await res.text();
                if (errText && errText.length < 200) {
                    errorDetail = errText;
                }
            } catch (_) {}
        }
        throw new Error(errorDetail || `Server returned HTTP ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

// 1. Fetch & Render Questions strictly from Supabase Cloud DB
async function loadQuestions() {
    try {
        const subject = ui.filterSubject ? ui.filterSubject.value : 'All';
        const statusVal = ui.filterStatus ? ui.filterStatus.value : 'All';

        const params = new URLSearchParams();
        if (subject && subject !== 'All') params.append('subject', subject);
        if (statusVal && statusVal !== 'All') params.append('status', statusVal);
        const queryStr = params.toString() ? `?${params.toString()}` : '';

        let questions: any[] = [];
        try {
            questions = await fetchQuestionsFromUrl(`${API_BASE}/${queryStr}`);
        } catch (firstErr: any) {
            // If running on localhost and relative fetch failed, try direct connection to port 8000
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isLocal && window.location.port !== '8000') {
                console.info('[Question Bank] Relative fetch failed, attempting direct connection to http://127.0.0.1:8000...');
                questions = await fetchQuestionsFromUrl(`http://127.0.0.1:8000${API_BASE}/${queryStr}`);
            } else {
                throw firstErr;
            }
        }

        loadedQuestions = questions;
        renderFilteredQuestions();
    } catch (err: any) {
        const errorMsg = err?.message || "Failed to fetch questions from Cloud DB";
        showToast(errorMsg, true);
        if (ui.list) {
            ui.list.innerHTML = `
                <div class="q-item" style="text-align: center; color: var(--danger, #ef4444); padding: 3rem;">
                    Failed to fetch questions from Cloud DB (${errorMsg}).<br />
                    <span style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; display: block;">
                        Please ensure your backend server is running (<code style="background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px;">uvicorn main:app --reload --port 8000</code>) and connected to Supabase.
                    </span>
                </div>
            `;
        }
    }
}

function renderFilteredQuestions() {
    if (!ui.list) return;

    const searchTerm = (ui.searchInput?.value || '').trim().toLowerCase();
    const diffFilter = ui.filterDifficulty?.value || 'All';

    const filtered = loadedQuestions.filter(q => {
        if (diffFilter !== 'All' && (q.difficulty || 'Medium') !== diffFilter) return false;
        if (searchTerm) {
            const stmt = (q.statement || '').toLowerCase();
            const subj = (q.subject || '').toLowerCase();
            const opts = (q.options || []).join(' ').toLowerCase();
            if (!stmt.includes(searchTerm) && !subj.includes(searchTerm) && !opts.includes(searchTerm)) {
                return false;
            }
        }
        return true;
    });

    if (ui.statTotalBadge) {
        ui.statTotalBadge.textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'}`;
    }

    ui.list.innerHTML = '';

    if (filtered.length === 0) {
        ui.list.innerHTML = `
            <div class="q-item" style="text-align: center; color: #64748b; padding: 3.5rem;">
                <h3 style="margin: 0 0 0.5rem 0; color: #1e293b; font-size: 1.25rem;">Question Bank is Empty</h3>
                <p style="margin: 0 0 1.5rem 0; font-size: 0.92rem; color: #64748b; max-width: 500px; margin-inline: auto;">
                    No questions exist in your database matching the selected filters. Use the import options or create questions to get started.
                </p>
                <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
                    <button class="btn btn-primary" id="empty-state-import-btn" style="background: #1e3a8a; border-color: #1e3a8a;">
                        Import Question Bank (CSV / JSON / Paste)
                    </button>
                    <button class="btn btn-outline" id="empty-state-create-btn">
                        Create Single Question
                    </button>
                </div>
            </div>
        `;

        document.getElementById('empty-state-import-btn')?.addEventListener('click', () => {
            ui.btnImport?.click();
        });
        document.getElementById('empty-state-create-btn')?.addEventListener('click', () => {
            ui.btnCreate?.click();
        });
        return;
    }

    filtered.forEach((q: any, idx: number) => {
        const div = document.createElement('div');
        div.className = 'q-item';

        const optLabels = ['A', 'B', 'C', 'D'];
        const options = q.options || [];
        const correctAns = (q.correct_answer || 'A').toUpperCase();

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-weight: 700; color: #1e293b; font-size: 0.95rem;">#${idx + 1}</span>
                    <span style="color: #94a3b8; font-size: 0.78rem; font-family: monospace;" title="Cloud DB ID: ${q.id}">[ID: ${q.id.substring(0, 8)}...]</span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-outline btn-sm btn-edit-q" data-id="${q.id}" style="padding: 3px 8px; font-size: 0.8rem;">Edit</button>
                    <button class="btn btn-outline btn-sm btn-delete-q" data-id="${q.id}" style="padding: 3px 8px; font-size: 0.8rem; color: #ef4444; border-color: #fca5a5;">Delete</button>
                </div>
            </div>

            <div class="q-stmt-text" style="font-size: 1.05rem; font-weight: 500; color: #0f172a; line-height: 1.5; margin-bottom: 0.85rem;">
                ${escapeHtml(q.statement)}
            </div>

            <div class="options-grid">
                ${options.map((opt: string, i: number) => {
                    const label = optLabels[i] || `${i + 1}`;
                    const isCorrect = correctAns === label;
                    return `
                        <div class="option-box ${isCorrect ? 'correct' : ''}">
                            <span style="font-weight: 700;">${label})</span>
                            <span class="opt-text">${escapeHtml(opt)}</span>
                            ${isCorrect ? '<span style="margin-left: auto; color: #16a34a; font-weight: 700;">[Key]</span>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="q-tags">
                <span class="tag tag-subject">${escapeHtml(q.subject || 'General')}</span>
                <span class="tag">${escapeHtml(q.difficulty || 'Medium')}</span>
                <span class="tag tag-correct">Correct Key: ${correctAns}</span>
                <span class="tag" style="background: #f8fafc; color: #64748b;">Marks: ${q.marks || 4}</span>
            </div>
        `;

        ui.list.appendChild(div);
        renderMath(div);
    });

    // Wire edit & delete buttons
    ui.list.querySelectorAll('.btn-edit-q').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            const q = loadedQuestions.find(item => item.id === id);
            if (q) openEditModal(q);
        });
    });

    ui.list.querySelectorAll('.btn-delete-q').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            if (!id) return;
            if (confirm("Are you sure you want to permanently delete this question from Supabase Cloud DB?")) {
                await deleteQuestion(id);
            }
        });
    });
}

function escapeHtml(str: string): string {
    return (str || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 2. Delete question from Cloud DB
async function deleteQuestion(questionId: string) {
    try {
        const res = await fetch(`${API_BASE}/${encodeURIComponent(questionId)}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (res.ok) {
            showToast("Question deleted from Cloud DB.");
            await loadQuestions();
        } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.detail || "Failed to delete question", true);
        }
    } catch {
        showToast("Network error deleting question", true);
    }
}

// 3. Edit question modal
function openEditModal(q: any) {
    if (!ui.modalEdit) return;
    ui.editId.value = q.id;
    ui.editStmt.value = q.statement || '';
    const opts = q.options || [];
    ui.editOptA.value = opts[0] || '';
    ui.editOptB.value = opts[1] || '';
    ui.editOptC.value = opts[2] || '';
    ui.editOptD.value = opts[3] || '';
    ui.editCorrect.value = (q.correct_answer || 'A').toUpperCase();
    ui.editSubj.value = q.subject || 'General';
    ui.modalEdit.style.display = 'flex';
}

if (ui.formEdit) {
    ui.formEdit.onsubmit = async (e) => {
        e.preventDefault();
        const id = ui.editId.value;
        const payload = {
            statement: ui.editStmt.value.trim(),
            options: [
                ui.editOptA.value.trim(),
                ui.editOptB.value.trim(),
                ui.editOptC.value.trim(),
                ui.editOptD.value.trim(),
            ],
            correct_answer: ui.editCorrect.value,
            subject: ui.editSubj.value,
        };

        try {
            const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                showToast("Question updated in Cloud DB and broadcast live!");
                ui.modalEdit.style.display = 'none';
                await loadQuestions();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || "Update failed", true);
            }
        } catch {
            showToast("Network error updating question", true);
        }
    };
}

// 4. Modal Navigation & Close Handlers
if (ui.btnCreate) ui.btnCreate.onclick = () => { ui.modalCreate.style.display = 'flex'; };
if (ui.btnCloseCreateModal) ui.btnCloseCreateModal.onclick = () => { ui.modalCreate.style.display = 'none'; };
if (ui.btnCancelCreate) ui.btnCancelCreate.onclick = () => { ui.modalCreate.style.display = 'none'; };

if (ui.btnImport) ui.btnImport.onclick = () => {
    ui.modalImport.style.display = 'flex';
    if (ui.dryRunReport) ui.dryRunReport.style.display = 'none';
    if (ui.btnCommitImport) ui.btnCommitImport.disabled = true;
};
if (ui.btnCloseImportModal) ui.btnCloseImportModal.onclick = () => { ui.modalImport.style.display = 'none'; };

if (ui.btnCloseEditModal) ui.btnCloseEditModal.onclick = () => { ui.modalEdit.style.display = 'none'; };
if (ui.btnCancelEdit) ui.btnCancelEdit.onclick = () => { ui.modalEdit.style.display = 'none'; };

// Tab Switching inside Import Hub
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetTab = (e.currentTarget as HTMLElement).getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        if (targetTab) {
            document.getElementById(targetTab)?.classList.add('active');
        }
    });
});

// 5. Create Single Question Form
if (ui.formCreate) {
    ui.formCreate.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            statement: (document.getElementById('q-stmt') as HTMLTextAreaElement).value.trim(),
            opt_a: (document.getElementById('q-opta') as HTMLInputElement).value.trim(),
            opt_b: (document.getElementById('q-optb') as HTMLInputElement).value.trim(),
            opt_c: (document.getElementById('q-optc') as HTMLInputElement).value.trim(),
            opt_d: (document.getElementById('q-optd') as HTMLInputElement).value.trim(),
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
                showToast("Question saved directly to Cloud DB!");
                ui.modalCreate.style.display = 'none';
                ui.formCreate.reset();
                await loadQuestions();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || "Creation failed", true);
            }
        } catch {
            showToast("Network error creating question", true);
        }
    };
}

// 6. CSV File Dry Run & Commit
if (ui.btnDryRun) {
    ui.btnDryRun.onclick = async () => {
        const file = ui.csvFileInput.files?.[0];
        if (!file) {
            alert("Please choose a CSV file first");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('format', 'csv');

        const token = localStorage.getItem('access_token') || localStorage.getItem('admin_token') || '';
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
                currentDryRunJobId = data.job_id;
                ui.dryRunReport.style.display = 'block';

                ui.drSummary.innerHTML = `
                    <div style="margin-bottom: 0.5rem;">
                        <strong>Total rows detected:</strong> ${data.total_detected} |
                        <strong style="color: var(--success, #10b981);">Valid:</strong> ${data.valid_count} |
                        <strong style="color: var(--danger, #ef4444);">Invalid:</strong> ${data.invalid_count}
                    </div>
                    ${data.errors.length > 0 ? `
                        <div style="color: var(--danger, #ef4444); max-height: 100px; overflow-y: auto; font-size: 0.8rem; background: #fff; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 4px;">
                            ${data.errors.map((err: any) => `<div>Row ${err.row}: ${err.message}</div>`).join('')}
                        </div>
                    ` : '<div style="color: #15803d; font-weight: 600;">All records passed validation!</div>'}
                `;

                ui.btnCommitImport.disabled = data.valid_count === 0;
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || "Validation failed", true);
            }
        } catch {
            showToast("Network error verifying file", true);
        } finally {
            ui.btnDryRun.textContent = "Verify File (Dry Run)";
        }
    };
}

if (ui.formImportCsv) {
    ui.formImportCsv.onsubmit = async (e) => {
        e.preventDefault();
        if (!currentDryRunJobId) return;

        ui.btnCommitImport.textContent = "Committing to Cloud DB...";
        ui.btnCommitImport.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/import/commit/${currentDryRunJobId}`, {
                method: 'POST',
                headers: getAuthHeaders(),
            });

            if (res.ok) {
                const data = await res.json();
                showToast(data.message || "Questions imported successfully to Cloud DB");
                ui.modalImport.style.display = 'none';
                ui.formImportCsv.reset();
                currentDryRunJobId = null;
                await loadQuestions();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || "Import commit failed", true);
            }
        } catch {
            showToast("Network error committing import", true);
        } finally {
            ui.btnCommitImport.textContent = "Commit to Cloud DB";
        }
    };
}

// 7. JSON Bulk Import (from file or paste)
if (ui.btnImportJson) {
    ui.btnImportJson.onclick = async () => {
        let jsonPayload: any[] = [];
        const file = ui.jsonFileInput?.files?.[0];

        if (file) {
            try {
                const text = await file.text();
                jsonPayload = JSON.parse(text);
            } catch (err) {
                alert("Invalid JSON file: " + (err as any).message);
                return;
            }
        } else {
            const raw = (ui.jsonTextarea?.value || '').trim();
            if (!raw) {
                alert("Please select a JSON file or paste a JSON array.");
                return;
            }
            try {
                jsonPayload = JSON.parse(raw);
            } catch (err) {
                alert("Invalid JSON syntax: " + (err as any).message);
                return;
            }
        }

        if (!Array.isArray(jsonPayload) || jsonPayload.length === 0) {
            alert("JSON payload must be a non-empty array of question objects.");
            return;
        }

        ui.btnImportJson.textContent = "Importing to Cloud DB...";
        ui.btnImportJson.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/import/bulk`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ questions: jsonPayload }),
            });

            if (res.ok) {
                const data = await res.json();
                showToast(data.message || 'JSON questions imported to Cloud DB!');
                ui.modalImport.style.display = 'none';
                if (ui.jsonTextarea) ui.jsonTextarea.value = '';
                if (ui.jsonFileInput) ui.jsonFileInput.value = '';
                await loadQuestions();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || "Bulk JSON import failed", true);
            }
        } catch {
            showToast("Network error importing JSON", true);
        } finally {
            ui.btnImportJson.textContent = "Import JSON to Cloud DB";
            ui.btnImportJson.disabled = false;
        }
    };
}

// 8. AI / Plain Text Bulk Paste (NLP Parser)
if (ui.btnParsePreview) {
    ui.btnParsePreview.onclick = async () => {
        const text = (ui.pasteTextarea?.value || '').trim();
        if (!text) {
            alert("Please paste question text first.");
            return;
        }

        ui.btnParsePreview.textContent = "Parsing...";
        ui.btnParsePreview.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/import/paste-text`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    text,
                    default_subject: ui.pasteDefaultSubject?.value || 'General',
                    default_difficulty: ui.pasteDefaultDifficulty?.value || 'Medium',
                    dry_run: true,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                ui.pastePreviewContainer.style.display = 'block';
                ui.pastePreviewTitle.textContent = `Parsed Preview: ${data.valid_count} questions detected (${data.invalid_count} errors)`;

                const questions = data.questions || [];
                ui.pastePreviewList.innerHTML = questions.map((q: any, i: number) => `
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.5rem; margin-bottom: 0.5rem; font-size: 0.8rem;">
                        <strong>Q${i + 1}: ${escapeHtml(q.statement)}</strong>
                        <div style="color: #64748b; font-size: 0.75rem; margin-top: 2px;">
                            A: ${escapeHtml(q.opt_a)} | B: ${escapeHtml(q.opt_b)} | Key: <strong style="color: #16a34a;">${q.correct_answer}</strong> | Subj: ${q.subject}
                        </div>
                    </div>
                `).join('');

                if (data.errors && data.errors.length > 0) {
                    ui.pastePreviewList.innerHTML += `
                        <div style="color: #ef4444; font-size: 0.75rem; padding: 0.5rem;">
                            ${data.errors.map((e: any) => `<div>Item ${e.item}: ${e.message}</div>`).join('')}
                        </div>
                    `;
                }
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || "Parse failed", true);
            }
        } catch {
            showToast("Network error parsing pasted text", true);
        } finally {
            ui.btnParsePreview.textContent = "Parse & Preview";
            ui.btnParsePreview.disabled = false;
        }
    };
}

if (ui.btnCommitPaste) {
    ui.btnCommitPaste.onclick = async () => {
        const text = (ui.pasteTextarea?.value || '').trim();
        if (!text) {
            alert("Please paste question text first.");
            return;
        }

        ui.btnCommitPaste.textContent = "Saving to Cloud DB...";
        ui.btnCommitPaste.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/import/paste-text`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    text,
                    default_subject: ui.pasteDefaultSubject?.value || 'General',
                    default_difficulty: ui.pasteDefaultDifficulty?.value || 'Medium',
                    dry_run: false,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                showToast(data.message || 'Pasted questions committed to Cloud DB!');
                ui.modalImport.style.display = 'none';
                if (ui.pasteTextarea) ui.pasteTextarea.value = '';
                if (ui.pastePreviewContainer) ui.pastePreviewContainer.style.display = 'none';
                await loadQuestions();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || "Commit failed", true);
            }
        } catch {
            showToast("Network error saving questions", true);
        } finally {
            ui.btnCommitPaste.textContent = "Save All to Cloud DB";
            ui.btnCommitPaste.disabled = false;
        }
    };
}

// 9. Export to CSV
if (ui.btnExportCsv) {
    ui.btnExportCsv.onclick = () => {
        const link = document.createElement('a');
        link.href = `${API_BASE}/export/csv`;
        link.setAttribute('download', 'cloud_question_bank_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
}

// 10. Purge Seed / Demo Questions
if (ui.btnPurgeSeeds) {
    ui.btnPurgeSeeds.onclick = async () => {
        if (!confirm("Are you sure you want to purge all pre-seeded demo questions (e.g. 00000000-... and old test items) from Cloud DB?")) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/purge/seeds`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            if (res.ok) {
                const data = await res.json();
                showToast(data.message || 'Purged demo questions successfully!');
                await loadQuestions();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || "Purge failed", true);
            }
        } catch {
            showToast("Network error purging seed questions", true);
        }
    };
}

// 11. Purge Entire Question Bank
if (ui.btnPurgeAll) {
    ui.btnPurgeAll.onclick = async () => {
        const confirm1 = confirm("WARNING: This will permanently delete ALL questions for this tenant from Supabase Cloud DB.\n\nAre you sure you want to proceed?");
        if (!confirm1) return;
        const confirm2 = confirm("Double Confirmation: Do you want a 100% clean, blank slate to author/import fresh questions?");
        if (!confirm2) return;

        try {
            const res = await fetch(`${API_BASE}/purge/all`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            if (res.ok) {
                showToast("Question bank wiped. Ready for your uploaded questions!");
                await loadQuestions();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || "Purge failed", true);
            }
        } catch {
            showToast("Network error purging question bank", true);
        }
    };
}

// 12. Search & Filter Listeners
if (ui.filterSubject) ui.filterSubject.onchange = loadQuestions;
if (ui.filterStatus) ui.filterStatus.onchange = loadQuestions;
if (ui.filterDifficulty) ui.filterDifficulty.onchange = renderFilteredQuestions;
if (ui.searchInput) ui.searchInput.oninput = renderFilteredQuestions;

// 13. Live WebSocket DB Synchronization
function initQuestionBankWebSocket(): void {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/admin`;
    try {
        const socket = new WebSocket(wsUrl);
        socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (['QUESTION_UPDATED', 'QUESTION_DELETED', 'QUESTION_ADJUDICATED', 'QUESTION_CREATED', 'QUESTION_BANK_PURGED'].includes(msg.type)) {
                    loadQuestions();
                    showToast(`Cloud DB Sync: ${msg.message || 'Question bank updated live.'}`);
                }
            } catch (_) {}
        };
        socket.onclose = () => {
            setTimeout(initQuestionBankWebSocket, 4000);
        };
    } catch (_) {}
}

// Initialize
loadQuestions();
initQuestionBankWebSocket();
