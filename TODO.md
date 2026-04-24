# TODO - Fix Vercel Browse/Notes Listing Issue

## Problem
- Upload works (shows in Dashboard/History) ✓
- Browse/Notes Listing page shows nothing ✗

## Root Causes
1. UploadPage saves to Supabase DB, but NotesListingPage fetches from local `notes.json` (not persistent on Vercel)
2. Vercel serverless has ephemeral filesystem - local files don't persist
3. UploadPage sets `status: 'pending'` but NotesListingPage filters only `approved` notes

## Fix Steps
- [x] Step 1: Fix NotesListingPage - Use Supabase direct query instead of `/api/notes`
- [x] Step 2: Fix NotesListingPage - Allow uploader to see their own pending notes
- [x] Step 3: Fix UploadPage - Set `status: 'approved'` for immediate visibility without admin approval
- [x] Step 4: Remove broken `/api/notes/trending` call (endpoint doesn't exist)

## Status: COMPLETED

