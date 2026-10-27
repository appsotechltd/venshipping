import React from 'react';
import { motion } from 'framer-motion';

const PageWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default PageWrapper;