import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UploadPage = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Engineering');
  const [isPremium, setIsPremium] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const allowedTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only PDF, PPT, and DOC files are allowed');
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) {
      setError('Please login first');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Local real PDF for preview
      // 3. REAL FILE UPLOAD with FormData
      const formData = new FormData();
      formData.append('file', file!);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('is_premium', isPremium.toString());

      const response = await fetch('/api/notes/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      
      // Refresh notes list
      window.location.reload();
      navigate('/notes');
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload note');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-indigo-100 dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-900 dark:to-purple-900 p-8 text-white">
          <h1 className="text-3xl font-bold">Share Your Knowledge</h1>
          <p className="text-indigo-100 dark:text-indigo-200 mt-2">Upload your notes and help fellow students succeed</p>
        </div>

        <form onSubmit={handleUpload} className="p-8 space-y-8">
          {error && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Note Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Advanced Calculus Unit 1"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Subject / Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Medical">Medical</option>
                  <option value="Business & Management">Business & Management</option>
                  <option value="Arts & Humanities">Arts & Humanities</option>
                  <option value="Science">Science</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Description</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly explain what's inside these notes..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div className="flex items-center space-x-3 p-4 bg-amber-50 dark:bg-amber-900/30 rounded-2xl border border-amber-100 dark:border-amber-800">
                <input
                  type="checkbox"
                  id="premium"
                  checked={isPremium}
                  onChange={(e) => setIsPremium(e.target.checked)}
                  className="h-5 w-5 text-amber-600 rounded focus:ring-amber-500 border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800"
                />
                <label htmlFor="premium" className="flex items-center space-x-2 cursor-pointer">
                  <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span className="font-bold text-amber-900 dark:text-amber-100">Mark as Premium Content</span>
                </label>
              </div>
            </div>

            <div className="space-y-6">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Upload File</label>
              <div className={`relative border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
                file ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
              }`}>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.ppt,.pptx,.doc,.docx"
                />
                <div className="space-y-4">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${
                    file ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {file ? <CheckCircle2 className="h-8 w-8" /> : <Upload className="h-8 w-8" />}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {file ? file.name : 'Click to upload or drag & drop'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">PDF, PPT, or DOC (Max 10MB)</p>
                  </div>
                </div>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    <span>Uploading...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="bg-indigo-600 h-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center space-x-3 disabled:opacity-50 disabled:shadow-none"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6" />
                  <span>Publish Notes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
