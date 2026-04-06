import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ChevronRight, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';

const AuthScreen = () => {
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState('');
  const setUser = useAppStore((state) => state.setUser);
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    // Mock login
    setUser({ name: 'Guest User', onboarded: false });
    navigate('/onboarding');
  };

  const handleMobileSubmit = (e) => {
    e.preventDefault();
    if (phoneNumber.length === 10) {
      setOtpMode(true);
    }
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (otp.length === 4) {
      setUser({ phone: phoneNumber, onboarded: false });
      navigate('/onboarding');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 bg-white overflow-hidden relative">
      {/* Background patterns */}
      <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[40%] bg-primary/5 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[40%] bg-primary/5 blur-[100px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12 text-center"
      >
        <div className="w-24 h-24 bg-primary rounded-3xl mx-auto flex items-center justify-center shadow-premium mb-6">
          <div className="w-12 h-12 bg-white/20 blur-[2px] rounded-xl absolute animate-pulse" />
          <div className="w-8 h-8 border-4 border-white rounded-lg rotate-45" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Antigravity</h1>
        <p className="text-slate-400 font-medium">Compare. Save. Shop Smart.</p>
      </motion.div>

      <div className="w-full space-y-4 max-w-sm relative z-10">
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleLogin}
          className="antigravity-button w-full flex items-center justify-center gap-3 bg-white border border-slate-200 py-4 rounded-2xl font-semibold shadow-soft hover:shadow-premium"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Continue with Google
        </motion.button>

        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowBottomSheet(true)}
          className="antigravity-button w-full flex items-center justify-center gap-3 bg-primary text-white py-4 rounded-2xl font-semibold shadow-premium"
        >
          <Phone size={20} />
          Continue with Mobile
        </motion.button>
      </div>

      <AnimatePresence>
        {showBottomSheet && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBottomSheet(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 pb-12 z-50 shadow-premium max-w-[480px] mx-auto"
            >
              <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold tracking-tight">
                  {otpMode ? 'Verify Number' : 'Enter Number'}
                </h2>
                <button onClick={() => setShowBottomSheet(false)} className="p-2 bg-slate-50 rounded-full text-slate-400">
                  <X size={20} />
                </button>
              </div>

              {!otpMode ? (
                <form onSubmit={handleMobileSubmit} className="space-y-6">
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-400">+91</span>
                    <input 
                      autoFocus
                      type="tel" 
                      placeholder="00000 00000"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="input-field pl-16 text-lg font-semibold tracking-widest"
                    />
                  </div>
                  <motion.button 
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={phoneNumber.length !== 10}
                    className="antigravity-button w-full bg-primary text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-premium"
                  >
                    Send OTP <ChevronRight size={20} />
                  </motion.button>
                </form>
              ) : (
                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div className="flex gap-4 justify-center">
                    <input 
                      autoFocus
                      type="tel"
                      maxLength={4}
                      placeholder="• • • •"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full text-center px-5 py-6 bg-surface border border-transparent rounded-3xl text-3xl font-bold tracking-[1rem] focus:bg-white focus:border-primary/20 outline-none transition-all duration-300"
                    />
                  </div>
                  <p className="text-center text-slate-400 text-sm">
                    Enter the mock 4-digit code sent to +91 {phoneNumber}
                  </p>
                  <motion.button 
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={otp.length !== 4}
                    className="antigravity-button w-full bg-primary text-white py-5 rounded-2xl font-bold shadow-premium"
                  >
                    Verify & Continue
                  </motion.button>
                  <button 
                    type="button" 
                    onClick={() => setOtpMode(false)}
                    className="w-full text-center text-primary font-semibold text-sm"
                  >
                    Edit Phone Number
                  </button>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthScreen;
