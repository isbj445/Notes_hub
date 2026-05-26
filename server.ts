import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

import { Request } from 'express';
interface MulterRequest extends Request {
  file: any;
}

const app = express();
const PORT = 3000;

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

// Multer setup - Real file uploads to uploads folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = crypto.randomUUID() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('application/pdf') || 
        file.mimetype.startsWith('application/vnd.openxmlformats-officedocument') ||
        file.mimetype.startsWith('application/msword')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, PPT allowed'), false);
    }
  }
});

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// TEST API
app.get('/api/test', (req, res) => {
  res.json({ status: 'Server Perfect!', notesCount: notes.length });
});

// GET ALL NOTES
app.get('/api/notes', (req, res) => {
  res.json(notes);
});

// REAL FILE UPLOAD + METADATA
app.post('/api/notes/upload', upload.single('file'), (req: MulterRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const newNote: Note = {
    id: Date.now().toString(),
    title: req.body.title as string,
    description: req.body.description as string,
    category: req.body.category as string,
    file_url: `/uploads/${req.file.filename}`,  // Dynamic real URL
    file_type: req.file.mimetype.split('/')[1],
    file_size: req.file.size,
    is_premium: (req.body.is_premium === 'true'),
    user_id: 'demo-user',
    likes_count: 0,
    downloads_count: 0,
    comments: [],
    created_at: new Date().toISOString()
  };

notes.unshift(newNote);
saveNotes();
  console.log('✅ REAL UPLOAD:', newNote.file_url);
  
  res.json({ 
    success: true, 
    note: newNote,
    message: `Uploaded ${req.file.originalname} → ${newNote.file_url}`
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

// Vite dev server integration
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
    console.log(`\\n🚀 SmartNote REAL PDF Upload Server!`);
    console.log(`🌐 App: http://localhost:${PORT}`);
    console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
    console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
  });
}

startServer();

