import React, { useEffect, useState } from 'react';
import { WhatsAppIcon } from './icons';
import { fetchSiteSettings, toWhatsAppLink } from '../services/api';
import { defaultSiteSettings } from '../services/defaultData';

const WhatsAppButton: React.FC = () => {
  const [whatsapp, setWhatsapp] = useState<string>('');

  useEffect(() => {
    const loadNumber = async () => {
      try {
        const data = await fetchSiteSettings();
        setWhatsapp(data.whatsapp || defaultSiteSettings.whatsapp);
      } catch (error) {
        setWhatsapp(defaultSiteSettings.whatsapp);
      }
    };
    loadNumber();
  }, []);

  if (!whatsapp) return null;

  return (
    <a
      href={toWhatsAppLink(whatsapp, "Hi, I'd like to enquire about shipping with Ven Logistics.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-24 right-5 z-40 flex flex-row-reverse items-center gap-3"
    >
      <span className="relative flex items-center justify-center h-16 w-16 flex-shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75 animate-ping"></span>
        <span className="relative flex items-center justify-center h-16 w-16 rounded-full bg-[#25D366] text-white shadow-xl hover:scale-110 transition-transform duration-200">
          <WhatsAppIcon className="h-8 w-8" />
        </span>
      </span>
      <span className="hidden sm:block max-w-0 group-hover:max-w-xs overflow-hidden whitespace-nowrap bg-white dark:bg-dark-card text-primary dark:text-white text-sm font-semibold px-0 group-hover:px-4 py-3 rounded-full shadow-lg transition-all duration-300">
        Chat with us on WhatsApp
      </span>
    </a>
  );
};

export default WhatsAppButton;
