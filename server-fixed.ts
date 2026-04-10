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

// Supabase Server Client (service_role for uploads)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
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

const loadNotes = (): Note[] => {
  try {
    if (fs.existsSync(NOTES_FILE)) {
      return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8'));
    }
  } catch (error) {
    console.log('No existing notes file, starting fresh');
  }
  return [];
};

const saveNotes = () => {
  try {
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
  } catch (error) {
    console.error('Error saving notes:', error);
  }
};

notes = loadNotes();

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));  
app.use(express.static('public'));

// TEST API
app.get('/api/test', (req, res) => {
  res.json({ status: 'Server Perfect! Supabase Storage Ready', notesCount: notes.length });
});

// GET ALL NOTES
app.get('/api/notes', (req, res) => {
  res.json(notes);
});

// SUPABASE STORAGE UPLOAD WITH FORMIDABLE (supports FormData)
app.post('/api/notes/upload', async (req, res) => {
  const formidable = (await import('formidable')).default;
    const form = formidable.default({ 
    multiples: false, 
    maxFileSize: 10 * 1024 * 1024,
    filter: ({ mimetype }) => {
      return mimetype && (
        mimetype.startsWith('application/pdf') || 
        mimetype.startsWith('application/vnd.openxmlformats') || 
        mimetype.startsWith('application/msword') ||
        mimetype.startsWith('application/vnd.ms-powerpoint')
      );
    }
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: 'File parse error: ' + err.message });
    }

    const title = (Array.isArray(fields.title) ? fields.title[0] : fields.title) as string;
    const description = (Array.isArray(fields.description) ? fields.description[0] : fields.description) as string;
    const category = (Array.isArray(fields.category) ? fields.category[0] : fields.category) as string;
    const is_premium = (Array.isArray(fields.is_premium) ? fields.is_premium[0] : fields.is_premium) as string;
    const user_id = 'demo-user'; // TODO: from auth

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file || !file.filepath) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read file buffer
    const buffer = await fs.promises.readFile(file.filepath);
    const ext = path.extname(file.originalFilename || 'pdf');
    const fileName = crypto.randomUUID() + ext;
    const filePath = `${user_id}/${fileName}`;

    // Upload to Supabase
    const { data: uploadData, error } = await supabase.storage
      .from('notes')
      .upload(filePath, buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ error: 'Upload failed: ' + error.message });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('notes')
      .getPublicUrl(filePath);

    const newNote: Note = {
      id: Date.now().toString(),
      title,
      description,
      category,
      file_url: publicUrl,
      file_type: file.mimetype.split('/')[1],
      file_size: buffer.length,
      is_premium: is_premium === 'true',
      user_id,
      likes_count: 0,
      downloads_count: 0,
      comments: [],
      created_at: new Date().toISOString()
    };

    notes.unshift(newNote);
    saveNotes();

    console.log('✅ SUPABASE UPLOAD:', publicUrl);
    
    res.json({ 
      success: true, 
      note: newNote,
      message: `Uploaded to Supabase: ${file.originalFilename || 'file'}`
    });
  });
});

// LIKE NOTE
app.post('/api/notes/:id/like', (req, res) => {
  const note = notes.find(n => n.id === req.params.id);
  if (note) {
    note.likes_count += 1;
    saveNotes();
    res.json({ success: true, likes_count: note.likes_count });
  } else {
    res.status(404).json({ error: 'Note not found' });
  }
});

// Vite dev server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => res.sendFile(path.join(process.cwd(), 'dist/index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\\n🚀 SmartNote SUPABASE STORAGE Server!`);
    console.log(`🌐 App: http://localhost:${PORT}`);
    console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
    console.log(`📦 Bucket: notes (Supabase)`);
  });
}

startServer();

