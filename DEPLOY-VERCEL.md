# Vercel Deploy Guide (Upload Fixed!)

## 1. Env Vars (Vercel Dashboard)
```
Settings → Environment Variables
SUPABASE_URL=https://isdjtpfqvgdvpfqvohav.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 2. Files Ready
```
✅ vercel.json
✅ package-vercel-fixed.json (use this)
✅ server-final-fixed.ts (production server)
```

## 3. GitHub + Deploy
```
git add .
git commit -m "Vercel deploy + Supabase storage"
git push

Vercel → Import GitHub repo → Deploy
```

## 4. Test Live
```
your-app.vercel.app → Upload PDF → Supabase storage success!
```

**Vercel env vars = upload fixed!** 🚀
