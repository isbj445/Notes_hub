 import express from "express";
import multer from "multer";
import { createClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import crypto from "crypto";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase keys in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Multer memory storage (no disk writes)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('PDF only'), false);
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

// API Routes
app.get('/api/test', (_, res) => res.json({ status: 'Supabase "note" Ready!', notesCount: notes.length }));
app.get('/api/notes', (_, res) => res.json(notes));

// UPLOAD TO SUPABASE "note" bucket
app.post('/api/notes/upload', upload.single('file'), async (req, res) => {
  try {
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: 'No PDF file' });

    const title = req.body.title as string;
    const description = req.body.description as string;
    const category = req.body.category as string;
    const is_premium = req.body.is_premium === 'true';
    const user_id = 'demo-user';

    // Unique timestamp filename
    const timestamp = Date.now();
    const fileName = `${timestamp}-${crypto.randomUUID().slice(0, 8)}.pdf`;
    const filePath = `${user_id}/${fileName}`;

    // Upload buffer to Supabase "note" bucket
    const { error: uploadError } = await supabase.storage
      .from('note')
      .upload(filePath, file.buffer, { 
        contentType: 'application/pdf',
        upsert: false 
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ error: 'Supabase upload failed' });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('note')
      .getPublicUrl(filePath);

    const newNote: Note = {
      id: Date.now().toString(),
      title, description, category,
      file_url: publicUrl,
      file_type: 'pdf',
      file_size: file.size,
      is_premium, user_id,
      likes_count: 0, downloads_count: 0, comments: [],
      created_at: new Date().toISOString()
    };

    notes.unshift(newNote);
    saveNotes();

    console.log('✅ SUPABASE "note" UPLOAD:', publicUrl);
    res.json({ 
      success: true, 
      note: newNote, 
      publicUrl,
      message: `PDF uploaded to note bucket!`
    });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notes/like/:id', (req, res) => {
  const note = notes.find(n => n.id === req.params.id);
  if (note) {
    note.likes_count++;
    saveNotes();
    res.json({ success: true, likes_count: note.likes_count });
  } else res.status(404).json({ error: 'Note not found' });
});

// Vite dev
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_, res) => res.sendFile(path.join(process.cwd(), 'dist/index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 Supabase "note" Server: http://localhost:' + PORT);
    console.log('📁 Bucket: note');
    console.log('🧪 Test API: http://localhost:' + PORT + '/api/test');
  });
}

startServer();
