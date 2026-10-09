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
    const regNo = localStorage.getItem('reg_no') || 'SSEC-A-0001';

    try {
        const res = await fetch('/api/v1/exams/EX-1001/result');
        if (res.ok) {
            const data = await res.json();
            if (scName) scName.textContent = candidateName;
            if (scReg) scReg.textContent = data.reference || regNo;
            if (scExam) scExam.textContent = data.exam_title || 'SSE CBT PLATFORM V0.1 - JEE MAIN 2026 MOCK TEST';
            if (scScore) scScore.textContent = data.score || '-- / --';
            if (scPercentile) scPercentile.textContent = `${data.percentile || '0.0'} PR`;
            if (scRef) scRef.textContent = data.reference || 'SSEC-2026';
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
            if (scExam) scExam.textContent = "SSE CBT PLATFORM V0.1 - JEE MAIN 2026 MOCK TEST";
            if (scScore) scScore.textContent = `${data.score} / ${data.max_possible || 20}`;
            if (scPercentile) scPercentile.textContent = `${data.percentile} PR`;
            if (scRef) scRef.textContent = data.reference || 'SSEC-2026';
            if (scTotMarks) scTotMarks.textContent = `+${data.score || '0.0'}`;
            if (scTotPr) scTotPr.textContent = `${data.percentile} PR`;
            return;
        } catch (_) {}
    }

    if (scName) scName.textContent = candidateName;
    if (scReg) scReg.textContent = regNo;
    if (scExam) scExam.textContent = "SSE CBT PLATFORM V0.1 - JEE MAIN 2026 MOCK TEST";
    if (scScore) scScore.textContent = "-- / --";
    if (scPercentile) scPercentile.textContent = "N/A";
    if (scRef) scRef.textContent = "SSEC-2026";
}

loadAuthoritativeScore();
