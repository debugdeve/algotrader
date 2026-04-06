import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowLeft, X, TrendingUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);

  const recentSearches = ['Milk', 'iPhone 15', 'Sony Headphones'];
  const trending = ['Maggi 12 Pack', 'Protein Powder', 'Peanut Butter'];

  const handleSearch = (q) => {
    const searchVal = q || query;
    if (searchVal.trim()) {
      setSearchQuery(searchVal);
      navigate(`/results?q=${encodeURIComponent(searchVal)}`);
    }
  };

  return (
    <div className="flex flex-col bg-white min-h-screen">
      <div className="px-6 pt-12 pb-4 flex items-center gap-4 border-b border-slate-50 sticky top-0 bg-white z-30">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
          <input 
            autoFocus
            type="text" 
            placeholder="Search for a product..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-12 pr-12 py-3.5 bg-surface border border-transparent rounded-2xl focus:bg-white focus:border-primary/20 outline-none transition-all font-medium"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-8 overflow-y-auto">
        {/* Recent Searches */}
        <div>
          <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
            <Clock size={16} /> Recent Searches
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((s) => (
              <button 
                key={s} 
                onClick={() => handleSearch(s)}
                className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-xs font-bold text-slate-600"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Trending Searches */}
        <div>
          <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> Popular Now
          </h3>
          <div className="space-y-4">
            {trending.map((t) => (
              <motion.button 
                key={t}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSearch(t)}
                className="w-full flex items-center gap-4 py-1 text-left"
              >
                <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary">
                  <Search size={18} />
                </div>
                <span className="font-semibold text-slate-700">{t}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchScreen;
