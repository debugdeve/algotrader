import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';

const OnboardingScreen = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const setUser = useAppStore((state) => state.setUser);
  const user = useAppStore((state) => state.user);
  const navigate = useNavigate();

  const handleFinish = (e) => {
    e.preventDefault();
    if (firstName.trim()) {
      setUser({ ...user, name: `${firstName} ${lastName}`.trim(), onboarded: true });
      navigate('/home');
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-8 pt-24 bg-white relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6">
          <Sparkles size={32} />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">Hi there! 👋</h1>
        <p className="text-slate-400 font-medium">Let's personalize your experience. What should we call you?</p>
      </motion.div>

      <form onSubmit={handleFinish} className="space-y-6 flex-1">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-800 ml-1">First Name</label>
          <input 
            autoFocus
            type="text" 
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="input-field text-lg font-semibold"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-800 ml-1">Last Name</label>
          <input 
            type="text" 
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="input-field text-lg font-semibold"
          />
        </div>

        <div className="flex-1" /> {/* Spacer */}

        <motion.div 
          className="fixed bottom-12 left-8 right-8 max-w-[420px] mx-auto"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          <motion.button 
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!firstName.trim()}
            className="antigravity-button w-full bg-primary text-white py-5 rounded-3xl font-bold flex items-center justify-center gap-3 shadow-premium text-lg"
          >
            Let's Go <ArrowRight size={22} />
          </motion.button>
        </motion.div>
      </form>
    </div>
  );
};

export default OnboardingScreen;
