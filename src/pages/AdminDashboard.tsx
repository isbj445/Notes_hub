import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import {
  Users,
  FileText,
  Activity,
  CheckCircle,
  XCircle,
  Trash2,
  Shield,
  Loader2,
  Crown,
  Search,
  Ban,

  Filter,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';


export const AdminDashboard = () => {
  const { profile, session } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'notes'>('overview');
  const [stats, setStats] = useState<any>(null);

  // Users tab state
  const [users, setUsers] = useState<any[]>([]);
  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersActionLoadingIds, setUsersActionLoadingIds] = useState<Record<string, boolean>>({});

  // Notes tab state
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData();
    }
  }, [profile, activeTab]);

  const fetchData = async () => {
    // Keep existing loading behavior for non-users tabs
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: premiumUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'premium');
        const { count: totalNotes } = await supabase.from('notes').select('*', { count: 'exact', head: true });
        const { count: pendingNotes } = await supabase.from('notes').select('*', { count: 'exact', head: true }).eq('status', 'pending');

        setStats({
          totalUsers: totalUsers || 0,
          premiumUsers: premiumUsers || 0,
          totalNotes: totalNotes || 0,
          pendingNotes: pendingNotes || 0,
        });
      } else if (activeTab === 'users') {
        setUsersLoading(true);
        const { data } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
        setUsers(data || []);
      } else if (activeTab === 'notes') {
        const { data } = await supabase
          .from('notes')
          .select('*, users(name)')
          .order('created_at', { ascending: false });
        setNotes(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
      if (activeTab === 'users') setUsersLoading(false);
    }
  };

  const handleUpdateNoteStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('notes').update({ status }).eq('id', id);
      if (error) throw error;
      setNotes(notes.map(n => n.id === id ? { ...n, status } : n));
    } catch (error) {
      alert('Failed to update note status');
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
      setNotes(notes.filter(n => n.id !== id));
    } catch (error) {
      alert('Failed to delete note');
    }
  };

  const handleUpdateUserRole = async (id: string, nextRole: 'user' | 'admin' | 'moderator') => {
    console.log('[AdminDashboard][Users] updateRole click:', { id, nextRole });
    if (!window.confirm(`Set role to '${nextRole}'?`)) return;

    setUsersActionLoadingIds(prev => ({ ...prev, [id]: true }));
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: nextRole })
        .eq('id', id);

      if (error) throw error;

      setUsers(prev => prev.map(u => (u.id === id ? { ...u, role: nextRole } : u)));
      console.log('[AdminDashboard][Users] updateRole success:', { id, nextRole });
    } catch (error) {
      console.error('[AdminDashboard][Users] updateRole error:', { id, nextRole, error });
      alert('Failed to update user role');
    } finally {
      setUsersActionLoadingIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleToggleUserBan = async (id: string, nextStatus: 'active' | 'banned') => {
    console.log('[AdminDashboard][Users] toggleBan click:', { id, nextStatus });
    if (!window.confirm(nextStatus === 'banned' ? 'Ban this user?' : 'Unban this user?')) return;

    setUsersActionLoadingIds(prev => ({ ...prev, [id]: true }));
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: nextStatus })
        .eq('id', id);

      if (error) throw error;

      setUsers(prev => prev.map(u => (u.id === id ? { ...u, status: nextStatus } : u)));
      console.log('[AdminDashboard][Users] toggleBan success:', { id, nextStatus });
    } catch (error) {
      console.error('[AdminDashboard][Users] toggleBan error:', { id, nextStatus, error });
      alert('Failed to update ban status');
    } finally {
      setUsersActionLoadingIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleDeleteUser = async (id: string) => {
    console.log('[AdminDashboard][Users] delete click:', { id });
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    setUsersActionLoadingIds(prev => ({ ...prev, [id]: true }));
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== id));
      console.log('[AdminDashboard][Users] delete success:', { id });
    } catch (error) {
      console.error('[AdminDashboard][Users] delete error:', { id, error });
      alert('Failed to delete user');
    } finally {
      setUsersActionLoadingIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  const filteredUsers = useMemo(() => {
    const q = usersSearchQuery.trim().toLowerCase();
    if (!q) return users;

    return users.filter((u) => {
      const name = String(u?.name ?? '').toLowerCase();
      const email = String(u?.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, usersSearchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center space-x-4 mb-8">
        <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-2xl">
          <Shield className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage users, moderate content, and view analytics</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-8 border-b border-gray-200 dark:border-gray-800">

        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-4 px-4 text-lg font-bold transition-colors relative ${
            activeTab === 'overview' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Overview</span>
          </div>
          {activeTab === 'overview' && (
            <motion.div layoutId="adminTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 px-4 text-lg font-bold transition-colors relative ${
            activeTab === 'users' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Users</span>
          </div>
          {activeTab === 'users' && (
            <motion.div layoutId="adminTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`pb-4 px-4 text-lg font-bold transition-colors relative ${
            activeTab === 'notes' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Content Moderation</span>
          </div>
          {activeTab === 'notes' && (
            <motion.div layoutId="adminTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
        </div>
      ) : (
        <div className="min-h-[400px]">
          {activeTab === 'overview' && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-2xl text-blue-600 dark:text-blue-400">
                  <Users className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-4">
                <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-2xl text-amber-600 dark:text-amber-400">
                  <Crown className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider">Premium Users</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.premiumUsers}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-2xl text-indigo-600 dark:text-indigo-400">
                  <FileText className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider">Total Notes</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalNotes}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-4">
                <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-2xl text-red-600 dark:text-red-400">
                  <Activity className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider">Pending Notes</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.pendingNotes}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl flex-1">
                    <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <input
                      value={usersSearchQuery}
                      onChange={(e) => setUsersSearchQuery(e.target.value)}
                      placeholder="Search by name or email..."
                      className="bg-transparent outline-none w-full text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {filteredUsers.length} users
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                      <th className="p-4 font-bold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider">Name</th>
                      <th className="p-4 font-bold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider">Email</th>
                      <th className="p-4 font-bold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider">Role</th>
                      <th className="p-4 font-bold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider">Joined</th>
                      <th className="p-4 font-bold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider">Last login</th>
                      <th className="p-4 font-bold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {filteredUsers.map((u) => {
                      const status = u.status || 'active';
                      const isBanned = status === 'banned';
                      return (
                        <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="p-4 font-medium text-gray-900 dark:text-white">{u.name || 'Anonymous'}</td>
                          <td className="p-4 text-gray-500 dark:text-gray-400">{u.email}</td>
                          <td className="p-4">
                            <select
                              value={u.role || 'user'}
                              className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200"
                              disabled={!!usersActionLoadingIds[u.id]}
                              onChange={(e) => {
                                const next = e.target.value as 'user' | 'admin' | 'moderator';
                                if (next === u.role) return;
                                handleUpdateUserRole(u.id, next);
                              }}
                            >
                              <option value="user">User</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                          <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">{u.last_login ? new Date(u.last_login).toLocaleDateString() : '—'}</td>
                          <td className="p-4 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleUserBan(u.id, isBanned ? 'active' : 'banned')}
                                className={`p-2 rounded-xl transition-colors ${
                                  isBanned
                                    ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                                } bg-transparent`}
                                title={isBanned ? 'Unban User' : 'Ban User'}
                              >
                                <Ban className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                                title="Delete User"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                      <th className="p-4 font-bold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider">Title</th>
                      <th className="p-4 font-bold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider">Author</th>
                      <th className="p-4 font-bold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider">Status</th>
                      <th className="p-4 font-bold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {notes.map((note) => (
                      <tr key={note.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="p-4">
                          <p className="font-medium text-gray-900 dark:text-white">{note.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{note.file_type}</p>
                        </td>
                        <td className="p-4 text-gray-500 dark:text-gray-400">{note.users?.name || 'Unknown'}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            note.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            note.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                            'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          }`}>
                            {note.status || 'approved'}
                          </span>
                        </td>
                        <td className="p-4 text-right flex justify-end space-x-2">
                          {note.status !== 'approved' && (
                            <button
                              onClick={() => handleUpdateNoteStatus(note.id, 'approved')}
                              className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-xl transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                          )}
                          {note.status !== 'rejected' && (
                            <button
                              onClick={() => handleUpdateNoteStatus(note.id, 'rejected')}
                              className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-xl transition-colors"
                              title="Reject"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                            title="Delete Spam"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
