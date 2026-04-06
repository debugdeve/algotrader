import React from 'react';
import { motion } from 'framer-motion';
import { User, LogOut, Settings, Bell, Shield, HelpCircle, ChevronRight, Apple } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';

const ProfileScreen = () => {
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: <Settings size={20} />, label: 'Account Settings' },
    { icon: <Bell size={20} />, label: 'Notifications' },
    { icon: <Shield size={20} />, label: 'Privacy & Security' },
    { icon: <HelpCircle size={20} />, label: 'Help & Support' },
  ];

  return (
    <div className="flex flex-col bg-slate-50/30 min-h-screen">
      <div className="bg-white px-6 pt-16 pb-12 flex flex-col items-center border-b border-slate-50 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] bg-primary/5 blur-[80px] rounded-full" />
        
        <div className="w-28 h-28 bg-primary shadow-premium rounded-[2.5rem] flex items-center justify-center text-white relative z-10 mb-6">
          <User size={50} strokeWidth={1.5} />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-success rounded-full border-4 border-white flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-slate-800 tracking-tight relative z-10">{user?.name || 'Guest User'}</h2>
        <p className="text-sm text-slate-400 font-medium mt-1 relative z-10">{user?.phone || 'johndoe@example.com'}</p>
        
        <motion.button 
          whileTap={{ scale: 0.95 }}
          className="mt-6 px-6 py-2.5 bg-white border border-slate-100 rounded-full text-xs font-bold text-slate-500 shadow-soft relative z-10"
        >
          Edit Profile
        </motion.button>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-white rounded-[2rem] shadow-soft border border-slate-50 overflow-hidden">
          {menuItems.map((item, index) => (
            <motion.button 
              key={index}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center justify-between p-5 text-left border-b border-slate-50 last:border-0`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                  {item.icon}
                </div>
                <span className="font-bold text-slate-700">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-slate-200" />
            </motion.button>
          ))}
        </div>

        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="w-full bg-red-50 text-red-500 py-5 rounded-[2rem] font-bold flex items-center justify-center gap-3 shadow-soft border border-red-100/50"
        >
          <LogOut size={20} />
          Sign Out
        </motion.button>

        <div className="text-center pt-8">
          <p className="text-[10px] text-slate-300 font-bold tracking-widest uppercase">Antigravity v1.0.4 r2</p>
          <p className="text-[10px] text-slate-200 mt-2">© 2026 Antigravity Labs</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
