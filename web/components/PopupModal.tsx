import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchPopupSettings } from '../services/api';
import { CloseIcon } from './icons';

const POPUP_SESSION_KEY = 'ven_popup_dismissed';

const PopupModal: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({
    enabled: 'false',
    title: '',
    content: '',
    bg_color: '#d1fae5',
    text_color: '#000000',
  });

  useEffect(() => {
    // Only show if not dismissed this session
    const dismissed = sessionStorage.getItem(POPUP_SESSION_KEY);
    if (dismissed) return;

    fetchPopupSettings()
      .then((data) => {
        setSettings(data);
        if (data.enabled === 'true') {
          // Short delay for better UX
          setTimeout(() => setVisible(true), 800);
        }
      })
      .catch(() => {
        // silently fail
      });
  }, []);

  const handleClose = () => {
    setVisible(false);
    sessionStorage.setItem(POPUP_SESSION_KEY, '1');
  };

  const bgColor = settings.bg_color || '#d1fae5';
  const textColor = settings.text_color || '#000000';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: bgColor, color: textColor }}
            initial={{ scale: 0.85, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 20, stiffness: 280 }}
          >
            {/* Top accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-green-400 to-emerald-600" />

            <div className="p-6 sm:p-8">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/10 transition-colors"
                style={{ color: textColor }}
                aria-label="Close popup"
              >
                <CloseIcon className="h-5 w-5" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              {settings.title && (
                <h2 className="text-xl sm:text-2xl font-extrabold text-center mb-3" style={{ color: textColor }}>
                  {settings.title}
                </h2>
              )}

              {/* Content */}
              {settings.content && (
                <p className="text-sm sm:text-base leading-relaxed text-center whitespace-pre-line" style={{ color: textColor }}>
                  {settings.content}
                </p>
              )}

              {/* CTA Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="#/quote"
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-lg font-bold text-sm text-center transition-all"
                  style={{
                    backgroundColor: textColor,
                    color: bgColor,
                  }}
                >
                  Book a Shipping
                </a>
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-lg font-bold text-sm border-2 transition-all"
                  style={{ borderColor: textColor, color: textColor }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PopupModal;
