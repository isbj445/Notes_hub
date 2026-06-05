-- Database Schema for SmartNote Application

-- ==========================================
-- 1. Users Table
-- ==========================================
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'free' CHECK (role IN ('free', 'premium', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Users
-- Users can read their own profile
CREATE POLICY "Users can view their own profile" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users" 
  ON public.users FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id);


-- ==========================================
-- 2. Notes Table
-- ==========================================
CREATE TABLE public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  -- Deprecated: per-note unlock intentionally not stored in notes json.
  -- Use note_purchases table instead.

  description TEXT,
  category TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT false,
  price_inr INTEGER,
  -- price is used only when is_premium=true
  -- set via UploadPage UI
  -- examples: 99, 199, 499

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,
  ai_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Notes
-- Anyone can view approved notes
CREATE POLICY "Anyone can view approved notes" 
  ON public.notes FOR SELECT 
  USING (status = 'approved');

-- Users can view their own notes regardless of status
CREATE POLICY "Users can view their own notes" 
  ON public.notes FOR SELECT 
  USING (auth.uid() = user_id);

-- Admins can view all notes
CREATE POLICY "Admins can view all notes" 
  ON public.notes FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Authenticated users can insert notes
CREATE POLICY "Authenticated users can upload notes" 
  ON public.notes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Admins can update notes (e.g., approve/reject)
CREATE POLICY "Admins can update notes" 
  ON public.notes FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can delete their own notes
CREATE POLICY "Users can delete their own notes" 
  ON public.notes FOR DELETE 
  USING (auth.uid() = user_id);

-- Admins can delete any note
CREATE POLICY "Admins can delete any note" 
  ON public.notes FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ==========================================
-- 3. Per-note purchases (Razorpay unlock history)
-- ==========================================
CREATE TABLE public.note_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
  amount_inr INTEGER NOT NULL CHECK (amount_inr > 0),
  razorpay_payment_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.note_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view their own purchases" 
  ON public.note_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own purchases
CREATE POLICY "Users can create their own purchases" 
  ON public.note_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ==========================================
-- 4. Comments Table
-- ==========================================
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Comments
-- Anyone can view comments
CREATE POLICY "Anyone can view comments" 
  ON public.comments FOR SELECT 
  USING (true);

-- Authenticated users can insert comments
CREATE POLICY "Authenticated users can insert comments" 
  ON public.comments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments" 
  ON public.comments FOR DELETE 
  USING (auth.uid() = user_id);

-- Admins can delete any comment
CREATE POLICY "Admins can delete any comment" 
  ON public.comments FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );
