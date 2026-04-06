import React from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, ShoppingBag, ChevronRight, Star } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { MOCK_PRODUCTS, PLATFORMS } from '../data/mockData';

const HomeScreen = () => {
  const user = useAppStore((state) => state.user);
  const navigate = useNavigate();
  const categories = ['Electronics', 'Groceries', 'Personal Care', 'Beauty', 'Home & Kitchen'];

  return (
    <div className="flex flex-col bg-slate-50/30 min-h-screen">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <ShoppingBag size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Hey {user?.name?.split(' ')[0] || 'Guest'}! 👋</h2>
            <p className="text-xs text-slate-400 font-medium">Find the best price today!</p>
          </div>
        </div>
        <button className="w-10 h-10 bg-surface rounded-full flex items-center justify-center text-slate-400">
          <Bell size={20} />
        </button>
      </div>

      {/* Sticky Search Bar area */}
      <div className="px-6 py-4 sticky top-0 bg-white/80 backdrop-blur-xl z-20">
        <motion.div 
          onClick={() => navigate('/search')}
          className="w-full flex items-center gap-3 px-5 py-4 bg-surface/50 border border-slate-100 rounded-3xl text-slate-400 shadow-soft cursor-pointer hover:bg-white transition-all"
        >
          <Search size={20} className="text-primary" />
          <span className="font-medium">Search for groceries, electronics...</span>
        </motion.div>
      </div>

      {/* Hero Strip / Platforms */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar py-2">
          {Object.entries(PLATFORMS).map(([key, platform]) => (
            <motion.div 
              key={key} 
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 flex flex-col items-center gap-2"
            >
              <div 
                className="w-14 h-14 bg-white rounded-2xl shadow-soft border border-slate-50 flex items-center justify-center overflow-hidden"
              >
                <div 
                  className="w-1 h-full absolute left-0" 
                  style={{ backgroundColor: platform.color }} 
                />
                <span className="text-[10px] font-bold text-center px-2">{platform.name.split(' ')[0]}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Categories */}
      <div className="px-6 py-4">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
          Quick Categories
          <button className="text-xs text-primary font-bold">See All</button>
        </h3>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar">
          {categories.map((cat) => (
            <button key={cat} className="flex-shrink-0 px-5 py-2.5 bg-white border border-slate-100 rounded-full text-xs font-bold text-slate-500 shadow-soft whitespace-nowrap">
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Trending Products */}
      <div className="px-6 py-8 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">Trending Products</h3>
          <ChevronRight size={20} className="text-slate-300" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {MOCK_PRODUCTS.map((product) => (
            <motion.div 
              key={product.id}
              whileTap={{ scale: 0.98 }}
              className="antigravity-card p-4 flex flex-col items-center relative overflow-hidden group"
              onClick={() => {
                useAppStore.getState().setSearchQuery(product.name);
                navigate(`/results?q=${encodeURIComponent(product.name)}`);
              }}
            >
              <div className="w-full h-32 bg-slate-50 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="w-full text-left">
                <div className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold mb-1">
                  <Star size={10} fill="currentColor" />
                  4.8 • Top Trend
                </div>
                <h4 className="text-xs font-bold text-slate-800 line-clamp-2 mb-3 h-8">{product.name}</h4>
                <button className="w-full py-2.5 bg-primary/5 text-primary text-[10px] font-bold rounded-xl flex items-center justify-center gap-1">
                  Compare Prices
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
