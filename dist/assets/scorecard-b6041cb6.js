import"./modulepreload-polyfill-3cfb730f.js";/* empty css              */function mt(){return localStorage.getItem("access_token")||""}function ut(){return localStorage.getItem("tenant_id")||"00000000-0000-0000-0000-000000000001"}function Z(){const t=mt(),f={"Content-Type":"application/json","x-tenant-id":ut()};return t&&(f.Authorization=`Bearer ${t}`),f}function h(t){return(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function ot(t,f,U){const w=document.getElementById("sc-name"),E=document.getElementById("sc-reg"),S=document.getElementById("sc-app-no"),C=document.getElementById("sc-exam"),d=document.getElementById("sc-score"),a=document.getElementById("sc-percentage"),l=document.getElementById("sc-accuracy"),W=document.getElementById("sc-accuracy-subtext"),_=document.getElementById("sc-ref"),m=document.getElementById("sc-status"),I=document.getElementById("sc-time-taken"),o=document.getElementById("sc-submitted-at"),n=document.getElementById("sc-table-body"),s=document.getElementById("sc-question-review-body"),g=document.getElementById("sc-disq-banner"),B=document.getElementById("sc-disq-reason"),$=document.getElementById("sc-stat-total"),k=document.getElementById("sc-stat-attempted"),v=document.getElementById("sc-stat-correct"),A=document.getElementById("sc-stat-incorrect"),T=document.getElementById("sc-stat-unanswered"),N=document.getElementById("sc-stat-review"),R=document.getElementById("sc-stat-positive"),L=document.getElementById("sc-stat-penalty"),z=t.candidate_name||f,b=t.registration_number||U;if(w&&(w.textContent=z),E&&(E.textContent=b),S&&b){const r=b.replace(/[^0-9]/g,"");r&&(S.textContent=`260310${r.padStart(6,"0").slice(-6)}`)}C&&(C.textContent=t.exam_title||"MCQ ASSESSMENT [ SSE CBT 2026 ]"),_&&(_.textContent=t.reference||"SSE-2026");const e=t.scoring_details||{},D=t.disqualified===!0||t.status==="disqualified";if(m&&(D?(m.textContent="DISQUALIFIED / ANNULLED",m.style.color="#dc2626"):(m.textContent="Submitted & Authoritatively Verified",m.style.color="#16a34a")),I&&(I.textContent=t.time_taken_display||(t.time_taken_seconds?`${Math.round(t.time_taken_seconds/60)} min`:"-- min")),o)if(t.submitted_at&&t.submitted_at!=="N/A")try{const r=new Date(t.submitted_at);o.textContent=isNaN(r.getTime())?t.submitted_at:r.toLocaleString()}catch{o.textContent=t.submitted_at}else o.textContent="Today";if(D){g&&(g.style.display="block"),B&&(B.textContent=t.reason||"This examination attempt was terminated under CBT Examination Security Regulations due to security malpractice/violations. All scores have been annulled."),d&&(d.textContent="0.0 (ANNULLED)",d.style.color="#dc2626"),a&&(a.textContent="0.0%",a.style.color="#dc2626"),l&&(l.textContent="REVOKED",l.style.color="#dc2626"),n&&(n.innerHTML=`
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2.5rem 1.5rem; background: #fef2f2;">
                        <div style="font-size: 1.15rem; font-weight: 800; color: #b91c1c; margin-bottom: 0.5rem;">
                            EXAMINATION SCORES NULLIFIED &bull; CANDIDATE DISQUALIFIED
                        </div>
                        <div style="color: #991b1b; font-size: 0.92rem; max-width: 650px; margin: 0 auto; line-height: 1.6;">
                            <strong>Reason:</strong> ${h(t.reason||"Exceeded security infraction threshold.")}<br>
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
            `);return}g&&(g.style.display="none");const j=typeof t.score=="number"?t.score:parseFloat(t.score)||0,ct=typeof t.max_possible=="number"?t.max_possible:e.max_possible_score||80,tt=j>0?"+":"";d&&(d.textContent=`${tt}${j} / ${ct}`,d.style.color=j>=0?"#1e40af":"#dc2626");const et=t.percentage!=null?t.percentage:e.percentage;a&&(a.textContent=et!=null?`${et}%`:"0.0%",a.style.color="#0369a1");const J=t.accuracy_display||e.accuracy_display||(t.accuracy!=null?`${t.accuracy}%`:e.accuracy!=null?`${e.accuracy}%`:"N/A");l&&(l.textContent=J,l.style.color="#15803d");const H=e.attempted_count!=null?e.attempted_count:t.attempted_count||0,K=e.correct_count!=null?e.correct_count:0,nt=e.incorrect_count!=null?e.incorrect_count:0,X=e.total_questions!=null?e.total_questions:e.details?e.details.length:20,st=e.unanswered_count!=null?e.unanswered_count:X-H,rt=e.marked_for_review_count!=null?e.marked_for_review_count:0,at=e.marks_before_penalty!=null?e.marks_before_penalty:t.marks_before_penalty||0,it=e.penalty_deducted!=null?e.penalty_deducted:t.penalty_deducted||0;if(W&&(W.textContent=`Correct: ${K} / Attempted: ${H}`),$&&($.textContent=String(X)),k&&(k.textContent=String(H)),v&&(v.textContent=String(K)),A&&(A.textContent=String(nt)),T&&(T.textContent=String(st)),N&&(N.textContent=String(rt)),R&&(R.textContent=`+${at.toFixed(1)}`),L&&(L.textContent=`-${it.toFixed(1)}`),n){const r=e.subject_breakdown;if(r&&typeof r=="object"&&Object.keys(r).length>0){const P=Object.keys(r);let c="",M=0,F=0,q=0,Q=0,O=0;P.forEach(p=>{const i=r[p],u=i.total||0,x=i.correct||0,Y=i.incorrect||0,G=i.attempted!=null?i.attempted:x+Y,V=i.score||0,dt=i.accuracy_display||(i.accuracy!=null?`${i.accuracy}%`:G>0?`${Math.round(x/G*100)}%`:"N/A"),lt=V>0?"+":"";M+=u,F+=G,q+=x,Q+=Y,O+=V,c+=`
                    <tr>
                        <td style="font-weight: 700; color: var(--text-heading);">${h(p)}</td>
                        <td>${u}</td>
                        <td style="color: #0284c7; font-weight: 700;">${G}</td>
                        <td style="color: #15803d; font-weight: 700;">${x}</td>
                        <td style="color: #b91c1c; font-weight: 700;">${Y}</td>
                        <td style="font-family: var(--font-mono); font-weight: 700; color: ${V>=0?"#1e40af":"#b91c1c"};">${lt}${V}</td>
                        <td>
                            <span style="font-weight: 700; color: #15803d;">${dt}</span>
                        </td>
                    </tr>
                `});const y=O>0?"+":"";c+=`
                <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid var(--border-color, #e2e8f0);">
                    <td style="color: #1e3a8a;">TOTAL AGGREGATE</td>
                    <td>${M}</td>
                    <td style="color: #0284c7;">${F}</td>
                    <td style="color: #15803d;">${q}</td>
                    <td style="color: #b91c1c;">${Q}</td>
                    <td style="font-family: var(--font-mono); color: #1e40af; font-size: 1.05rem;">${y}${O}</td>
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
            `}if(s){const r=Array.isArray(e.details)?e.details:[];if(r.length>0){let P="";r.forEach(c=>{const M=c.question_number||"--",F=h(c.subject||c.section||"General"),q=h(c.statement||c.question_text||`Question ${M}`),Q=h(c.candidate_answer_display||(c.candidate_answer?`Option ${c.candidate_answer}`:"[UNANSWERED]")),O=h(c.correct_answer_display||(c.correct_answer?`Option ${c.correct_answer}`:"--")),y=(c.status||"unanswered").toLowerCase(),p=typeof c.marks_awarded=="number"?c.marks_awarded:parseFloat(c.marks_awarded)||0,i=p>0?"+":"";let u="";y==="correct"?u='<span style="background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">CORRECT</span>':y==="incorrect"?u='<span style="background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">INCORRECT</span>':y==="bonus"?u='<span style="background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">BONUS</span>':u='<span style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">UNANSWERED</span>',c.is_marked_for_review&&(u+=' <span title="Marked for Review" style="font-size: 0.68rem; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 0.15rem 0.35rem; border-radius: 3px; font-weight: 700;">REVIEW</span>');const x=p>0?"#15803d":p<0?"#b91c1c":"#64748b";P+=`
                    <tr>
                        <td style="font-weight: 800; font-family: var(--font-mono); color: #1e3a8a;">${M}</td>
                        <td style="font-weight: 600; color: #475569; font-size: 0.85rem;">${F}</td>
                        <td style="font-size: 0.88rem; line-height: 1.45; color: #0f172a;">${q}</td>
                        <td style="font-size: 0.85rem; font-weight: 600; color: ${y==="correct"?"#15803d":y==="incorrect"?"#b91c1c":"#64748b"};">${Q}</td>
                        <td style="font-size: 0.85rem; font-weight: 700; color: #1e3a8a;">${O}</td>
                        <td>${u}</td>
                        <td style="font-family: var(--font-mono); font-weight: 800; color: ${x}; text-align: right;">${i}${p.toFixed(1)}</td>
                    </tr>
                `}),s.innerHTML=P}else s.innerHTML=`
                <tr>
                    <td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
                        No individual question log items available in the authoritative record.
                    </td>
                </tr>
            `}}async function ft(){const t=document.getElementById("sc-name"),f=document.getElementById("sc-reg"),U=document.getElementById("sc-score"),w=document.getElementById("sc-percentage"),E=document.getElementById("sc-accuracy"),S=document.getElementById("sc-ref"),C=document.getElementById("sc-table-body"),d=localStorage.getItem("candidate_name")||"Registered Candidate",a=localStorage.getItem("reg_no")||new URLSearchParams(window.location.search).get("reg_no")||"",l=localStorage.getItem("candidate_id")||new URLSearchParams(window.location.search).get("candidate_id")||"";let _=new URLSearchParams(window.location.search).get("exam_id")||localStorage.getItem("active_exam_id")||"";if(!_)try{const o=await fetch("/api/v1/exams/",{headers:Z()});if(o.ok){const n=await o.json();Array.isArray(n)&&n.length>0&&(_=n[0].id)}}catch{}try{const o=await fetch("/api/v1/exams/settings",{headers:Z()});if(o.ok){const n=await o.json(),s=n.scorecard||{},g=document.getElementById("sc-agency"),B=document.getElementById("sc-title"),$=document.getElementById("sc-subhead-exam"),k=document.getElementById("sc-subhead-status"),v=document.getElementById("sc-controller-name"),A=document.getElementById("sc-controller-desig"),T=document.getElementById("sc-center-node"),N=document.getElementById("sc-footer-disclaimer");g&&(g.textContent=s.institution_name||n.institution_name||"SSE CBT PLATFORM"),B&&(B.textContent=s.document_title||(n.examination_title?`${n.examination_title} : Official Score Card`:"MCQ ASSESSMENT [ SSE CBT 2026 ] : Official Score Card")),$&&($.textContent=n.examination_title||"MCQ Assessment 2026"),k&&s.subhead_status_text&&(k.textContent=s.subhead_status_text),v&&n.controller_name&&(v.textContent=n.controller_name),A&&n.controller_designation&&(A.textContent=n.controller_designation),T&&n.test_venue_name&&(T.textContent=n.test_venue_name),N&&s.footer_disclaimer&&(N.textContent=s.footer_disclaimer);const R=document.getElementById("sc-score-banner");R&&(R.style.display=s.show_score_banner!==!1?"flex":"none");const L=document.getElementById("sc-metrics-grid-container");L&&(L.style.display=s.show_metrics_grid!==!1?"block":"none");const z=document.getElementById("sc-subject-breakdown-container");z&&(z.style.display=s.show_subject_breakdown!==!1?"block":"none");const b=document.getElementById("sc-question-review-container");b&&(b.style.display=s.show_question_review!==!1?"block":"none");const e=document.getElementById("sc-signature-container");e&&(e.style.display=s.show_signature_block!==!1?"flex":"none");const D=document.getElementById("sc-seal");D&&(D.style.display=s.show_seal!==!1?"flex":"none")}}catch{}const m=new URLSearchParams;a&&m.set("reg_no",a),l&&m.set("candidate_id",l);try{const o=await fetch(`/api/v1/exams/${encodeURIComponent(_)}/result?${m.toString()}`,{headers:Z()});if(o.ok){const n=await o.json();if(n&&n.status!=="pending"){ot(n,d,a);return}}}catch(o){console.warn("Could not fetch remote result, checking session storage",o)}const I=sessionStorage.getItem("latest_result");if(I)try{const o=JSON.parse(I);ot(o,d,a);return}catch{}t&&(t.textContent=d),f&&(f.textContent=a),U&&(U.textContent="-- / --"),w&&(w.textContent="--%"),E&&(E.textContent="N/A"),S&&(S.textContent="SSE-2026"),C&&(C.innerHTML='<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Awaiting authoritative submission data from Cloud DB...</td></tr>')}ft();
