# SmartNote - AI-Powered Note Sharing System

A full-stack SaaS platform for students to share, discover, and download study notes.

## 🚀 Tech Stack
- **Frontend**: React.js, Tailwind CSS, Framer Motion, Axios
- **Backend**: Node.js, Express.js
- **Database & Auth**: Supabase (PostgreSQL + Email OTP)
- **File Storage**: Supabase Storage
- **Payments**: Razorpay

## 🛠️ Supabase Setup Guide

### 1. Database Tables
Run the following SQL in your Supabase SQL Editor:

```sql
-- 1. Create Users Table
CREATE TABLE users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'free', -- 'free' or 'premium'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create Notes Table
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT, -- 'pdf', 'ppt', 'doc'
  user_id UUID REFERENCES users(id) NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
-- Anyone can read notes
CREATE POLICY "Anyone can view notes" ON notes FOR SELECT USING (true);
-- Authenticated users can insert notes
CREATE POLICY "Auth users can insert notes" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 2. Storage Bucket
1. Go to **Storage** in Supabase.
2. Create a new bucket named `notes`.
3. Set it to **Public**.
4. Add a policy: "Allow authenticated uploads" and "Allow public read".

### 3. Authentication
1. Go to **Authentication** > **Providers**.
2. Enable **Email**.
3. Disable **Confirm Email** (optional for testing) or set up your SMTP.
4. Enable **OTP** (Magic Link).

## 💳 Razorpay Setup
1. Create a Razorpay account.
2. Generate **Key ID** and **Key Secret** from Settings > API Keys.
3. Add them to your `.env` file.

## 📦 Installation & Setup

1. **Clone & Install**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Create a `.env` file based on `.env.example`.

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 🚢 Deployment Guide

### Frontend (Vercel)
1. Connect your GitHub repo to Vercel.
2. Add all `VITE_` environment variables.
3. Set build command: `npm run build`.
4. Set output directory: `dist`.

### Backend (Render/Railway)
1. Connect repo to Render.
2. Set build command: `npm install`.
3. Set start command: `node server.ts` (or use a build step to compile TS).
4. Add all backend environment variables (Supabase Service Key, Razorpay Secret).
