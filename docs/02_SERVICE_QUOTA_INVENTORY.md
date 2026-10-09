# Service & Quota Inventory

## 1. Frontend & Backend Hosting: Vercel Free (Hobby)
- **Purpose**: Host static assets (HTML/CSS/JS) and FastAPI backend (Serverless Functions).
- **Free Allowance**: 100GB bandwidth/month, Serverless function execution (10s max duration, 1024MB RAM).
- **Limitations**: Max 10s execution. Cold starts possible.
- **Alternative**: Render Free Tier or self-hosted if duration exceeds limits.

## 2. Database: Supabase (PostgreSQL) Free Tier
- **Purpose**: Core authoritative state, RBAC, tenant isolation.
- **Free Allowance**: 500MB DB space, 5GB bandwidth, 50 active connections.
- **Limitations**: Pauses after 1 week of inactivity (need to prevent by usage or active script). 
- **Alternative**: Neon PostgreSQL Free tier.

## 3. Authentication: Supabase Auth
- **Purpose**: Identity and JWT generation.
- **Free Allowance**: 50,000 MAU (Monthly Active Users).
- **Limitations**: Rate limits on sign-ups / password resets.

## 4. Realtime: Supabase Realtime
- **Purpose**: Live exam dashboard, command center updates.
- **Free Allowance**: 200 concurrent connections, 2 million messages/month.
- **Limitations**: Strict concurrent connection limit. Must multiplex or gracefully degrade to polling if limit reached.

## 5. Storage: Supabase Storage
- **Purpose**: Question images, profile pictures.
- **Free Allowance**: 1GB storage.
- **Limitations**: 50MB max file size.

## 6. Email: Optional / Resend Free Tier
- **Purpose**: Password resets, candidate invites.
- **Free Allowance**: 3,000 emails/month (Resend).
- **Limitations**: Max 100 emails/day.
- **Alternative**: Console logging in development mode.
