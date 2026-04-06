import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Share2, Heart, Filter, ExternalLink, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getMockResults, PLATFORMS } from '../data/mockData';
import { useAppStore } from '../store/useAppStore';

const SearchResultsScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(null);
  const query = new URLSearchParams(location.search).get('q') || 'Product';
  const toggleSaved = useAppStore((state) => state.toggleSaved);
  const savedItems = useAppStore((state) => state.savedItems);
  const isSaved = savedItems.some(item => item.name === query);

  useEffect(() => {
    setLoading(true);
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setResults(getMockResults(query));
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [query]);

  const handleBuyNow = (platform) => {
    setRedirecting(platform);
    setTimeout(() => {
      setRedirecting(null);
      // In a real app, use Linking or window.location
      alert(`Redirecting to ${PLATFORMS[platform].name}...`);
    }, 2000);
  };

  return (
    <div className="flex flex-col bg-slate-50/30 min-h-screen">
      {/* Search Header */}
      <div className="bg-white px-6 pt-12 pb-6 sticky top-0 z-30 flex items-center justify-between border-b border-slate-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-lg font-bold tracking-tight line-clamp-1">{query}</h2>
            <p className="text-[10px] text-primary font-bold tracking-wider uppercase">Comparing 7 Platforms</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => toggleSaved({ id: query, name: query })}
            className={`p-2 rounded-full border transition-all ${isSaved ? 'bg-red-50 border-red-100 text-red-500' : 'bg-white border-slate-100 text-slate-300'}`}
          >
            <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
          <button className="p-2 bg-white border border-slate-100 rounded-full text-slate-300">
            <Share2 size={20} />
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Filter Strip */}
        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-xs font-bold shadow-soft">
            <Filter size={14} /> Lowest Price
          </button>
          <button className="px-4 py-2 bg-white border border-slate-100 rounded-full text-xs font-bold text-slate-500 shadow-soft">
            Fastest Delivery
          </button>
          <button className="px-4 py-2 bg-white border border-slate-100 rounded-full text-xs font-bold text-slate-500 shadow-soft">
            Highly Rated
          </button>
        </div>

        {/* Results List */}
        <div className="space-y-4">
          {loading ? (
            // Skeleton Loading State
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="antigravity-card p-4 flex gap-4 animate-pulse">
                <div className="w-16 h-16 bg-slate-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-50 rounded w-1/4" />
                </div>
              </div>
            ))
          ) : (
            results.map((res, index) => {
              const platform = PLATFORMS[res.platform];
              return (
                <motion.div 
                  key={res.platform}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`antigravity-card p-5 flex items-center gap-5 relative overflow-hidden ${!res.available ? 'opacity-50 grayscale bg-slate-50' : ''}`}
                >
                  <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: platform.color }} />
                  
                  {res.best && (
                    <div className="absolute top-0 right-0 bg-success text-white px-3 py-1 rounded-bl-xl text-[9px] font-bold tracking-wider flex items-center gap-1">
                      BEST PRICE <CheckCircle2 size={10} />
                    </div>
                  )}

                  <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center font-bold text-xs ring-1 ring-slate-100/50">
                    {/* Simplified logo placeholder */}
                    <span style={{ color: platform.color }}>{platform.name.split(' ')[0]}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      {platform.name}
                      {platform.type === 'quick' && <Clock size={12} className="text-primary" />}
                    </h4>
                    
                    {!res.available ? (
                      <p className="text-xs font-medium text-slate-400 mt-1">Not Available</p>
                    ) : (
                      <>
                        <p className="text-2xl font-black text-slate-900 mt-1 tracking-tight">₹{res.price}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded-md text-slate-500 flex items-center gap-1">
                            <Clock size={10} /> {res.delivery}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {res.available && (
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleBuyNow(res.platform)}
                      className="p-3 bg-primary text-white rounded-2xl shadow-premium"
                    >
                      <ExternalLink size={20} />
                    </motion.button>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <AnimatePresence>
        {redirecting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 text-center"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full mb-8 shadow-premium"
            />
            <h2 className="text-2xl font-black tracking-tight mb-2">Hang tight!</h2>
            <p className="text-slate-400 font-medium">Redirecting you to <span className="font-bold text-slate-800">{PLATFORMS[redirecting].name}</span> app for the best checkout experience.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchResultsScreen;
