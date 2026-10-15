export {};

// Purge legacy hardcoded account from browser localStorage if present
(function purgeLegacyHardcodedUser() {
    try {
        const staleValues = ['5254740', '5254740(V4.3.7)', 'NARESH S'];
        const r = localStorage.getItem('reg_no') || '';
        const n = localStorage.getItem('candidate_name') || '';
        const u = localStorage.getItem('cbt_remembered_user') || '';
        if (staleValues.some(v => r.includes(v) || n.toUpperCase() === v.toUpperCase() || u.includes(v))) {
            localStorage.removeItem('reg_no');
            localStorage.removeItem('candidate_name');
            localStorage.removeItem('candidate_id');
            localStorage.removeItem('cbt_remembered_user');
            localStorage.removeItem('access_token');
        }
    } catch (_) {}
})();

function getAuthToken(): string {
    return localStorage.getItem('access_token') || '';
}

function getTenantId(): string {
    return localStorage.getItem('tenant_id') || '00000000-0000-0000-0000-000000000001';
}

function getHeaders(): HeadersInit {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-tenant-id': getTenantId(),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
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
    const scPercentage = document.getElementById('sc-percentage');
    const scAccuracy = document.getElementById('sc-accuracy');
    const scAccuracySubtext = document.getElementById('sc-accuracy-subtext');
    const scRef = document.getElementById('sc-ref');
    const scStatus = document.getElementById('sc-status');
    const scTimeTaken = document.getElementById('sc-time-taken');
    const scSubmittedAt = document.getElementById('sc-submitted-at');
    const scTableBody = document.getElementById('sc-table-body');
    const scQuestionReviewBody = document.getElementById('sc-question-review-body');
    const scDisqBanner = document.getElementById('sc-disq-banner');
    const scDisqReason = document.getElementById('sc-disq-reason');

    // Performance summary elements
    const scStatTotal = document.getElementById('sc-stat-total');
    const scStatAttempted = document.getElementById('sc-stat-attempted');
    const scStatCorrect = document.getElementById('sc-stat-correct');
    const scStatIncorrect = document.getElementById('sc-stat-incorrect');
    const scStatUnanswered = document.getElementById('sc-stat-unanswered');
    const scStatReview = document.getElementById('sc-stat-review');
    const scStatPositive = document.getElementById('sc-stat-positive');
    const scStatPenalty = document.getElementById('sc-stat-penalty');

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

    const details = data.scoring_details || {};
    const isDisqualified = data.disqualified === true || data.status === 'disqualified';

    if (scStatus) {
        if (isDisqualified) {
            scStatus.textContent = 'DISQUALIFIED / ANNULLED';
            scStatus.style.color = '#dc2626';
        } else {
            scStatus.textContent = 'Submitted & Authoritatively Verified';
            scStatus.style.color = '#16a34a';
        }
    }

    if (scTimeTaken) {
        scTimeTaken.textContent = data.time_taken_display || (data.time_taken_seconds ? `${Math.round(data.time_taken_seconds / 60)} min` : '-- min');
    }
    if (scSubmittedAt) {
        if (data.submitted_at && data.submitted_at !== 'N/A') {
            try {
                const d = new Date(data.submitted_at);
                scSubmittedAt.textContent = isNaN(d.getTime()) ? data.submitted_at : d.toLocaleString();
            } catch (_) {
                scSubmittedAt.textContent = data.submitted_at;
            }
        } else {
            scSubmittedAt.textContent = 'Today';
        }
    }

    // Handle Disqualification
    if (isDisqualified) {
        if (scDisqBanner) scDisqBanner.style.display = 'block';
        if (scDisqReason) {
            scDisqReason.textContent = data.reason || 'This examination attempt was terminated under CBT Examination Security Regulations due to security malpractice/violations. All scores have been annulled.';
        }
        if (scScore) {
            scScore.textContent = '0.0 (ANNULLED)';
            scScore.style.color = '#dc2626';
        }
        if (scPercentage) {
            scPercentage.textContent = '0.0%';
            scPercentage.style.color = '#dc2626';
        }
        if (scAccuracy) {
            scAccuracy.textContent = 'REVOKED';
            scAccuracy.style.color = '#dc2626';
        }
        if (scTableBody) {
            scTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2.5rem 1.5rem; background: #fef2f2;">
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
        if (scQuestionReviewBody) {
            scQuestionReviewBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: #b91c1c;">
                        Itemized question responses suppressed due to administrative disqualification.
                    </td>
                </tr>
            `;
        }
        return;
    }

    // Normal Valid Submission
    if (scDisqBanner) scDisqBanner.style.display = 'none';

    // 1. Primary Metrics (Total Score, Percentage, Accuracy)
    const rawScore = typeof data.score === 'number' ? data.score : (parseFloat(data.score) || 0.0);
    const maxScore = typeof data.max_possible === 'number' ? data.max_possible : (details.max_possible_score || 80);
    const sign = rawScore > 0 ? '+' : '';

    if (scScore) {
        scScore.textContent = `${sign}${rawScore} / ${maxScore}`;
        scScore.style.color = rawScore >= 0 ? '#1e40af' : '#dc2626';
    }

    const pct = data.percentage != null ? data.percentage : details.percentage;
    if (scPercentage) {
        scPercentage.textContent = pct != null ? `${pct}%` : '0.0%';
        scPercentage.style.color = '#0369a1';
    }

    const acc = data.accuracy_display || details.accuracy_display || (data.accuracy != null ? `${data.accuracy}%` : (details.accuracy != null ? `${details.accuracy}%` : 'N/A'));
    if (scAccuracy) {
        scAccuracy.textContent = acc;
        scAccuracy.style.color = '#15803d';
    }

    const attCount = details.attempted_count != null ? details.attempted_count : (data.attempted_count || 0);
    const corCount = details.correct_count != null ? details.correct_count : 0;
    const incCount = details.incorrect_count != null ? details.incorrect_count : 0;
    const totCount = details.total_questions != null ? details.total_questions : (details.details ? details.details.length : 20);
    const unansCount = details.unanswered_count != null ? details.unanswered_count : (totCount - attCount);
    const revCount = details.marked_for_review_count != null ? details.marked_for_review_count : 0;
    const posMarks = details.marks_before_penalty != null ? details.marks_before_penalty : (data.marks_before_penalty || 0.0);
    const penDeducted = details.penalty_deducted != null ? details.penalty_deducted : (data.penalty_deducted || 0.0);

    if (scAccuracySubtext) {
        scAccuracySubtext.textContent = `Correct: ${corCount} / Attempted: ${attCount}`;
    }

    // 2. Performance Summary Metric Cards
    if (scStatTotal) scStatTotal.textContent = String(totCount);
    if (scStatAttempted) scStatAttempted.textContent = String(attCount);
    if (scStatCorrect) scStatCorrect.textContent = String(corCount);
    if (scStatIncorrect) scStatIncorrect.textContent = String(incCount);
    if (scStatUnanswered) scStatUnanswered.textContent = String(unansCount);
    if (scStatReview) scStatReview.textContent = String(revCount);
    if (scStatPositive) scStatPositive.textContent = `+${posMarks.toFixed(1)}`;
    if (scStatPenalty) scStatPenalty.textContent = `-${penDeducted.toFixed(1)}`;

    // 3. Subject & Section Performance Dossier
    if (scTableBody) {
        const breakdown = details.subject_breakdown;
        if (breakdown && typeof breakdown === 'object' && Object.keys(breakdown).length > 0) {
            const subjects = Object.keys(breakdown);
            let rowsHtml = '';
            let aggTot = 0;
            let aggAtt = 0;
            let aggCor = 0;
            let aggInc = 0;
            let aggScore = 0;

            subjects.forEach(subj => {
                const s = breakdown[subj];
                const qTot = s.total || 0;
                const cor = s.correct || 0;
                const inc = s.incorrect || 0;
                const att = s.attempted != null ? s.attempted : (cor + inc);
                const sc = s.score || 0;
                const subAcc = s.accuracy_display || (s.accuracy != null ? `${s.accuracy}%` : (att > 0 ? `${Math.round((cor / att) * 100)}%` : 'N/A'));
                const scSign = sc > 0 ? '+' : '';

                aggTot += qTot;
                aggAtt += att;
                aggCor += cor;
                aggInc += inc;
                aggScore += sc;

                rowsHtml += `
                    <tr>
                        <td style="font-weight: 700; color: var(--text-heading);">${escapeHtml(subj)}</td>
                        <td>${qTot}</td>
                        <td style="color: #0284c7; font-weight: 700;">${att}</td>
                        <td style="color: #15803d; font-weight: 700;">${cor}</td>
                        <td style="color: #b91c1c; font-weight: 700;">${inc}</td>
                        <td style="font-family: var(--font-mono); font-weight: 700; color: ${sc >= 0 ? '#1e40af' : '#b91c1c'};">${scSign}${sc}</td>
                        <td>
                            <span style="font-weight: 700; color: #15803d;">${subAcc}</span>
                        </td>
                    </tr>
                `;
            });

            const aggSign = aggScore > 0 ? '+' : '';
            rowsHtml += `
                <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid var(--border-color, #e2e8f0);">
                    <td style="color: #1e3a8a;">TOTAL AGGREGATE</td>
                    <td>${aggTot}</td>
                    <td style="color: #0284c7;">${aggAtt}</td>
                    <td style="color: #15803d;">${aggCor}</td>
                    <td style="color: #b91c1c;">${aggInc}</td>
                    <td style="font-family: var(--font-mono); color: #1e40af; font-size: 1.05rem;">${aggSign}${aggScore}</td>
                    <td>
                        <span style="font-weight: 800; color: #15803d;">${acc}</span>
                    </td>
                </tr>
            `;
            scTableBody.innerHTML = rowsHtml;
        } else {
            scTableBody.innerHTML = `
                <tr style="background: #f8fafc; font-weight: 800;">
                    <td style="color: #1e3a8a;">Comprehensive Assessment Paper</td>
                    <td>${totCount}</td>
                    <td style="color: #0284c7;">${attCount}</td>
                    <td style="color: #15803d;">${corCount}</td>
                    <td style="color: #b91c1c;">${incCount}</td>
                    <td style="font-family: var(--font-mono); color: #1e40af;">${sign}${rawScore}</td>
                    <td>
                        <span style="font-weight: 800; color: #15803d;">${acc}</span>
                    </td>
                </tr>
            `;
        }
    }

    // 4. Detailed Question Review Table
    if (scQuestionReviewBody) {
        const qList = Array.isArray(details.details) ? details.details : [];
        if (qList.length > 0) {
            let qHtml = '';
            qList.forEach((q: any) => {
                const qNum = q.question_number || '--';
                const subj = escapeHtml(q.subject || q.section || 'General');
                const stmt = escapeHtml(q.statement || q.question_text || `Question ${qNum}`);
                const candAns = escapeHtml(q.candidate_answer_display || (q.candidate_answer ? `Option ${q.candidate_answer}` : '[UNANSWERED]'));
                const corAns = escapeHtml(q.correct_answer_display || (q.correct_answer ? `Option ${q.correct_answer}` : '--'));
                const st = (q.status || 'unanswered').toLowerCase();
                const marksAwarded = typeof q.marks_awarded === 'number' ? q.marks_awarded : (parseFloat(q.marks_awarded) || 0.0);
                const markSign = marksAwarded > 0 ? '+' : '';

                let statusBadge = '';
                if (st === 'correct') {
                    statusBadge = '<span style="background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">CORRECT</span>';
                } else if (st === 'incorrect') {
                    statusBadge = '<span style="background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">INCORRECT</span>';
                } else if (st === 'bonus') {
                    statusBadge = '<span style="background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">BONUS</span>';
                } else {
                    statusBadge = '<span style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">UNANSWERED</span>';
                }

                if (q.is_marked_for_review) {
                    statusBadge += ' <span title="Marked for Review" style="font-size: 0.68rem; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 0.15rem 0.35rem; border-radius: 3px; font-weight: 700;">REVIEW</span>';
                }

                const marksColor = marksAwarded > 0 ? '#15803d' : (marksAwarded < 0 ? '#b91c1c' : '#64748b');

                qHtml += `
                    <tr>
                        <td style="font-weight: 800; font-family: var(--font-mono); color: #1e3a8a;">${qNum}</td>
                        <td style="font-weight: 600; color: #475569; font-size: 0.85rem;">${subj}</td>
                        <td style="font-size: 0.88rem; line-height: 1.45; color: #0f172a;">${stmt}</td>
                        <td style="font-size: 0.85rem; font-weight: 600; color: ${st === 'correct' ? '#15803d' : (st === 'incorrect' ? '#b91c1c' : '#64748b')};">${candAns}</td>
                        <td style="font-size: 0.85rem; font-weight: 700; color: #1e3a8a;">${corAns}</td>
                        <td>${statusBadge}</td>
                        <td style="font-family: var(--font-mono); font-weight: 800; color: ${marksColor}; text-align: right;">${markSign}${marksAwarded.toFixed(1)}</td>
                    </tr>
                `;
            });
            scQuestionReviewBody.innerHTML = qHtml;
        } else {
            scQuestionReviewBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
                        No individual question log items available in the authoritative record.
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
    const scPercentage = document.getElementById('sc-percentage');
    const scAccuracy = document.getElementById('sc-accuracy');
    const scRef = document.getElementById('sc-ref');
    const scTableBody = document.getElementById('sc-table-body');

    const candidateName = localStorage.getItem('candidate_name') || 'Registered Candidate';
    const regNo = localStorage.getItem('reg_no') || new URLSearchParams(window.location.search).get('reg_no') || '';
    const candId = localStorage.getItem('candidate_id') || new URLSearchParams(window.location.search).get('candidate_id') || '';
    const urlExamId = new URLSearchParams(window.location.search).get('exam_id');
    let examId = urlExamId || localStorage.getItem('active_exam_id') || '';
    if (!examId) {
        try {
            const exListRes = await fetch('/api/v1/exams/', { headers: getHeaders() });
            if (exListRes.ok) {
                const exList = await exListRes.json();
                if (Array.isArray(exList) && exList.length > 0) {
                    examId = exList[0].id;
                }
            }
        } catch (_) {}
    }

    // 1. Fetch Admin Configured Exam & Controller Settings
    try {
        const sRes = await fetch('/api/v1/exams/settings', { headers: getHeaders() });
        if (sRes.ok) {
            const s = await sRes.json();
            const sc = s.scorecard || {};
            const elAgency = document.getElementById('sc-agency');
            const elTitle = document.getElementById('sc-title');
            const elSubhead = document.getElementById('sc-subhead-exam');
            const elSubheadStatus = document.getElementById('sc-subhead-status');
            const elCtrlName = document.getElementById('sc-controller-name');
            const elCtrlDesig = document.getElementById('sc-controller-desig');
            const elNode = document.getElementById('sc-center-node');
            const elDisclaimer = document.getElementById('sc-footer-disclaimer');

            if (elAgency) elAgency.textContent = sc.institution_name || s.institution_name || 'SSE CBT PLATFORM';
            if (elTitle) elTitle.textContent = sc.document_title || (s.examination_title ? `${s.examination_title} : Official Score Card` : 'MCQ ASSESSMENT [ SSE CBT 2026 ] : Official Score Card');
            if (elSubhead) elSubhead.textContent = s.examination_title || 'MCQ Assessment 2026';
            if (elSubheadStatus && sc.subhead_status_text) elSubheadStatus.textContent = sc.subhead_status_text;
            if (elCtrlName && s.controller_name) elCtrlName.textContent = s.controller_name;
            if (elCtrlDesig && s.controller_designation) elCtrlDesig.textContent = s.controller_designation;
            if (elNode && s.test_venue_name) elNode.textContent = s.test_venue_name;
            if (elDisclaimer && sc.footer_disclaimer) elDisclaimer.textContent = sc.footer_disclaimer;

            // Structural section visibility toggles
            const elBanner = document.getElementById('sc-score-banner');
            if (elBanner) {
                elBanner.style.display = sc.show_score_banner !== false ? 'flex' : 'none';
            }

            const elMetricsGrid = document.getElementById('sc-metrics-grid-container');
            if (elMetricsGrid) {
                elMetricsGrid.style.display = sc.show_metrics_grid !== false ? 'block' : 'none';
            }

            const elBreakdown = document.getElementById('sc-subject-breakdown-container');
            if (elBreakdown) {
                elBreakdown.style.display = sc.show_subject_breakdown !== false ? 'block' : 'none';
            }

            const elReview = document.getElementById('sc-question-review-container');
            if (elReview) {
                elReview.style.display = sc.show_question_review !== false ? 'block' : 'none';
            }

            const elSig = document.getElementById('sc-signature-container');
            if (elSig) {
                elSig.style.display = sc.show_signature_block !== false ? 'flex' : 'none';
            }

            const elSeal = document.getElementById('sc-seal');
            if (elSeal) {
                elSeal.style.display = sc.show_seal !== false ? 'flex' : 'none';
            }
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
    if (scPercentage) scPercentage.textContent = "--%";
    if (scAccuracy) scAccuracy.textContent = "N/A";
    if (scRef) scRef.textContent = "SSE-2026";
    if (scTableBody) {
        scTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Awaiting authoritative submission data from Cloud DB...</td></tr>';
    }
}

loadAuthoritativeScore();
