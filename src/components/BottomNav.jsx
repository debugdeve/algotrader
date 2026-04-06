import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Heart, User } from 'lucide-react';

const BottomNav = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white/80 backdrop-blur-xl border-t border-slate-100 px-8 py-4 flex justify-between items-center z-50 rounded-t-3xl">
      <NavLink to="/home" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Home size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-medium tracking-tight">Home</span>
      </NavLink>
      
      <NavLink to="/search" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Search size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-medium tracking-tight">Search</span>
      </NavLink>
      
      <NavLink to="/saved" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Heart size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-medium tracking-tight">Saved</span>
      </NavLink>
      
      <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <User size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-medium tracking-tight">Profile</span>
      </NavLink>
    </div>
  );
};

export default BottomNav;
