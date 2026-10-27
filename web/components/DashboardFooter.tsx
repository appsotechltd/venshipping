import React from 'react';
import { ThemeContext } from '../App';



const DashboardFooter: React.FC = () => {
    const { theme } = React.useContext(ThemeContext);

    return (
        <footer className="bg-white dark:bg-dark-card border-t border-gray-200 dark:border-gray-700 mt-auto">
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <img
                        src={theme === 'dark' ? "/logos/logo_white.png" : "/logos/logo_dark.png"}
                        alt="Ven International Logistics Logo"
                        className="h-6 w-auto"
                    />
                </div>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    &copy; {new Date().getFullYear()} Ven International Logistics. All rights reserved.
                </p>
            </div>
        </footer>
    );
};

export default DashboardFooter;
