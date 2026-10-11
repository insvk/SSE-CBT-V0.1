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

function escapeHtml(str: string): string {
    return (str || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderScorecardData(data: any, fallbackName: string, fallbackReg: string): void {
    const scName = document.getElementById('sc-name');
    const scReg = document.getElementById('sc-reg');
    const scAppNo = document.getElementById('sc-app-no');
    const scExam = document.getElementById('sc-exam');
    const scScore = document.getElementById('sc-score');
    const scPercentile = document.getElementById('sc-percentile');
    const scRef = document.getElementById('sc-ref');
    const scTableBody = document.getElementById('sc-table-body');
    const scDisqBanner = document.getElementById('sc-disq-banner');
    const scDisqReason = document.getElementById('sc-disq-reason');

    const candName = data.candidate_name || fallbackName;
    const candReg = data.registration_number || fallbackReg;

    if (scName) scName.textContent = candName;
    if (scReg) scReg.textContent = candReg;
    if (scAppNo && candReg) {
        const numeric = candReg.replace(/[^0-9]/g, '');
        if (numeric) scAppNo.textContent = `260310${numeric.padStart(6, '0').slice(-6)}`;
    }
    if (scExam) scExam.textContent = data.exam_title || 'MCQ ASSESSMENT [ SSE CBT 2026 ]';
    if (scRef) scRef.textContent = data.reference || 'SSE-2026';

    // Handle Disqualification
    if (data.disqualified === true || data.status === 'disqualified') {
        if (scDisqBanner) scDisqBanner.style.display = 'block';
        if (scDisqReason) {
            scDisqReason.textContent = data.reason || 'This examination attempt was terminated under CBT Examination Security Regulations due to security malpractice/violations. All scores have been annulled.';
        }
        if (scScore) {
            scScore.textContent = '0.0 (REVOKED)';
            scScore.style.color = '#dc2626';
        }
        if (scPercentile) {
            scPercentile.textContent = '0.0 PR (REVOKED)';
            scPercentile.style.background = '#ef4444';
        }
        if (scTableBody) {
            scTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2.5rem 1.5rem; background: #fef2f2;">
                        <div style="font-size: 1.15rem; font-weight: 800; color: #b91c1c; margin-bottom: 0.5rem;">
                            EXAMINATION SCORES NULLIFIED &bull; CANDIDATE DISQUALIFIED
                        </div>
                        <div style="color: #991b1b; font-size: 0.92rem; max-width: 650px; margin: 0 auto; line-height: 1.6;">
                            <strong>Reason:</strong> ${escapeHtml(data.reason || 'Exceeded security infraction threshold.')}<br>
                            Under SSE CBT Statutory Regulations, candidate responses have been invalidated and no merit marks are awarded.
                        </div>
                    </td>
                </tr>
            `;
        }
        return;
    }

    // Normal Valid Submission
    if (scDisqBanner) scDisqBanner.style.display = 'none';
    if (scScore) {
        const rawScore = typeof data.score === 'number' ? data.score : (parseFloat(data.score) || 0.0);
        const maxScore = typeof data.max_possible === 'number' ? data.max_possible : (data.scoring_details?.max_possible_score || 80);
        const sign = rawScore > 0 ? '+' : '';
        scScore.textContent = `${sign}${rawScore} / ${maxScore}`;
        scScore.style.color = '#1e40af';
    }
    if (scPercentile) {
        scPercentile.textContent = `${data.percentile || '0.0'} PR`;
        scPercentile.style.background = '#10b981';
    }

    // Subject Breakdown in Table
    if (scTableBody) {
        const breakdown = data.scoring_details?.subject_breakdown;
        if (breakdown && typeof breakdown === 'object' && Object.keys(breakdown).length > 0) {
            const subjects = Object.keys(breakdown);
            let rowsHtml = '';
            let totQ = 0;
            let totCor = 0;
            let totInc = 0;
            let totScore = 0;

            subjects.forEach(subj => {
                const s = breakdown[subj];
                const qCount = s.total || 0;
                const cor = s.correct || 0;
                const inc = s.incorrect || 0;
                const sc = s.score || 0;
                totQ += qCount;
                totCor += cor;
                totInc += inc;
                totScore += sc;
                const acc = qCount > 0 ? Math.round((cor / qCount) * 100) : 0;
                const sign = sc > 0 ? '+' : '';

                rowsHtml += `
                    <tr>
                        <td style="font-weight: 700; color: var(--text-heading);">${escapeHtml(subj)}</td>
                        <td>${qCount}</td>
                        <td style="color: #059669; font-weight: 700;">${cor}</td>
                        <td style="color: #dc2626; font-weight: 700;">${inc}</td>
                        <td style="font-family: var(--font-mono); font-weight: 700; color: ${sc >= 0 ? '#1e40af' : '#dc2626'};">${sign}${sc}</td>
                        <td>
                            <span style="font-weight: 700; color: #047857;">${acc}% Accuracy</span>
                        </td>
                    </tr>
                `;
            });

            const rawScore = typeof data.score === 'number' ? data.score : totScore;
            const aggSign = rawScore > 0 ? '+' : '';
            rowsHtml += `
                <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid var(--border-color, #e2e8f0);">
                    <td style="color: #1e3a8a;">TOTAL AGGREGATE</td>
                    <td>${totQ || data.scoring_details?.total_questions || 20}</td>
                    <td style="color: #059669;">${totCor || data.scoring_details?.correct_count || 0}</td>
                    <td style="color: #dc2626;">${totInc || data.scoring_details?.incorrect_count || 0}</td>
                    <td style="font-family: var(--font-mono); color: #1e40af; font-size: 1.05rem;">${aggSign}${rawScore}</td>
                    <td>
                        <span class="badge-pill" style="background: #ecfdf5; color: #047857; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 4px;">
                            ${data.percentile || '0.0'} PR
                        </span>
                    </td>
                </tr>
            `;
            scTableBody.innerHTML = rowsHtml;
        } else {
            const sc = typeof data.score === 'number' ? data.score : 0.0;
            const sign = sc > 0 ? '+' : '';
            scTableBody.innerHTML = `
                <tr style="background: #f8fafc; font-weight: 800;">
                    <td style="color: #1e3a8a;">Comprehensive Assessment Paper</td>
                    <td>${data.scoring_details?.total_questions || 20}</td>
                    <td style="color: #059669;">${data.scoring_details?.correct_count || 0}</td>
                    <td style="color: #dc2626;">${data.scoring_details?.incorrect_count || 0}</td>
                    <td style="font-family: var(--font-mono); color: #1e40af;">${sign}${sc}</td>
                    <td>
                        <span class="badge-pill" style="background: #ecfdf5; color: #047857; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 4px;">
                            ${data.percentile || '0.0'} PR
                        </span>
                    </td>
                </tr>
            `;
        }
    }
}

async function loadAuthoritativeScore(): Promise<void> {
    const scName = document.getElementById('sc-name');
    const scReg = document.getElementById('sc-reg');
    const scScore = document.getElementById('sc-score');
    const scPercentile = document.getElementById('sc-percentile');
    const scRef = document.getElementById('sc-ref');
    const scTableBody = document.getElementById('sc-table-body');

    const candidateName = localStorage.getItem('candidate_name') || 'Registered Candidate';
    const regNo = localStorage.getItem('reg_no') || 'SSE-A-CBT-0001';
    const candId = localStorage.getItem('candidate_id') || '';
    const examId = localStorage.getItem('active_exam_id') || 'EX-1001';

    // 1. Fetch Admin Configured Exam & Controller Settings
    try {
        const sRes = await fetch('/api/v1/exams/settings', { headers: getHeaders() });
        if (sRes.ok) {
            const s = await sRes.json();
            const elAgency = document.getElementById('sc-agency');
            const elTitle = document.getElementById('sc-title');
            const elSubhead = document.getElementById('sc-subhead-exam');
            const elCtrlName = document.getElementById('sc-controller-name');
            const elCtrlDesig = document.getElementById('sc-controller-desig');
            const elNode = document.getElementById('sc-center-node');

            if (elAgency && s.institution_name) elAgency.textContent = s.institution_name;
            if (elTitle && s.examination_title) elTitle.textContent = `${s.examination_title} : Official Score Card`;
            if (elSubhead && s.examination_title) elSubhead.textContent = s.examination_title;
            if (elCtrlName && s.controller_name) elCtrlName.textContent = s.controller_name;
            if (elCtrlDesig && s.controller_designation) elCtrlDesig.textContent = s.controller_designation;
            if (elNode && s.test_venue_name) elNode.textContent = s.test_venue_name;
        }
    } catch (_) {}

    // 2. Fetch Authoritative Result from Cloud DB
    const qParams = new URLSearchParams();
    if (regNo) qParams.set('reg_no', regNo);
    if (candId) qParams.set('candidate_id', candId);

    try {
        const res = await fetch(`/api/v1/exams/${encodeURIComponent(examId)}/result?${qParams.toString()}`, {
            headers: getHeaders()
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.status !== 'pending') {
                renderScorecardData(data, candidateName, regNo);
                return;
            }
        }
    } catch (e) {
        console.warn("Could not fetch remote result, checking session storage", e);
    }

    // 3. Fallback to session cached result
    const cached = sessionStorage.getItem('latest_result');
    if (cached) {
        try {
            const data = JSON.parse(cached);
            renderScorecardData(data, candidateName, regNo);
            return;
        } catch (_) {}
    }

    // 4. Default awaiting state
    if (scName) scName.textContent = candidateName;
    if (scReg) scReg.textContent = regNo;
    if (scScore) scScore.textContent = "-- / --";
    if (scPercentile) scPercentile.textContent = "N/A";
    if (scRef) scRef.textContent = "SSE-2026";
    if (scTableBody) {
        scTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Awaiting authoritative submission data from Cloud DB...</td></tr>';
    }
}

loadAuthoritativeScore();

