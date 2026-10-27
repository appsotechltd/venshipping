import React from 'react';
import { CloseIcon, LogOutIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab: string;
    setActiveTab: (tab: any) => void;
    tabs: {
        id: string;
        label: string;
        icon: React.ReactNode;
        subItems?: { id: string; label: string }[];
    }[];
    isCollapsed: boolean;
    toggleCollapse: () => void;
    activeSubTab?: string;
    setActiveSubTab?: (subTab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeTab, setActiveTab, tabs, isCollapsed, toggleCollapse, activeSubTab, setActiveSubTab }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                fixed top-0 left-0 z-50 h-full min-h-screen transition-all duration-300 ease-in-out shadow-lg lg:shadow-none
                bg-secondary dark:bg-dark-card
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0
                ${isCollapsed ? 'w-20' : 'w-64'}
            `}>
                <div className="h-full flex flex-col">
                    {/* Mobile Header */}
                    <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-gray-700 lg:hidden">
                        <span className="text-xl font-bold text-black dark:text-white">Menu</span>
                        <button onClick={onClose} className="p-2 text-black/80 hover:text-black dark:text-gray-400">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Desktop Collapse Toggle */}
                    <div className="hidden lg:flex justify-end p-4">
                        <button
                            onClick={toggleCollapse}
                            className="p-1 rounded-full hover:bg-black/10 text-black/80 hover:text-black dark:text-white/80 dark:hover:text-white transition-colors"
                        >
                            {isCollapsed ? <ChevronRightIcon className="w-6 h-6" /> : <ChevronLeftIcon className="w-6 h-6" />}
                        </button>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 overflow-y-auto py-2">
                        <ul className="space-y-2 px-2">
                            {tabs.map((tab) => (
                                <li key={tab.id}>
                                    <button
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            if (!tab.subItems) {
                                                onClose();
                                            }
                                        }}
                                        className={`
                                            w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors
                                            ${activeTab === tab.id
                                                ? 'bg-black/10 text-black font-bold shadow-sm dark:bg-white/20 dark:text-white'
                                                : 'text-gray-800 hover:bg-black/5 hover:text-black dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'}
                                            ${isCollapsed ? 'justify-center px-2' : ''}
                                        `}
                                        title={isCollapsed ? tab.label : ''}
                                    >
                                        <span className={`${activeTab === tab.id ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400 group-hover:text-black'}`}>
                                            {tab.icon}
                                        </span>
                                        {!isCollapsed && <span>{tab.label}</span>}
                                    </button>

                                    {/* Submenu */}
                                    {!isCollapsed && tab.subItems && activeTab === tab.id && (
                                        <ul className="mt-1 ml-10 space-y-1">
                                            {tab.subItems.map(subItem => (
                                                <li key={subItem.id}>
                                                    <button
                                                        onClick={() => {
                                                            if (setActiveSubTab) setActiveSubTab(subItem.id);
                                                            onClose();
                                                        }}
                                                        className={`
                                                            w-full text-left px-3 py-2 text-sm rounded-md transition-colors
                                                            ${activeSubTab === subItem.id
                                                                ? 'text-black font-semibold bg-white/50 dark:text-white dark:bg-white/10'
                                                                : 'text-gray-600 hover:text-black hover:bg-white/30 dark:text-gray-400 dark:hover:text-white'}
                                                        `}
                                                    >
                                                        {subItem.label}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Footer / Logout */}
                    <div className="p-4 border-t border-black/10 dark:border-gray-700">
                        <button
                            onClick={handleLogout}
                            className={`
                                w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors
                                ${isCollapsed ? 'justify-center px-2' : ''}
                            `}
                            title={isCollapsed ? 'Logout' : ''}
                        >
                            <LogOutIcon className="w-5 h-5" />
                            {!isCollapsed && <span>Logout</span>}
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
