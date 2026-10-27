import React from 'react';
import { Outlet } from 'react-router-dom';
import DashboardHeader from '../components/DashboardHeader';
import DashboardFooter from '../components/DashboardFooter';
import { useAuth } from '../contexts/AuthContext';

const DashboardLayout: React.FC = () => {
    const { user } = useAuth();
    const title = user?.role === 'admin' ? 'Admin Dashboard' : 'Customer Dashboard';

    return (
        <div className="min-h-screen flex flex-col bg-light-bg dark:bg-dark-bg transition-colors duration-300">
            <main className="flex-grow">
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;
