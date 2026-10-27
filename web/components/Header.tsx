import React, { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ThemeContext } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from './ThemeToggle';
import { DashboardIcon, PhoneIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { fetchPhones } from '../services/api';
import { PhoneNumber } from '../types';

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { user, logout } = useAuth();
  const { theme } = React.useContext(ThemeContext);
  const [headerPhone, setHeaderPhone] = useState<PhoneNumber | null>(null);

  useEffect(() => {
    fetchPhones()
      .then((phones) => {
        const primary = phones.find((p) => p.showInHeader) || phones[0] || null;
        setHeaderPhone(primary);
      })
      .catch(() => {});
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative py-2 px-3 text-sm font-medium transition-colors
    after:content-[''] after:absolute after:left-0 after:bottom-1 after:h-[2px] after:w-full after:bg-secondary 
    after:origin-center after:transition-transform after:duration-300 after:ease-out
    ${isActive
      ? 'text-secondary after:scale-x-100'
      : 'text-primary dark:text-white hover:text-secondary dark:hover:text-secondary after:scale-x-0 hover:after:scale-x-100'
    }`;

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block py-2 px-3 rounded-md text-base font-medium transition-colors ${isActive
      ? 'bg-secondary text-white'
      : 'text-primary dark:text-white hover:bg-gray-200 dark:hover:bg-primary-dark'
    }`;

  return (
    <header className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-lg sticky top-0 z-50 shadow-md">
      {/* Top bar with phone */}
      {headerPhone && (
        <div className="bg-primary text-white text-xs py-1.5 px-4 text-right hidden md:block">
          <a href={`tel:${headerPhone.number}`} className="inline-flex items-center gap-1.5 hover:text-secondary transition-colors">
            <PhoneIcon className="h-3 w-3" />
            <span className="font-medium">{headerPhone.label && `${headerPhone.label}: `}{headerPhone.number}</span>
          </a>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <img
                src={theme === 'dark' ? "/logos/logo_white.png" : "/logos/logo_dark.png"}
                alt="Ven International Logistics Logo"
                className="h-8 w-auto"
              />
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              <NavLink to="/" className={navLinkClass}>Home</NavLink>
              <NavLink to="/about" className={navLinkClass}>About Us</NavLink>
              <NavLink to="/services" className={navLinkClass}>Services</NavLink>
              <NavLink to="/track" className={navLinkClass}>Track Shipment</NavLink>
              <NavLink to="/faq" className={navLinkClass}>FAQ</NavLink>
              <NavLink to="/contact" className={navLinkClass}>Contact Us</NavLink>
              <ThemeToggle />
              {user ? (
                <>
                  <NavLink to={`/${user.role}/dashboard`} className={navLinkClass}>
                    <DashboardIcon className="h-5 w-5 inline-block mr-1" />
                    Dashboard
                  </NavLink>
                  <button onClick={logout} className="ml-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                    Logout
                  </button>
                </>
              ) : (
                <Link to="/quote" className="ml-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-secondary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary">
                  Book a Shipping
                </Link>
              )}
            </div>
          </div>
          <div className="md:hidden flex items-center">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="ml-2 bg-gray-100 dark:bg-primary-dark inline-flex items-center justify-center p-2 rounded-md text-primary dark:text-white hover:bg-gray-200 dark:hover:bg-primary focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!isOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="md:hidden"
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <NavLink to="/" className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>Home</NavLink>
              <NavLink to="/about" className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>About Us</NavLink>
              <NavLink to="/services" className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>Services</NavLink>
              <NavLink to="/track" className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>Track Shipment</NavLink>
              <NavLink to="/faq" className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>FAQ</NavLink>
              <NavLink to="/contact" className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>Contact Us</NavLink>
              {headerPhone && (
                <a href={`tel:${headerPhone.number}`} className="flex items-center gap-2 py-2 px-3 text-base font-medium text-primary dark:text-white">
                  <PhoneIcon className="h-4 w-4 text-secondary" />
                  {headerPhone.label && `${headerPhone.label}: `}{headerPhone.number}
                </a>
              )}
              <div className="mt-4 px-1 border-t pt-4 border-gray-200 dark:border-gray-700">
                {user ? (
                  <div className='space-y-2'>
                    <NavLink to={`/${user.role}/dashboard`} className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>Dashboard</NavLink>
                    <button onClick={() => { logout(); setIsOpen(false); }} className="block text-left w-full px-3 py-2 text-base font-medium text-primary dark:text-white rounded-md hover:bg-gray-200 dark:hover:bg-primary-dark">
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link to="/quote" className="block text-center w-full px-4 py-3 bg-secondary text-white font-bold rounded-md hover:bg-opacity-90" onClick={() => setIsOpen(false)}>
                    Book a Shipping
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;