import express from "express";
import { createClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

// Supabase Server Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
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

const loadNotes = (): Note[] => {
  try {
    if (fs.existsSync(NOTES_FILE)) return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
  } catch {
    console.log('Starting fresh notes');
  }
  return [];
};

const saveNotes = () => fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));

notes = loadNotes();

// Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// APIs
app.get('/api/test', (req, res) => res.json({ status: 'Supabase Ready!', notesCount: notes.length }));
app.get('/api/notes', (req, res) => res.json(notes));

app.post('/api/notes/like/:id', (req, res) => {
  const note = notes.find(n => n.id === req.params.id);
  if (note) {
    note.likes_count++;
    saveNotes();
    res.json({ success: true, likes_count: note.likes_count });
  } else res.status(404).json({ error: 'Note not found' });
});

// SUPABASE UPLOAD - Fixed Formidable
app.post('/api/notes/upload', (req, res) => {
  const Formidable = require('formidable');
  const form = new Formidable.IncomingForm({
    maxFileSize: 50 * 1024 * 1024, // 50MB
    multiples: false,
    filter: function ({ mimetype }) {
      return mimetype === 'application/pdf';
    },
    keepExtensions: true
  });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: err.message });

    const title = fields.title?.[0] || '';
    const description = fields.description?.[0] || '';
    const category = fields.category?.[0] || '';
    const is_premium = fields.is_premium?.[0] === 'true';
    const user_id = 'demo-user';
    
    const file = files.file?.[0];
    if (!file) return res.status(400).json({ error: 'No PDF file' });

    const buffer = await fs.promises.readFile(file.filepath);
    const timestamp = Date.now();
    const fileName = `${timestamp}-${crypto.randomUUID().slice(0,8)}.pdf`;
    const filePath = `${user_id}/${fileName}`;

    // Upload
    const { error: uploadError } = await supabase.storage
      .from('note')
      .upload(filePath, buffer, { contentType: 'application/pdf' });

    if (uploadError) {
      console.error(uploadError);
      return res.status(500).json({ error: 'Upload failed' });
    }

    // Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('note')
      .getPublicUrl(filePath);

    const newNote: Note = {
      id: Date.now().toString(),
      title, description, category,
      file_url: publicUrl,
      file_type: 'pdf',
      file_size: buffer.length,
      is_premium, user_id,
      likes_count: 0, downloads_count: 0, comments: [],
      created_at: new Date().toISOString()
    };

    notes.unshift(newNote);
    saveNotes();
    console.log('✅ SUPABASE UPLOAD:', publicUrl);

    res.json({ success: true, note: newNote, publicUrl, message: 'Uploaded to note bucket!' });
  });
});

// Vite
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_, res) => res.sendFile(path.join(process.cwd(), 'dist/index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 Supabase PDF Server http://localhost:' + PORT);
    console.log('📤 Bucket: note | Test: http://localhost:' + PORT + '/api/test');
  });
}

startServer();
