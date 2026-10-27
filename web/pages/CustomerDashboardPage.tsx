import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Shipment, InvoiceWithDetails, User, SiteSettings } from '../types';
import { ShipmentIcon, InvoiceIcon, ProfileIcon, ViewIcon, EyeIcon, EyeOffIcon } from '../components/icons';
import Sidebar from '../components/Sidebar';
import DashboardHeader from '../components/DashboardHeader';
import DashboardFooter from '../components/DashboardFooter';
import PageWrapper from '../components/PageWrapper';
import InvoiceViewModal from '../components/InvoiceViewModal';
import TrackingResult from '../components/ShipmentTrackingResult';

// =================================================================
// Re-usable Panels
// =================================================================

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center h-64">
        <svg className="animate-spin h-8 w-8 text-secondary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);


// =================================================================
// Dashboard Panels
// =================================================================

const MyShipmentsPanel: React.FC<{ customerId: number }> = ({ customerId }) => {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadShipments = async () => {
            if (!customerId) return;
            setIsLoading(true);
            try {
                const data = await api.fetchCustomerShipments(customerId);
                setShipments(data);
            } catch (err) {
                setError('Failed to load your shipments.');
            } finally {
                setIsLoading(false);
            }
        };
        loadShipments();
    }, [customerId]);

    const handleViewDetails = (shipment: Shipment) => {
        setSelectedShipment(shipment);
    };

    if (isLoading) return <LoadingSpinner />;
    if (error) return <p className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-4 rounded-md">{error}</p>;

    if (selectedShipment) {
        return (
            <div>
                <button onClick={() => setSelectedShipment(null)} className="mb-4 px-4 py-2 bg-gray-200 dark:bg-primary-dark rounded-md text-sm font-semibold hover:bg-gray-300 dark:hover:bg-primary transition-colors">
                    &larr; Back to Shipments List
                </button>
                <TrackingResult shipment={selectedShipment} variant="compact" />
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-xl font-bold text-primary dark:text-white mb-4">My Shipments</h2>
            {shipments.length === 0 ? (
                <p>You do not have any active or past shipments.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-primary-dark">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tracking ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Route</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Est. Arrival</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                            {shipments.map(s => (
                                <tr key={s.trackingId}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary">{s.trackingId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{s.origin} → {s.destination}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.status === 'Delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>{s.status}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(s.estimatedArrival).toDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onClick={() => handleViewDetails(s)} className="text-primary dark:text-blue-400 hover:text-secondary flex items-center gap-1">
                                            <ViewIcon className="h-5 w-5" /> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


const InvoicesPanel: React.FC<{ customerId: number }> = ({ customerId }) => {
    const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
    const [settings, setSettings] = useState<Partial<SiteSettings>>({});

    useEffect(() => {
        const loadData = async () => {
            if (!customerId) return;
            setIsLoading(true);
            try {
                const [invoicesData, settingsData] = await Promise.all([
                    api.fetchCustomerInvoices(customerId),
                    api.fetchSiteSettings()
                ]);
                setInvoices(invoicesData);
                setSettings(settingsData);
            } catch (err) {
                setError('Failed to load your invoices.');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [customerId]);

    if (isLoading) return <LoadingSpinner />;
    if (error) return <p className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-4 rounded-md">{error}</p>;

    return (
        <div>
            <h2 className="text-xl font-bold text-primary dark:text-white mb-4">Your Invoices</h2>
            {invoices.length === 0 ? (
                <p>You do not have any invoices.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-primary-dark">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Invoice ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tracking ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                            {invoices.map(i => (
                                <tr key={i.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary">{i.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(i.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{i.shipmentId || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">₦{i.total.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${i.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>{i.status}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onClick={() => setSelectedInvoice(i)} className="text-primary dark:text-blue-400 hover:text-secondary flex items-center gap-1">
                                            <ViewIcon className="h-5 w-5" /> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <InvoiceViewModal
                isOpen={!!selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                invoice={selectedInvoice}
                settings={settings}
                onSend={async (id, method) => { await api.customerSendDocument(id, method); }}
            />
        </div>
    );
};

const ProfilePanel: React.FC<{ user: User }> = ({ user }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isChanging, setIsChanging] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsChanging(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await api.changePassword({
                email: user.email,
                oldPassword,
                newPassword,
                role: 'customer'
            });
            if (res.success) {
                setMessage({ type: 'success', text: 'Password changed successfully.' });
                setOldPassword('');
                setNewPassword('');
            } else {
                setMessage({ type: 'error', text: res.message || 'Failed to change password.' });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to change password.' });
        } finally {
            setIsChanging(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold text-primary dark:text-white mb-4">Your Profile</h2>
                <form className="space-y-6 max-w-lg">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name / Company</label>
                        <input type="text" id="name" value={user.name} readOnly className="mt-1 block w-full p-3 bg-gray-100 dark:bg-primary-dark rounded-md border-transparent focus:ring-2 focus:ring-secondary focus:border-transparent cursor-not-allowed" />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                        <input type="email" id="email" value={user.email} readOnly className="mt-1 block w-full p-3 bg-gray-100 dark:bg-primary-dark rounded-md border-transparent focus:ring-2 focus:ring-secondary focus:border-transparent cursor-not-allowed" />
                    </div>
                </form>
            </div>

            <div className="max-w-lg">
                <h3 className="text-lg font-bold text-primary dark:text-white mb-4 border-b pb-2 dark:border-gray-700">Change Password</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4 bg-gray-50 dark:bg-primary-dark/30 p-6 rounded-lg">
                    {message.text && (
                        <p className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                            {message.text}
                        </p>
                    )}
                    <div>
                        <label className="block text-sm font-medium mb-1">Current Password</label>
                        <div className="relative">
                            <input
                                type={showOldPassword ? "text" : "password"}
                                required
                                value={oldPassword}
                                onChange={e => setOldPassword(e.target.value)}
                                className="w-full p-2 pr-10 bg-white dark:bg-primary-dark border border-gray-300 dark:border-gray-600 rounded-md"
                            />
                            <button
                                type="button"
                                onClick={() => setShowOldPassword(!showOldPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                {showOldPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">New Password</label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                required
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full p-2 pr-10 bg-white dark:bg-primary-dark border border-gray-300 dark:border-gray-600 rounded-md"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                {showNewPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={isChanging} className="px-6 py-2 bg-primary text-white font-bold rounded-md disabled:bg-gray-400 hover:bg-primary-dark">
                            {isChanging ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
};

// =================================================================
// Main Dashboard Component
// =================================================================

type Tab = 'shipments' | 'invoices' | 'profile';

const CustomerDashboardPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('shipments');
    const { user } = useAuth();

    if (!user) {
        return <LoadingSpinner />;
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'shipments': return <MyShipmentsPanel customerId={user.id!} />;
            case 'invoices': return <InvoicesPanel customerId={user.id!} />;
            case 'profile': return <ProfilePanel user={user} />;
            default: return null;
        }
    };

    const getTabClass = (tabName: Tab) =>
        `flex items-center gap-2 px-4 py-3 font-medium rounded-t-lg transition-colors ${activeTab === tabName
            ? 'bg-white dark:bg-dark-card text-secondary border-b-2 border-secondary'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-primary-dark'
        }`;

    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setCollapsed] = useState(false);

    const tabs = [
        { id: 'shipments', label: 'My Shipments', icon: <ShipmentIcon className="h-5 w-5" /> },
        { id: 'invoices', label: 'Invoices', icon: <InvoiceIcon className="h-5 w-5" /> },
        { id: 'profile', label: 'Profile', icon: <ProfileIcon className="h-5 w-5" /> },
    ];

    return (
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                tabs={tabs}
                isCollapsed={isCollapsed}
                toggleCollapse={() => setCollapsed(!isCollapsed)}
            />

            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                <DashboardHeader title="Customer Dashboard" onMenuClick={() => setSidebarOpen(true)} />

                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">
                        <header className="mb-8">
                            <h1 className="text-3xl font-extrabold text-primary dark:text-white">Customer Dashboard</h1>
                            <p className="mt-1 text-lg text-gray-500 dark:text-gray-400">Welcome, {user.name}.</p>
                        </header>

                        <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
                            {renderContent()}
                        </div>
                    </div>
                </main>
                <DashboardFooter />
            </div>
        </div>
    );
};

export default CustomerDashboardPage;