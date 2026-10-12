import"./modulepreload-polyfill-3cfb730f.js";/* empty css              */function mt(){return localStorage.getItem("access_token")||"dev_test_token_do_not_use_in_prod"}function ut(){return localStorage.getItem("tenant_id")||"00000000-0000-0000-0000-000000000001"}function et(){return{"Content-Type":"application/json",Authorization:`Bearer ${mt()}`,"x-tenant-id":ut()}}function x(t){return(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function nt(t,A,k){const C=document.getElementById("sc-name"),E=document.getElementById("sc-reg"),h=document.getElementById("sc-app-no"),I=document.getElementById("sc-exam"),i=document.getElementById("sc-score"),r=document.getElementById("sc-percentage"),d=document.getElementById("sc-accuracy"),N=document.getElementById("sc-accuracy-subtext"),_=document.getElementById("sc-ref"),m=document.getElementById("sc-status"),s=document.getElementById("sc-time-taken"),n=document.getElementById("sc-submitted-at"),u=document.getElementById("sc-table-body"),g=document.getElementById("sc-question-review-body"),f=document.getElementById("sc-disq-banner"),S=document.getElementById("sc-disq-reason"),w=document.getElementById("sc-stat-total"),$=document.getElementById("sc-stat-attempted"),Q=document.getElementById("sc-stat-correct"),G=document.getElementById("sc-stat-incorrect"),V=document.getElementById("sc-stat-unanswered"),W=document.getElementById("sc-stat-review"),X=document.getElementById("sc-stat-positive"),J=document.getElementById("sc-stat-penalty"),ot=t.candidate_name||A,H=t.registration_number||k;if(C&&(C.textContent=ot),E&&(E.textContent=H),h&&H){const c=H.replace(/[^0-9]/g,"");c&&(h.textContent=`260310${c.padStart(6,"0").slice(-6)}`)}I&&(I.textContent=t.exam_title||"MCQ ASSESSMENT [ SSE CBT 2026 ]"),_&&(_.textContent=t.reference||"SSE-2026");const e=t.scoring_details||{},K=t.disqualified===!0||t.status==="disqualified";if(m&&(K?(m.textContent="DISQUALIFIED / ANNULLED",m.style.color="#dc2626"):(m.textContent="Submitted & Authoritatively Verified",m.style.color="#16a34a")),s&&(s.textContent=t.time_taken_display||(t.time_taken_seconds?`${Math.round(t.time_taken_seconds/60)} min`:"-- min")),n)if(t.submitted_at&&t.submitted_at!=="N/A")try{const c=new Date(t.submitted_at);n.textContent=isNaN(c.getTime())?t.submitted_at:c.toLocaleString()}catch{n.textContent=t.submitted_at}else n.textContent="Today";if(K){f&&(f.style.display="block"),S&&(S.textContent=t.reason||"This examination attempt was terminated under CBT Examination Security Regulations due to security malpractice/violations. All scores have been annulled."),i&&(i.textContent="0.0 (ANNULLED)",i.style.color="#dc2626"),r&&(r.textContent="0.0%",r.style.color="#dc2626"),d&&(d.textContent="REVOKED",d.style.color="#dc2626"),u&&(u.innerHTML=`
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
            `),g&&(g.innerHTML=`
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: #b91c1c;">
                        Itemized question responses suppressed due to administrative disqualification.
                    </td>
                </tr>
            `);return}f&&(f.style.display="none");const T=typeof t.score=="number"?t.score:parseFloat(t.score)||0,ct=typeof t.max_possible=="number"?t.max_possible:e.max_possible_score||80,Y=T>0?"+":"";i&&(i.textContent=`${Y}${T} / ${ct}`,i.style.color=T>=0?"#1e40af":"#dc2626");const Z=t.percentage!=null?t.percentage:e.percentage;r&&(r.textContent=Z!=null?`${Z}%`:"0.0%",r.style.color="#0369a1");const j=t.accuracy_display||e.accuracy_display||(t.accuracy!=null?`${t.accuracy}%`:e.accuracy!=null?`${e.accuracy}%`:"N/A");d&&(d.textContent=j,d.style.color="#15803d");const R=e.attempted_count!=null?e.attempted_count:t.attempted_count||0,F=e.correct_count!=null?e.correct_count:0,tt=e.incorrect_count!=null?e.incorrect_count:0,P=e.total_questions!=null?e.total_questions:e.details?e.details.length:20,st=e.unanswered_count!=null?e.unanswered_count:P-R,rt=e.marked_for_review_count!=null?e.marked_for_review_count:0,at=e.marks_before_penalty!=null?e.marks_before_penalty:t.marks_before_penalty||0,it=e.penalty_deducted!=null?e.penalty_deducted:t.penalty_deducted||0;if(N&&(N.textContent=`Correct: ${F} / Attempted: ${R}`),w&&(w.textContent=String(P)),$&&($.textContent=String(R)),Q&&(Q.textContent=String(F)),G&&(G.textContent=String(tt)),V&&(V.textContent=String(st)),W&&(W.textContent=String(rt)),X&&(X.textContent=`+${at.toFixed(1)}`),J&&(J.textContent=`-${it.toFixed(1)}`),u){const c=e.subject_breakdown;if(c&&typeof c=="object"&&Object.keys(c).length>0){const L=Object.keys(c);let o="",B=0,D=0,z=0,M=0,v=0;L.forEach(p=>{const a=c[p],l=a.total||0,b=a.correct||0,q=a.incorrect||0,O=a.attempted!=null?a.attempted:b+q,U=a.score||0,dt=a.accuracy_display||(a.accuracy!=null?`${a.accuracy}%`:O>0?`${Math.round(b/O*100)}%`:"N/A"),lt=U>0?"+":"";B+=l,D+=O,z+=b,M+=q,v+=U,o+=`
                    <tr>
                        <td style="font-weight: 700; color: var(--text-heading);">${x(p)}</td>
                        <td>${l}</td>
                        <td style="color: #0284c7; font-weight: 700;">${O}</td>
                        <td style="color: #15803d; font-weight: 700;">${b}</td>
                        <td style="color: #b91c1c; font-weight: 700;">${q}</td>
                        <td style="font-family: var(--font-mono); font-weight: 700; color: ${U>=0?"#1e40af":"#b91c1c"};">${lt}${U}</td>
                        <td>
                            <span style="font-weight: 700; color: #15803d;">${dt}</span>
                        </td>
                    </tr>
                `});const y=v>0?"+":"";o+=`
                <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid var(--border-color, #e2e8f0);">
                    <td style="color: #1e3a8a;">TOTAL AGGREGATE</td>
                    <td>${B}</td>
                    <td style="color: #0284c7;">${D}</td>
                    <td style="color: #15803d;">${z}</td>
                    <td style="color: #b91c1c;">${M}</td>
                    <td style="font-family: var(--font-mono); color: #1e40af; font-size: 1.05rem;">${y}${v}</td>
                    <td>
                        <span style="font-weight: 800; color: #15803d;">${j}</span>
                    </td>
                </tr>
            `,u.innerHTML=o}else u.innerHTML=`
                <tr style="background: #f8fafc; font-weight: 800;">
                    <td style="color: #1e3a8a;">Comprehensive Assessment Paper</td>
                    <td>${P}</td>
                    <td style="color: #0284c7;">${R}</td>
                    <td style="color: #15803d;">${F}</td>
                    <td style="color: #b91c1c;">${tt}</td>
                    <td style="font-family: var(--font-mono); color: #1e40af;">${Y}${T}</td>
                    <td>
                        <span style="font-weight: 800; color: #15803d;">${j}</span>
                    </td>
                </tr>
            `}if(g){const c=Array.isArray(e.details)?e.details:[];if(c.length>0){let L="";c.forEach(o=>{const B=o.question_number||"--",D=x(o.subject||o.section||"General"),z=x(o.statement||o.question_text||`Question ${B}`),M=x(o.candidate_answer_display||(o.candidate_answer?`Option ${o.candidate_answer}`:"[UNANSWERED]")),v=x(o.correct_answer_display||(o.correct_answer?`Option ${o.correct_answer}`:"--")),y=(o.status||"unanswered").toLowerCase(),p=typeof o.marks_awarded=="number"?o.marks_awarded:parseFloat(o.marks_awarded)||0,a=p>0?"+":"";let l="";y==="correct"?l='<span style="background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">CORRECT</span>':y==="incorrect"?l='<span style="background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">INCORRECT</span>':y==="bonus"?l='<span style="background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">BONUS</span>':l='<span style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">UNANSWERED</span>',o.is_marked_for_review&&(l+=' <span title="Marked for Review" style="font-size: 0.68rem; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 0.15rem 0.35rem; border-radius: 3px; font-weight: 700;">REVIEW</span>');const b=p>0?"#15803d":p<0?"#b91c1c":"#64748b";L+=`
                    <tr>
                        <td style="font-weight: 800; font-family: var(--font-mono); color: #1e3a8a;">${B}</td>
                        <td style="font-weight: 600; color: #475569; font-size: 0.85rem;">${D}</td>
                        <td style="font-size: 0.88rem; line-height: 1.45; color: #0f172a;">${z}</td>
                        <td style="font-size: 0.85rem; font-weight: 600; color: ${y==="correct"?"#15803d":y==="incorrect"?"#b91c1c":"#64748b"};">${M}</td>
                        <td style="font-size: 0.85rem; font-weight: 700; color: #1e3a8a;">${v}</td>
                        <td>${l}</td>
                        <td style="font-family: var(--font-mono); font-weight: 800; color: ${b}; text-align: right;">${a}${p.toFixed(1)}</td>
                    </tr>
                `}),g.innerHTML=L}else g.innerHTML=`
                <tr>
                    <td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
                        No individual question log items available in the authoritative record.
                    </td>
                </tr>
            `}}async function gt(){const t=document.getElementById("sc-name"),A=document.getElementById("sc-reg"),k=document.getElementById("sc-score"),C=document.getElementById("sc-percentage"),E=document.getElementById("sc-accuracy"),h=document.getElementById("sc-ref"),I=document.getElementById("sc-table-body"),i=localStorage.getItem("candidate_name")||"Registered Candidate",r=localStorage.getItem("reg_no")||new URLSearchParams(window.location.search).get("reg_no")||"",d=localStorage.getItem("candidate_id")||"",N=localStorage.getItem("active_exam_id")||"EX-1001";try{const s=await fetch("/api/v1/exams/settings",{headers:et()});if(s.ok){const n=await s.json(),u=document.getElementById("sc-agency"),g=document.getElementById("sc-title"),f=document.getElementById("sc-subhead-exam"),S=document.getElementById("sc-controller-name"),w=document.getElementById("sc-controller-desig"),$=document.getElementById("sc-center-node");u&&n.institution_name&&(u.textContent=n.institution_name),g&&n.examination_title&&(g.textContent=`${n.examination_title} : Official Score Card`),f&&n.examination_title&&(f.textContent=n.examination_title),S&&n.controller_name&&(S.textContent=n.controller_name),w&&n.controller_designation&&(w.textContent=n.controller_designation),$&&n.test_venue_name&&($.textContent=n.test_venue_name)}}catch{}const _=new URLSearchParams;r&&_.set("reg_no",r),d&&_.set("candidate_id",d);try{const s=await fetch(`/api/v1/exams/${encodeURIComponent(N)}/result?${_.toString()}`,{headers:et()});if(s.ok){const n=await s.json();if(n&&n.status!=="pending"){nt(n,i,r);return}}}catch(s){console.warn("Could not fetch remote result, checking session storage",s)}const m=sessionStorage.getItem("latest_result");if(m)try{const s=JSON.parse(m);nt(s,i,r);return}catch{}t&&(t.textContent=i),A&&(A.textContent=r),k&&(k.textContent="-- / --"),C&&(C.textContent="--%"),E&&(E.textContent="N/A"),h&&(h.textContent="SSE-2026"),I&&(I.innerHTML='<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Awaiting authoritative submission data from Cloud DB...</td></tr>')}gt();
