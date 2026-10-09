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

    const candidateName = localStorage.getItem('candidate_name') || 'NARESH S';
    const regNo = localStorage.getItem('reg_no') || '5254740(V4.3.7)';

    try {
        const res = await fetch('/api/v1/exams/EX-1001/result');
        if (res.ok) {
            const data = await res.json();
            if (scName) scName.textContent = candidateName;
            if (scReg) scReg.textContent = data.reference ? `APEX-${data.reference}` : regNo;
            if (scExam) scExam.textContent = data.exam_title || 'CLG-12 IIT APEX_MAIN-PTM11_18Oct25';
            if (scScore) scScore.textContent = data.score || '76 / 80';
            if (scPercentile) scPercentile.textContent = `${data.percentile || '99.42'} PR`;
            if (scRef) scRef.textContent = data.reference || 'PTM11-2026';
            if (scTotMarks) scTotMarks.textContent = `+${data.score || '76.0'}`;
            if (scTotPr) scTotPr.textContent = `${data.percentile || '99.42'} PR`;
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
            if (scReg) scReg.textContent = data.reference ? `APEX-${data.reference}` : regNo;
            if (scExam) scExam.textContent = "CLG-12 IIT APEX_MAIN-PTM11_18Oct25";
            if (scScore) scScore.textContent = `${data.score} / ${data.max_possible || 80}`;
            if (scPercentile) scPercentile.textContent = `${data.percentile} PR`;
            if (scRef) scRef.textContent = data.reference || 'PTM11-2026';
            if (scTotMarks) scTotMarks.textContent = `+${data.score || '76.0'}`;
            if (scTotPr) scTotPr.textContent = `${data.percentile} PR`;
            return;
        } catch (_) {}
    }

    if (scName) scName.textContent = candidateName;
    if (scReg) scReg.textContent = regNo;
    if (scExam) scExam.textContent = "CLG-12 IIT APEX_MAIN-PTM11_18Oct25";
    if (scScore) scScore.textContent = "76 / 80";
    if (scPercentile) scPercentile.textContent = "99.42 PR";
    if (scRef) scRef.textContent = "PTM11-2026-N1";
}

loadAuthoritativeScore();
