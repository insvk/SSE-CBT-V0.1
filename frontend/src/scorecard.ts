// Mock data for Scorecard
const scorecardData = {
    name: "Jane Doe",
    registration: "APEX10293",
    exam: "JEE Main Mock Exam A",
    score: "245 / 300",
    percentile: "98.5"
};

document.getElementById('sc-name')!.textContent = scorecardData.name;
document.getElementById('sc-reg')!.textContent = scorecardData.registration;
document.getElementById('sc-exam')!.textContent = scorecardData.exam;
document.getElementById('sc-score')!.textContent = scorecardData.score;
document.getElementById('sc-percentile')!.textContent = `${scorecardData.percentile} PR`;
