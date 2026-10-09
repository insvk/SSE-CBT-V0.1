console.log('SIMATS CBT Frontend Initialized');

async function initializeApp() {
    try {
        const p = document.querySelector('p:last-of-type');
        if (p) p.textContent = "Connecting to APEX OMEGA Core (Vercel Serverless)...";
        
        const res = await fetch('/api/v1/health');
        if (res.ok) {
            if (p) p.textContent = "Connection established. Redirecting to login...";
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 800);
        } else {
            throw new Error("Backend not ready");
        }
    } catch (err) {
        console.error(err);
        const p = document.querySelector('p:last-of-type');
        if (p) {
            p.textContent = "Failed to connect to backend. Please check Vercel Logs.";
            p.setAttribute("style", "color: red; font-weight: bold;");
        }
    }
}

initializeApp();
