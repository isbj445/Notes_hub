import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { FileText, Download, Trash2, Plus, Loader2, Clock, Crown, Shield, User, Mail, History } from 'lucide-react';
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
  created_at: string;
  downloaded_at?: string;
}

export const DashboardPage = () => {
  const { user, profile, session } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [downloadHistory, setDownloadHistory] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'uploads' | 'downloads'>('uploads');

  useEffect(() => {
    if (user) {
      fetchUserNotes();
      loadDownloadHistory();
    }
  }, [user]);

  const fetchUserNotes = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching user notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDownloadHistory = () => {
    if (user) {
      const historyKey = `downloads_${user.id}`;
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      setDownloadHistory(history);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotes(notes.filter(n => n.id !== id));
    } catch (error) {
      alert('Failed to delete note');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Welcome, {profile?.name || 'Student'}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Manage your shared notes and track your progress</p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          <Plus className="h-5 w-5" />
          <span>Upload New Note</span>
        </Link>
      </div>

      {/* Profile Section */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-8 mb-12 flex flex-col md:flex-row items-center md:items-start gap-8">
        <div className="h-24 w-24 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-3xl font-bold shrink-0">
          {profile?.name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Profile Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center justify-center md:justify-start space-x-3 text-gray-600 dark:text-gray-300">
              <User className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">Name</p>
                <p className="font-medium text-gray-900 dark:text-white">{profile?.name || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start space-x-3 text-gray-600 dark:text-gray-300">
              <Mail className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">Email</p>
                <p className="font-medium text-gray-900 dark:text-white">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start space-x-3 text-gray-600 dark:text-gray-300">
              <Crown className={`h-5 w-5 ${profile?.role === 'premium' ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`} />
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">Current Plan</p>
                <p className={`font-bold capitalize ${profile?.role === 'premium' ? 'text-amber-600 dark:text-amber-500' : 'text-gray-900 dark:text-white'}`}>
                  {profile?.role || 'Free'}
                </p>
              </div>
            </div>
          </div>
        </div>
        {profile?.role !== 'premium' && profile?.role !== 'admin' && (
          <div className="shrink-0 flex flex-col space-y-3">
            <Link to="/premium" className="inline-flex items-center space-x-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-6 py-3 rounded-xl font-bold hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors">
              <Crown className="h-5 w-5" />
              <span>Upgrade to Premium</span>
            </Link>
            <button 
              onClick={async () => {
                try {
                  const { error } = await supabase
                    .from('users')
                    .update({ role: 'admin' })
                    .eq('id', user?.id);
                  if (error) throw error;
                  window.location.reload();
                } catch (e) {
                  alert('Failed to toggle admin');
                }
              }}
              className="inline-flex items-center justify-center space-x-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-6 py-3 rounded-xl font-bold hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
              <Shield className="h-5 w-5" />
              <span>Make me Admin (Demo)</span>
            </button>
          </div>
        )}
        {profile?.role === 'admin' && (
          <div className="shrink-0 flex flex-col space-y-3">
            <Link to="/admin" className="inline-flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200 dark:shadow-none">
              <Shield className="h-5 w-5" />
              <span>Admin Dashboard</span>
            </Link>
            <button 
              onClick={async () => {
                try {
                  const { error } = await supabase
                    .from('users')
                    .update({ role: 'free' })
                    .eq('id', user?.id);
                  if (error) throw error;
                  window.location.reload();
                } catch (e) {
                  alert('Failed to toggle admin');
                }
              }}
              className="inline-flex items-center justify-center space-x-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <User className="h-5 w-5" />
              <span>Remove Admin (Demo)</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-8 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('uploads')}
          className={`pb-4 px-4 text-lg font-bold transition-colors relative ${
            activeTab === 'uploads' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Uploaded Notes</span>
          </div>
          {activeTab === 'uploads' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('downloads')}
          className={`pb-4 px-4 text-lg font-bold transition-colors relative ${
            activeTab === 'downloads' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Download History</span>
          </div>
          {activeTab === 'downloads' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
        </div>
      ) : activeTab === 'uploads' ? (
        notes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {notes.map((note) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl ${
                      note.file_type === 'pdf' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                      note.file_type === 'ppt' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                      'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}>
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex items-center space-x-2">
                      {note.is_premium && (
                        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-1.5 rounded-lg">
                          <Crown className="h-4 w-4" />
                        </span>
                      )}
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{note.title}</h3>
                  <div className="flex items-center text-sm text-gray-400 dark:text-gray-500 mb-6">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                    {note.status && (
                      <>
                        <span className="mx-2">•</span>
                        <span className={`capitalize font-medium ${
                          note.status === 'approved' ? 'text-green-500 dark:text-green-400' :
                          note.status === 'rejected' ? 'text-red-500 dark:text-red-400' :
                          'text-yellow-500 dark:text-yellow-400'
                        }`}>
                          {note.status}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700">
                    <span className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500">{note.file_type} File</span>
                    <a
                      href={note.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline flex items-center"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      View
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-[32px] border-2 border-dashed border-gray-200 dark:border-gray-700">
            <div className="bg-white dark:bg-gray-800 w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">No notes uploaded yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Start sharing your knowledge with the community!</p>
            <Link
              to="/upload"
              className="mt-6 inline-flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              <span>Upload your first note</span>
              <Plus className="h-4 w-4" />
            </Link>
          </div>
        )
      ) : (
        downloadHistory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {downloadHistory.map((note) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl ${
                      note.file_type === 'pdf' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                      note.file_type === 'ppt' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                      'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}>
                      <FileText className="h-6 w-6" />
                    </div>
                    {note.is_premium && (
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-1.5 rounded-lg">
                        <Crown className="h-4 w-4" />
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{note.title}</h3>
                  <div className="flex flex-col space-y-1 text-sm text-gray-400 dark:text-gray-500 mb-6">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Downloaded: {note.downloaded_at ? new Date(note.downloaded_at).toLocaleDateString() : 'Unknown'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700">
                    <span className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500">{note.file_type} File</span>
                    <a
                      href={note.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline flex items-center"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download Again
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-[32px] border-2 border-dashed border-gray-200 dark:border-gray-700">
            <div className="bg-white dark:bg-gray-800 w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
              <History className="h-8 w-8 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">No download history</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Notes you download will appear here.</p>
            <Link
              to="/notes"
              className="mt-6 inline-flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              <span>Explore notes</span>
            </Link>
          </div>
        )
      )}
    </div>
  );
};
