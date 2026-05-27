# TODO - Supabase Auth/RLS Fix

## Done
- [x] Update Supabase client init (`src/lib/supabase.ts`) with session persistence.
- [x] Harden AuthContext + add debug logs.
- [x] Guard admin toggle flow with session/user checks + debug logs.


## To do
- [x] Update `src/lib/supabase.ts` to enable `persistSession`, `autoRefreshToken`, `detectSessionInUrl`.

- [ ] Update `src/context/AuthContext.tsx`:
  - [x] Add debug logs (session + user.id)
  - [x] Ensure initial `getSession()` completes deterministically
  - [x] Ensure `onAuthStateChange` updates user/session/profile consistently
- [ ] Update `src/pages/DashboardPage.tsx`:
  - [x] Add guards before admin role update (ensure `session` and `user.id` exist)
  - [x] Add debug logs around toggle

- [x] Verify logic for `/admin` unlock based on fresh `profile.role`.

- [ ] Run app and manually test: login → auth.uid equivalent not null → Make me Admin works → `/admin` unlocks.

