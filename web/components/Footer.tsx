import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MailIcon, PhoneIcon, WhatsAppIcon, LocationIcon } from './icons';
import { fetchServices, fetchSiteSettings, fetchAddresses, fetchPhones, toWhatsAppLink } from '../services/api';
import { Service, SiteSettings, Address, PhoneNumber } from '../types';
import { defaultServices, defaultSiteSettings } from '../services/defaultData';

// Newsletter subscription mini-form
const NewsletterBar: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMsg(data.message || 'Subscribed!');
        setEmail('');
      } else {
        setStatus('error');
        setMsg(data.message || 'Failed to subscribe.');
      }
    } catch {
      setStatus('error');
      setMsg('Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-secondary/20 border border-secondary/40 text-secondary rounded-lg p-3 text-sm font-medium">
        ✅ {msg}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        className="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
      />
      {status === 'error' && <p className="text-red-400 text-xs">{msg}</p>}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-4 py-2 bg-secondary text-white text-sm font-bold rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-60"
      >
        {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
      </button>
    </form>
  );
};

const Footer: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<Partial<SiteSettings>>({});
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [phones, setPhones] = useState<PhoneNumber[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const settingsData = await fetchSiteSettings();
        setSettings(settingsData);
      } catch {
        setSettings(defaultSiteSettings);
      }
      try {
        const servicesData = await fetchServices();
        setServices(servicesData);
      } catch {
        setServices(defaultServices);
      }
      try {
        const addrs = await fetchAddresses();
        setAddresses(addrs);
      } catch {}
      try {
        const phs = await fetchPhones();
        setPhones(phs);
      } catch {}
    };
    loadData();
  }, []);

  return (
    <footer className="bg-primary text-gray-300">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Brand + Newsletter */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logos/logo_white.png" alt="Ven International Logistics Logo" className="h-10 w-auto" />
            </Link>
            <p className="text-sm">Your trusted partner in international shipping and logistics. Connecting China to Nigeria with efficiency and care.</p>
            <div>
              <h4 className="text-sm font-semibold text-gray-200 tracking-wider uppercase mb-3">Newsletter</h4>
              <NewsletterBar />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 tracking-wider uppercase">Quick Links</h3>
            <ul className="mt-4 space-y-2">
              <li><Link to="/" className="text-base text-gray-300 hover:text-white">Home</Link></li>
              <li><Link to="/track" className="text-base text-gray-300 hover:text-white">Track Shipment</Link></li>
              <li><Link to="/faq" className="text-base text-gray-300 hover:text-white">FAQ</Link></li>
              <li><Link to="/contact" className="text-base text-gray-300 hover:text-white">Contact</Link></li>
              <li><Link to="/quote" className="text-base text-gray-300 hover:text-white">Book a Shipping</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 tracking-wider uppercase">Our Services</h3>
            <ul className="mt-4 space-y-2 text-base">
              {services.slice(0, 5).map(service => (
                <li key={service.id}>
                  <Link to={`/services/${service.id}`} className="text-base text-gray-300 hover:text-white transition-colors">
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 tracking-wider uppercase">Contact Us</h3>
            <ul className="mt-4 space-y-3">
              {/* Multiple Addresses */}
              {addresses.length > 0 ? (
                addresses.map((addr) => (
                  <li key={addr.id} className="flex items-start">
                    <LocationIcon className="h-5 w-5 mt-1 mr-3 flex-shrink-0 text-secondary" />
                    <div>
                      {addr.title && <span className="block text-xs font-semibold text-gray-200 uppercase">{addr.title}</span>}
                      <span className="text-sm">{addr.address}</span>
                    </div>
                  </li>
                ))
              ) : settings.address ? (
                <li className="flex items-start">
                  <LocationIcon className="h-5 w-5 mt-1 mr-3 flex-shrink-0 text-secondary" />
                  <span>{settings.address}</span>
                </li>
              ) : null}

              {/* Email */}
              {settings.email && (
                <li className="flex items-center">
                  <MailIcon className="h-5 w-5 mr-3 flex-shrink-0 text-secondary" />
                  <a href={`mailto:${settings.email}`} className="hover:text-white text-sm">{settings.email}</a>
                </li>
              )}

              {/* Multiple Phone Numbers */}
              {phones.length > 0 ? (
                phones.map((ph) => (
                  <li key={ph.id} className="flex items-center">
                    <PhoneIcon className="h-5 w-5 mr-3 flex-shrink-0 text-secondary" />
                    <div>
                      {ph.label && <span className="text-xs font-semibold text-gray-400 block">{ph.label}</span>}
                      <a href={`tel:${ph.number}`} className="hover:text-white text-sm">{ph.number}</a>
                    </div>
                  </li>
                ))
              ) : settings.phone ? (
                <li className="flex items-center">
                  <PhoneIcon className="h-5 w-5 mr-3 flex-shrink-0 text-secondary" />
                  <a href={`tel:${settings.phone}`} className="hover:text-white">{settings.phone}</a>
                </li>
              ) : null}

              {/* WhatsApp */}
              {settings.whatsapp && (
                <li className="flex items-center">
                  <WhatsAppIcon className="h-5 w-5 mr-3 flex-shrink-0 text-secondary" />
                  <a href={toWhatsAppLink(settings.whatsapp)} target="_blank" rel="noopener noreferrer" className="hover:text-white text-sm">{settings.whatsapp}</a>
                </li>
              )}
            </ul>
          </div>

        </div>

        <div className="mt-8 border-t border-gray-700 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-base text-gray-400">&copy; {new Date().getFullYear()} {settings.companyName || 'Ven International Logistics Ltd'}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;