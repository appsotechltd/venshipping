import React from 'react';
import { Link } from 'react-router-dom';
import { MailIcon, PhoneIcon, UserIcon, WhatsAppIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { fetchSiteSettings, toWhatsAppLink } from '../services/api';
import { SiteSettings } from '../types';
import { defaultSiteSettings } from '../services/defaultData';

const SubHeader: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = React.useState<Partial<SiteSettings>>({});

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await fetchSiteSettings();
        setSettings(data);
      } catch (error) {
        console.error("Failed to fetch site settings for subheader:", error);
        setSettings(defaultSiteSettings);
      }
    };
    loadSettings();
  }, []);

  return (
    <div className="bg-primary text-white text-xs hidden md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-10">
          <div className="flex items-center gap-6">
            {settings.email && (
              <a href={`mailto:${settings.email}`} className="flex items-center gap-2 hover:text-secondary transition-colors">
                <MailIcon className="h-4 w-4" />
                <span>{settings.email}</span>
              </a>
            )}
            {settings.phone && (
              <a href={`tel:${settings.phone}`} className="flex items-center gap-2 hover:text-secondary transition-colors">
                <PhoneIcon className="h-4 w-4" />
                <span>{settings.phone}</span>
              </a>
            )}
            {settings.whatsapp && (
              <a href={toWhatsAppLink(settings.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-secondary transition-colors">
                <WhatsAppIcon className="h-4 w-4" />
                <span>WhatsApp</span>
              </a>
            )}
          </div>
          <div className="flex items-center gap-6">
            {!user && (
              <Link to="/customer" className="flex items-center gap-2 hover:text-secondary transition-colors">
                <UserIcon className="h-4 w-4" />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubHeader;
