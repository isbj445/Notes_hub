import express from "express";
import multer from "multer";
import { createClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import crypto from "crypto";
import fs from "fs";
import dotenv from "dotenv";
import Razorpay from 'razorpay';

// Load UTF-8 env reliably (the repo's .env is UTF-16LE in this workspace)
dotenv.config({ path: '.env.utf8' });



const app = express();
const PORT = 3000;

// Supabase
// Note: In Vite, client env vars start with VITE_. But this file is Node (server),
// so we still read them from process.env populated by dotenv.
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Razorpay
// The repo uses `.evn` / `.env.utf8` with `VITE_RAZORPAY_KEY_ID` (frontend-safe).
// Map it to backend variable names for Razorpay initialization.
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

// If key secret came from `.evn` it may be present, but dotenv sometimes doesn't parse/update it correctly.
// Fallback: read from VITE-prefixed/ parsed values (repo uses `.evn`).
const razorpayKeySecretFallback = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;


const razorpay = (razorpayKeyId && razorpayKeySecret)
  ? new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret })
  : null;

// Dev-safe: ensure Razorpay secrets are loaded even if the env filepath is non-standard.
// Note: server-final-fixed.ts already loads `.env.utf8`.
try {
  // If either key is missing, attempt repo's `.evn` (this workspace's env file).
  if ((!razorpayKeyId || !razorpayKeySecret)) {
    dotenv.config({ path: '.evn' });
  }
} catch {}




// In dev we allow running without Supabase keys.
// Upload routes will return 503 when Supabase is not configured.
let supabase: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
} else {
  console.warn('⚠️ Missing Supabase keys in .env — running in dev-only mode (uploads disabled).');
}


// Multer memory storage - PDF/PPT/Word
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const mime = file.mimetype;
    if (mime === 'application/pdf' || 
        mime.includes('word') || 
        mime.includes('powerpoint')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

interface Note {
  id: string;
  title: string;
  description: string;
  category: string;
  file_url: string;
  file_type: string;
  file_size: number;
  is_premium: boolean;
  user_id: string;
  likes_count: number;
  downloads_count: number;
  comments: any[];
  created_at: string;
}

const NOTES_FILE = 'notes.json';
let notes: Note[] = [];

const loadNotes = () => {
  try {
    if (fs.existsSync(NOTES_FILE)) return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
  } catch {}
  return [];
};

const saveNotes = () => fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));

notes = loadNotes();

// Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Ensure Razorpay webhooks/checkout can call these routes from the browser
// (CORS already enabled for http://localhost:3000 above)


// API Routes
app.get('/api/test', (_, res) => res.json({
  status: supabase ? 'Supabase "notes" Ready!' : 'Dev mode: Supabase not configured',
  notesCount: notes.length,
  supabaseConfigured: Boolean(supabase)
}));
app.get('/api/notes', (_, res) => res.json(notes));

// Razorpay Standard Checkout
// STEP 1: Create order
app.post('/api/create-order', async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(401).json({ error: 'Razorpay not configured' });
    }

    const amount = Number(req.body?.amount);
    const currency = (req.body?.currency ?? 'INR') as string;
    const receipt = (req.body?.receipt ?? `receipt_${Date.now()}`) as string;

    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({ error: 'Invalid amount. Minimum is 100 paise.' });
    }

    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt
    });

    return res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    return res.status(500).json({ error: error?.message || 'Server error' });
  }
});

// STEP 3: Verify signature
app.post('/api/verify-payment', async (req, res) => {
  try {
    if (!razorpayKeySecret) {
      return res.status(401).json({ error: 'Razorpay not configured' });
    }

    const payment_id = req.body?.razorpay_payment_id as string | undefined;
    const order_id = req.body?.razorpay_order_id as string | undefined;
    const signature = req.body?.razorpay_signature as string | undefined;

    if (!payment_id || !order_id || !signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    const payload = `${order_id}|${payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: 'Signature mismatch' });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return res.status(500).json({ error: error?.message || 'Server error' });
  }
});



// LIKE
app.post('/api/notes/like/:id', (req, res) => {
  const note = notes.find(n => n.id === req.params.id);
  if (note) {
    note.likes_count++;
    saveNotes();
    res.json({ success: true, likes_count: note.likes_count });
  } else res.status(404).json({ error: 'Note not found' });
});

// COMMENTS (dev-safe)
app.post('/api/notes/:id/comments', (req, res) => {
  const note = notes.find(n => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  const text = (req.body?.text ?? '') as string;
  if (!text.trim()) return res.status(400).json({ error: 'Comment text is required' });

  const newComment = {
    id: Date.now().toString(),
    user: 'demo-user',
    text,
    created_at: new Date().toISOString()
  };

  note.comments = Array.isArray(note.comments) ? note.comments : [];
  note.comments.push(newComment);
  saveNotes();

  res.json({ success: true, comment: newComment });
});

// SUMMARIZE (dev-safe mock)
app.post('/api/notes/:id/summarize', async (req, res) => {
  const note = notes.find(n => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  const ai_summary =
    'This is an AI-generated summary of the note. It covers the key concepts and main takeaways from the document. (Mocked for preview)';

  (note as any).ai_summary = ai_summary;
  saveNotes();

  res.json({ success: true, ai_summary });
});

// DOWNLOAD COUNT (dev-safe)
app.get('/api/notes/download/:id', (req, res) => {
  const note = notes.find(n => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });

  note.downloads_count++;
  saveNotes();

  res.json({ success: true, downloads_count: note.downloads_count });
});

// **SUPABASE "notes" BUCKET UPLOAD** - Works with Frontend FormData!
app.post('/api/notes/upload', upload.single('file'), async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase not configured (missing env vars). Upload disabled.' });
    }

    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const title = req.body.title as string;

    const description = req.body.description as string;
    const category = req.body.category as string;
    const is_premium = req.body.is_premium === 'true';
    const user_id = 'demo-user';

    // Filename with original extension
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const fileName = `${timestamp}-${crypto.randomUUID().slice(0, 8)}${ext}`;
    const filePath = `${user_id}/${fileName}`;

    // Upload to "notes" bucket
    const { error: uploadError } = await supabase.storage
      .from('notes')  // ← Your bucket "notes"
      .upload(filePath, file.buffer, { 
        contentType: file.mimetype,
        upsert: false 
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('notes')
      .getPublicUrl(filePath);

    const newNote: Note = {
      id: Date.now().toString(),
      title, description, category,
      file_url: publicUrl,
      file_type: file.mimetype.split('/')[1] || 'pdf',
      file_size: file.size,
      is_premium, user_id,
      likes_count: 0, downloads_count: 0, comments: [],
      created_at: new Date().toISOString()
    };

    notes.unshift(newNote);
    saveNotes();

    console.log('✅ UPLOADED TO "notes" BUCKET:', publicUrl);
    res.json({ 
      success: true, 
      note: newNote, 
      publicUrl,
      message: `Uploaded ${file.originalname} → notes bucket!`
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Vite dev server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_, res) => res.sendFile(path.join(process.cwd(), 'dist/index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 SmartNote Supabase Server http://localhost:' + PORT);
    console.log('📁 Storage: notes bucket');
    console.log('🧪 Test: http://localhost:' + PORT + '/api/test');
    console.log('📤 Upload: http://localhost:3000 (app) or supabase-upload-test.html');
  });
}

startServer();
