import"./modulepreload-polyfill-3cfb730f.js";/* empty css              */function mt(){return localStorage.getItem("access_token")||"dev_test_token_do_not_use_in_prod"}function ut(){return localStorage.getItem("tenant_id")||"00000000-0000-0000-0000-000000000001"}function nt(){return{"Content-Type":"application/json",Authorization:`Bearer ${mt()}`,"x-tenant-id":ut()}}function E(t){return(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function ot(t,M,O){const S=document.getElementById("sc-name"),C=document.getElementById("sc-reg"),w=document.getElementById("sc-app-no"),h=document.getElementById("sc-exam"),d=document.getElementById("sc-score"),a=document.getElementById("sc-percentage"),l=document.getElementById("sc-accuracy"),z=document.getElementById("sc-accuracy-subtext"),_=document.getElementById("sc-ref"),u=document.getElementById("sc-status"),r=document.getElementById("sc-time-taken"),n=document.getElementById("sc-submitted-at"),c=document.getElementById("sc-table-body"),f=document.getElementById("sc-question-review-body"),g=document.getElementById("sc-disq-banner"),I=document.getElementById("sc-disq-reason"),B=document.getElementById("sc-stat-total"),$=document.getElementById("sc-stat-attempted"),k=document.getElementById("sc-stat-correct"),v=document.getElementById("sc-stat-incorrect"),A=document.getElementById("sc-stat-unanswered"),T=document.getElementById("sc-stat-review"),N=document.getElementById("sc-stat-positive"),R=document.getElementById("sc-stat-penalty"),U=t.candidate_name||M,b=t.registration_number||O;if(S&&(S.textContent=U),C&&(C.textContent=b),w&&b){const s=b.replace(/[^0-9]/g,"");s&&(w.textContent=`260310${s.padStart(6,"0").slice(-6)}`)}h&&(h.textContent=t.exam_title||"MCQ ASSESSMENT [ SSE CBT 2026 ]"),_&&(_.textContent=t.reference||"SSE-2026");const e=t.scoring_details||{},Y=t.disqualified===!0||t.status==="disqualified";if(u&&(Y?(u.textContent="DISQUALIFIED / ANNULLED",u.style.color="#dc2626"):(u.textContent="Submitted & Authoritatively Verified",u.style.color="#16a34a")),r&&(r.textContent=t.time_taken_display||(t.time_taken_seconds?`${Math.round(t.time_taken_seconds/60)} min`:"-- min")),n)if(t.submitted_at&&t.submitted_at!=="N/A")try{const s=new Date(t.submitted_at);n.textContent=isNaN(s.getTime())?t.submitted_at:s.toLocaleString()}catch{n.textContent=t.submitted_at}else n.textContent="Today";if(Y){g&&(g.style.display="block"),I&&(I.textContent=t.reason||"This examination attempt was terminated under CBT Examination Security Regulations due to security malpractice/violations. All scores have been annulled."),d&&(d.textContent="0.0 (ANNULLED)",d.style.color="#dc2626"),a&&(a.textContent="0.0%",a.style.color="#dc2626"),l&&(l.textContent="REVOKED",l.style.color="#dc2626"),c&&(c.innerHTML=`
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2.5rem 1.5rem; background: #fef2f2;">
                        <div style="font-size: 1.15rem; font-weight: 800; color: #b91c1c; margin-bottom: 0.5rem;">
                            EXAMINATION SCORES NULLIFIED &bull; CANDIDATE DISQUALIFIED
                        </div>
                        <div style="color: #991b1b; font-size: 0.92rem; max-width: 650px; margin: 0 auto; line-height: 1.6;">
                            <strong>Reason:</strong> ${E(t.reason||"Exceeded security infraction threshold.")}<br>
                            Under SSE CBT Statutory Regulations, candidate responses have been invalidated and no merit marks are awarded.
                        </div>
                    </td>
                </tr>
            `),f&&(f.innerHTML=`
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: #b91c1c;">
                        Itemized question responses suppressed due to administrative disqualification.
                    </td>
                </tr>
            `);return}g&&(g.style.display="none");const j=typeof t.score=="number"?t.score:parseFloat(t.score)||0,ct=typeof t.max_possible=="number"?t.max_possible:e.max_possible_score||80,Z=j>0?"+":"";d&&(d.textContent=`${Z}${j} / ${ct}`,d.style.color=j>=0?"#1e40af":"#dc2626");const tt=t.percentage!=null?t.percentage:e.percentage;a&&(a.textContent=tt!=null?`${tt}%`:"0.0%",a.style.color="#0369a1");const W=t.accuracy_display||e.accuracy_display||(t.accuracy!=null?`${t.accuracy}%`:e.accuracy!=null?`${e.accuracy}%`:"N/A");l&&(l.textContent=W,l.style.color="#15803d");const H=e.attempted_count!=null?e.attempted_count:t.attempted_count||0,X=e.correct_count!=null?e.correct_count:0,et=e.incorrect_count!=null?e.incorrect_count:0,J=e.total_questions!=null?e.total_questions:e.details?e.details.length:20,st=e.unanswered_count!=null?e.unanswered_count:J-H,rt=e.marked_for_review_count!=null?e.marked_for_review_count:0,at=e.marks_before_penalty!=null?e.marks_before_penalty:t.marks_before_penalty||0,it=e.penalty_deducted!=null?e.penalty_deducted:t.penalty_deducted||0;if(z&&(z.textContent=`Correct: ${X} / Attempted: ${H}`),B&&(B.textContent=String(J)),$&&($.textContent=String(H)),k&&(k.textContent=String(X)),v&&(v.textContent=String(et)),A&&(A.textContent=String(st)),T&&(T.textContent=String(rt)),N&&(N.textContent=`+${at.toFixed(1)}`),R&&(R.textContent=`-${it.toFixed(1)}`),c){const s=e.subject_breakdown;if(s&&typeof s=="object"&&Object.keys(s).length>0){const F=Object.keys(s);let o="",L=0,P=0,q=0,Q=0,D=0;F.forEach(p=>{const i=s[p],m=i.total||0,x=i.correct||0,K=i.incorrect||0,G=i.attempted!=null?i.attempted:x+K,V=i.score||0,dt=i.accuracy_display||(i.accuracy!=null?`${i.accuracy}%`:G>0?`${Math.round(x/G*100)}%`:"N/A"),lt=V>0?"+":"";L+=m,P+=G,q+=x,Q+=K,D+=V,o+=`
                    <tr>
                        <td style="font-weight: 700; color: var(--text-heading);">${E(p)}</td>
                        <td>${m}</td>
                        <td style="color: #0284c7; font-weight: 700;">${G}</td>
                        <td style="color: #15803d; font-weight: 700;">${x}</td>
                        <td style="color: #b91c1c; font-weight: 700;">${K}</td>
                        <td style="font-family: var(--font-mono); font-weight: 700; color: ${V>=0?"#1e40af":"#b91c1c"};">${lt}${V}</td>
                        <td>
                            <span style="font-weight: 700; color: #15803d;">${dt}</span>
                        </td>
                    </tr>
                `});const y=D>0?"+":"";o+=`
                <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid var(--border-color, #e2e8f0);">
                    <td style="color: #1e3a8a;">TOTAL AGGREGATE</td>
                    <td>${L}</td>
                    <td style="color: #0284c7;">${P}</td>
                    <td style="color: #15803d;">${q}</td>
                    <td style="color: #b91c1c;">${Q}</td>
                    <td style="font-family: var(--font-mono); color: #1e40af; font-size: 1.05rem;">${y}${D}</td>
                    <td>
                        <span style="font-weight: 800; color: #15803d;">${W}</span>
                    </td>
                </tr>
            `,c.innerHTML=o}else c.innerHTML=`
                <tr style="background: #f8fafc; font-weight: 800;">
                    <td style="color: #1e3a8a;">Comprehensive Assessment Paper</td>
                    <td>${J}</td>
                    <td style="color: #0284c7;">${H}</td>
                    <td style="color: #15803d;">${X}</td>
                    <td style="color: #b91c1c;">${et}</td>
                    <td style="font-family: var(--font-mono); color: #1e40af;">${Z}${j}</td>
                    <td>
                        <span style="font-weight: 800; color: #15803d;">${W}</span>
                    </td>
                </tr>
            `}if(f){const s=Array.isArray(e.details)?e.details:[];if(s.length>0){let F="";s.forEach(o=>{const L=o.question_number||"--",P=E(o.subject||o.section||"General"),q=E(o.statement||o.question_text||`Question ${L}`),Q=E(o.candidate_answer_display||(o.candidate_answer?`Option ${o.candidate_answer}`:"[UNANSWERED]")),D=E(o.correct_answer_display||(o.correct_answer?`Option ${o.correct_answer}`:"--")),y=(o.status||"unanswered").toLowerCase(),p=typeof o.marks_awarded=="number"?o.marks_awarded:parseFloat(o.marks_awarded)||0,i=p>0?"+":"";let m="";y==="correct"?m='<span style="background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">CORRECT</span>':y==="incorrect"?m='<span style="background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">INCORRECT</span>':y==="bonus"?m='<span style="background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">BONUS</span>':m='<span style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">UNANSWERED</span>',o.is_marked_for_review&&(m+=' <span title="Marked for Review" style="font-size: 0.68rem; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 0.15rem 0.35rem; border-radius: 3px; font-weight: 700;">REVIEW</span>');const x=p>0?"#15803d":p<0?"#b91c1c":"#64748b";F+=`
                    <tr>
                        <td style="font-weight: 800; font-family: var(--font-mono); color: #1e3a8a;">${L}</td>
                        <td style="font-weight: 600; color: #475569; font-size: 0.85rem;">${P}</td>
                        <td style="font-size: 0.88rem; line-height: 1.45; color: #0f172a;">${q}</td>
                        <td style="font-size: 0.85rem; font-weight: 600; color: ${y==="correct"?"#15803d":y==="incorrect"?"#b91c1c":"#64748b"};">${Q}</td>
                        <td style="font-size: 0.85rem; font-weight: 700; color: #1e3a8a;">${D}</td>
                        <td>${m}</td>
                        <td style="font-family: var(--font-mono); font-weight: 800; color: ${x}; text-align: right;">${i}${p.toFixed(1)}</td>
                    </tr>
                `}),f.innerHTML=F}else f.innerHTML=`
                <tr>
                    <td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
                        No individual question log items available in the authoritative record.
                    </td>
                </tr>
            `}}async function ft(){const t=document.getElementById("sc-name"),M=document.getElementById("sc-reg"),O=document.getElementById("sc-score"),S=document.getElementById("sc-percentage"),C=document.getElementById("sc-accuracy"),w=document.getElementById("sc-ref"),h=document.getElementById("sc-table-body"),d=localStorage.getItem("candidate_name")||"Registered Candidate",a=localStorage.getItem("reg_no")||new URLSearchParams(window.location.search).get("reg_no")||"",l=localStorage.getItem("candidate_id")||"",z=localStorage.getItem("active_exam_id")||"EX-1001";try{const r=await fetch("/api/v1/exams/settings",{headers:nt()});if(r.ok){const n=await r.json(),c=n.scorecard||{},f=document.getElementById("sc-agency"),g=document.getElementById("sc-title"),I=document.getElementById("sc-subhead-exam"),B=document.getElementById("sc-subhead-status"),$=document.getElementById("sc-controller-name"),k=document.getElementById("sc-controller-desig"),v=document.getElementById("sc-center-node"),A=document.getElementById("sc-footer-disclaimer");f&&(f.textContent=c.institution_name||n.institution_name||"SSE CBT PLATFORM"),g&&(g.textContent=c.document_title||(n.examination_title?`${n.examination_title} : Official Score Card`:"MCQ ASSESSMENT [ SSE CBT 2026 ] : Official Score Card")),I&&(I.textContent=n.examination_title||"MCQ Assessment 2026"),B&&c.subhead_status_text&&(B.textContent=c.subhead_status_text),$&&n.controller_name&&($.textContent=n.controller_name),k&&n.controller_designation&&(k.textContent=n.controller_designation),v&&n.test_venue_name&&(v.textContent=n.test_venue_name),A&&c.footer_disclaimer&&(A.textContent=c.footer_disclaimer);const T=document.getElementById("sc-score-banner");T&&(T.style.display=c.show_score_banner!==!1?"flex":"none");const N=document.getElementById("sc-metrics-grid-container");N&&(N.style.display=c.show_metrics_grid!==!1?"block":"none");const R=document.getElementById("sc-subject-breakdown-container");R&&(R.style.display=c.show_subject_breakdown!==!1?"block":"none");const U=document.getElementById("sc-question-review-container");U&&(U.style.display=c.show_question_review!==!1?"block":"none");const b=document.getElementById("sc-signature-container");b&&(b.style.display=c.show_signature_block!==!1?"flex":"none");const e=document.getElementById("sc-seal");e&&(e.style.display=c.show_seal!==!1?"flex":"none")}}catch{}const _=new URLSearchParams;a&&_.set("reg_no",a),l&&_.set("candidate_id",l);try{const r=await fetch(`/api/v1/exams/${encodeURIComponent(z)}/result?${_.toString()}`,{headers:nt()});if(r.ok){const n=await r.json();if(n&&n.status!=="pending"){ot(n,d,a);return}}}catch(r){console.warn("Could not fetch remote result, checking session storage",r)}const u=sessionStorage.getItem("latest_result");if(u)try{const r=JSON.parse(u);ot(r,d,a);return}catch{}t&&(t.textContent=d),M&&(M.textContent=a),O&&(O.textContent="-- / --"),S&&(S.textContent="--%"),C&&(C.textContent="N/A"),w&&(w.textContent="SSE-2026"),h&&(h.innerHTML='<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Awaiting authoritative submission data from Cloud DB...</td></tr>')}ft();
