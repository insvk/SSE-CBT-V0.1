import"./modulepreload-polyfill-3cfb730f.js";/* empty css              */function mt(){return localStorage.getItem("access_token")||"dev_test_token_do_not_use_in_prod"}function ut(){return localStorage.getItem("tenant_id")||"00000000-0000-0000-0000-000000000001"}function Z(){return{"Content-Type":"application/json",Authorization:`Bearer ${mt()}`,"x-tenant-id":ut()}}function x(t){return(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function ot(t,O,U){const w=document.getElementById("sc-name"),h=document.getElementById("sc-reg"),E=document.getElementById("sc-app-no"),S=document.getElementById("sc-exam"),d=document.getElementById("sc-score"),a=document.getElementById("sc-percentage"),l=document.getElementById("sc-accuracy"),W=document.getElementById("sc-accuracy-subtext"),p=document.getElementById("sc-ref"),m=document.getElementById("sc-status"),C=document.getElementById("sc-time-taken"),o=document.getElementById("sc-submitted-at"),n=document.getElementById("sc-table-body"),s=document.getElementById("sc-question-review-body"),f=document.getElementById("sc-disq-banner"),I=document.getElementById("sc-disq-reason"),B=document.getElementById("sc-stat-total"),$=document.getElementById("sc-stat-attempted"),k=document.getElementById("sc-stat-correct"),v=document.getElementById("sc-stat-incorrect"),A=document.getElementById("sc-stat-unanswered"),T=document.getElementById("sc-stat-review"),N=document.getElementById("sc-stat-positive"),R=document.getElementById("sc-stat-penalty"),z=t.candidate_name||O,_=t.registration_number||U;if(w&&(w.textContent=z),h&&(h.textContent=_),E&&_){const r=_.replace(/[^0-9]/g,"");r&&(E.textContent=`260310${r.padStart(6,"0").slice(-6)}`)}S&&(S.textContent=t.exam_title||"MCQ ASSESSMENT [ SSE CBT 2026 ]"),p&&(p.textContent=t.reference||"SSE-2026");const e=t.scoring_details||{},L=t.disqualified===!0||t.status==="disqualified";if(m&&(L?(m.textContent="DISQUALIFIED / ANNULLED",m.style.color="#dc2626"):(m.textContent="Submitted & Authoritatively Verified",m.style.color="#16a34a")),C&&(C.textContent=t.time_taken_display||(t.time_taken_seconds?`${Math.round(t.time_taken_seconds/60)} min`:"-- min")),o)if(t.submitted_at&&t.submitted_at!=="N/A")try{const r=new Date(t.submitted_at);o.textContent=isNaN(r.getTime())?t.submitted_at:r.toLocaleString()}catch{o.textContent=t.submitted_at}else o.textContent="Today";if(L){f&&(f.style.display="block"),I&&(I.textContent=t.reason||"This examination attempt was terminated under CBT Examination Security Regulations due to security malpractice/violations. All scores have been annulled."),d&&(d.textContent="0.0 (ANNULLED)",d.style.color="#dc2626"),a&&(a.textContent="0.0%",a.style.color="#dc2626"),l&&(l.textContent="REVOKED",l.style.color="#dc2626"),n&&(n.innerHTML=`
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2.5rem 1.5rem; background: #fef2f2;">
                        <div style="font-size: 1.15rem; font-weight: 800; color: #b91c1c; margin-bottom: 0.5rem;">
                            EXAMINATION SCORES NULLIFIED &bull; CANDIDATE DISQUALIFIED
                        </div>
                        <div style="color: #991b1b; font-size: 0.92rem; max-width: 650px; margin: 0 auto; line-height: 1.6;">
                            <strong>Reason:</strong> ${x(t.reason||"Exceeded security infraction threshold.")}<br>
                            Under SSE CBT Statutory Regulations, candidate responses have been invalidated and no merit marks are awarded.
                        </div>
                    </td>
                </tr>
            `),s&&(s.innerHTML=`
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: #b91c1c;">
                        Itemized question responses suppressed due to administrative disqualification.
                    </td>
                </tr>
            `);return}f&&(f.style.display="none");const j=typeof t.score=="number"?t.score:parseFloat(t.score)||0,ct=typeof t.max_possible=="number"?t.max_possible:e.max_possible_score||80,tt=j>0?"+":"";d&&(d.textContent=`${tt}${j} / ${ct}`,d.style.color=j>=0?"#1e40af":"#dc2626");const et=t.percentage!=null?t.percentage:e.percentage;a&&(a.textContent=et!=null?`${et}%`:"0.0%",a.style.color="#0369a1");const J=t.accuracy_display||e.accuracy_display||(t.accuracy!=null?`${t.accuracy}%`:e.accuracy!=null?`${e.accuracy}%`:"N/A");l&&(l.textContent=J,l.style.color="#15803d");const H=e.attempted_count!=null?e.attempted_count:t.attempted_count||0,K=e.correct_count!=null?e.correct_count:0,nt=e.incorrect_count!=null?e.incorrect_count:0,X=e.total_questions!=null?e.total_questions:e.details?e.details.length:20,st=e.unanswered_count!=null?e.unanswered_count:X-H,rt=e.marked_for_review_count!=null?e.marked_for_review_count:0,at=e.marks_before_penalty!=null?e.marks_before_penalty:t.marks_before_penalty||0,it=e.penalty_deducted!=null?e.penalty_deducted:t.penalty_deducted||0;if(W&&(W.textContent=`Correct: ${K} / Attempted: ${H}`),B&&(B.textContent=String(X)),$&&($.textContent=String(H)),k&&(k.textContent=String(K)),v&&(v.textContent=String(nt)),A&&(A.textContent=String(st)),T&&(T.textContent=String(rt)),N&&(N.textContent=`+${at.toFixed(1)}`),R&&(R.textContent=`-${it.toFixed(1)}`),n){const r=e.subject_breakdown;if(r&&typeof r=="object"&&Object.keys(r).length>0){const P=Object.keys(r);let c="",D=0,F=0,q=0,Q=0,M=0;P.forEach(y=>{const i=r[y],u=i.total||0,b=i.correct||0,Y=i.incorrect||0,G=i.attempted!=null?i.attempted:b+Y,V=i.score||0,dt=i.accuracy_display||(i.accuracy!=null?`${i.accuracy}%`:G>0?`${Math.round(b/G*100)}%`:"N/A"),lt=V>0?"+":"";D+=u,F+=G,q+=b,Q+=Y,M+=V,c+=`
                    <tr>
                        <td style="font-weight: 700; color: var(--text-heading);">${x(y)}</td>
                        <td>${u}</td>
                        <td style="color: #0284c7; font-weight: 700;">${G}</td>
                        <td style="color: #15803d; font-weight: 700;">${b}</td>
                        <td style="color: #b91c1c; font-weight: 700;">${Y}</td>
                        <td style="font-family: var(--font-mono); font-weight: 700; color: ${V>=0?"#1e40af":"#b91c1c"};">${lt}${V}</td>
                        <td>
                            <span style="font-weight: 700; color: #15803d;">${dt}</span>
                        </td>
                    </tr>
                `});const g=M>0?"+":"";c+=`
                <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid var(--border-color, #e2e8f0);">
                    <td style="color: #1e3a8a;">TOTAL AGGREGATE</td>
                    <td>${D}</td>
                    <td style="color: #0284c7;">${F}</td>
                    <td style="color: #15803d;">${q}</td>
                    <td style="color: #b91c1c;">${Q}</td>
                    <td style="font-family: var(--font-mono); color: #1e40af; font-size: 1.05rem;">${g}${M}</td>
                    <td>
                        <span style="font-weight: 800; color: #15803d;">${J}</span>
                    </td>
                </tr>
            `,n.innerHTML=c}else n.innerHTML=`
                <tr style="background: #f8fafc; font-weight: 800;">
                    <td style="color: #1e3a8a;">Comprehensive Assessment Paper</td>
                    <td>${X}</td>
                    <td style="color: #0284c7;">${H}</td>
                    <td style="color: #15803d;">${K}</td>
                    <td style="color: #b91c1c;">${nt}</td>
                    <td style="font-family: var(--font-mono); color: #1e40af;">${tt}${j}</td>
                    <td>
                        <span style="font-weight: 800; color: #15803d;">${J}</span>
                    </td>
                </tr>
            `}if(s){const r=Array.isArray(e.details)?e.details:[];if(r.length>0){let P="";r.forEach(c=>{const D=c.question_number||"--",F=x(c.subject||c.section||"General"),q=x(c.statement||c.question_text||`Question ${D}`),Q=x(c.candidate_answer_display||(c.candidate_answer?`Option ${c.candidate_answer}`:"[UNANSWERED]")),M=x(c.correct_answer_display||(c.correct_answer?`Option ${c.correct_answer}`:"--")),g=(c.status||"unanswered").toLowerCase(),y=typeof c.marks_awarded=="number"?c.marks_awarded:parseFloat(c.marks_awarded)||0,i=y>0?"+":"";let u="";g==="correct"?u='<span style="background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">CORRECT</span>':g==="incorrect"?u='<span style="background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">INCORRECT</span>':g==="bonus"?u='<span style="background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">BONUS</span>':u='<span style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">UNANSWERED</span>',c.is_marked_for_review&&(u+=' <span title="Marked for Review" style="font-size: 0.68rem; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 0.15rem 0.35rem; border-radius: 3px; font-weight: 700;">REVIEW</span>');const b=y>0?"#15803d":y<0?"#b91c1c":"#64748b";P+=`
                    <tr>
                        <td style="font-weight: 800; font-family: var(--font-mono); color: #1e3a8a;">${D}</td>
                        <td style="font-weight: 600; color: #475569; font-size: 0.85rem;">${F}</td>
                        <td style="font-size: 0.88rem; line-height: 1.45; color: #0f172a;">${q}</td>
                        <td style="font-size: 0.85rem; font-weight: 600; color: ${g==="correct"?"#15803d":g==="incorrect"?"#b91c1c":"#64748b"};">${Q}</td>
                        <td style="font-size: 0.85rem; font-weight: 700; color: #1e3a8a;">${M}</td>
                        <td>${u}</td>
                        <td style="font-family: var(--font-mono); font-weight: 800; color: ${b}; text-align: right;">${i}${y.toFixed(1)}</td>
                    </tr>
                `}),s.innerHTML=P}else s.innerHTML=`
                <tr>
                    <td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
                        No individual question log items available in the authoritative record.
                    </td>
                </tr>
            `}}async function ft(){const t=document.getElementById("sc-name"),O=document.getElementById("sc-reg"),U=document.getElementById("sc-score"),w=document.getElementById("sc-percentage"),h=document.getElementById("sc-accuracy"),E=document.getElementById("sc-ref"),S=document.getElementById("sc-table-body"),d=localStorage.getItem("candidate_name")||"Registered Candidate",a=localStorage.getItem("reg_no")||new URLSearchParams(window.location.search).get("reg_no")||"",l=localStorage.getItem("candidate_id")||new URLSearchParams(window.location.search).get("candidate_id")||"";let p=new URLSearchParams(window.location.search).get("exam_id")||localStorage.getItem("active_exam_id")||"";if(!p)try{const o=await fetch("/api/v1/exams/",{headers:Z()});if(o.ok){const n=await o.json();Array.isArray(n)&&n.length>0&&(p=n[0].id)}}catch{}try{const o=await fetch("/api/v1/exams/settings",{headers:Z()});if(o.ok){const n=await o.json(),s=n.scorecard||{},f=document.getElementById("sc-agency"),I=document.getElementById("sc-title"),B=document.getElementById("sc-subhead-exam"),$=document.getElementById("sc-subhead-status"),k=document.getElementById("sc-controller-name"),v=document.getElementById("sc-controller-desig"),A=document.getElementById("sc-center-node"),T=document.getElementById("sc-footer-disclaimer");f&&(f.textContent=s.institution_name||n.institution_name||"SSE CBT PLATFORM"),I&&(I.textContent=s.document_title||(n.examination_title?`${n.examination_title} : Official Score Card`:"MCQ ASSESSMENT [ SSE CBT 2026 ] : Official Score Card")),B&&(B.textContent=n.examination_title||"MCQ Assessment 2026"),$&&s.subhead_status_text&&($.textContent=s.subhead_status_text),k&&n.controller_name&&(k.textContent=n.controller_name),v&&n.controller_designation&&(v.textContent=n.controller_designation),A&&n.test_venue_name&&(A.textContent=n.test_venue_name),T&&s.footer_disclaimer&&(T.textContent=s.footer_disclaimer);const N=document.getElementById("sc-score-banner");N&&(N.style.display=s.show_score_banner!==!1?"flex":"none");const R=document.getElementById("sc-metrics-grid-container");R&&(R.style.display=s.show_metrics_grid!==!1?"block":"none");const z=document.getElementById("sc-subject-breakdown-container");z&&(z.style.display=s.show_subject_breakdown!==!1?"block":"none");const _=document.getElementById("sc-question-review-container");_&&(_.style.display=s.show_question_review!==!1?"block":"none");const e=document.getElementById("sc-signature-container");e&&(e.style.display=s.show_signature_block!==!1?"flex":"none");const L=document.getElementById("sc-seal");L&&(L.style.display=s.show_seal!==!1?"flex":"none")}}catch{}const m=new URLSearchParams;a&&m.set("reg_no",a),l&&m.set("candidate_id",l);try{const o=await fetch(`/api/v1/exams/${encodeURIComponent(p)}/result?${m.toString()}`,{headers:Z()});if(o.ok){const n=await o.json();if(n&&n.status!=="pending"){ot(n,d,a);return}}}catch(o){console.warn("Could not fetch remote result, checking session storage",o)}const C=sessionStorage.getItem("latest_result");if(C)try{const o=JSON.parse(C);ot(o,d,a);return}catch{}t&&(t.textContent=d),O&&(O.textContent=a),U&&(U.textContent="-- / --"),w&&(w.textContent="--%"),h&&(h.textContent="N/A"),E&&(E.textContent="SSE-2026"),S&&(S.innerHTML='<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Awaiting authoritative submission data from Cloud DB...</td></tr>')}ft();
