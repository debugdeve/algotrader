import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';

const AppLayout = ({ children }) => {
  const location = useLocation();
  const showNav = !['/login', '/onboarding'].includes(location.pathname);

  return (
    <div className="mobile-container overflow-y-auto hide-scrollbar">
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex-1 pb-24" // padding bottom for Nav
        >
          {children}
        </motion.main>
      </AnimatePresence>
      
      {showNav && <BottomNav />}
    </div>
  );
};

export default AppLayout;
