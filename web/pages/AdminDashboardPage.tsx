import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import DashboardHeader from '../components/DashboardHeader';
import DashboardFooter from '../components/DashboardFooter';
import { ShipmentIcon, UsersIcon, InvoiceIcon, ContentIcon, EditIcon, ViewIcon, PdfIcon, SendIcon, CloseIcon, PlusIcon, DeleteIcon, MinusIcon, WhatsAppIcon, MailIcon, EyeIcon, EyeOffIcon, SettingsIcon, ProfileIcon, PhoneIcon, LocationIcon, StarIcon, CheckCircleIcon, PackageIcon } from '../components/icons';
import { Service, FAQ, HomepageContent, Customer, SiteSettings, Slide, Shipment, TrackingEvent, Invoice, InvoiceItem, InvoiceWithDetails, Address, PhoneNumber, NewsletterSubscriber, Testimonial } from '../types';
import * as api from '../services/api';
import { iconMap } from '../components/icons';
import PageWrapper from '../components/PageWrapper';
import FileUpload from '../components/FileUpload';
import ConfirmationModal from '../components/ConfirmationModal';
import InvoiceViewModal from '../components/InvoiceViewModal';
import ManageInstallmentsModal from '../components/ManageInstallmentsModal';

type Tab = 'dashboard' | 'shipments' | 'customers' | 'invoicing' | 'content' | 'newsletter' | 'settings' | 'profile';

const AdminDashboardPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('invoicing');

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardHomePanel />;
            case 'shipments':
                return <ShipmentsPanel />;
            case 'customers':
                return <CustomersPanel />;
            case 'invoicing':
                return <InvoicingPanel filterType={invoiceFilter} onFilterChange={setInvoiceFilter} />;
            case 'content':
                return <ContentPanel activeSubTab={contentSubTab} onTabChange={setContentSubTab} />;
            case 'newsletter':
                return <NewsletterPanel />;
            case 'settings':
                return <SettingsContentPanel />;
            case 'profile':
                return <ProfilePanel />;
            default:
                return <DashboardHomePanel />;
        }
    };

    const getTabClass = (tabName: Tab) =>
        `flex items - center gap - 2 px - 4 py - 3 font - medium rounded - t - lg transition - colors ${activeTab === tabName
            ? 'bg-white dark:bg-dark-card text-secondary border-b-2 border-secondary'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-primary-dark'
        } `;


    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setCollapsed] = useState(false);

    // Sub-tab States
    const [contentSubTab, setContentSubTab] = useState<ContentSubTab>('slider');
    const [invoiceFilter, setInvoiceFilter] = useState('All');

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: <ShipmentIcon className="h-5 w-5" /> },
        { id: 'shipments', label: 'Shipments', icon: <ShipmentIcon className="h-5 w-5" /> },
        { id: 'customers', label: 'Customers', icon: <UsersIcon className="h-5 w-5" /> },
        {
            id: 'invoicing',
            label: 'Invoicing',
            icon: <InvoiceIcon className="h-5 w-5" />,
            subItems: [
                { id: 'All', label: 'All Documents' },
                { id: 'Invoice', label: 'Invoices' },
                { id: 'Proforma', label: 'Proforma Invoices' },
                { id: 'Receipt', label: 'Receipts' }
            ]
        },
        {
            id: 'content',
            label: 'Website Content',
            icon: <ContentIcon className="h-5 w-5" />,
            subItems: [
                { id: 'slider', label: 'Homepage Slider' },
                { id: 'homepage', label: 'Homepage & About' },
                { id: 'services', label: 'Services' },
                { id: 'faqs', label: 'FAQs' },
                { id: 'testimonials', label: 'Testimonials' },
                { id: 'popup', label: 'Popup Modal' },
                { id: 'booking', label: 'Booking Page' },
                { id: 'addresses', label: 'Addresses' },
                { id: 'phones', label: 'Phone Numbers' },
                { id: 'settings', label: 'Site Settings' }
            ]
        },
        { id: 'newsletter', label: 'Newsletter', icon: <MailIcon className="h-5 w-5" /> },
        { id: 'settings', label: 'Settings', icon: <SettingsIcon className="h-5 w-5" /> },
        { id: 'profile', label: 'Profile', icon: <ProfileIcon className="h-5 w-5" /> },
    ];

    const handleSubTabChange = (subTabId: string) => {
        if (activeTab === 'content') setContentSubTab(subTabId as ContentSubTab);
        if (activeTab === 'invoicing') setInvoiceFilter(subTabId);
    };

    const currentSubTab = activeTab === 'content' ? contentSubTab : (activeTab === 'invoicing' ? invoiceFilter : undefined);

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
                activeSubTab={currentSubTab}
                setActiveSubTab={handleSubTabChange}
            />

            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                <DashboardHeader title="Admin Dashboard" onMenuClick={() => setSidebarOpen(true)} />

                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">
                        <header className="mb-8">
                            <h1 className="text-3xl font-extrabold text-primary dark:text-white">Admin Dashboard</h1>
                            <p className="mt-1 text-lg text-gray-500 dark:text-gray-400">Welcome, Admin. Manage your operations from here.</p>
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

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string }> = ({ icon, title, value }) => (
    <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md flex items-center gap-4">
        <div className="bg-secondary/10 p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-primary dark:text-white">{value}</p>
        </div>
    </div>
);

const DashboardHomePanel: React.FC = () => (
    <div>
        <h2 className="text-xl font-bold text-primary dark:text-white mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard icon={<ShipmentIcon className="h-8 w-8 text-secondary" />} title="Active Shipments" value="2" />
            <StatCard icon={<UsersIcon className="h-8 w-8 text-secondary" />} title="Total Customers" value="3" />
            <StatCard icon={<InvoiceIcon className="h-8 w-8 text-secondary" />} title="Pending Invoices" value={"1"} />
        </div>
        <p>This is the main dashboard overview. More stats and reports can be added here.</p>
    </div>
);


// --- Confirmation Modal ---


// --- SHIPMENTS PANEL & COMPONENTS ---
const shipmentStatuses = ['Processing', 'In Transit', 'Arrived', 'Delivered'];

const initialShipmentState: Omit<Shipment, 'trackingId'> = {
    origin: '', destination: '', status: 'Processing', estimatedArrival: '',
    shippedDate: '', carrier: 'Ven Logistics', service: 'Sea Shipping', weight: '',
    itemDescription: '', orderedQuantity: 1, unit: 'cartons', history: [],
};

const ShipmentFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (shipment: Shipment | Omit<Shipment, 'trackingId'>) => void;
    shipment: Shipment | null;
    customers: Customer[];
}> = ({ isOpen, onClose, onSave, shipment, customers }) => {
    const [formData, setFormData] = useState<Shipment | Omit<Shipment, 'trackingId'>>({ ...initialShipmentState, customerId: 0 });

    useEffect(() => {
        if (shipment) {
            setFormData({
                ...shipment,
                shippedDate: shipment.shippedDate ? new Date(shipment.shippedDate).toISOString().split('T')[0] : '',
                estimatedArrival: shipment.estimatedArrival ? new Date(shipment.estimatedArrival).toISOString().split('T')[0] : '',
            });
        } else {
            setFormData(initialShipmentState);
        }
    }, [shipment, isOpen]);

    const handleHistoryChange = (index: number, field: keyof TrackingEvent, value: string) => {
        const newHistory = [...formData.history];
        newHistory[index] = { ...newHistory[index], [field]: value };
        setFormData(p => ({ ...p, history: newHistory }));
    };
    const addHistoryEvent = () => {
        const newEvent: TrackingEvent = { date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5), status: '', location: '', details: '' };
        setFormData(p => ({ ...p, history: [...p.history, newEvent] }));
    };
    const removeHistoryEvent = (index: number) => {
        setFormData(p => ({ ...p, history: p.history.filter((_, i) => i !== index) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const saveData = { ...formData, orderedQuantity: Number(formData.orderedQuantity) || 0 };
        onSave(saveData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 flex-shrink-0">
                    <h3 className="text-xl font-bold">{shipment ? `Edit Shipment: ${shipment.trackingId} ` : 'Create New Shipment'}</h3>
                    <button type="button" onClick={onClose}><CloseIcon className="h-6 w-6" /></button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Main Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-2">
                            <label className="text-xs font-semibold">Customer</label>
                            <select value={formData.customerId || ''} onChange={e => setFormData(p => ({ ...p, customerId: Number(e.target.value) }))} className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md">
                                <option value="">Select Customer (Optional)</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <input value={formData.origin} onChange={e => setFormData(p => ({ ...p, origin: e.target.value }))} placeholder="Origin" required className="p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                        <input value={formData.destination} onChange={e => setFormData(p => ({ ...p, destination: e.target.value }))} placeholder="Destination" required className="p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                        <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))} required className="p-2 bg-gray-100 dark:bg-primary-dark rounded-md">
                            {shipmentStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input value={formData.carrier} onChange={e => setFormData(p => ({ ...p, carrier: e.target.value }))} placeholder="Carrier" required className="p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                        <input value={formData.service} onChange={e => setFormData(p => ({ ...p, service: e.target.value }))} placeholder="Service" required className="p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                        <input value={formData.weight} onChange={e => setFormData(p => ({ ...p, weight: e.target.value }))} placeholder="Weight (e.g., 50kg)" required className="p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                        <div className="lg:col-span-2">
                            <label className="text-xs font-semibold">Item Description</label>
                            <input value={formData.itemDescription} onChange={e => setFormData(p => ({ ...p, itemDescription: e.target.value }))} placeholder="e.g., Biscuits" required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold">Ordered Quantity</label>
                            <input type="number" min="1" value={formData.orderedQuantity} onChange={e => setFormData(p => ({ ...p, orderedQuantity: Number(e.target.value) }))} required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold">Unit</label>
                            <input value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))} placeholder="e.g., cartons" required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                        </div>
                        <div>
                            <label className="text-xs">Shipped Date</label>
                            <input type="date" value={formData.shippedDate} onChange={e => setFormData(p => ({ ...p, shippedDate: e.target.value }))} className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                        </div>
                        <div>
                            <label className="text-xs">Est. Arrival</label>
                            <input type="date" value={formData.estimatedArrival} onChange={e => setFormData(p => ({ ...p, estimatedArrival: e.target.value }))} className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                        </div>
                    </div>
                    {/* History */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold">Tracking History</h4>
                            <button type="button" onClick={addHistoryEvent} className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md flex items-center gap-1"><PlusIcon className="h-4 w-4" /> Add Event</button>
                        </div>
                        <div className="space-y-2">
                            {formData.history.map((event, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-2 bg-gray-50 dark:bg-primary-dark/50 rounded-md">
                                    <input type="date" value={new Date(event.date).toISOString().split('T')[0]} onChange={e => handleHistoryChange(index, 'date', e.target.value)} className="p-2 text-sm bg-white dark:bg-primary-dark rounded" />
                                    <input type="time" value={event.time} onChange={e => handleHistoryChange(index, 'time', e.target.value)} className="p-2 text-sm bg-white dark:bg-primary-dark rounded" />
                                    <select value={event.status} onChange={e => handleHistoryChange(index, 'status', e.target.value)} required className="p-2 text-sm bg-white dark:bg-primary-dark rounded">
                                        <option value="">Status</option>
                                        {shipmentStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <input value={event.location} onChange={e => handleHistoryChange(index, 'location', e.target.value)} placeholder="Location" className="p-2 text-sm bg-white dark:bg-primary-dark rounded" />
                                    <div className="flex gap-2">
                                        <input value={event.details} onChange={e => handleHistoryChange(index, 'details', e.target.value)} placeholder="Details" className="flex-grow p-2 text-sm bg-white dark:bg-primary-dark rounded" />
                                        <button type="button" onClick={() => removeHistoryEvent(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><DeleteIcon className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3 flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-secondary text-white font-bold rounded-md">Save Shipment</button>
                </div>
            </form>
        </div>
    );
};


const ShipmentsPanel: React.FC = () => {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [deletingShipmentId, setDeletingShipmentId] = useState<string | null>(null);
    const [managingShipment, setManagingShipment] = useState<Shipment | null>(null);

    const fetchShipments = async () => {
        try {
            setLoading(true);
            const [shipmentsData, customersData] = await Promise.all([
                api.adminFetchShipments(),
                api.adminFetchCustomers()
            ]);
            setShipments(shipmentsData);
            setCustomers(customersData);
        } catch (err) {
            setError("Failed to fetch shipments.");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { fetchShipments(); }, []);

    const handleSave = async (shipmentData: Shipment | Omit<Shipment, 'trackingId'>) => {
        try {
            if ('trackingId' in shipmentData) {
                await api.adminUpdateShipment(shipmentData);
            } else {
                await api.adminCreateShipment(shipmentData);
            }
            setModalOpen(false);
            fetchShipments();
        } catch (err) {
            setError("Failed to save shipment.");
        }
    };

    const openDeleteConfirm = (id: string) => {
        setDeletingShipmentId(id);
        setConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (deletingShipmentId) {
            try {
                await api.adminDeleteShipment(deletingShipmentId);
                fetchShipments();
            } catch (err) {
                setError("Failed to delete shipment.");
            } finally {
                setConfirmOpen(false);
                setDeletingShipmentId(null);
            }
        }
    };

    const handleInstallmentsChanged = async () => {
        await fetchShipments();
    };

    const currentManagingShipment = managingShipment
        ? shipments.find(s => s.trackingId === managingShipment.trackingId) || null
        : null;

    if (loading) return <p>Loading shipments...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-primary dark:text-white">Manage Shipments</h2>
                <button onClick={() => { setEditingShipment(null); setModalOpen(true); }} className="px-4 py-2 bg-secondary text-white font-bold rounded-md hover:bg-opacity-90 transition-colors flex items-center gap-2">
                    <PlusIcon className="h-5 w-5" /> Add Shipment
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-primary-dark">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tracking ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Route</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Progress</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Est. Arrival</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                        {shipments.map(s => (
                            <tr key={s.trackingId}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary">{s.trackingId}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{s.customerName || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{s.origin} → {s.destination}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                        {s.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{s.fulfilledQuantity ?? 0}/{s.orderedQuantity ?? 0} {s.unit}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(s.estimatedArrival).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-4">
                                    <button onClick={() => { setEditingShipment(s); setModalOpen(true); }} className="text-primary dark:text-blue-400 hover:text-secondary"><EditIcon className="h-5 w-5" /></button>
                                    <button onClick={() => setManagingShipment(s)} className="text-primary dark:text-blue-400 hover:text-secondary" title="Manage Installments"><PackageIcon className="h-5 w-5" /></button>
                                    <button onClick={() => openDeleteConfirm(s.trackingId)} className="text-red-500 dark:text-red-400 hover:text-red-600"><DeleteIcon className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <ShipmentFormModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} shipment={editingShipment} customers={customers} />
            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Delete Shipment"
                message="Are you sure you want to delete this shipment? This action cannot be undone."
                isDestructive={true}
                confirmText="Delete"
            />
            <ManageInstallmentsModal
                isOpen={!!managingShipment}
                onClose={() => setManagingShipment(null)}
                shipment={currentManagingShipment}
                onChanged={handleInstallmentsChanged}
            />
        </div>
    );
};


// --- CUSTOMERS PANEL & COMPONENTS ---
const CustomerFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Customer | Omit<Customer, 'id'>) => void;
    customer: Customer | null;
}> = ({ isOpen, onClose, onSave, customer }) => {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });

    useEffect(() => {
        if (customer) {
            setFormData({ name: customer.name, email: customer.email, phone: customer.phone, address: customer.address });
        } else {
            setFormData({ name: '', email: '', phone: '', address: '' });
        }
    }, [customer, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const saveData = { ...formData };
        if (customer && customer.id) {
            onSave({ ...saveData, id: customer.id });
        } else {
            onSave(saveData);
        }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg">
                <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                        <h3 className="text-xl font-bold">{customer ? 'Edit Customer' : 'Create New Customer'}</h3>
                        <button type="button" onClick={onClose}><CloseIcon className="h-6 w-6" /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Full Name" required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                        <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="Email" required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                        <input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                        <textarea value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="Address" rows={3} required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                    </div>
                    <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-secondary text-white font-bold rounded-md">Save Customer</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CustomersPanel: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(null);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const data = await api.adminFetchCustomers();
            setCustomers(data);
        } catch (err) {
            setError("Failed to fetch customers.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleSave = async (customerData: Customer | Omit<Customer, 'id'>) => {
        try {
            if ('id' in customerData && customerData.id) {
                await api.adminUpdateCustomer(customerData as Customer);
            } else {
                await api.adminCreateCustomer(customerData as Omit<Customer, 'id'>);
            }
            setModalOpen(false);
            fetchCustomers();
        } catch (err) {
            setError("Failed to save customer.");
        }
    };

    const openDeleteConfirm = (id: number) => {
        setDeletingCustomerId(id);
        setConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (deletingCustomerId) {
            try {
                await api.adminDeleteCustomer(deletingCustomerId);
                fetchCustomers();
            } catch (err) {
                setError("Failed to delete customer.");
            } finally {
                setConfirmOpen(false);
                setDeletingCustomerId(null);
            }
        }
    };

    if (loading) return <p>Loading customers...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-primary dark:text-white">Manage Customers</h2>
                <button onClick={() => { setEditingCustomer(null); setModalOpen(true); }} className="px-4 py-2 bg-secondary text-white font-bold rounded-md hover:bg-opacity-90 transition-colors flex items-center gap-2">
                    <PlusIcon className="h-5 w-5" /> Add Customer
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-primary-dark">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                        {customers.map(c => (
                            <tr key={c.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{c.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{c.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{c.phone}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-4">
                                    <button onClick={() => { setEditingCustomer(c); setModalOpen(true); }} className="text-primary dark:text-blue-400 hover:text-secondary"><EditIcon className="h-5 w-5" /></button>
                                    <button onClick={() => openDeleteConfirm(c.id)} className="text-red-500 dark:text-red-400 hover:text-red-600"><DeleteIcon className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <CustomerFormModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} customer={editingCustomer} />
            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Delete Customer"
                message="Are you sure you want to delete this customer? This action cannot be undone."
                isDestructive={true}
                confirmText="Delete"
            />
        </div>
    );
};

// --- INVOICING PANEL & COMPONENTS ---
const initialInvoiceState: Omit<Invoice, 'id'> = {
    customerId: 0,
    shipmentId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Unpaid',
    type: 'Invoice',
    items: [{ description: '', quantity: 1, price: 0 }],
};



const InvoiceFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (invoice: Invoice | Omit<Invoice, 'id'>) => void;
    invoice: Invoice | null;
    customers: Customer[];
    shipments: Shipment[];
}> = ({ isOpen, onClose, onSave, invoice, customers, shipments }) => {
    const [formData, setFormData] = useState<Omit<Invoice, 'id'>>(initialInvoiceState);

    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });

    const total = useMemo(() => {
        return formData.items.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
    }, [formData.items]);

    useEffect(() => {
        if (invoice) {
            setFormData({
                ...invoice,
                date: new Date(invoice.date).toISOString().split('T')[0],
            });
        } else {
            setFormData(initialInvoiceState);
        }
    }, [invoice, isOpen]);

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData(p => ({ ...p, items: newItems }));
    };
    const addItem = () => setFormData(p => ({ ...p, items: [...p.items, { description: '', quantity: 1, price: 0 }] }));
    const removeItem = (index: number) => {
        if (formData.items.length > 1) {
            setFormData(p => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.customerId) {
            setAlertModal({ isOpen: true, message: 'Please select a customer.' });
            return;
        }
        const saveData = { ...formData, items: formData.items.map(item => ({ ...item, quantity: Number(item.quantity), price: Number(item.price) })) };
        if (invoice && invoice.id) {
            onSave({ ...saveData, id: invoice.id });
        } else {
            onSave(saveData);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 flex-shrink-0">
                    <h3 className="text-xl font-bold">{invoice ? `Edit ${invoice.type}: ${invoice.id} ` : 'Create New Document'}</h3>
                    <button type="button" onClick={onClose}><CloseIcon className="h-6 w-6" /></button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Main Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-2">
                            <label className="text-sm font-semibold">Customer</label>
                            <select value={formData.customerId} onChange={e => setFormData(p => ({ ...p, customerId: Number(e.target.value) }))} required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md">
                                <option value="">Select Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="lg:col-span-2">
                            <label className="text-sm font-semibold">Shipment (Optional)</label>
                            <select value={formData.shipmentId} onChange={e => setFormData(p => ({ ...p, shipmentId: e.target.value }))} className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md">
                                <option value="">Link to Shipment</option>
                                {shipments.map(s => <option key={s.trackingId} value={s.trackingId}>{s.trackingId} ({s.origin} to {s.destination})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-semibold">Document Type</label>
                            <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value as 'Invoice' | 'Proforma' | 'Receipt' }))} required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md">
                                <option value="Invoice">Invoice</option>
                                <option value="Proforma">Proforma Invoice</option>
                                <option value="Receipt">Receipt</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-semibold">Date</label>
                            <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                        </div>
                        <div>
                            <label className="text-sm font-semibold">Status</label>
                            <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value as 'Paid' | 'Unpaid' }))} required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md">
                                <option value="Unpaid">Unpaid</option>
                                <option value="Paid">Paid</option>
                            </select>
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <h4 className="font-semibold mb-2">Line Items</h4>
                        <div className="space-y-2">
                            {formData.items.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2">
                                    <input value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} placeholder="Description" required className="col-span-6 p-2 bg-gray-50 dark:bg-primary-dark/50 rounded-md" />
                                    <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} placeholder="Qty" required className="col-span-2 p-2 bg-gray-50 dark:bg-primary-dark/50 rounded-md" />
                                    <input type="number" value={item.price} onChange={e => handleItemChange(index, 'price', Number(e.target.value))} placeholder="Price" required className="col-span-3 p-2 bg-gray-50 dark:bg-primary-dark/50 rounded-md" />
                                    <button type="button" onClick={() => removeItem(index)} className="col-span-1 p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full flex items-center justify-center"><DeleteIcon className="h-5 w-5" /></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addItem} className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded-md flex items-center gap-1"><PlusIcon className="h-4 w-4" /> Add Item</button>
                    </div>

                    <div className="text-right font-bold text-xl border-t dark:border-gray-700 pt-4">
                        Total: ₦{total.toLocaleString()}
                    </div>
                </div>

                <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3 flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-secondary text-white font-bold rounded-md">Save Document</button>
                </div>
            </form>
            <ConfirmationModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                title="Validation Error"
                message={alertModal.message}
                confirmText="OK"
                showCancelButton={false}
            />
        </div>
    );
};

const InvoicingPanel: React.FC<{ filterType: string; onFilterChange: (type: any) => void }> = ({ filterType, onFilterChange }) => {
    const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [settings, setSettings] = useState<Partial<SiteSettings>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [isViewModalOpen, setViewModalOpen] = useState(false);
    const [isConfirmOpen, setConfirmOpen] = useState(false);

    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
    const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);

    // Filter State lifted up

    const fetchData = async () => {
        try {
            setLoading(true);
            const [invoicesData, customersData, shipmentsData, settingsData] = await Promise.all([
                api.adminFetchInvoices(),
                api.adminFetchCustomers(),
                api.adminFetchShipments(),
                api.adminFetchSettings()
            ]);
            setInvoices(invoicesData);
            setCustomers(customersData);
            setShipments(shipmentsData);
            setSettings(settingsData);
        } catch (err) {
            setError("Failed to fetch invoicing data.");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { fetchData(); }, []);

    const handleSave = async (invoiceData: Invoice | Omit<Invoice, 'id'>) => {
        try {
            if ('id' in invoiceData) await api.adminUpdateInvoice(invoiceData as Invoice);
            else await api.adminCreateInvoice(invoiceData as Omit<Invoice, 'id'>);
            setFormModalOpen(false);
            fetchData();
        } catch (err) { setError("Failed to save invoice."); }
    };

    const openDeleteConfirm = (id: string) => { setDeletingInvoiceId(id); setConfirmOpen(true); };

    const handleDelete = async () => {
        if (deletingInvoiceId) {
            try {
                await api.adminDeleteInvoice(deletingInvoiceId);
                fetchData();
            } catch (err) { setError("Failed to delete invoice."); }
            finally { setConfirmOpen(false); setDeletingInvoiceId(null); }
        }
    };

    const filteredInvoices = useMemo(() => {
        if (filterType === 'All') return invoices;
        return invoices.filter(inv => inv.type === filterType);
    }, [invoices, filterType]);

    if (loading) return <p>Loading documents...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    const getFilterClass = (type: string) => `px - 3 py - 1 rounded - full text - sm font - medium transition - colors ${filterType === type
        ? 'bg-primary text-white'
        : 'bg-gray-200 dark:bg-primary-dark text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-primary'
        } `;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-primary dark:text-white">Manage Documents</h2>
                    <div className="flex gap-2 mt-2 lg:hidden">
                        <button onClick={() => onFilterChange('All')} className={getFilterClass('All')}>All</button>
                        <button onClick={() => onFilterChange('Invoice')} className={getFilterClass('Invoice')}>Invoices</button>
                        <button onClick={() => onFilterChange('Proforma')} className={getFilterClass('Proforma')}>Proforma</button>
                        <button onClick={() => onFilterChange('Receipt')} className={getFilterClass('Receipt')}>Receipts</button>
                    </div>
                </div>
                <button onClick={() => { setSelectedInvoice(null); setFormModalOpen(true); }} className="px-4 py-2 bg-secondary text-white font-bold rounded-md hover:bg-opacity-90 transition-colors flex items-center gap-2">
                    <PlusIcon className="h-5 w-5" /> Add Document
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-primary-dark">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Customer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredInvoices.map(inv => (
                            <tr key={inv.id}>
                                <td className="px-6 py-4 text-sm font-semibold">{inv.type}</td>
                                <td className="px-6 py-4 text-sm font-medium text-secondary">{inv.id}</td>
                                <td className="px-6 py-4 text-sm">{inv.customerName}</td>
                                <td className="px-6 py-4 text-sm">{new Date(inv.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-sm">₦{inv.total.toLocaleString()}</td>
                                <td className="px-6 py-4 text-sm">
                                    <span className={`px - 2 inline - flex text - xs leading - 5 font - semibold rounded - full ${inv.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'} `}>
                                        {inv.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium flex gap-4">
                                    <button onClick={() => { setSelectedInvoice(inv); setViewModalOpen(true); }} className="text-gray-500 dark:text-gray-300 hover:text-secondary" title="View/Send"><ViewIcon className="h-5 w-5" /></button>
                                    <button onClick={() => { setSelectedInvoice(inv); setFormModalOpen(true); }} className="text-primary dark:text-blue-400 hover:text-secondary" title="Edit"><EditIcon className="h-5 w-5" /></button>
                                    <button onClick={() => openDeleteConfirm(inv.id)} className="text-red-500 dark:text-red-400 hover:text-red-600" title="Delete"><DeleteIcon className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <InvoiceFormModal isOpen={isFormModalOpen} onClose={() => setFormModalOpen(false)} onSave={handleSave} invoice={selectedInvoice} customers={customers} shipments={shipments} />
            <InvoiceViewModal
                isOpen={isViewModalOpen}
                onClose={() => setViewModalOpen(false)}
                invoice={selectedInvoice}
                settings={settings}
                onSend={async (id, method) => { await api.adminSendDocument(id, method); }}
            />
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Delete Document" message="Are you sure you want to delete this document?" isDestructive={true} confirmText="Delete" />
        </div>
    );
};

// --- CONTENT MANAGEMENT PANEL & COMPONENTS ---
type ContentSubTab = 'slider' | 'settings' | 'services' | 'faqs' | 'homepage' | 'popup' | 'booking' | 'addresses' | 'phones' | 'testimonials';

const ContentPanel: React.FC<{ activeSubTab: ContentSubTab; onTabChange: (tab: ContentSubTab) => void }> = ({ activeSubTab, onTabChange }) => {

    const getSubTabClass = (tabName: ContentSubTab) =>
        `px - 4 py - 2 rounded - md font - semibold transition - colors text - sm ${activeSubTab === tabName
            ? 'bg-secondary text-white'
            : 'bg-gray-200 dark:bg-primary-dark hover:bg-gray-300 dark:hover:bg-primary'
        } `;

    const renderContent = () => {
        switch (activeSubTab) {
            case 'slider': return <SliderContentPanel />;
            case 'homepage': return <HomepageContentPanel />;
            case 'services': return <ServiceContentPanel />;
            case 'faqs': return <FaqContentPanel />;
            case 'testimonials': return <TestimonialsContentPanel />;
            case 'settings': return <SettingsContentPanel />;
            case 'popup': return <PopupSettingsPanel />;
            case 'booking': return <BookingPagePanel />;
            case 'addresses': return <AddressesPanel />;
            case 'phones': return <PhonesPanel />;
            default: return null;
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-primary dark:text-white">Manage Website Content</h2>
            <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-4 lg:hidden">
                <button onClick={() => onTabChange('slider')} className={getSubTabClass('slider')}>Homepage Slider</button>
                <button onClick={() => onTabChange('homepage')} className={getSubTabClass('homepage')}>Homepage & About</button>
                <button onClick={() => onTabChange('services')} className={getSubTabClass('services')}>Services</button>
                <button onClick={() => onTabChange('faqs')} className={getSubTabClass('faqs')}>FAQs</button>
                <button onClick={() => onTabChange('testimonials')} className={getSubTabClass('testimonials')}>Testimonials</button>
                <button onClick={() => onTabChange('popup')} className={getSubTabClass('popup')}>Popup Modal</button>
                <button onClick={() => onTabChange('booking')} className={getSubTabClass('booking')}>Booking Page</button>
                <button onClick={() => onTabChange('addresses')} className={getSubTabClass('addresses')}>Addresses</button>
                <button onClick={() => onTabChange('phones')} className={getSubTabClass('phones')}>Phone Numbers</button>
                <button onClick={() => onTabChange('settings')} className={getSubTabClass('settings')}>Site Settings</button>
            </div>
            <div>{renderContent()}</div>
        </div>
    );
};

// --- SLIDER MANAGEMENT ---
type SlideFormData = {
    type: 'video' | 'image';
    url: string;
    title: string;
    subtitle: string;
    sortOrder: string;
};
const initialSlideFormState: SlideFormData = { type: 'image', url: '', title: '', subtitle: '', sortOrder: '99' };

const SlideFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (slide: Slide | Omit<Slide, 'id'>) => void; slide: Slide | null; }> = ({ isOpen, onClose, onSave, slide }) => {
    const [formData, setFormData] = useState<SlideFormData>(initialSlideFormState);

    useEffect(() => {
        if (slide) {
            setFormData({
                type: slide.type,
                url: slide.url,
                title: slide.title,
                subtitle: slide.subtitle,
                sortOrder: String(slide.sortOrder)
            });
        } else {
            setFormData(initialSlideFormState);
        }
    }, [slide, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const saveData: Omit<Slide, 'id'> = { ...formData, sortOrder: Number(formData.sortOrder) || 99 };
        if (slide && slide.id) {
            onSave({ ...saveData, id: slide.id });
        } else {
            onSave(saveData);
        }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg flex flex-col">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h3 className="text-xl font-bold">{slide ? 'Edit Slide' : 'Add New Slide'}</h3>
                    <button type="button" onClick={onClose}><CloseIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value as 'image' | 'video' }))} className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md">
                        <option value="image">Image</option><option value="video">Video</option>
                    </select>
                    <div>
                        <input value={formData.url} onChange={e => setFormData(p => ({ ...p, url: e.target.value }))} placeholder="Image/Video URL" required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md mb-2" />
                        <FileUpload
                            onUpload={(url) => setFormData(p => ({ ...p, url }))}
                            accept={formData.type === 'video' ? 'video/*' : 'image/*'}
                            label={`Upload ${formData.type === 'video' ? 'Video' : 'Image'} `}
                        />
                    </div>
                    <input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Title" required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                    <textarea value={formData.subtitle} onChange={e => setFormData(p => ({ ...p, subtitle: e.target.value }))} placeholder="Subtitle" rows={3} className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                    <input type="number" value={formData.sortOrder} onChange={e => setFormData(p => ({ ...p, sortOrder: e.target.value }))} placeholder="Sort Order" required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                </div>
                <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-secondary text-white font-bold rounded-md">Save Slide</button>
                </div>
            </form>
        </div>
    );
}

const SliderContentPanel = () => {
    const [slides, setSlides] = useState<Slide[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [deletingSlideId, setDeletingSlideId] = useState<number | null>(null);

    const fetchSlides = async () => {
        try { setLoading(true); setSlides(await api.adminFetchSlides()); }
        catch (err) { setError("Failed to fetch slides."); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchSlides(); }, []);

    const handleSave = async (slide: Slide | Omit<Slide, 'id'>) => {
        try {
            if ('id' in slide && slide.id) await api.adminUpdateSlide(slide as Slide);
            else await api.adminCreateSlide(slide as Omit<Slide, 'id'>);
            setModalOpen(false); fetchSlides();
        } catch (err) { setError("Failed to save slide."); }
    };
    const openDeleteConfirm = (id: number) => { setDeletingSlideId(id); setConfirmOpen(true); };
    const handleDelete = async () => {
        if (deletingSlideId) {
            try { await api.adminDeleteSlide(deletingSlideId); fetchSlides(); }
            catch (err) { setError("Failed to delete slide."); }
            finally { setConfirmOpen(false); setDeletingSlideId(null); }
        }
    };

    if (loading) return <p>Loading slides...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Homepage Slider</h3>
                <button onClick={() => { setEditingSlide(null); setModalOpen(true); }} className="px-4 py-2 bg-secondary text-white font-bold rounded-md flex items-center gap-2 text-sm">
                    <PlusIcon className="h-5 w-5" /> Add Slide
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-primary-dark text-xs uppercase">
                        <tr>
                            <th className="px-4 py-2 text-left">Order</th><th className="px-4 py-2 text-left">Type</th>
                            <th className="px-4 py-2 text-left">Title</th><th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                        {slides.map(s => (
                            <tr key={s.id}>
                                <td className="px-4 py-2 text-sm">{s.sortOrder}</td>
                                <td className="px-4 py-2 text-sm">{s.type}</td>
                                <td className="px-4 py-2 text-sm">{s.title}</td>
                                <td className="px-4 py-2 text-sm flex gap-4">
                                    <button onClick={() => { setEditingSlide(s); setModalOpen(true); }} className="text-primary dark:text-blue-400 hover:text-secondary"><EditIcon className="h-5 w-5" /></button>
                                    <button onClick={() => openDeleteConfirm(s.id)} className="text-red-500 dark:text-red-400 hover:text-red-600"><DeleteIcon className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <SlideFormModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} slide={editingSlide} />
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Delete Slide" message="Are you sure you want to delete this slide?" isDestructive={true} confirmText="Delete" />
        </div>
    );
};

// --- HOMEPAGE & ABOUT CONTENT MANAGEMENT ---
const HomepageContentPanel = () => {
    const [content, setContent] = useState<Partial<HomepageContent>>({ whyUsPoints: [], stats: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadContent = async () => {
            try { setContent(await api.fetchHomepageContent()); }
            catch (e) { setError('Failed to load content.'); }
            finally { setLoading(false); }
        };
        loadContent();
    }, []);

    const handlePointChange = (index: number, field: 'title' | 'description', value: string) => {
        const newPoints = [...(content.whyUsPoints || [])];
        newPoints[index] = { ...newPoints[index], [field]: value };
        setContent(c => ({ ...c, whyUsPoints: newPoints }));
    };
    const addPoint = () => setContent(c => ({ ...c, whyUsPoints: [...(c.whyUsPoints || []), { title: '', description: '' }] }));
    const removePoint = (index: number) => setContent(c => ({ ...c, whyUsPoints: (c.whyUsPoints || []).filter((_, i) => i !== index) }));

    const handleStatChange = (index: number, field: 'label' | 'value', value: string) => {
        const newStats = [...(content.stats || [])];
        newStats[index] = { ...newStats[index], [field]: value };
        setContent(c => ({ ...c, stats: newStats }));
    };
    const addStat = () => setContent(c => ({ ...c, stats: [...(c.stats || []), { label: '', value: '' }] }));
    const removeStat = (index: number) => setContent(c => ({ ...c, stats: (c.stats || []).filter((_, i) => i !== index) }));

    const handleSave = async () => {
        setIsSaving(true); setError('');
        try { await api.adminUpdateHomepageContent(content as HomepageContent); }
        catch (e) { setError('Failed to save content.'); }
        finally { setIsSaving(false); }
    };

    if (loading) return <p>Loading content...</p>;

    return (
        <div className="space-y-8">
            {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}

            {/* Why Us Section */}
            <div className="p-4 border rounded-md dark:border-gray-700">
                <h3 className="text-lg font-bold mb-4">"Why Us?" Section</h3>
                <div className="space-y-4">
                    {(content.whyUsPoints || []).map((point, index) => (
                        <div key={index} className="flex gap-2 items-start p-2 bg-gray-50 dark:bg-primary-dark/50 rounded">
                            <div className="flex-grow space-y-2">
                                <input value={point.title} onChange={e => handlePointChange(index, 'title', e.target.value)} placeholder="Title" className="w-full p-2 bg-white dark:bg-primary-dark rounded-md" />
                                <textarea value={point.description} onChange={e => handlePointChange(index, 'description', e.target.value)} placeholder="Description" rows={2} className="w-full p-2 bg-white dark:bg-primary-dark rounded-md" />
                            </div>
                            <button onClick={() => removePoint(index)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><DeleteIcon className="h-5 w-5" /></button>
                        </div>
                    ))}
                </div>
                <button onClick={addPoint} className="mt-4 px-4 py-2 text-sm bg-gray-200 dark:bg-primary-dark rounded-md flex items-center gap-2"><PlusIcon className="h-4 w-4" /> Add Point</button>
            </div>

            {/* Statistics Section */}
            <div className="p-4 border rounded-md dark:border-gray-700">
                <h3 className="text-lg font-bold mb-1">Homepage Statistics</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Shown as counters near the top of the homepage (e.g. "500+ Projects Completed").</p>
                <div className="space-y-4">
                    {(content.stats || []).map((stat, index) => (
                        <div key={index} className="flex gap-2 items-start p-2 bg-gray-50 dark:bg-primary-dark/50 rounded">
                            <div className="flex-grow grid grid-cols-2 gap-2">
                                <input value={stat.value} onChange={e => handleStatChange(index, 'value', e.target.value)} placeholder="Value (e.g. 500+)" className="w-full p-2 bg-white dark:bg-primary-dark rounded-md" />
                                <input value={stat.label} onChange={e => handleStatChange(index, 'label', e.target.value)} placeholder="Label (e.g. Projects Completed)" className="w-full p-2 bg-white dark:bg-primary-dark rounded-md" />
                            </div>
                            <button onClick={() => removeStat(index)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><DeleteIcon className="h-5 w-5" /></button>
                        </div>
                    ))}
                </div>
                <button onClick={addStat} className="mt-4 px-4 py-2 text-sm bg-gray-200 dark:bg-primary-dark rounded-md flex items-center gap-2"><PlusIcon className="h-4 w-4" /> Add Statistic</button>
            </div>

            {/* About Page Section */}
            <div className="p-4 border rounded-md dark:border-gray-700 space-y-4">
                <h3 className="text-lg font-bold">About Page Content</h3>
                <div><label className="font-semibold text-sm">Our Story</label><textarea value={content.aboutStory || ''} onChange={e => setContent(c => ({ ...c, aboutStory: e.target.value }))} rows={5} className="w-full p-2 mt-1 bg-gray-100 dark:bg-primary-dark rounded-md" /></div>
                <div><label className="font-semibold text-sm">Our Mission</label><textarea value={content.aboutMission || ''} onChange={e => setContent(c => ({ ...c, aboutMission: e.target.value }))} rows={3} className="w-full p-2 mt-1 bg-gray-100 dark:bg-primary-dark rounded-md" /></div>
                <div><label className="font-semibold text-sm">Our Vision</label><textarea value={content.aboutVision || ''} onChange={e => setContent(c => ({ ...c, aboutVision: e.target.value }))} rows={3} className="w-full p-2 mt-1 bg-gray-100 dark:bg-primary-dark rounded-md" /></div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="font-semibold text-sm mb-1 block">About Hero Image</label>
                        <input value={content.aboutHeroImage || ''} onChange={e => setContent(c => ({ ...c, aboutHeroImage: e.target.value }))} className="w-full p-2 mb-2 bg-gray-100 dark:bg-primary-dark rounded-md" placeholder="Image URL" />
                        <FileUpload onUpload={(url) => setContent(c => ({ ...c, aboutHeroImage: url }))} label="Upload Hero Image" />
                    </div>
                    <div>
                        <label className="font-semibold text-sm mb-1 block">Our Story Image</label>
                        <input value={content.aboutStoryImage || ''} onChange={e => setContent(c => ({ ...c, aboutStoryImage: e.target.value }))} className="w-full p-2 mb-2 bg-gray-100 dark:bg-primary-dark rounded-md" placeholder="Image URL" />
                        <FileUpload onUpload={(url) => setContent(c => ({ ...c, aboutStoryImage: url }))} label="Upload Story Image" />
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-secondary text-white font-bold rounded-md disabled:bg-gray-400">
                    {isSaving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>
        </div>
    )
}

// --- SERVICES MANAGEMENT ---
const initialServiceState: Omit<Service, 'id'> = { name: '', shortDescription: '', longDescription: '', iconName: 'ShipIcon', image: '', keyFeatures: [] };

const ServiceFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (service: Service | Omit<Service, 'id'>) => void; service: Service | null; }> = ({ isOpen, onClose, onSave, service }) => {
    const [formData, setFormData] = useState(initialServiceState);
    const [keyFeaturesText, setKeyFeaturesText] = useState('');

    useEffect(() => {
        if (service) {
            setFormData(service);
            setKeyFeaturesText(service.keyFeatures.join('\n'));
        } else {
            setFormData(initialServiceState);
            setKeyFeaturesText('');
        }
    }, [service, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const keyFeatures = keyFeaturesText.split('\n').filter(f => f.trim() !== '');
        const saveData = { ...formData, keyFeatures };
        if (service && service.id) {
            onSave({ ...saveData, id: service.id });
        } else {
            onSave(saveData);
        }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h3 className="text-xl font-bold">{service ? 'Edit Service' : 'Add New Service'}</h3>
                    <button type="button" onClick={onClose}><CloseIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Service Name" required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                    <textarea value={formData.shortDescription} onChange={e => setFormData(p => ({ ...p, shortDescription: e.target.value }))} placeholder="Short Description" rows={2} required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                    <textarea value={formData.longDescription} onChange={e => setFormData(p => ({ ...p, longDescription: e.target.value }))} placeholder="Long Description" rows={4} required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                    <div>
                        <input value={formData.image} onChange={e => setFormData(p => ({ ...p, image: e.target.value }))} placeholder="Image URL" required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md mb-2" />
                        <FileUpload
                            onUpload={(url) => setFormData(p => ({ ...p, image: url }))}
                            label="Upload Service Image"
                        />
                    </div>
                    <div>
                        <label className="font-semibold text-sm mb-1 block">Icon</label>
                        <select value={formData.iconName} onChange={e => setFormData(p => ({ ...p, iconName: e.target.value }))} className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md">
                            {Object.keys(iconMap).map(iconName => <option key={iconName} value={iconName}>{iconName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="font-semibold text-sm mb-1 block">Key Features (one per line)</label>
                        <textarea value={keyFeaturesText} onChange={e => setKeyFeaturesText(e.target.value)} rows={5} className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                    </div>
                </div>
                <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3 flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-secondary text-white font-bold rounded-md">Save Service</button>
                </div>
            </form>
        </div>
    );
}

const ServiceContentPanel = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);

    const fetchServices = async () => {
        try { setLoading(true); setServices(await api.fetchServices()); }
        catch (err) { setError("Failed to fetch services."); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchServices(); }, []);

    const handleSave = async (service: Service | Omit<Service, 'id'>) => {
        try {
            if ('id' in service && service.id) await api.adminUpdateService(service as Service);
            else await api.adminCreateService(service as Omit<Service, 'id'>);
            setModalOpen(false); fetchServices();
        } catch (err) { setError("Failed to save service."); }
    };
    const openDeleteConfirm = (id: string) => { setDeletingServiceId(id); setConfirmOpen(true); };
    const handleDelete = async () => {
        if (deletingServiceId) {
            try { await api.adminDeleteService(deletingServiceId); fetchServices(); }
            catch (err) { setError("Failed to delete service."); }
            finally { setConfirmOpen(false); setDeletingServiceId(null); }
        }
    };

    if (loading) return <p>Loading services...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Services</h3>
                <button onClick={() => { setEditingService(null); setModalOpen(true); }} className="px-4 py-2 bg-secondary text-white font-bold rounded-md flex items-center gap-2 text-sm"><PlusIcon className="h-5 w-5" /> Add Service</button>
            </div>
            <div className="space-y-4">
                {services.map(s => (
                    <div key={s.id} className="p-4 bg-gray-50 dark:bg-primary-dark/50 rounded-lg flex justify-between items-center">
                        <div>
                            <h4 className="font-bold">{s.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{s.shortDescription}</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => { setEditingService(s); setModalOpen(true); }} className="text-primary dark:text-blue-400 hover:text-secondary"><EditIcon className="h-5 w-5" /></button>
                            <button onClick={() => openDeleteConfirm(s.id)} className="text-red-500 dark:text-red-400 hover:text-red-600"><DeleteIcon className="h-5 w-5" /></button>
                        </div>
                    </div>
                ))}
            </div>
            <ServiceFormModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} service={editingService} />
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Delete Service" message="Are you sure you want to delete this service?" isDestructive={true} confirmText="Delete" />
        </div>
    );
};


// --- FAQS MANAGEMENT ---
const FaqFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (faq: FAQ | Omit<FAQ, 'id'>) => void; faq: FAQ | null; }> = ({ isOpen, onClose, onSave, faq }) => {
    const [formData, setFormData] = useState({ question: '', answer: '' });
    useEffect(() => {
        if (faq) setFormData({ question: faq.question, answer: faq.answer });
        else setFormData({ question: '', answer: '' });
    }, [faq, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const saveData = { ...formData };
        if (faq && faq.id) onSave({ ...saveData, id: faq.id });
        else onSave(saveData);
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg flex flex-col">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h3 className="text-xl font-bold">{faq ? 'Edit FAQ' : 'Add New FAQ'}</h3>
                    <button type="button" onClick={onClose}><CloseIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <textarea value={formData.question} onChange={e => setFormData(p => ({ ...p, question: e.target.value }))} placeholder="Question" rows={3} required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                    <textarea value={formData.answer} onChange={e => setFormData(p => ({ ...p, answer: e.target.value }))} placeholder="Answer" rows={5} required className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                </div>
                <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-secondary text-white font-bold rounded-md">Save FAQ</button>
                </div>
            </form>
        </div>
    );
}

const FaqContentPanel = () => {
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [deletingFaqId, setDeletingFaqId] = useState<number | null>(null);

    const fetchFaqs = async () => {
        try { setLoading(true); setFaqs(await api.fetchFaqs()); }
        catch (err) { setError("Failed to fetch FAQs."); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchFaqs(); }, []);

    const handleSave = async (faq: FAQ | Omit<FAQ, 'id'>) => {
        try {
            if ('id' in faq && faq.id) await api.adminUpdateFaq(faq as FAQ);
            else await api.adminCreateFaq(faq as Omit<FAQ, 'id'>);
            setModalOpen(false); fetchFaqs();
        } catch (err) { setError("Failed to save FAQ."); }
    };
    const openDeleteConfirm = (id: number) => { setDeletingFaqId(id); setConfirmOpen(true); };
    const handleDelete = async () => {
        if (deletingFaqId) {
            try { await api.adminDeleteFaq(deletingFaqId); fetchFaqs(); }
            catch (err) { setError("Failed to delete FAQ."); }
            finally { setConfirmOpen(false); setDeletingFaqId(null); }
        }
    };

    if (loading) return <p>Loading FAQs...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">FAQs</h3>
                <button onClick={() => { setEditingFaq(null); setModalOpen(true); }} className="px-4 py-2 bg-secondary text-white font-bold rounded-md flex items-center gap-2 text-sm"><PlusIcon className="h-5 w-5" /> Add FAQ</button>
            </div>
            <div className="space-y-4">
                {faqs.map(f => (
                    <div key={f.id} className="p-4 bg-gray-50 dark:bg-primary-dark/50 rounded-lg flex justify-between items-start">
                        <div className="pr-4">
                            <h4 className="font-bold">{f.question}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{f.answer}</p>
                        </div>
                        <div className="flex gap-4 flex-shrink-0">
                            <button onClick={() => { setEditingFaq(f); setModalOpen(true); }} className="text-primary dark:text-blue-400 hover:text-secondary"><EditIcon className="h-5 w-5" /></button>
                            <button onClick={() => openDeleteConfirm(f.id)} className="text-red-500 dark:text-red-400 hover:text-red-600"><DeleteIcon className="h-5 w-5" /></button>
                        </div>
                    </div>
                ))}
            </div>
            <FaqFormModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} faq={editingFaq} />
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Delete FAQ" message="Are you sure you want to delete this FAQ?" isDestructive={true} confirmText="Delete" />
        </div>
    );
};

// --- TESTIMONIALS MANAGEMENT ---
const testimonialStatusBadgeClass = (status: Testimonial['status']) => {
    switch (status) {
        case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    }
};

const TestimonialsContentPanel = () => {
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchTestimonials = async () => {
        try { setLoading(true); setTestimonials(await api.adminFetchTestimonials()); }
        catch (err) { setError('Failed to fetch testimonials.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchTestimonials(); }, []);

    const handleStatusChange = async (id: number, status: 'approved' | 'rejected' | 'pending') => {
        try { await api.adminUpdateTestimonialStatus(id, status); fetchTestimonials(); }
        catch (err) { setError('Failed to update testimonial.'); }
    };

    const openDeleteConfirm = (id: number) => { setDeletingId(id); setConfirmOpen(true); };
    const handleDelete = async () => {
        if (deletingId) {
            try { await api.adminDeleteTestimonial(deletingId); fetchTestimonials(); }
            catch (err) { setError('Failed to delete testimonial.'); }
            finally { setConfirmOpen(false); setDeletingId(null); }
        }
    };

    if (loading) return <p>Loading testimonials...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div>
            <h3 className="text-lg font-bold mb-4">Testimonials</h3>
            {testimonials.length === 0 && <p className="text-gray-500 dark:text-gray-400">No testimonials submitted yet.</p>}
            <div className="space-y-4">
                {testimonials.map(t => (
                    <div key={t.id} className="p-4 bg-gray-50 dark:bg-primary-dark/50 rounded-lg">
                        <div className="flex justify-between items-start gap-4">
                            <div className="pr-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold">{t.name}</h4>
                                    {t.company && <span className="text-sm text-gray-500 dark:text-gray-400">({t.company})</span>}
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${testimonialStatusBadgeClass(t.status)}`}>{t.status}</span>
                                </div>
                                <div className="flex gap-0.5 mt-1">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <StarIcon key={star} className={`h-4 w-4 ${t.rating >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                                    ))}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t.message}</p>
                            </div>
                            <div className="flex gap-3 flex-shrink-0">
                                {t.status !== 'approved' && (
                                    <button onClick={() => handleStatusChange(t.id, 'approved')} className="text-green-600 hover:text-green-700" title="Approve"><CheckCircleIcon className="h-5 w-5" /></button>
                                )}
                                {t.status !== 'rejected' && (
                                    <button onClick={() => handleStatusChange(t.id, 'rejected')} className="text-yellow-600 hover:text-yellow-700" title="Reject"><CloseIcon className="h-5 w-5" /></button>
                                )}
                                <button onClick={() => openDeleteConfirm(t.id)} className="text-red-500 dark:text-red-400 hover:text-red-600" title="Delete"><DeleteIcon className="h-5 w-5" /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Delete Testimonial" message="Are you sure you want to delete this testimonial?" isDestructive={true} confirmText="Delete" />
        </div>
    );
};

// --- SITE SETTINGS MANAGEMENT ---
const SettingsContentPanel = () => {
    const [settings, setSettings] = useState<Partial<SiteSettings>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                setSettings(await api.adminFetchSettings());
            } catch (e) { setError('Failed to load settings.'); }
            finally { setLoading(false); }
        };
        loadSettings();
    }, []);

    const handleChange = (key: keyof SiteSettings, value: string) => {
        setSettings(s => ({ ...s, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true); setError('');
        try {
            // Filter out admin_password and admin_email/name before saving generic settings if they exist in state
            // Although admin_email/name are part of site_settings, we might want to manage them only in ProfilePanel
            // For now, let's just filter out password.
            const { admin_password, admin_email, admin_name, ...settingsToSave } = settings as any;
            await api.adminUpdateSettings(settingsToSave as SiteSettings);
        } catch (e) {
            setError('Failed to save settings.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <p>Loading settings...</p>;

    return (
        <div className="space-y-8 max-w-2xl">
            <div className="space-y-6">
                <h3 className="text-lg font-bold border-b pb-2 dark:border-gray-700">General Settings</h3>
                {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
                <div className="space-y-4">
                    {(Object.keys(settings) as Array<keyof SiteSettings>)
                        .filter(k => k !== 'admin_password' && k !== 'admin_email' && k !== 'admin_name')
                        .map(key => (
                            <div key={key}>
                                <label className="font-semibold capitalize text-sm">{String(key).replace(/([A-Z])/g, ' $1')}</label>
                                <input value={settings[key] || ''} onChange={e => handleChange(key, e.target.value)} className="w-full p-2 mt-1 bg-gray-100 dark:bg-primary-dark rounded-md" />
                            </div>
                        ))}
                </div>
                <div className="flex justify-end">
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-secondary text-white font-bold rounded-md disabled:bg-gray-400">
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const ProfilePanel: React.FC = () => {
    const [settings, setSettings] = useState<Partial<SiteSettings>>({});
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await api.adminFetchSettings();
                setSettings(data);
            } catch (err) {
                console.error("Failed to fetch settings", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        try {
            await api.adminUpdateSettings(settings as SiteSettings);
            setMessage({ type: 'success', text: 'Profile updated successfully.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsChangingPassword(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await api.changePassword({
                email: settings.admin_email || 'admin@venshipping.com',
                oldPassword,
                newPassword,
                role: 'admin'
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
            setIsChangingPassword(false);
        }
    };

    if (loading) return <p>Loading profile...</p>;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold text-primary dark:text-white mb-4">Admin Profile</h2>
                {message.text && (
                    <div className={`p-4 mb-4 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message.text}
                    </div>
                )}
                <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-lg bg-white dark:bg-dark-card p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Name</label>
                        <input
                            type="text"
                            value={settings.admin_name || ''}
                            onChange={e => setSettings({ ...settings, admin_name: e.target.value })}
                            className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-primary-dark"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Email</label>
                        <input
                            type="email"
                            value={settings.admin_email || ''}
                            onChange={e => setSettings({ ...settings, admin_email: e.target.value })}
                            className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-primary-dark"
                        />
                        <p className="text-xs text-gray-500 mt-1">This email is used for login and notifications.</p>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">Save Profile</button>
                    </div>
                </form>
            </div>

            <div className="max-w-lg">
                <h3 className="text-lg font-bold text-primary dark:text-white mb-4 border-b pb-2 dark:border-gray-700">Change Password</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4 bg-gray-50 dark:bg-primary-dark/30 p-6 rounded-lg">
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
                        <button type="submit" disabled={isChangingPassword} className="px-6 py-2 bg-secondary text-white font-bold rounded-md disabled:bg-gray-400 hover:bg-opacity-90">
                            {isChangingPassword ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- POPUP SETTINGS PANEL ---
const PopupSettingsPanel: React.FC = () => {
    const [form, setForm] = useState({ enabled: 'false', title: '', content: '', bg_color: '#d1fae5', text_color: '#000000' });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        api.fetchPopupSettings().then(data => {
            setForm({ enabled: data.enabled || 'false', title: data.title || '', content: data.content || '', bg_color: data.bg_color || '#d1fae5', text_color: data.text_color || '#000000' });
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setIsSaving(true); setMsg('');
        try { await api.adminUpdatePopup(form); setMsg('Saved successfully!'); }
        catch { setMsg('Failed to save.'); }
        finally { setIsSaving(false); }
    };

    if (loading) return <p>Loading...</p>;
    return (
        <div className="space-y-6 max-w-2xl">
            <h3 className="text-lg font-bold border-b pb-2 dark:border-gray-700">Popup Modal Settings</h3>
            {msg && <p className={`p-3 rounded-md text-sm ${msg.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{msg}</p>}
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-primary-dark/30 rounded-lg">
                <label className="font-semibold text-sm">Enable Popup</label>
                <button
                    onClick={() => setForm(f => ({ ...f, enabled: f.enabled === 'true' ? 'false' : 'true' }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.enabled === 'true' ? 'bg-secondary' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.enabled === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-500">{form.enabled === 'true' ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="space-y-4">
                <div><label className="font-semibold text-sm block mb-1">Popup Title</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" placeholder="Welcome title..." /></div>
                <div><label className="font-semibold text-sm block mb-1">Popup Content</label>
                    <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={5} className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" placeholder="Popup message..." /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="font-semibold text-sm block mb-1">Background Color</label>
                        <div className="flex gap-2 items-center"><input type="color" value={form.bg_color} onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))} className="h-10 w-14 rounded cursor-pointer border" />
                        <input value={form.bg_color} onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))} className="flex-1 p-2 bg-gray-100 dark:bg-primary-dark rounded-md text-sm" /></div></div>
                    <div><label className="font-semibold text-sm block mb-1">Text Color</label>
                        <div className="flex gap-2 items-center"><input type="color" value={form.text_color} onChange={e => setForm(f => ({ ...f, text_color: e.target.value }))} className="h-10 w-14 rounded cursor-pointer border" />
                        <input value={form.text_color} onChange={e => setForm(f => ({ ...f, text_color: e.target.value }))} className="flex-1 p-2 bg-gray-100 dark:bg-primary-dark rounded-md text-sm" /></div></div>
                </div>
                {/* Preview */}
                {form.title && (
                    <div className="mt-2 p-5 rounded-xl border-2 border-dashed border-gray-300" style={{ backgroundColor: form.bg_color, color: form.text_color }}>
                        <p className="text-xs font-bold uppercase mb-2 opacity-60">Preview</p>
                        <h4 className="font-bold text-lg">{form.title}</h4>
                        <p className="text-sm mt-1 whitespace-pre-line">{form.content}</p>
                    </div>
                )}
            </div>
            <div className="flex justify-end">
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-secondary text-white font-bold rounded-md disabled:opacity-60">{isSaving ? 'Saving...' : 'Save Popup Settings'}</button>
            </div>
        </div>
    );
};

// --- BOOKING PAGE SIDEBAR PANEL ---
const BookingPagePanel: React.FC = () => {
    const [form, setForm] = useState({ sidebar_title: '', sidebar_text: '' });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        api.fetchBookingPageContent().then(data => {
            setForm({ sidebar_title: data.sidebar_title || '', sidebar_text: data.sidebar_text || '' });
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setIsSaving(true); setMsg('');
        try { await api.adminUpdateBookingPage(form); setMsg('Saved successfully!'); }
        catch { setMsg('Failed to save.'); }
        finally { setIsSaving(false); }
    };

    if (loading) return <p>Loading...</p>;
    return (
        <div className="space-y-6 max-w-2xl">
            <h3 className="text-lg font-bold border-b pb-2 dark:border-gray-700">Book a Shipping - Sidebar Content</h3>
            <p className="text-sm text-gray-500">This text appears beside the booking form on the "Book a Shipping" page.</p>
            {msg && <p className={`p-3 rounded-md text-sm ${msg.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{msg}</p>}
            <div><label className="font-semibold text-sm block mb-1">Sidebar Title</label>
                <input value={form.sidebar_title} onChange={e => setForm(f => ({ ...f, sidebar_title: e.target.value }))} className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" placeholder="Why Book With Us?" /></div>
            <div><label className="font-semibold text-sm block mb-1">Sidebar Text</label>
                <p className="text-xs text-gray-400 mb-1">Supports line breaks. Use emoji for bullet points (e.g. ✅)</p>
                <textarea value={form.sidebar_text} onChange={e => setForm(f => ({ ...f, sidebar_text: e.target.value }))} rows={10} className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md font-mono text-sm" /></div>
            <div className="flex justify-end">
                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-secondary text-white font-bold rounded-md disabled:opacity-60">{isSaving ? 'Saving...' : 'Save Sidebar Content'}</button>
            </div>
        </div>
    );
};

// --- ADDRESSES PANEL ---
const AddressesPanel: React.FC = () => {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | 'new' | null>(null);
    const [form, setForm] = useState({ title: '', address: '', sort_order: 99 });
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [msg, setMsg] = useState('');

    const load = () => api.adminFetchAddresses().then(setAddresses).catch(() => {}).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    const openEdit = (addr?: Address) => {
        if (addr) { setForm({ title: addr.title, address: addr.address, sort_order: addr.sortOrder }); setEditingId(addr.id); }
        else { setForm({ title: '', address: '', sort_order: 99 }); setEditingId('new'); }
    };
    const handleSave = async () => {
        try {
            if (editingId === 'new') await api.adminCreateAddress({ title: form.title, address: form.address, sortOrder: form.sort_order });
            else if (editingId) await api.adminUpdateAddress({ id: editingId, title: form.title, address: form.address, sortOrder: form.sort_order });
            setEditingId(null); setMsg('Saved!'); load();
        } catch { setMsg('Failed to save.'); }
    };
    const handleDelete = async () => {
        if (deletingId) { try { await api.adminDeleteAddress(deletingId); load(); } catch {} finally { setConfirmOpen(false); setDeletingId(null); } }
    };

    if (loading) return <p>Loading...</p>;
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center"><h3 className="text-lg font-bold">Manage Addresses</h3>
                <button onClick={() => openEdit()} className="px-4 py-2 bg-secondary text-white font-bold rounded-md flex items-center gap-2 text-sm"><PlusIcon className="h-4 w-4" /> Add Address</button>
            </div>
            {msg && <p className="text-sm text-green-600">{msg}</p>}
            {editingId !== null && (
                <div className="p-4 bg-gray-50 dark:bg-primary-dark/30 rounded-lg border dark:border-gray-700 space-y-3">
                    <h4 className="font-semibold">{editingId === 'new' ? 'New Address' : 'Edit Address'}</h4>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title (e.g. Nigeria Warehouse)" className="w-full p-2 bg-white dark:bg-primary-dark rounded-md border dark:border-gray-600" />
                    <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} placeholder="Full address..." className="w-full p-2 bg-white dark:bg-primary-dark rounded-md border dark:border-gray-600" />
                    <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} placeholder="Sort Order" className="w-full p-2 bg-white dark:bg-primary-dark rounded-md border dark:border-gray-600" />
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 rounded-md text-sm">Cancel</button>
                        <button onClick={handleSave} className="px-3 py-1.5 bg-secondary text-white font-bold rounded-md text-sm">Save</button>
                    </div>
                </div>
            )}
            <div className="space-y-3">
                {addresses.map(addr => (
                    <div key={addr.id} className="flex items-start justify-between p-4 bg-white dark:bg-dark-card rounded-lg shadow-sm border dark:border-gray-700">
                        <div>
                            <p className="font-bold text-sm">{addr.title}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{addr.address}</p>
                            <p className="text-xs text-gray-400 mt-1">Sort: {addr.sortOrder}</p>
                        </div>
                        <div className="flex gap-3 flex-shrink-0">
                            <button onClick={() => openEdit(addr)} className="text-primary dark:text-blue-400 hover:text-secondary"><EditIcon className="h-5 w-5" /></button>
                            <button onClick={() => { setDeletingId(addr.id); setConfirmOpen(true); }} className="text-red-500 hover:text-red-600"><DeleteIcon className="h-5 w-5" /></button>
                        </div>
                    </div>
                ))}
            </div>
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Delete Address" message="Are you sure you want to delete this address?" isDestructive confirmText="Delete" />
        </div>
    );
};

// --- PHONE NUMBERS PANEL ---
const PhonesPanel: React.FC = () => {
    const [phones, setPhones] = useState<PhoneNumber[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | 'new' | null>(null);
    const [form, setForm] = useState({ label: '', number: '', showInHeader: false, sort_order: 99 });
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [msg, setMsg] = useState('');

    const load = () => api.adminFetchPhones().then(setPhones).catch(() => {}).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    const openEdit = (ph?: PhoneNumber) => {
        if (ph) { setForm({ label: ph.label, number: ph.number, showInHeader: ph.showInHeader, sort_order: ph.sortOrder }); setEditingId(ph.id); }
        else { setForm({ label: '', number: '', showInHeader: false, sort_order: 99 }); setEditingId('new'); }
    };
    const handleSave = async () => {
        try {
            if (editingId === 'new') await api.adminCreatePhone({ label: form.label, number: form.number, showInHeader: form.showInHeader, sortOrder: form.sort_order });
            else if (editingId) await api.adminUpdatePhone({ id: editingId, label: form.label, number: form.number, showInHeader: form.showInHeader, sortOrder: form.sort_order });
            setEditingId(null); setMsg('Saved!'); load();
        } catch { setMsg('Failed to save.'); }
    };
    const handleDelete = async () => {
        if (deletingId) { try { await api.adminDeletePhone(deletingId); load(); } catch {} finally { setConfirmOpen(false); setDeletingId(null); } }
    };

    if (loading) return <p>Loading...</p>;
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center"><h3 className="text-lg font-bold">Manage Phone Numbers</h3>
                <button onClick={() => openEdit()} className="px-4 py-2 bg-secondary text-white font-bold rounded-md flex items-center gap-2 text-sm"><PlusIcon className="h-4 w-4" /> Add Phone</button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">⚠️ Only one phone can be shown in the header at a time. Setting a new one as "Show in Header" will unset others.</p>
            {msg && <p className="text-sm text-green-600">{msg}</p>}
            {editingId !== null && (
                <div className="p-4 bg-gray-50 dark:bg-primary-dark/30 rounded-lg border dark:border-gray-700 space-y-3">
                    <h4 className="font-semibold">{editingId === 'new' ? 'New Phone Number' : 'Edit Phone Number'}</h4>
                    <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Label (e.g. Nigeria Line, WhatsApp)" className="w-full p-2 bg-white dark:bg-primary-dark rounded-md border dark:border-gray-600" />
                    <input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} placeholder="Phone number (e.g. 08143919153)" className="w-full p-2 bg-white dark:bg-primary-dark rounded-md border dark:border-gray-600" />
                    <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} placeholder="Sort Order" className="w-full p-2 bg-white dark:bg-primary-dark rounded-md border dark:border-gray-600" />
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.showInHeader} onChange={e => setForm(f => ({ ...f, showInHeader: e.target.checked }))} className="h-4 w-4 text-secondary rounded" />
                        <span className="text-sm font-medium">Show this number in the header top bar</span>
                    </label>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 rounded-md text-sm">Cancel</button>
                        <button onClick={handleSave} className="px-3 py-1.5 bg-secondary text-white font-bold rounded-md text-sm">Save</button>
                    </div>
                </div>
            )}
            <div className="space-y-3">
                {phones.map(ph => (
                    <div key={ph.id} className={`flex items-start justify-between p-4 rounded-lg shadow-sm border ${ph.showInHeader ? 'bg-secondary/5 border-secondary/40 dark:bg-secondary/10' : 'bg-white dark:bg-dark-card dark:border-gray-700'}`}>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-bold text-sm">{ph.label}</p>
                                {ph.showInHeader && <span className="px-2 py-0.5 bg-secondary text-white text-xs rounded-full">Header</span>}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{ph.number}</p>
                            <p className="text-xs text-gray-400 mt-1">Sort: {ph.sortOrder}</p>
                        </div>
                        <div className="flex gap-3 flex-shrink-0">
                            <button onClick={() => openEdit(ph)} className="text-primary dark:text-blue-400 hover:text-secondary"><EditIcon className="h-5 w-5" /></button>
                            <button onClick={() => { setDeletingId(ph.id); setConfirmOpen(true); }} className="text-red-500 hover:text-red-600"><DeleteIcon className="h-5 w-5" /></button>
                        </div>
                    </div>
                ))}
            </div>
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Delete Phone Number" message="Are you sure you want to delete this phone number?" isDestructive confirmText="Delete" />
        </div>
    );
};

// --- NEWSLETTER PANEL ---
const NewsletterPanel: React.FC = () => {
    const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendMsg, setSendMsg] = useState('');
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const load = () => api.adminFetchSubscribers().then(setSubscribers).catch(() => {}).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    const handleSend = async () => {
        if (!subject.trim() || !body.trim()) { setSendMsg('Subject and body are required.'); return; }
        setIsSending(true); setSendMsg('');
        try { const r = await api.adminSendNewsletter(subject, body); setSendMsg(r.message); setSubject(''); setBody(''); }
        catch (e: any) { setSendMsg(e.message || 'Failed to send newsletter.'); }
        finally { setIsSending(false); }
    };
    const handleDelete = async () => {
        if (deletingId) { try { await api.adminDeleteSubscriber(deletingId); load(); } catch {} finally { setConfirmOpen(false); setDeletingId(null); } }
    };

    return (
        <div className="space-y-8">
            {/* Compose */}
            <div className="p-6 bg-white dark:bg-dark-card rounded-xl shadow-sm border dark:border-gray-700">
                <h3 className="text-lg font-bold mb-4">Send Newsletter</h3>
                <p className="text-sm text-gray-500 mb-4">Will be sent to all <span className="font-bold text-secondary">{subscribers.length}</span> subscriber(s).</p>
                {sendMsg && <p className={`mb-4 p-3 rounded-md text-sm ${sendMsg.includes('Failed') || sendMsg.includes('required') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{sendMsg}</p>}
                <div className="space-y-3">
                    <div><label className="font-semibold text-sm block mb-1">Subject</label>
                        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Newsletter subject..." className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md" /></div>
                    <div><label className="font-semibold text-sm block mb-1">Message Body</label>
                        <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} placeholder="Write your newsletter content here..." className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md font-mono text-sm" /></div>
                    <div className="flex justify-end">
                        <button onClick={handleSend} disabled={isSending || subscribers.length === 0} className="px-6 py-2 bg-secondary text-white font-bold rounded-md disabled:opacity-60 flex items-center gap-2">
                            <SendIcon className="h-4 w-4" />{isSending ? 'Sending...' : `Send to ${subscribers.length} Subscriber(s)`}
                        </button>
                    </div>
                </div>
            </div>

            {/* Subscribers List */}
            <div>
                <h3 className="text-lg font-bold mb-4">Subscribers ({subscribers.length})</h3>
                {loading ? <p>Loading...</p> : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-primary-dark text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-2 text-left">Email</th>
                                    <th className="px-4 py-2 text-left">Name</th>
                                    <th className="px-4 py-2 text-left">Subscribed At</th>
                                    <th className="px-4 py-2 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                                {subscribers.map(s => (
                                    <tr key={s.id}>
                                        <td className="px-4 py-3 text-sm">{s.email}</td>
                                        <td className="px-4 py-3 text-sm">{s.name || '-'}</td>
                                        <td className="px-4 py-3 text-sm">{new Date(s.subscribedAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <button onClick={() => { setDeletingId(s.id); setConfirmOpen(true); }} className="text-red-500 hover:text-red-600"><DeleteIcon className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                                {subscribers.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">No subscribers yet.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Remove Subscriber" message="Remove this subscriber from the newsletter list?" isDestructive confirmText="Remove" />
        </div>
    );
};

export default AdminDashboardPage;

