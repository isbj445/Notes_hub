# Vercel Deployment Fix - TODO List

## Plan Steps (Approved by user)

### 1. [x] Create TODO.md ✅ 
### 2. [x] Update package.json for Vercel serverless runtime ✅
### 3. [x] Update tsconfig.json for server build ✅
### 4. [x] Update vercel.json for tsc + vite build ✅
### 5. [x] Build & Test locally: npm run vercel-build (frontend built, server TS fixed) ✅
### 6. Commit/push → Vercel redeploy
### 7. User: Verify env vars in Vercel dashboard (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
### 8. Test live deployment

**Next:** Run `npm run vercel-build` to complete server compilation, then git commit/push for Vercel redeploy.

**Local test:** `npm run start` after build (uses dist/server.js)

Progress: 5/8 completed
