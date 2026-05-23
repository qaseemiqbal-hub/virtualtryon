'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Upload, 
  ChevronRight, 
  X, 
  Download, 
  RefreshCw, 
  ArrowRight, 
  User, 
  Heart, 
  Eye, 
  Lock,
  Shirt,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';

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

interface Generation {
  id: string;
  originalImageUrl: string;
  generatedImageUrl: string | null;
  status: string; // PENDING, PROCESSING, COMPLETED, FAILED
  error: string | null;
  dress: Dress;
}

export default function FashionStudio() {
  // Session States
  const [guestToken, setGuestToken] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');

  // Catalog States
  const [categories, setCategories] = useState<Category[]>([]);
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(true);

  // Drawer States
  const [selectedDress, setSelectedDress] = useState<Dress | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Generation & Polling States
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string>('PENDING');
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [aiTipIndex, setAiTipIndex] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Recent try-ons shelf
  const [recentTryOns, setRecentTryOns] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI tips carousel during scanning
  const aiTips = [
    "AURA AI is mapping your body contours...",
    "Matching camera angle and studio lighting...",
    "Sewing the garment fabrics naturally...",
    "Preserving skin tone, hairstyle, and shadows...",
    "Applying high-definition fabric textures..."
  ];

  // Timer to track generation elapsed time
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isGenerating) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isGenerating]);

  const getDetailedStatus = () => {
    if (elapsedSeconds < 8) return "Securing AI Studio Connection...";
    if (elapsedSeconds < 25) return "Allocating high-speed Nvidia A100 GPU...";
    if (elapsedSeconds < 55) return "GPU Cold Start: Booting container (can take 1-2 min)...";
    if (elapsedSeconds < 90) return "Downloading SDXL VTON weights (15GB)...";
    return "Fusing garment details onto body (almost ready)...";
  };

  // 1. Session Setup on Load
  useEffect(() => {
    // Generate UUID
    let token = localStorage.getItem('aura_guest_token');
    if (!token) {
      token = 'guest_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('aura_guest_token', token);
    }
    setGuestToken(token);

    const savedName = localStorage.getItem('aura_guest_name');
    if (savedName) {
      setGuestName(savedName);
    }

    // Load recent try-ons from local storage
    const savedTryOns = localStorage.getItem('aura_recent_tryons');
    if (savedTryOns) {
      try {
        setRecentTryOns(JSON.parse(savedTryOns));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // 2. Fetch Catalog Data
  useEffect(() => {
    async function loadCatalog() {
      setLoadingCatalog(true);
      try {
        const [catsRes, dressesRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/dresses')
        ]);
        const catsData = await catsRes.json();
        const dressesData = await dressesRes.json();

        if (catsData.success) setCategories(catsData.data);
        if (dressesData.success) setDresses(dressesData.data);
      } catch (err) {
        console.error('Failed to load catalog data:', err);
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  // 3. AI Tips cycle
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setAiTipIndex((prev) => (prev + 1) % aiTips.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // 4. Polling Generation Status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (isGenerating && generationId) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/generate-tryon/status/${generationId}`);
          const result = await res.json();

          if (result.success) {
            const gen = result.data;
            setGenerationStatus(gen.status);

            if (gen.status === 'COMPLETED') {
              setIsGenerating(false);
              setGeneratedResult(gen.generatedImageUrl);
              clearInterval(pollInterval);
              
              // Trigger Celebration!
              confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#a855f7', '#ec4899', '#3b82f6']
              });

              // Add to recent try-ons
              const newTryOn = {
                id: gen.id,
                imageUrl: gen.generatedImageUrl,
                originalUrl: gen.originalImageUrl,
                dressTitle: selectedDress?.title || 'Luxury Dress',
                dressImageUrl: selectedDress?.imageUrl,
                createdAt: new Date().toISOString()
              };
              
              const updated = [newTryOn, ...recentTryOns.filter(r => r.id !== gen.id)].slice(0, 10);
              setRecentTryOns(updated);
              localStorage.setItem('aura_recent_tryons', JSON.stringify(updated));

            } else if (gen.status === 'FAILED') {
              setIsGenerating(false);
              setUploadError(gen.error || 'AI generation failed. Please try a different photo.');
              clearInterval(pollInterval);
            }
          } else {
            console.error('❌ Status check returned success=false:', result.message);
            setIsGenerating(false);
            setUploadError(result.message || 'Failed to check AI processing state.');
            clearInterval(pollInterval);
          }
        } catch (pollErr) {
          console.error('❌ Error checking tryon status:', pollErr);
          setIsGenerating(false);
          setUploadError('Failed to contact the styling server. Polling aborted.');
          clearInterval(pollInterval);
        }
      }, 2500);
    }

    return () => clearInterval(pollInterval);
  }, [isGenerating, generationId, recentTryOns, selectedDress]);

  // Welcome modal submit
  const handleSaveName = () => {
    const formatted = nameInput.trim();
    if (formatted) {
      localStorage.setItem('aura_guest_name', formatted);
      setGuestName(formatted);
    }
    setShowNameModal(false);
  };

  // Helper to resize and compress human image on the client side
  // This avoids exceeding Vercel's strict 4.5 MB request payload limits
  const resizeAndCompressImage = (file: File, maxWidth: number = 1024, maxHeight: number = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          // Compress as high-quality JPEG (0.85) to minimize base64 size (normally 100kb-300kb)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          resolve(compressedBase64);
        };
        img.onerror = (err) => reject(new Error('Failed to load image for resizing.'));
        img.src = event.target?.result as string;
      };
      reader.onerror = (err) => reject(new Error('Failed to read selected file.'));
      reader.readAsDataURL(file);
    });
  };

  // Image Upload handler (resizes & compresses on client, then converts to base64)
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadError(null);
      setIsGenerating(false); // Make sure generator is idle
      try {
        const resizedBase64 = await resizeAndCompressImage(file);
        setUploadedImage(resizedBase64);
      } catch (err: any) {
        console.error('❌ Image compression failed:', err);
        setUploadError(err.message || 'Failed to process selected image file.');
      }
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type.indexOf('image/') === -1) {
        setUploadError('Please drop an image file (PNG, JPG, JPEG).');
        return;
      }
      setUploadError(null);
      setIsGenerating(false); // Make sure generator is idle
      try {
        const resizedBase64 = await resizeAndCompressImage(file);
        setUploadedImage(resizedBase64);
      } catch (err: any) {
        console.error('❌ Dropped image compression failed:', err);
        setUploadError(err.message || 'Failed to process dropped image file.');
      }
    }
  };

  // Trigger AI generation
  const handleStartTryOn = async () => {
    if (!uploadedImage || !selectedDress) return;

    setIsGenerating(true);
    setUploadError(null);
    setGeneratedResult(null);
    setGenerationStatus('PENDING');

    try {
      const res = await fetch('/api/generate-tryon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guestToken,
          humanImage: uploadedImage,
          dressId: selectedDress.id,
          optionalName: guestName,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setGenerationId(result.data.id);
        setGenerationStatus(result.data.status);
      } else {
        setIsGenerating(false);
        setUploadError(result.message || 'Failed to trigger AI try-on.');
      }
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
      setUploadError('Server error while initiating virtual try-on.');
    }
  };

  const filteredDresses = selectedCategory === 'all'
    ? dresses
    : dresses.filter(d => d.categoryId === selectedCategory);

  return (
    <div className="flex-1 gradient-bg-glow flex flex-col pb-20">
      
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-purple-400">AURA</span>
            <span className="text-[10px] block tracking-[0.2em] font-light text-neutral-500 -mt-1">AI FASHION STUDIO</span>
          </div>
        </div>

        {/* Admin Portal is accessible directly via URL, keeping the landing page clean */}
      </header>

      {/* HERO SECTION */}
      <section className="relative px-6 py-16 md:py-24 text-center max-w-4xl mx-auto flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 font-medium mb-6"
        >
          <Shirt className="h-3.5 w-3.5" />
          Virtual Showroom Live - Zero Setup Required
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-none"
        >
          Step Into the Future <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">
            of Personal Styling
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-6 text-base sm:text-lg text-neutral-400 max-w-2xl font-light leading-relaxed"
        >
          Upload your photo, select any premium gown or outfit, and see yourself instantly fitted using state-of-the-art AI. Experience premium fashion try-ons from your browser.
        </motion.p>
      </section>

      {/* MAIN CONTAINER */}
      <main className="px-6 md:px-12 max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {selectedCategory === 'all' ? (
          /* COLLECTIONS GRID VIEW */
          <section className="w-full flex-1 flex flex-col">
            <div className="flex justify-between items-end border-b border-white/5 pb-4 mb-8">
              <h2 className="text-lg font-bold tracking-wider uppercase text-neutral-300 flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-purple-400" />
                Select a Collection
              </h2>
              <span className="text-xs text-neutral-500">{categories.length} Collections Available</span>
            </div>

            {loadingCatalog ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-[4/5] rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                {categories.map((cat) => {
                  const coverImage = cat.thumbnailUrl || 
                    dresses.find(d => d.categoryId === cat.id)?.imageUrl || 
                    (cat.slug === 'evening-gowns' ? 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=600&auto=format&fit=crop' :
                     cat.slug === 'summer-dresses' ? 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=600&auto=format&fit=crop' :
                     cat.slug === 'cocktail-party' ? 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600&auto=format&fit=crop' :
                     cat.slug === 'luxury-velvet' ? 'https://images.unsplash.com/photo-1539008835657-9e8e62c82f62?q=80&w=600&auto=format&fit=crop' :
                     'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600&auto=format&fit=crop');

                  return (
                    <motion.div
                      whileHover={{ y: -6, scale: 1.02 }}
                      transition={{ duration: 0.3 }}
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className="group relative aspect-[4/5] rounded-2xl overflow-hidden glass-panel border border-white/5 hover:border-purple-500/30 transition-all duration-500 shadow-xl cursor-pointer flex flex-col justify-end"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={coverImage} 
                        alt={cat.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      
                      {/* Overlay Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent opacity-85" />
                      
                      {/* Info */}
                      <div className="relative z-10 p-6">
                        <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block mb-1">
                          Collection
                        </span>
                        <h3 className="text-white font-extrabold text-xl tracking-wide group-hover:text-purple-300 transition-colors">
                          {cat.name}
                        </h3>
                        
                        <span className="mt-4 inline-flex items-center gap-1.5 text-xs text-neutral-400 group-hover:text-white transition-colors">
                          Browse Collection
                          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* OUTFITS IN SELECTED COLLECTION VIEW */
          <section className="w-full flex-1 flex flex-col">
            {/* Header / Back Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors border border-white/5"
                  title="Back to Collections"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </button>
                <div>
                  <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest block">
                    Now Viewing
                  </span>
                  <h2 className="text-xl font-extrabold tracking-wide text-white">
                    {categories.find(c => c.id === selectedCategory)?.name || 'Collection'}
                  </h2>
                </div>
              </div>
              
              <span className="text-xs text-neutral-500 self-end sm:self-center">
                {filteredDresses.length} Outfits Available
              </span>
            </div>

            {/* Outfits Grid */}
            {loadingCatalog ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                ))}
              </div>
            ) : filteredDresses.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
                <p className="text-neutral-500 text-sm">No outfits found in this collection.</p>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="mt-4 text-xs bg-purple-600/25 hover:bg-purple-600/40 text-purple-300 font-bold px-4 py-2 rounded-lg border border-purple-500/20 uppercase tracking-wider"
                >
                  Return to Collections
                </button>
              </div>
            ) : (
              <motion.div 
                layout
                className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-16"
              >
                <AnimatePresence mode="popLayout">
                  {filteredDresses.map((dress) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      key={dress.id}
                      onClick={() => {
                        setSelectedDress(dress);
                        setUploadedImage(null);
                        setGeneratedResult(null);
                        setUploadError(null);
                      }}
                      className="group relative rounded-2xl overflow-hidden glass-panel border border-white/5 hover:border-white/20 transition-all duration-500 shadow-xl aspect-[3/4] cursor-pointer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={dress.imageUrl} 
                        alt={dress.title}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent opacity-0 group-hover:opacity-90 transition-opacity duration-300 flex flex-col justify-end p-4 md:p-6" />

                      {/* Info Overlay (Visible on Hover / Focus) */}
                      <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                        <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block mb-1">
                          {dress.category?.name || 'Exclusive Gown'}
                        </span>
                        <h4 className="text-white font-extrabold text-sm md:text-base tracking-wide truncate">
                          {dress.title}
                        </h4>
                        
                        <span className="mt-3 inline-flex items-center gap-1 text-[10px] md:text-xs text-white bg-gradient-to-r from-purple-600 to-pink-500 font-bold tracking-widest px-3.5 py-2 rounded-xl shadow-lg self-start">
                          TRY THIS ON
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>

                      {/* Mobile interactive indicator */}
                      <div className="absolute bottom-3 right-3 md:hidden bg-black/60 backdrop-blur-md border border-white/10 rounded-full p-2 text-white shadow-lg">
                        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </section>
        )}
      </main>

      {/* Recent try-ons removed for user privacy */}

      {/* TRY-ON SIDE-DRAWER */}
      <AnimatePresence>
        {selectedDress && (
          <>
            {/* Backdrop filter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isGenerating) setSelectedDress(null);
              }}
              className="fixed inset-0 bg-black z-40 backdrop-blur-sm"
            />

            {/* Main Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.4, ease: 'easeOut' }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] lg:w-[700px] h-full bg-[#0a0a0d] border-l border-white/5 z-50 overflow-y-auto shadow-2xl flex flex-col justify-between"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0d0d12]">
                <div className="flex items-center gap-2">
                  <Shirt className="h-5 w-5 text-purple-400" />
                  <span className="text-sm font-bold tracking-wider uppercase text-neutral-300">AURA AI Try-On Studio</span>
                </div>
                <button
                  disabled={isGenerating}
                  onClick={() => setSelectedDress(null)}
                  className="h-9 w-9 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors disabled:opacity-40"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 md:p-8 flex-1 flex flex-col gap-6">
                
                {/* Error Banner */}
                {uploadError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
                    <Info className="h-4 w-4 shrink-0 text-red-400" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Grid layout for Selected Dress & Human Upload */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* Left: Dress Preview */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest block">Selected garment</span>
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-neutral-950 border border-white/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={selectedDress.imageUrl} 
                        alt={selectedDress.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        <h4 className="text-white text-sm font-bold truncate">{selectedDress.title}</h4>
                      </div>
                    </div>
                  </div>

                  {/* Right: Human Upload / Generative screen */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest block">Your Photo</span>
                    
                    {/* Scanner / Upload Display */}
                    <div 
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className="relative aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border border-dashed border-white/15 hover:border-purple-500/50 flex flex-col items-center justify-center p-4 text-center transition-colors group cursor-pointer"
                      onClick={() => {
                        if (!uploadedImage && !isGenerating) fileInputRef.current?.click();
                      }}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden" 
                      />

                      {/* Scenario 1: Uploading State (Scanner Animation) */}
                      {isGenerating ? (
                        <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center p-4">
                          {uploadedImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={uploadedImage} 
                              alt="Uploading person" 
                              className="absolute inset-0 w-full h-full object-cover opacity-35" 
                            />
                          )}
                          <div className="absolute inset-0 scanner-line" />
                          
                          <div className="relative z-10 flex flex-col items-center gap-3 p-4 text-center">
                            <div className="h-10 w-10 rounded-full border-t-2 border-r-2 border-purple-500 animate-spin" />
                            <p className="text-white font-bold text-sm tracking-wide mt-2">{getDetailedStatus()}</p>
                            <p className="text-[11px] text-neutral-400 italic max-w-[200px]">
                              {aiTips[aiTipIndex]}
                            </p>
                          </div>
                        </div>
                      ) : generatedResult ? (
                        /* Scenario 2: Try-On complete outcome display */
                        <div className="absolute inset-0 bg-neutral-950">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={generatedResult} 
                            alt="AI Virtual Try-On Result" 
                            className="w-full h-full object-cover animate-fade-in"
                          />
                        </div>
                      ) : uploadedImage ? (
                        /* Scenario 3: Human image uploaded, previewing */
                        <div className="absolute inset-0 bg-neutral-900 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={uploadedImage} 
                            alt="Uploaded customer" 
                            className="w-full h-full object-cover" 
                          />
                          
                          {/* Delete Hover */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedImage(null);
                              setGeneratedResult(null);
                            }}
                            className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center text-white border border-white/5 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        /* Scenario 4: Awaiting upload state */
                        <div className="flex flex-col items-center gap-3 p-4">
                          <div className="h-12 w-12 rounded-full bg-white/5 border border-white/5 group-hover:bg-purple-500/10 group-hover:border-purple-500/30 flex items-center justify-center text-neutral-400 group-hover:text-purple-400 transition-all duration-300">
                            <Upload className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-white text-xs font-bold">Drag & drop your photo</p>
                            <p className="text-neutral-500 text-[10px] mt-1">or click to browse local files</p>
                          </div>
                          <span className="text-[10px] text-neutral-600 block bg-neutral-950/40 px-2 py-1 rounded-full uppercase tracking-wider">
                            PNG, JPG, JPEG (Max 8MB)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Try-on guest name section removed */}

              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-white/5 bg-[#0d0d12]">
                {generatedResult ? (
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setGeneratedResult(null);
                        setUploadedImage(null);
                      }}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold tracking-wider text-white uppercase py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try Another
                    </button>
                    
                    <a
                      href={generatedResult}
                      download={`aura-tryon-${generationId}.jpg`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 hover:shadow-lg hover:shadow-purple-600/20 text-xs font-bold tracking-wider text-white uppercase py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Try-On
                    </a>
                  </div>
                ) : (
                  <button
                    disabled={!uploadedImage || isGenerating}
                    onClick={handleStartTryOn}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 disabled:from-neutral-800 disabled:to-neutral-900 text-xs font-bold tracking-widest text-white uppercase py-4 rounded-xl transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        AI GENERATING IN PROGRESS...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        GENERATE AI VIRTUAL TRY-ON
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Welcome Name Modal Removed */}

    </div>
  );
}
