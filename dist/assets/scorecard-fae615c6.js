import"./modulepreload-polyfill-3cfb730f.js";/* empty css              */function z(){return localStorage.getItem("access_token")||"dev_test_token_do_not_use_in_prod"}function F(){return localStorage.getItem("tenant_id")||"00000000-0000-0000-0000-000000000001"}function P(){return{"Content-Type":"application/json",Authorization:`Bearer ${z()}`,"x-tenant-id":F()}}function O(e){return(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function M(e,E,h){var y,p,_,x,b,w,v,R;const g=document.getElementById("sc-name"),f=document.getElementById("sc-reg"),u=document.getElementById("sc-app-no"),l=document.getElementById("sc-exam"),o=document.getElementById("sc-score"),s=document.getElementById("sc-percentile"),I=document.getElementById("sc-ref"),r=document.getElementById("sc-table-body"),i=document.getElementById("sc-disq-banner"),n=document.getElementById("sc-disq-reason"),t=e.candidate_name||E,d=e.registration_number||h;if(g&&(g.textContent=t),f&&(f.textContent=d),u&&d){const c=d.replace(/[^0-9]/g,"");c&&(u.textContent=`260310${c.padStart(6,"0").slice(-6)}`)}if(l&&(l.textContent=e.exam_title||"MCQ ASSESSMENT [ SSE CBT 2026 ]"),I&&(I.textContent=e.reference||"SSE-2026"),e.disqualified===!0||e.status==="disqualified"){i&&(i.style.display="block"),n&&(n.textContent=e.reason||"This examination attempt was terminated under CBT Examination Security Regulations due to security malpractice/violations. All scores have been annulled."),o&&(o.textContent="0.0 (REVOKED)",o.style.color="#dc2626"),s&&(s.textContent="0.0 PR (REVOKED)",s.style.background="#ef4444"),r&&(r.innerHTML=`
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2.5rem 1.5rem; background: #fef2f2;">
                        <div style="font-size: 1.15rem; font-weight: 800; color: #b91c1c; margin-bottom: 0.5rem;">
                            EXAMINATION SCORES NULLIFIED &bull; CANDIDATE DISQUALIFIED
                        </div>
                        <div style="color: #991b1b; font-size: 0.92rem; max-width: 650px; margin: 0 auto; line-height: 1.6;">
                            <strong>Reason:</strong> ${O(e.reason||"Exceeded security infraction threshold.")}<br>
                            Under SSE CBT Statutory Regulations, candidate responses have been invalidated and no merit marks are awarded.
                        </div>
                    </td>
                </tr>
            `);return}if(i&&(i.style.display="none"),o){const c=typeof e.score=="number"?e.score:parseFloat(e.score)||0,m=typeof e.max_possible=="number"?e.max_possible:((y=e.scoring_details)==null?void 0:y.max_possible_score)||80,a=c>0?"+":"";o.textContent=`${a}${c} / ${m}`,o.style.color="#1e40af"}if(s&&(s.textContent=`${e.percentile||"0.0"} PR`,s.style.background="#10b981"),r){const c=(p=e.scoring_details)==null?void 0:p.subject_breakdown;if(c&&typeof c=="object"&&Object.keys(c).length>0){const m=Object.keys(c);let a="",T=0,k=0,A=0,N=0;m.forEach(q=>{const S=c[q],C=S.total||0,$=S.correct||0,L=S.incorrect||0,B=S.score||0;T+=C,k+=$,A+=L,N+=B;const H=C>0?Math.round($/C*100):0,U=B>0?"+":"";a+=`
                    <tr>
                        <td style="font-weight: 700; color: var(--text-heading);">${O(q)}</td>
                        <td>${C}</td>
                        <td style="color: #059669; font-weight: 700;">${$}</td>
                        <td style="color: #dc2626; font-weight: 700;">${L}</td>
                        <td style="font-family: var(--font-mono); font-weight: 700; color: ${B>=0?"#1e40af":"#dc2626"};">${U}${B}</td>
                        <td>
                            <span style="font-weight: 700; color: #047857;">${H}% Accuracy</span>
                        </td>
                    </tr>
                `});const D=typeof e.score=="number"?e.score:N,j=D>0?"+":"";a+=`
                <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid var(--border-color, #e2e8f0);">
                    <td style="color: #1e3a8a;">TOTAL AGGREGATE</td>
                    <td>${T||((_=e.scoring_details)==null?void 0:_.total_questions)||20}</td>
                    <td style="color: #059669;">${k||((x=e.scoring_details)==null?void 0:x.correct_count)||0}</td>
                    <td style="color: #dc2626;">${A||((b=e.scoring_details)==null?void 0:b.incorrect_count)||0}</td>
                    <td style="font-family: var(--font-mono); color: #1e40af; font-size: 1.05rem;">${j}${D}</td>
                    <td>
                        <span class="badge-pill" style="background: #ecfdf5; color: #047857; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 4px;">
                            ${e.percentile||"0.0"} PR
                        </span>
                    </td>
                </tr>
            `,r.innerHTML=a}else{const m=typeof e.score=="number"?e.score:0,a=m>0?"+":"";r.innerHTML=`
                <tr style="background: #f8fafc; font-weight: 800;">
                    <td style="color: #1e3a8a;">Comprehensive Assessment Paper</td>
                    <td>${((w=e.scoring_details)==null?void 0:w.total_questions)||20}</td>
                    <td style="color: #059669;">${((v=e.scoring_details)==null?void 0:v.correct_count)||0}</td>
                    <td style="color: #dc2626;">${((R=e.scoring_details)==null?void 0:R.incorrect_count)||0}</td>
                    <td style="font-family: var(--font-mono); color: #1e40af;">${a}${m}</td>
                    <td>
                        <span class="badge-pill" style="background: #ecfdf5; color: #047857; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: 4px;">
                            ${e.percentile||"0.0"} PR
                        </span>
                    </td>
                </tr>
            `}}}async function G(){const e=document.getElementById("sc-name"),E=document.getElementById("sc-reg"),h=document.getElementById("sc-score"),g=document.getElementById("sc-percentile"),f=document.getElementById("sc-ref"),u=document.getElementById("sc-table-body"),l=localStorage.getItem("candidate_name")||"Registered Candidate",o=localStorage.getItem("reg_no")||new URLSearchParams(window.location.search).get("reg_no")||"",s=localStorage.getItem("candidate_id")||"",I=localStorage.getItem("active_exam_id")||"EX-1001";try{const n=await fetch("/api/v1/exams/settings",{headers:P()});if(n.ok){const t=await n.json(),d=document.getElementById("sc-agency"),y=document.getElementById("sc-title"),p=document.getElementById("sc-subhead-exam"),_=document.getElementById("sc-controller-name"),x=document.getElementById("sc-controller-desig"),b=document.getElementById("sc-center-node");d&&t.institution_name&&(d.textContent=t.institution_name),y&&t.examination_title&&(y.textContent=`${t.examination_title} : Official Score Card`),p&&t.examination_title&&(p.textContent=t.examination_title),_&&t.controller_name&&(_.textContent=t.controller_name),x&&t.controller_designation&&(x.textContent=t.controller_designation),b&&t.test_venue_name&&(b.textContent=t.test_venue_name)}}catch{}const r=new URLSearchParams;o&&r.set("reg_no",o),s&&r.set("candidate_id",s);try{const n=await fetch(`/api/v1/exams/${encodeURIComponent(I)}/result?${r.toString()}`,{headers:P()});if(n.ok){const t=await n.json();if(t&&t.status!=="pending"){M(t,l,o);return}}}catch(n){console.warn("Could not fetch remote result, checking session storage",n)}const i=sessionStorage.getItem("latest_result");if(i)try{const n=JSON.parse(i);M(n,l,o);return}catch{}e&&(e.textContent=l),E&&(E.textContent=o),h&&(h.textContent="-- / --"),g&&(g.textContent="N/A"),f&&(f.textContent="SSE-2026"),u&&(u.innerHTML='<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Awaiting authoritative submission data from Cloud DB...</td></tr>')}G();
