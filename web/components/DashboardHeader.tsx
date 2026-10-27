import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ThemeContext } from '../App';
import ThemeToggle from './ThemeToggle';
import { LogOutIcon } from './icons';

const DashboardHeader: React.FC<{ title: string; onMenuClick?: () => void }> = ({ title, onMenuClick }) => {
    const { logout, user } = useAuth();
    const { theme } = React.useContext(ThemeContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <header className="bg-white dark:bg-dark-card shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={onMenuClick}
                            className="mr-4 p-2 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white lg:hidden focus:outline-none focus:ring-2 focus:ring-inset focus:ring-secondary"
                        >
                            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                            <img
                                src={theme === 'dark' ? "/logos/logo_white.png" : "/logos/logo_dark.png"}
                                alt="Ven International Logistics Logo"
                                className="h-8 w-auto"
                            />
                        </Link>
                        <div className="hidden md:block ml-10 flex items-baseline space-x-4">
                            <span className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-primary-dark">
                                {title}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-500 hover:text-red-500 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-primary-dark"
                                title="Logout"
                            >
                                <LogOutIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default DashboardHeader;
