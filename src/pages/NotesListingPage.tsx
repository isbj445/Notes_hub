import React, { useState, useEffect } from 'react';
// No axios needed - using fetch
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Download, Lock, Search, Filter, Crown, Loader2, Eye, X, BookOpen, Shield, ThumbsUp, MessageSquare, Sparkles, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

interface Note {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  is_premium: boolean;
  status?: string;
  likes_count?: number;
  downloads_count?: number;
  comments?: any[];
  ai_summary?: string | null;
  created_at: string;
  users: { name: string };
}

export const NotesListingPage = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState('all');
  const [previewNote, setPreviewNote] = useState<Note | null>(null);
  const [trendingNotes, setTrendingNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [commentText, setCommentText] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const { user, profile, session } = useAuth();

  useEffect(() => {
    fetchNotes();
    fetchTrendingNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const response = await fetch('/api/notes');
      const data = await response.json();
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingNotes = async () => {
    try {
      const response = await fetch('/api/notes/trending');
      const data = await response.json();
      setTrendingNotes(data || []);
    } catch (error) {
      console.error('Error fetching trending notes:', error);
    }
  };

  const checkDownloadLimit = () => {
    if (profile?.role === 'premium') return true;
    
    // Free user limit: 3 downloads per day
    const today = new Date().toDateString();
    const limitKey = `downloads_count_${user?.id}_${today}`;
    const count = parseInt(localStorage.getItem(limitKey) || '0');
    
    if (count >= 3) {
      alert('You have reached your daily limit of 3 free downloads. Please upgrade to Premium for unlimited access!');
      return false;
    }
    
    localStorage.setItem(limitKey, (count + 1).toString());
    return true;
  };

  const handleLike = async (id: string) => {
    if (!user) {
      alert('Please log in to like notes.');
      return;
    }
    try {
      const noteToLike = notes.find(n => n.id === id);
      if (!noteToLike) return;

      await fetch(`/api/notes/${id}/like`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token-123' 
        }
      });

      // Optimistic update
      setNotes(notes.map(n => n.id === id ? { ...n, likes_count: (n.likes_count || 0) + 1 } : n));
      if (selectedNote?.id === id) {
        setSelectedNote({ ...selectedNote, likes_count: (selectedNote.likes_count || 0) + 1 });
      }
    } catch (error) {
      console.error('Error liking note:', error);
    }
  };

  const handleComment = async (id: string) => {
    if (!user) {
      alert('Please log in to comment.');
      return;
    }
    if (!commentText.trim()) return;

    try {
      await fetch(`/api/notes/${id}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token-123' 
        },
        body: JSON.stringify({ text: commentText })
      });
      
      // Mock new comment for optimistic update
      const newComment = { id: Date.now().toString(), user: profile?.name || 'You', text: commentText, created_at: new Date().toISOString() };
      
      // Optimistic update
      setNotes(notes.map(n => {
        if (n.id === id) {
          return { ...n, comments: [...(n.comments || []), newComment] };
        }
        return n;
      }));
      
      if (selectedNote?.id === id) {
        setSelectedNote({ ...selectedNote, comments: [...(selectedNote.comments || []), newComment] });
      }
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleSummarize = async (id: string) => {
    if (!user) {
      alert('Please log in to use AI features.');
      return;
    }
    setLoadingSummary(true);
    try {
      // Mock AI summary for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      const ai_summary = "This is an AI-generated summary of the note. It covers the key concepts and main takeaways from the document. (Mocked for preview)";
      
      // Update state
      setNotes(notes.map(n => n.id === id ? { ...n, ai_summary } : n));
      if (selectedNote?.id === id) {
        setSelectedNote({ ...selectedNote, ai_summary });
      }

      // Save to database
      await fetch(`/api/notes/${id}/summarize`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token-123' 
        }
      });

    } catch (error) {
      console.error('Error summarizing note:', error);
      alert('Failed to generate summary.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleDownload = async (note: Note) => {
    if (!user) {
      alert('Please login to download notes');
      return;
    }

    if (note.is_premium && profile?.role !== 'premium') {
      if (window.confirm('This is a premium note. Would you like to upgrade to Premium to unlock it?')) {
        window.location.href = '/premium';
      }
      return;
    }

    if (!checkDownloadLimit()) return;

    try {
      // Increment download count
      await fetch(`/api/notes/download/${note.id}`, {
        method: 'GET',
        headers: { 
          'Authorization': 'Bearer mock-token-123' 
        }
      });

      // Open the file URL
      window.open(note.file_url, '_blank');
      
      // Save to download history in localStorage
      if (user) {
        const historyKey = `downloads_${user.id}`;
        const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
        const newEntry = {
          ...note,
          downloaded_at: new Date().toISOString()
        };
        // Remove existing entry if it's the same note to avoid duplicates, then add to top
        const updatedHistory = [newEntry, ...existingHistory.filter((n: any) => n.id !== note.id)];
        localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      }
    } catch (error: any) {
      alert(error.message || 'Download failed');
    }
  };

  const filteredNotes = notes.filter(note => {
    // Only show approved notes in the public listing
    if (note.status && note.status !== 'approved') return false;
    
    const matchesSearch = note.title.toLowerCase().includes(search.toLowerCase());
    const matchesFileType = fileTypeFilter === 'all' || note.file_type === fileTypeFilter;
    const matchesSubject = subjectFilter === 'all' || note.description.includes(`[Category: ${subjectFilter}]`);
    const matchesAccess = accessFilter === 'all' || (accessFilter === 'premium' ? note.is_premium : !note.is_premium);
    return matchesSearch && matchesFileType && matchesSubject && matchesAccess;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Explore Notes</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Find the best study materials shared by students</p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm mb-10 flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search notes by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative min-w-[160px]">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 transition-all text-gray-900 dark:text-white"
            >
              <option value="all">All Subjects</option>
              <option value="Engineering">Engineering</option>
              <option value="Medical">Medical</option>
              <option value="Business & Management">Business & Management</option>
              <option value="Arts & Humanities">Arts & Humanities</option>
              <option value="Science">Science</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="relative min-w-[140px]">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 transition-all text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="pdf">PDF</option>
              <option value="ppt">PPT</option>
              <option value="doc">DOC</option>
            </select>
          </div>

          <div className="relative min-w-[140px]">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <select
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 transition-all text-gray-900 dark:text-white"
            >
              <option value="all">All Access</option>
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trending Section */}
      {trendingNotes.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Trending Notes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {trendingNotes.map((note) => (
              <motion.div
                key={`trending-${note.id}`}
                whileHover={{ y: -5 }}
                onClick={() => setSelectedNote(note)}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className={`p-2 rounded-xl ${
                      note.file_type === 'pdf' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                      note.file_type === 'ppt' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                      'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    {note.is_premium && (
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-1 rounded-md">
                        <Crown className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2 mb-2">{note.title}</h3>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center"><ThumbsUp className="h-3 w-3 mr-1" /> {note.likes_count || 0}</span>
                      <span className="flex items-center"><Download className="h-3 w-3 mr-1" /> {note.downloads_count || 0}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 text-indigo-600 dark:text-indigo-400 animate-spin" />
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredNotes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 dark:hover:shadow-indigo-900/20 transition-all overflow-hidden flex flex-col"
            >
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl ${
                    note.file_type === 'pdf' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                    note.file_type === 'ppt' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                    'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  }`}>
                    <FileText className="h-6 w-6" />
                  </div>
                  {note.is_premium && (
                    <div className="flex items-center space-x-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      <Crown className="h-3 w-3" />
                      <span>Premium</span>
                    </div>
                  )}
                </div>

                <h3 
                  className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors cursor-pointer"
                  onClick={() => setSelectedNote(note)}
                >
                  {note.title}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 flex-1 whitespace-pre-wrap">
                  {note.description}
                </p>
                
                <div className="flex items-center space-x-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
                  <button onClick={() => handleLike(note.id)} className="flex items-center hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    <ThumbsUp className="h-4 w-4 mr-1" /> {note.likes_count || 0}
                  </button>
                  <button onClick={() => setSelectedNote(note)} className="flex items-center hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    <MessageSquare className="h-4 w-4 mr-1" /> {note.comments?.length || 0}
                  </button>
                  <span className="flex items-center">
                    <Download className="h-4 w-4 mr-1" /> {note.downloads_count || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400">
                      {note.users?.name?.charAt(0) || 'U'}
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{note.users?.name || 'Anonymous'}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPreviewNote(note)}
                      className="p-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white transition-all"
                      title="Preview Note"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDownload(note)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        note.is_premium && profile?.role !== 'premium'
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white'
                      }`}
                    >
                      {note.is_premium && profile?.role !== 'premium' ? (
                        <>
                          <Lock className="h-4 w-4" />
                          <span>Locked</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 mb-4">
            <Search className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">No notes found</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Try adjusting your search or filters</p>
          <button
            onClick={() => { setSearch(''); setFileTypeFilter('all'); setSubjectFilter('all'); setAccessFilter('all'); }}
            className="mt-6 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewNote && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewNote(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              style={{ height: '85vh' }}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl ${
                    previewNote.file_type === 'pdf' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                    previewNote.file_type === 'ppt' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                    'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  }`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{previewNote.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">{previewNote.file_type} File</p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewNote(null)}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 relative">
                {previewNote.file_type === 'pdf' ? (
                  <iframe
                    src={`${previewNote.file_url}#toolbar=0`}
                    className="w-full h-full border-0"
                    title="PDF Preview"
                  />
                ) : (
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(previewNote.file_url)}&embedded=true`}
                    className="w-full h-full border-0"
                    title="Document Preview"
                  />
                )}
              </div>
              
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-end">
                <button
                  onClick={() => {
                    handleDownload(previewNote);
                    setPreviewNote(null);
                  }}
                  className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                  <Download className="h-5 w-5" />
                  <span>Download File</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Note Details Modal (Comments & AI) */}
      <AnimatePresence>
        {selectedNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNote(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedNote.title}</h2>
                <button
                  onClick={() => setSelectedNote(null)}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="flex items-center space-x-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
                  <button onClick={() => handleLike(selectedNote.id)} className="flex items-center hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    <ThumbsUp className="h-5 w-5 mr-1" /> {selectedNote.likes_count || 0} Likes
                  </button>
                  <span className="flex items-center">
                    <Download className="h-5 w-5 mr-1" /> {selectedNote.downloads_count || 0} Downloads
                  </span>
                </div>

                {/* AI Summary Section */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                      <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
                      AI Summary
                    </h3>
                    {!selectedNote.ai_summary && (
                      <button
                        onClick={() => handleSummarize(selectedNote.id)}
                        disabled={loadingSummary}
                        className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 flex items-center"
                      >
                        {loadingSummary ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        {loadingSummary ? 'Generating...' : 'Generate Summary'}
                      </button>
                    )}
                  </div>
                  {selectedNote.ai_summary ? (
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-2xl text-indigo-900 dark:text-indigo-100 text-sm leading-relaxed border border-indigo-100 dark:border-indigo-800">
                      {selectedNote.ai_summary}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No AI summary generated yet.</p>
                  )}
                </div>

                {/* Comments Section */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center mb-4">
                    <MessageSquare className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                    Comments ({selectedNote.comments?.length || 0})
                  </h3>
                  
                  <div className="space-y-4 mb-6">
                    {selectedNote.comments?.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-sm text-gray-900 dark:text-white">{comment.user}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(comment.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">{comment.text}</p>
                      </div>
                    ))}
                    {(!selectedNote.comments || selectedNote.comments.length === 0) && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No comments yet. Be the first!</p>
                    )}
                  </div>

                  {user ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400 dark:placeholder-gray-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleComment(selectedNote.id)}
                      />
                      <button
                        onClick={() => handleComment(selectedNote.id)}
                        disabled={!commentText.trim()}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        Post
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center">Please log in to comment.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
