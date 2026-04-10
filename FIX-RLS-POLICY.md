# Fix Supabase "notes" Bucket RLS (Upload Error)

## Step-by-Step:

**1. Supabase Dashboard:**
```
Storage → "notes" → Settings (⚙️) → Policies
```

**2. CREATE POLICY:**
```
Name: allow_service_role_uploads

Target roles: service_role

@ INSERT → CHECK: true  
@ SELECT → USING: true
@ UPDATE → USING: true
@ DELETE → USING: true

Expression: `true`
```

**3. Or DISABLE RLS:**
```
Settings → Danger Zone → "Don't use RLS" → ENABLE
```

**4. Test:**
```
localhost:3000 → PDF upload → ✅ "UPLOADED TO notes BUCKET"
```

**Why?** Service_role key bypasses auth RLS but bucket policies override.

**Done → Uploads work!**
