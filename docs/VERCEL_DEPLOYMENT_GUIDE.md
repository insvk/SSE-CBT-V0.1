# VERCEL CLOUD DEPLOYMENT GUIDE (PROJECT APEX OMEGA)

This guide provides the exact step-by-step instructions to deploy the APEX OMEGA Examination SaaS to Vercel. 

The repository is already configured with `vercel.json` to handle the dual-architecture: **Static HTML/Vite Frontend** and **Serverless FastAPI Python Backend**.

## Prerequisites
1. A GitHub account with the code pushed to `https://github.com/insvk/SSE-CBT-V0.1`.
2. A [Vercel](https://vercel.com/) account (Free Hobby tier is sufficient).
3. A [Supabase](https://supabase.com/) account with your database schemas executed.

---

## Step 1: Import the Repository into Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click the **"Add New..."** button and select **"Project"**.
3. Under the "Import Git Repository" section, connect your GitHub account if you haven't already.
4. Search for `insvk/SSE-CBT-V0.1` and click **"Import"**.

---

## Step 2: Configure the Build Settings
Vercel will try to auto-detect the framework. Make sure the settings look like this:

* **Project Name**: `apex-omega-cbt` (or whatever you prefer)
* **Framework Preset**: `Other` (Do NOT select Vite or Python. Vercel will automatically read the `vercel.json` file we created at the root of the repo).
* **Root Directory**: `./`
* **Build Command**: `npm run build` (This builds the frontend).
* **Install Command**: `npm install` 
* **Output Directory**: `dist` (or leave default if Vercel reads it from package.json).

---

## Step 3: Inject Supabase Environment Variables (CRITICAL)
Before you click Deploy, expand the **"Environment Variables"** section. If you deploy without these, the Python backend will crash or fallback to mock mode.

Add the following keys exactly as they appear here. (You can find your real values in your local `.env` file or the Supabase API Settings dashboard):

| Key | Value (Example) | Notes |
| :--- | :--- | :--- |
| `SUPABASE_URL` | `https://xqiycolwfclfgamkiibt.supabase.co` | Your Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Your Supabase Service Role Secret |
| `SUPABASE_JWT_SECRET` | `rzU3+YDu...` | Your Supabase JWT Secret |
| `ENV` | `production` | **Crucial:** Tells the backend to enforce strict JWT security and disable mock logins. |

Click **"Add"** for each variable.

---

## Step 4: Deploy
1. Click the large blue **"Deploy"** button.
2. Vercel will now execute the build phases:
   - It will install the Python dependencies (`fastapi`, `supabase`, etc.) from `backend/requirements.txt` and package them into AWS Lambda serverless functions.
   - It will build the HTML/TS static assets.
3. Wait approximately 2-3 minutes for the build to finish.

---

## Step 5: Verification & Post-Deployment Checklist

Once deployed, click **"Continue to Dashboard"** and then **"Visit"** to open your live URL (e.g., `https://apex-omega-cbt.vercel.app`).

### Verify Frontend
- [ ] Navigate to `/login.html` and ensure the page loads correctly.
- [ ] Navigate to `/admin.html` and verify the CSS styling is intact.

### Verify Backend Serverless Functions
- [ ] Navigate to `/api/v1/health` in your browser. You should see `{"status": "ok", "message": "SIMATS CBT Backend is running."}`.
- [ ] Try creating a Candidate via the Admin UI. If it succeeds, the Python serverless function successfully communicated with your Supabase PostgreSQL database.

---

## Troubleshooting

**Error 500 on `/api/v1/...` routes:**
* Go to the Vercel Dashboard -> **Logs**. Filter by "Error".
* Usually, this means an environment variable is missing, or the Python package size exceeded the 250MB limit (which shouldn't happen with our current lightweight `requirements.txt`).

**Data is not saving / 401 Unauthorized:**
* Ensure `ENV=production` is set in Vercel.
* Double-check that your `SUPABASE_JWT_SECRET` is correct. If the signature doesn't match, the backend will reject the request.
