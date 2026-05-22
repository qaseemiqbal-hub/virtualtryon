'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Layers,
  Shirt,
  Users,
  Grid,
  TrendingUp,
  Plus,
  Upload,
  LogOut,
  ChevronRight,
  User,
  Clock,
  ExternalLink,
  Info,
  CheckCircle,
  XCircle,
  FileText,
  Home,
  Trash2
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl: string | null;
}

interface Dress {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  tags: string[];
  categoryId: string;
  category?: Category | null;
}

interface GuestUser {
  id: string;
  guestToken: string;
  optionalName: string | null;
  createdAt: string;
  _count?: {
    generations: number;
  };
}

interface Generation {
  id: string;
  guestUserId: string;
  guestUser: GuestUser | null;
  dressId: string;
  dress: Dress | null;
  originalImageUrl: string;
  generatedImageUrl: string | null;
  status: string;
  error: string | null;
  createdAt: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'generations' | 'dresses' | 'categories' | 'users'>('generations');
  const [loading, setLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  // Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [users, setUsers] = useState<GuestUser[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);

  // Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatThumb, setNewCatThumb] = useState('');
  const [catSubmitting, setCatSubmitting] = useState(false);

  // Dress Form
  const [showDressModal, setShowDressModal] = useState(false);
  const [dressTitle, setDressTitle] = useState('');
  const [dressDesc, setDressDesc] = useState('');
  const [dressImage, setDressImage] = useState<string | null>(null);
  const [dressTags, setDressTags] = useState('');
  const [dressCategoryId, setDressCategoryId] = useState('');
  const [dressSubmitting, setDressSubmitting] = useState(false);
  const [dressError, setDressError] = useState<string | null>(null);

  const dressFileInputRef = useRef<HTMLInputElement>(null);
  
  // Bulk Dress Form States
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
  const [bulkDresses, setBulkDresses] = useState<Array<{
    id: string;
    file: File;
    title: string;
    previewUrl: string;
    description: string;
    tags: string;
  }>>([]);
  const [bulkUploadProgress, setBulkUploadProgress] = useState(0);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedDressIds, setSelectedDressIds] = useState<string[]>([]);

  // Clear selections on tab swap
  useEffect(() => {
    setSelectedDressIds([]);
  }, [activeTab]);

  const router = useRouter();

  // 1. Authorization & Fetch Dashboard Data
  useEffect(() => {
    async function loadDashboard() {
      try {
        // Fetch generations first to check auth (returns 401 if not logged in)
        const genRes = await fetch('/api/admin/generations');
        if (genRes.status === 401) {
          router.push('/admin');
          return;
        }

        const genData = await genRes.json();
        if (genData.success) {
          setGenerations(genData.data);
          if (genData.isMock) setIsMockMode(true);
        }

        // Fetch categories, dresses, and users
        const [catsRes, dressesRes, usersRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/dresses'),
          fetch('/api/admin/users')
        ]);

        const catsData = await catsRes.json();
        const dressesData = await dressesRes.json();
        const usersData = await usersRes.json();

        if (catsData.success) setCategories(catsData.data);
        if (dressesData.success) setDresses(dressesData.data);
        if (usersData.success) setUsers(usersData.data);

      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin');
    } catch (e) {
      console.error(e);
    }
  };

  // Add Category Handler
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setCatSubmitting(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName, thumbnailUrl: newCatThumb }),
      });
      const data = await res.json();
      if (data.success) {
        setCategories([data.data, ...categories]);
        setNewCatName('');
        setNewCatThumb('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCatSubmitting(false);
    }
  };

  // Dress image upload
  const handleDressImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDressImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add Dress Handler
  const handleAddDress = async (e: React.FormEvent) => {
    e.preventDefault();
    setDressError(null);

    if (!dressTitle || !dressImage || !dressCategoryId) {
      setDressError('Please fill out all required fields and upload an image.');
      return;
    }

    setDressSubmitting(true);
    try {
      const res = await fetch('/api/dresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: dressTitle,
          description: dressDesc,
          image: dressImage,
          tags: dressTags,
          categoryId: dressCategoryId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDresses([data.data, ...dresses]);
        setShowDressModal(false);
        // Reset form
        setDressTitle('');
        setDressDesc('');
        setDressImage(null);
        setDressTags('');
        setDressCategoryId('');
      } else {
        setDressError(data.message || 'Failed to create outfit.');
      }
    } catch (err) {
      console.error(err);
      setDressError('Server error while saving outfit.');
    } finally {
      setDressSubmitting(false);
    }
  };

  // Bulk files selection
  const handleBulkFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newItems = files.map(file => {
        // Formulate a beautiful title from the filename
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        const cleanTitle = nameWithoutExt
          .split(/[-_\s]+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        return {
          id: Math.random().toString(36).substring(2, 9),
          file,
          title: cleanTitle,
          previewUrl: '',
          description: '',
          tags: ''
        };
      });

      setBulkDresses(prev => [...prev, ...newItems]);

      // Read files as base64 in parallel
      newItems.forEach(item => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setBulkDresses(current =>
            current.map(d => d.id === item.id ? { ...d, previewUrl: reader.result as string } : d)
          );
        };
        reader.readAsDataURL(item.file);
      });
    }
  };

  // Remove single item from bulk list before upload
  const handleRemoveBulkItem = (id: string) => {
    setBulkDresses(prev => prev.filter(item => item.id !== id));
  };

  // Modify bulk item title inline
  const handleUpdateBulkTitle = (id: string, newTitle: string) => {
    setBulkDresses(prev => prev.map(item => item.id === id ? { ...item, title: newTitle } : item));
  };

  // Bulk Upload outfits handler
  const handleAddBulkDresses = async (e: React.FormEvent) => {
    e.preventDefault();
    setDressError(null);

    if (bulkDresses.length === 0) {
      setDressError('Please add at least one outfit image.');
      return;
    }

    if (!bulkCategoryId) {
      setDressError('Please select a collection category for these outfits.');
      return;
    }

    setDressSubmitting(true);
    let successCount = 0;

    try {
      for (let i = 0; i < bulkDresses.length; i++) {
        const item = bulkDresses[i];
        setBulkUploadProgress(i + 1);

        // Fetch base64 if not loaded yet
        let base64 = item.previewUrl;
        if (!base64) {
          base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(item.file);
          });
        }

        const res = await fetch('/api/dresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title || `Outfit ${i + 1}`,
            description: item.description || dressDesc || '', // fallback to shared description
            image: base64,
            tags: item.tags || dressTags || '', // fallback to shared tags
            categoryId: bulkCategoryId,
          }),
        });

        const data = await res.json();
        if (data.success) {
          successCount++;
          setDresses(current => [data.data, ...current]);
        } else {
          console.error(`Failed to upload ${item.title}:`, data.message);
        }
      }

      // Upload finished!
      setShowDressModal(false);
      // Reset form states
      setBulkDresses([]);
      setBulkUploadProgress(0);
      setBulkCategoryId('');
      setDressTags('');
      setDressDesc('');
    } catch (err) {
      console.error(err);
      setDressError(`An error occurred during bulk upload. Successfully saved ${successCount} outfits.`);
    } finally {
      setDressSubmitting(false);
    }
  };

  // Bulk Delete outfits from Neon & MockDB
  const handleBulkDeleteDresses = async () => {
    if (selectedDressIds.length === 0) return;

    const confirmed = window.confirm(`Are you sure you want to delete the selected ${selectedDressIds.length} outfits? This will also remove all guest try-on sessions associated with them.`);
    if (!confirmed) return;

    setDressSubmitting(true);
    try {
      const res = await fetch('/api/dresses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedDressIds }),
      });
      const data = await res.json();
      if (data.success) {
        // Filter out of local dresses inventory
        setDresses(prev => prev.filter(d => !selectedDressIds.includes(d.id)));
        // Filter out related generations from the feed
        setGenerations(prev => prev.filter(g => !selectedDressIds.includes(g.dressId)));
        setSelectedDressIds([]);
      } else {
        alert(data.message || 'Failed to delete outfits.');
      }
    } catch (err) {
      console.error(err);
      alert('Server error while deleting outfits.');
    } finally {
      setDressSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-[#060608] flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-t-2 border-r-2 border-purple-500 animate-spin" />
          <p className="text-neutral-400 text-xs font-semibold tracking-widest uppercase">Opening Studio Gates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#060608] flex flex-col min-h-screen text-[#f4f4f7]">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center bg-[#0a0a0d]/80">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white">
            <Layers className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-wider text-white">AURA CONTROL CENTER</span>
            <span className="text-[9px] block tracking-[0.2em] font-light text-neutral-500">MANAGEMENT PORTAL</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isMockMode && (
            <span className="hidden sm:inline-block bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] tracking-widest uppercase font-bold px-3 py-1.5 rounded-full">
              MOCK DATABASE ACTIVE
            </span>
          )}

          <a 
            href="/" 
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white bg-white/5 px-3 py-2 rounded-lg border border-white/5"
          >
            <Home className="h-3.5 w-3.5" />
            Fashion Studio
          </a>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 px-3.5 py-2 rounded-lg border border-red-500/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {/* BODY GRID */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-10 flex flex-col md:flex-row gap-8">
        
        {/* SIDEBAR TABS */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-3 mb-2 block">Navigation</span>
          
          <button
            onClick={() => setActiveTab('generations')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-between ${
              activeTab === 'generations'
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-600/10'
                : 'bg-white/5 border border-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generation Feed
            </span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setActiveTab('dresses')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-between ${
              activeTab === 'dresses'
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-600/10'
                : 'bg-white/5 border border-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="flex items-center gap-2">
              <Shirt className="h-4 w-4" />
              Manage Outfits
            </span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-between ${
              activeTab === 'categories'
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-600/10'
                : 'bg-white/5 border border-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="flex items-center gap-2">
              <Grid className="h-4 w-4" />
              Collections
            </span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-between ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-600/10'
                : 'bg-white/5 border border-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Registered Guests
            </span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </aside>

        {/* MAIN PANEL */}
        <main className="flex-1 flex flex-col gap-6 overflow-hidden">
          
          {/* STATS ANALYTICS BAR */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Try-on Output</span>
              <span className="text-xl font-bold text-white mt-1">{generations.length}</span>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Total Guests</span>
              <span className="text-xl font-bold text-white mt-1">{users.length}</span>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Outfits Seeder</span>
              <span className="text-xl font-bold text-white mt-1">{dresses.length}</span>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Active Collections</span>
              <span className="text-xl font-bold text-white mt-1">{categories.length}</span>
            </div>
          </div>

          {/* TAB 1: GENERATION FEED */}
          {activeTab === 'generations' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold tracking-wider uppercase text-neutral-300">AI Try-On System Monitor</h3>
                <span className="text-xs text-neutral-500">{generations.length} Sessions Logged</span>
              </div>

              {generations.length === 0 ? (
                <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/5 text-neutral-500 text-xs">
                  No virtual try-on history recorded in the database.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {generations.map((gen) => (
                    <div key={gen.id} className="glass-panel rounded-2xl border border-white/5 p-5 flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between">
                      
                      {/* Left: Session metadata & Dress */}
                      <div className="flex flex-col gap-2.5 max-w-xs w-full">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-400">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {gen.guestUser?.optionalName || 'Guest User'}
                            </span>
                            <span className="text-[9px] text-neutral-500 block -mt-0.5 truncate max-w-[150px]">
                              ID: {gen.guestUserId}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="h-6 w-6 rounded-md bg-pink-500/10 flex items-center justify-center text-pink-400">
                            <Shirt className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-neutral-300 truncate">
                            {gen.dress?.title || 'Unknown Dress'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 mt-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{new Date(gen.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Middle: Comparative Gallery */}
                      <div className="flex items-center gap-4 bg-black/40 p-2.5 rounded-xl border border-white/5">
                        {/* Human Source */}
                        <div className="flex flex-col gap-1 items-center">
                          <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">Source User</span>
                          <div className="h-16 w-12 rounded bg-neutral-950 overflow-hidden relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={gen.originalImageUrl} alt="source human" className="w-full h-full object-cover" />
                          </div>
                        </div>

                        {/* Plus sign */}
                        <Plus className="h-3.5 w-3.5 text-neutral-600" />

                        {/* Dress Image */}
                        <div className="flex flex-col gap-1 items-center">
                          <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">Dress</span>
                          <div className="h-16 w-12 rounded bg-neutral-950 overflow-hidden relative">
                            {gen.dress ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={gen.dress.imageUrl} alt="dress" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-neutral-900" />
                            )}
                          </div>
                        </div>

                        {/* Arrow sign */}
                        <ChevronRight className="h-4 w-4 text-neutral-600" />

                        {/* Generated Result */}
                        <div className="flex flex-col gap-1 items-center">
                          <span className="text-[8px] font-bold text-purple-400 uppercase tracking-widest">AI Output</span>
                          <div className="h-16 w-12 rounded bg-neutral-950 overflow-hidden relative border border-purple-500/20">
                            {gen.generatedImageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={gen.generatedImageUrl} alt="try-on output" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                                <Clock className="h-3.5 w-3.5 text-neutral-600 animate-spin" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Badge Status */}
                      <div className="flex flex-col gap-2 items-end">
                        {gen.status === 'COMPLETED' ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle className="h-3.5 w-3.5" />
                            SUCCESS
                          </div>
                        ) : gen.status === 'FAILED' ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider" title={gen.error || ''}>
                            <XCircle className="h-3.5 w-3.5" />
                            FAILED
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase tracking-wider">
                            <Clock className="h-3.5 w-3.5 animate-spin" />
                            {gen.status}
                          </div>
                        )}

                        {gen.generatedImageUrl && (
                          <a
                            href={gen.generatedImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-neutral-400 hover:text-white transition-colors flex items-center gap-1 mt-1"
                          >
                            OPEN HIGH-RES
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OUTFIT MANAGER (DRESSES CRUD) */}
          {activeTab === 'dresses' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3 gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold tracking-wider uppercase text-neutral-300">Outfit Inventory</h3>
                  {dresses.length > 0 && (
                    <button
                      onClick={() => {
                        if (selectedDressIds.length === dresses.length) {
                          setSelectedDressIds([]);
                        } else {
                          setSelectedDressIds(dresses.map(d => d.id));
                        }
                      }}
                      className="bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-400 hover:text-white text-[9px] font-bold tracking-wider uppercase px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      {selectedDressIds.length === dresses.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {selectedDressIds.length > 0 && (
                    <button
                      onClick={handleBulkDeleteDresses}
                      disabled={dressSubmitting}
                      className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 disabled:opacity-50 text-[10px] font-bold tracking-wider uppercase px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Selected ({selectedDressIds.length})
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setDressError(null);
                      setUploadMode('single');
                      setShowDressModal(true);
                    }}
                    className="bg-gradient-to-r from-purple-600 to-pink-500 text-[10px] font-bold tracking-wider uppercase px-4 py-2.5 rounded-xl text-white shadow-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Add New Outfit
                  </button>
                </div>
              </div>

              {dresses.length === 0 ? (
                <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/5 text-neutral-500 text-xs">
                  No dresses configured. Click the button to add your first premium dress outfit.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {dresses.map((dress) => {
                    const isSelected = selectedDressIds.includes(dress.id);
                    return (
                      <div 
                        key={dress.id} 
                        onClick={() => {
                          if (isSelected) {
                            setSelectedDressIds(prev => prev.filter(id => id !== dress.id));
                          } else {
                            setSelectedDressIds(prev => [...prev, dress.id]);
                          }
                        }}
                        className={`glass-panel border rounded-xl overflow-hidden flex flex-col h-full cursor-pointer relative group transition-all duration-300 ${
                          isSelected 
                            ? 'border-purple-500/80 shadow-md shadow-purple-500/10 ring-1 ring-purple-500/20' 
                            : 'border-white/5 hover:border-white/15'
                        }`}
                      >
                        {/* Selector check indicator */}
                        <div className="absolute top-2.5 left-2.5 z-10">
                          <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'bg-purple-500 border-purple-400 text-white' 
                              : 'bg-black/60 border-white/20 group-hover:border-white/40'
                          }`}>
                            {isSelected && (
                              <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                                <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                              </svg>
                            )}
                          </div>
                        </div>

                        <div className="relative aspect-[3/4] bg-neutral-950 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={dress.imageUrl} alt={dress.title} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
                        </div>
                        <div className="p-3.5 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider block mb-1">
                              {dress.category?.name || 'Exclusive'}
                            </span>
                            <h4 className="text-white text-xs font-bold truncate">{dress.title}</h4>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {dress.tags.slice(0, 2).map((t, idx) => (
                              <span key={idx} className="bg-white/5 text-[9px] text-neutral-400 font-semibold px-2 py-0.5 rounded uppercase tracking-wider">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="flex flex-col gap-6">
              
              {/* Category creation panel */}
              <div className="glass-panel border border-white/5 rounded-2xl p-6">
                <h4 className="text-xs font-bold tracking-widest text-neutral-300 uppercase mb-4 flex items-center gap-1.5">
                  <Grid className="h-4 w-4 text-purple-400" />
                  Add New Collection Category
                </h4>
                
                <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Category Name</label>
                    <input
                      type="text"
                      required
                      placeholder="E.g., Winter Coats..."
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-4.5 py-3 text-xs text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Thumbnail Image URL</label>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={newCatThumb}
                      onChange={(e) => setNewCatThumb(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-4.5 py-3 text-xs text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={catSubmitting || !newCatName}
                    className="bg-gradient-to-r from-purple-600 to-pink-500 disabled:opacity-40 text-xs font-bold tracking-wider text-white uppercase py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    CREATE
                  </button>
                </form>
              </div>

              {/* Category list grid */}
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="text-sm font-bold tracking-wider uppercase text-neutral-300">Registered Collections</h3>
                  <span className="text-xs text-neutral-500">{categories.length} Categories Registered</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categories.map((cat) => (
                    <div key={cat.id} className="glass-panel border border-white/5 rounded-xl overflow-hidden flex flex-col h-full">
                      <div className="relative aspect-video bg-neutral-950 overflow-hidden">
                        {cat.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cat.thumbnailUrl} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-purple-500/10 flex items-center justify-center text-purple-400 text-xs font-bold">
                            NO PREVIEW
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="text-white text-xs font-bold">{cat.name}</h4>
                        <span className="text-[9px] text-neutral-500 font-mono tracking-wide block mt-0.5">slug: {cat.slug}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: GUEST DIRECTORY */}
          {activeTab === 'users' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold tracking-wider uppercase text-neutral-300">Registered Guest Directory</h3>
                <span className="text-xs text-neutral-500">{users.length} Unique Sessions</span>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/5 text-neutral-500 text-xs">
                  No guest user sessions recorded in database.
                </div>
              ) : (
                <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/5 text-neutral-400 uppercase tracking-widest text-[9px] font-bold">
                          <th className="p-4">Guest Identifier</th>
                          <th className="p-4">Name</th>
                          <th className="p-4">Registered Date</th>
                          <th className="p-4 text-right">Try-On Output Volume</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-white/3 transition-colors text-neutral-300">
                            <td className="p-4 font-mono text-[10px] text-neutral-400 max-w-[180px] truncate" title={u.guestToken}>
                              {u.guestToken}
                            </td>
                            <td className="p-4 font-bold text-white">
                              {u.optionalName || <span className="text-neutral-500 italic font-normal">Anonymous</span>}
                            </td>
                            <td className="p-4 font-light text-neutral-400">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-right font-extrabold text-white">
                              {u._count?.generations || 0}
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

        </main>

      </div>

      {/* ADD OUTFIT DRAWER/MODAL */}
      <AnimatePresence>
        {showDressModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!dressSubmitting) setShowDressModal(false);
              }}
              className="absolute inset-0 bg-black backdrop-blur-sm"
            />

            {/* Form Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-xl relative z-10 glass-panel rounded-2xl p-6 md:p-8 flex flex-col gap-5 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              
              {/* Header */}
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div className="flex items-center gap-1.5">
                  <Shirt className="h-5 w-5 text-purple-400" />
                  <h3 className="text-white font-extrabold text-base tracking-wide">Add Premium Outfit Dress</h3>
                </div>
                <button
                  disabled={dressSubmitting}
                  onClick={() => setShowDressModal(false)}
                  className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              {dressError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-4 py-3 rounded-xl">
                  {dressError}
                </div>
              )}

              {/* Upload Mode Switcher */}
              <div className="flex border-b border-white/5 pb-1 mb-2 gap-4">
                <button
                  type="button"
                  disabled={dressSubmitting}
                  onClick={() => setUploadMode('single')}
                  className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    uploadMode === 'single'
                      ? 'border-purple-500 text-white'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  Single Outfit
                </button>
                <button
                  type="button"
                  disabled={dressSubmitting}
                  onClick={() => setUploadMode('bulk')}
                  className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    uploadMode === 'bulk'
                      ? 'border-purple-500 text-white'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  Bulk Outfits
                </button>
              </div>

              {uploadMode === 'single' ? (
                /* Form body - Single Mode */
                <form onSubmit={handleAddDress} className="flex flex-col gap-4">
                  
                  <div className="grid grid-cols-2 gap-4">
                    
                    {/* Left Column: Details */}
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Outfit Title*</label>
                        <input
                          type="text"
                          required
                          placeholder="Midnight Stellar Gown..."
                          value={dressTitle}
                          onChange={(e) => setDressTitle(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Collection Category*</label>
                        <select
                          required
                          value={dressCategoryId}
                          onChange={(e) => setDressCategoryId(e.target.value)}
                          className="bg-[#0c0c0f] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                        >
                          <option value="" disabled>Select category...</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Tags (comma-separated)</label>
                        <input
                          type="text"
                          placeholder="Elegant, Satin, Gala..."
                          value={dressTags}
                          onChange={(e) => setDressTags(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                    </div>

                    {/* Right Column: Image Upload Preview */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Garment Display Photo*</label>
                      
                      <div
                        onClick={() => dressFileInputRef.current?.click()}
                        className="border border-dashed border-white/15 hover:border-purple-500/50 rounded-xl aspect-[3/4] bg-white/5 flex flex-col items-center justify-center p-3 text-center cursor-pointer overflow-hidden relative group"
                      >
                        <input
                          type="file"
                          ref={dressFileInputRef}
                          accept="image/*"
                          onChange={handleDressImageChange}
                          className="hidden"
                        />

                        {dressImage ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={dressImage} alt="outfit preview" className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white font-bold">
                              CHANGE IMAGE
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5">
                            <Upload className="h-6 w-6 text-neutral-400" />
                            <span className="text-[10px] text-white font-bold">Upload Outfit Photo</span>
                            <span className="text-[9px] text-neutral-500">Click to select files</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1.5 mt-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Outfit Description</label>
                    <textarea
                      placeholder="A breathtaking evening gown tailored from premium silk..."
                      value={dressDesc}
                      onChange={(e) => setDressDesc(e.target.value)}
                      rows={3}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500/50 resize-none"
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={dressSubmitting}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 disabled:opacity-50 text-xs font-bold tracking-widest text-white uppercase py-3.5 rounded-xl shadow-lg mt-2 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {dressSubmitting ? 'ADDING OUTFIT TO SHOWROOM...' : 'PUBLISH OUTFIT'}
                  </button>

                </form>
              ) : (
                /* Form body - Bulk Mode */
                <form onSubmit={handleAddBulkDresses} className="flex flex-col gap-4">
                  
                  {/* Dropzone */}
                  <div
                    onClick={() => bulkFileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 hover:border-purple-500/50 bg-white/5 hover:bg-white/10 rounded-2xl py-8 px-4 flex flex-col items-center justify-center gap-2 cursor-pointer text-center group transition-all"
                  >
                    <input
                      type="file"
                      ref={bulkFileInputRef}
                      accept="image/*"
                      multiple
                      onChange={handleBulkFilesChange}
                      className="hidden"
                    />
                    <Upload className="h-8 w-8 text-neutral-400 group-hover:text-purple-400 transition-colors" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Drag & Drop Garment Images</span>
                    <span className="text-[10px] text-neutral-500">Or click to browse files from your computer (Multiple allowed)</span>
                  </div>

                  {/* Selected items list */}
                  {bulkDresses.length > 0 && (
                    <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                        Selected Outfits ({bulkDresses.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {bulkDresses.map((item) => (
                          <div key={item.id} className="bg-white/5 border border-white/5 rounded-xl p-2.5 flex gap-3 items-center relative group">
                            {/* Thumbnail */}
                            <div className="h-14 w-10 shrink-0 bg-neutral-900 rounded-lg overflow-hidden relative">
                              {item.previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.previewUrl} alt="preview" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="h-3 w-3 rounded-full border-t border-purple-500 animate-spin" />
                                </div>
                              )}
                            </div>

                            {/* Title input */}
                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                              <label className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest block">Outfit Title</label>
                              <input
                                type="text"
                                required
                                value={item.title}
                                onChange={(e) => handleUpdateBulkTitle(item.id, e.target.value)}
                                className="bg-black/20 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-purple-500/50 w-full"
                                placeholder="Enter title..."
                              />
                            </div>

                            {/* Remove button */}
                            <button
                              type="button"
                              disabled={dressSubmitting}
                              onClick={() => handleRemoveBulkItem(item.id)}
                              className="text-red-400 hover:text-red-300 p-1 transition-colors cursor-pointer shrink-0 self-center"
                              title="Remove from upload list"
                            >
                              <XCircle className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shared Metadata Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Shared Category*</label>
                      <select
                        required
                        value={bulkCategoryId}
                        onChange={(e) => setBulkCategoryId(e.target.value)}
                        className="bg-[#0c0c0f] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                      >
                        <option value="" disabled>Select category...</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Shared Tags (comma-separated)</label>
                      <input
                        type="text"
                        placeholder="E.g., Elegant, Silk..."
                        value={dressTags}
                        onChange={(e) => setDressTags(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Shared Description (optional)</label>
                    <textarea
                      placeholder="Enter description that applies to this batch..."
                      value={dressDesc}
                      onChange={(e) => setDressDesc(e.target.value)}
                      rows={2}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50 resize-none"
                    />
                  </div>

                  {/* Bulk Upload Progress Loader */}
                  {dressSubmitting && bulkUploadProgress > 0 && (
                    <div className="flex flex-col gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
                      <div className="flex justify-between items-center text-[10px] font-bold text-purple-300 uppercase tracking-wider">
                        <span>Uploading Garments...</span>
                        <span>{bulkUploadProgress} / {bulkDresses.length}</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                          style={{ width: `${(bulkUploadProgress / bulkDresses.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-neutral-400 truncate block">
                        Uploading: "{bulkDresses[bulkUploadProgress - 1]?.title}"...
                      </span>
                    </div>
                  )}

                  {/* Bulk Submit button */}
                  <button
                    type="submit"
                    disabled={dressSubmitting || bulkDresses.length === 0 || !bulkCategoryId}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold tracking-widest text-white uppercase py-3.5 rounded-xl shadow-lg mt-2 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {dressSubmitting ? `UPLOADING (${bulkUploadProgress}/${bulkDresses.length})...` : `PUBLISH ${bulkDresses.length} OUTFITS`}
                  </button>

                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
