import"./modulepreload-polyfill-3cfb730f.js";/* empty css              */const s=[{id:"Q-100",text:"What is the time complexity of binary search?",type:"MCQ Single",subject:"Computer Science",diff:"Medium",status:"Approved"},{id:"Q-101",text:"State the first law of thermodynamics.",type:"Descriptive",subject:"Physics",diff:"Hard",status:"Draft"}],a=document.getElementById("q-list");s.forEach(t=>{const e=document.createElement("div");e.className="q-item",e.innerHTML=`
        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
            <span style="color: var(--text-muted); font-weight: 600;">${t.id}</span>
            <span style="color: ${t.status==="Approved"?"var(--success)":"var(--warning)"}; font-weight: 600;">${t.status}</span>
        </div>
        <div style="font-size: 1.125rem; font-weight: 500;">${t.text}</div>
        <div class="q-tags">
            <span class="tag">${t.type}</span>
            <span class="tag">${t.subject}</span>
            <span class="tag">${t.diff}</span>
        </div>
    `,a.appendChild(e)});
