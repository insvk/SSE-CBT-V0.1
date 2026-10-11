export {};

async function loadAuthoritativeScore(): Promise<void> {
    const scName = document.getElementById('sc-name');
    const scReg = document.getElementById('sc-reg');
    const scExam = document.getElementById('sc-exam');
    const scScore = document.getElementById('sc-score');
    const scPercentile = document.getElementById('sc-percentile');
    const scRef = document.getElementById('sc-ref');
    const scTotMarks = document.getElementById('sc-tot-marks');
    const scTotPr = document.getElementById('sc-tot-pr');

    const candidateName = localStorage.getItem('candidate_name') || 'Registered Candidate';
    const regNo = localStorage.getItem('reg_no') || 'SSE-A-CBT-0001';

    // Fetch Admin Configured Exam & Controller Settings
    try {
        const sRes = await fetch('/api/v1/exams/settings');
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

    try {
        const res = await fetch('/api/v1/exams/EX-1001/result');
        if (res.ok) {
            const data = await res.json();
            if (scName) scName.textContent = candidateName;
            if (scReg) scReg.textContent = data.reference || regNo;
            if (scExam) scExam.textContent = data.exam_title || 'MCQ ASSESSMENT [ SSE CBT 2026 ]';
            if (scScore) scScore.textContent = data.score || '-- / --';
            if (scPercentile) scPercentile.textContent = `${data.percentile || '0.0'} PR`;
            if (scRef) scRef.textContent = data.reference || 'SSE-2026';
            if (scTotMarks) scTotMarks.textContent = `+${data.scoring_details?.total_score || data.score || '0.0'}`;
            if (scTotPr) scTotPr.textContent = `${data.percentile || '0.0'} PR`;
            return;
        }
    } catch (e) {
        console.warn("Could not fetch remote result, checking session storage", e);
    }

    const cached = sessionStorage.getItem('latest_result');
    if (cached) {
        try {
            const data = JSON.parse(cached);
            if (scName) scName.textContent = candidateName;
            if (scReg) scReg.textContent = data.reference || regNo;
            if (scExam) scExam.textContent = "MCQ ASSESSMENT [ SSE CBT 2026 ]";
            if (scScore) scScore.textContent = `${data.score} / ${data.max_possible || 20}`;
            if (scPercentile) scPercentile.textContent = `${data.percentile} PR`;
            if (scRef) scRef.textContent = data.reference || 'SSE-2026';
            if (scTotMarks) scTotMarks.textContent = `+${data.score || '0.0'}`;
            if (scTotPr) scTotPr.textContent = `${data.percentile} PR`;
            return;
        } catch (_) {}
    }

    if (scName) scName.textContent = candidateName;
    if (scReg) scReg.textContent = regNo;
    if (scExam) scExam.textContent = "MCQ ASSESSMENT [ SSE CBT 2026 ]";
    if (scScore) scScore.textContent = "-- / --";
    if (scPercentile) scPercentile.textContent = "N/A";
    if (scRef) scRef.textContent = "SSE-2026";
}

loadAuthoritativeScore();
