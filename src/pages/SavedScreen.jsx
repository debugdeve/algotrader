import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Search, ChevronRight, ShoppingBag } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';

const SavedScreen = () => {
  const savedItems = useAppStore((state) => state.savedItems);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col bg-white min-h-screen">
      <div className="px-6 pt-12 pb-6 border-b border-slate-50 sticky top-0 bg-white z-30">
        <h2 className="text-3xl font-extrabold tracking-tight">Saved Items</h2>
        <p className="text-xs text-slate-400 font-medium mt-1">Products you're watching</p>
      </div>

      <div className="flex-1 p-6">
        {savedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6">
              <Heart size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Your wishlist is empty</h3>
            <p className="text-slate-400 font-medium max-w-[200px] mb-8">Save products to track price changes across platforms.</p>
            <button 
              onClick={() => navigate('/search')}
              className="px-8 py-4 bg-primary text-white rounded-2xl font-bold shadow-premium flex items-center gap-2"
            >
              <Search size={18} /> Explore Products
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {savedItems.map((item) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate(`/results?q=${encodeURIComponent(item.name)}`)}
                className="antigravity-card p-4 flex items-center gap-4 group cursor-pointer"
              >
                <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                  <ShoppingBag size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800">{item.name}</h4>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-wider mt-0.5">Tracked on 7 platforms</p>
                </div>
                <button className="p-2 text-slate-300 group-hover:text-primary transition-colors">
                  <ChevronRight size={20} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedScreen;
