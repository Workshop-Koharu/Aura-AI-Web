# Aura AI Web

Next.js App Router web foundation for Aura AI.

## Requirements
- Node.js 20.9+ (Node.js 22 recommended)
- npm

## Local development
```bash
npm install
cp .env.example .env.local
npm run dev
```
Open http://localhost:3000.

## Environment
Set `NEXT_PUBLIC_API_BASE_URL` to the public HTTPS API base URL. This variable is visible to browser clients; never put API keys or tunnel tokens in it.

## Deployment
Import this repository in Vercel, use the repository root as Root Directory, and use the standard Next.js build. Add `aura.koharu.live` under Project → Settings → Domains after deployment. Configure DNS from the exact values Vercel displays.
