const API_BASE = '/api/v1/candidates';

const ui = {
    tbody: document.getElementById('candidate-table-body')!,
    searchInput: document.getElementById('search-input') as HTMLInputElement,
    btnImport: document.getElementById('btn-import')!,
    btnCreate: document.getElementById('btn-create')!,
    btnAssign: document.getElementById('btn-assign') as HTMLButtonElement,
    modalCreate: document.getElementById('modal-create')!,
    modalImport: document.getElementById('modal-import')!,
    formCreate: document.getElementById('form-create') as HTMLFormElement,
    formImport: document.getElementById('form-import') as HTMLFormElement,
    checkAll: document.getElementById('check-all') as HTMLInputElement,
    toast: document.getElementById('toast')!
};

// Mock Headers simulating get_tenant_user dependency
const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock_valid_token',
    'x-tenant-id': 'tenant-1'
};

function showToast(msg: string, isError = false) {
    ui.toast.textContent = msg;
    ui.toast.style.backgroundColor = isError ? "var(--danger)" : "var(--success)";
    ui.toast.className = "show";
    setTimeout(() => { ui.toast.className = ui.toast.className.replace("show", ""); }, 3000);
}

async function loadCandidates(query = "") {
    try {
        const res = await fetch(API_BASE, { headers });
        let data = await res.json();

        if (query) {
            data = data.filter((c: any) => 
                c.full_name.toLowerCase().includes(query.toLowerCase()) || 
                c.registration_number.toLowerCase().includes(query.toLowerCase())
            );
        }

        ui.tbody.innerHTML = "";
        data.forEach((c: any) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox" class="row-check" value="${c.id}"></td>
                <td style="font-weight:600;">${c.registration_number}</td>
                <td>${c.full_name}</td>
                <td>${c.batch}</td>
                <td><span style="color: ${c.status === 'active' ? 'var(--success)' : 'var(--danger)'}">${c.status}</span></td>
                <td>
                    <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: var(--danger)" onclick="suspendCandidate('${c.id}')">Suspend</button>
                </td>
            `;
            ui.tbody.appendChild(tr);
        });
        
        bindCheckboxes();

    } catch (err) {
        showToast("Failed to load candidates", true);
    }
}

// --- CREATION ---
ui.btnCreate.onclick = () => { ui.modalCreate.style.display = 'flex'; };

ui.formCreate.onsubmit = async (e) => {
    e.preventDefault();
    const payload = {
        full_name: (document.getElementById('c-name') as HTMLInputElement).value,
        batch: (document.getElementById('c-batch') as HTMLInputElement).value
    };

    const res = await fetch(API_BASE, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (res.ok) {
        showToast("Candidate Created");
        ui.modalCreate.style.display = 'none';
        ui.formCreate.reset();
        loadCandidates();
    } else {
        const err = await res.json();
        showToast(err.detail || "Creation failed", true);
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

    const importHeaders = {
        'Authorization': 'Bearer mock_valid_token',
        'x-tenant-id': 'tenant-1'
    }; // no content-type for formData

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

// --- SUSPEND ---
(window as any).suspendCandidate = async (id: string) => {
    if (!confirm("Are you sure you want to suspend this candidate?")) return;
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers });
    if (res.ok) {
        showToast("Candidate suspended");
        loadCandidates();
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
        headers, 
        body: JSON.stringify({candidate_ids: selected, exam_id: "EX-1001"}) 
    });
    if (res.ok) {
        showToast(`Assigned ${selected.length} candidates to exam.`);
        ui.checkAll.checked = false;
        bindCheckboxes(); // reset
    }
};

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
