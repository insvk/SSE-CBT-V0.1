# SSE CBT PLATFORM V0.1 - Architecture Document

## Overview
SIMATS ENGINEERING CBT PLATFORM V0.1 is an enterprise-grade CBT examination SaaS built from scratch.

## Technology Stack
- **Frontend**: HTML5, CSS3 (Vanilla/Design System), Modern JavaScript/TypeScript. Hosted on Vercel Free.
- **Backend**: Python 3.10+ with FastAPI. Hosted on Vercel Serverless Functions.
- **Database**: PostgreSQL (Supabase Free).
- **Authentication**: Supabase Auth.
- **Realtime**: Supabase Realtime (WebSockets).
- **Storage**: Supabase Storage for assets.
- **High-Performance Utilities**: C11/C17 for bulk data processing / report generation where serverless timeouts apply (deployed as WASM or native binaries depending on final hosting environment execution capabilities).
- **Source Control**: GitHub Free.

## Separation of Responsibilities
1. **Browser Client**: Handles UI, candidate experience, real-time feedback. NEVER trusted with authorization or authoritative state.
2. **Backend API**: Validates everything, enforces deadlines, interacts with DB, orchestrates data.
3. **Database (Supabase PostgreSQL)**: Authoritative state. RLS policies ensure strict tenant isolation.
4. **Authentication (Supabase)**: JWT generation and session management.

## Free-Tier Constraints
- Avoid heavy long-running processes on API. 
- Use DB-backed job queues for tasks, but rely on synchronous FastAPI response for critical path (e.g. answer saving).
- Vercel Serverless Function limit: 10 seconds execution time on free tier. Operations must be fast.
- Supabase connection limits: Use connection pooling via Supabase IPv4 connection pooler.
