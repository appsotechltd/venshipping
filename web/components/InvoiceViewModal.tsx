import React, { useState } from 'react';
import { InvoiceWithDetails, SiteSettings } from '../types';
import { MailIcon, WhatsAppIcon, PdfIcon, CloseIcon } from './icons';
import ConfirmationModal from './ConfirmationModal';

interface InvoiceViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: InvoiceWithDetails | null;
    settings: Partial<SiteSettings>;
    onSend: (id: string, method: 'email' | 'whatsapp') => Promise<void>;
}

const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({ isOpen, onClose, invoice, settings, onSend }) => {
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: '', message: '' });

    if (!isOpen || !invoice) return null;

    const handlePrint = () => {
        const printContent = document.getElementById('invoice-to-print');
        if (printContent) {
            const printWindow = window.open('', '', 'height=600,width=800');
            printWindow?.document.write('<html><head><title>Print Invoice</title>');
            printWindow?.document.write('<style>body{font-family: sans-serif;} table{width: 100%; border-collapse: collapse;} th, td{border: 1px solid #ddd; padding: 8px; text-align: left;} th{background-color: #f2f2f2;}</style>');
            printWindow?.document.write('</head><body >');
            printWindow?.document.write(printContent.innerHTML);
            printWindow?.document.write('</body></html>');
            printWindow?.document.close();
            printWindow?.focus();
            printWindow?.print();
        }
    }

    const handleSend = (method: 'email' | 'whatsapp') => {
        setConfirmModal({
            isOpen: true,
            title: `Send ${invoice.type}`,
            message: `Send this ${invoice.type} to ${invoice.customerName} via ${method}?`,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await onSend(invoice.id, method);
                    setAlertModal({ isOpen: true, title: 'Success', message: `${invoice.type} sent successfully!` });
                } catch (e) {
                    setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to send document.' });
                }
            }
        });
    }

    // Generate a WhatsApp link for direct opening
    const whatsAppMessage = `Hello ${invoice.customerName}, please find your ${invoice.type} ${invoice.id} for amount ${invoice.total.toLocaleString()}.`;
    const whatsAppLink = `https://wa.me/${invoice.customerPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(whatsAppMessage)}`;

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 flex-shrink-0">
                    <h3 className="text-xl font-bold">{invoice.type.toUpperCase()} {invoice.id}</h3>
                    <div className="flex gap-2">
                        <button onClick={() => handleSend('email')} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md flex items-center gap-1"><MailIcon className="h-4 w-4" /> Email</button>
                        <button onClick={() => handleSend('whatsapp')} className="px-3 py-1 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded-md flex items-center gap-1"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</button>
                        {invoice.customerPhone && (
                            <a href={whatsAppLink} target="_blank" rel="noreferrer" className="px-3 py-1 text-sm bg-green-600 text-white hover:bg-green-700 rounded-md flex items-center gap-1">Open WA</a>
                        )}
                        <button onClick={handlePrint} className="px-3 py-1 text-sm bg-gray-200 dark:bg-primary-dark rounded-md flex items-center gap-1"><PdfIcon className="h-4 w-4" /> Print/PDF</button>
                        <button type="button" onClick={onClose}><CloseIcon className="h-6 w-6" /></button>
                    </div>
                </div>
                <div id="invoice-to-print" className="p-8 overflow-y-auto">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-primary dark:text-white">{settings.companyName || 'Ven Logistics'}</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">{settings.address}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-3xl font-bold uppercase text-gray-400 dark:text-gray-500">{invoice.type}</h2>
                            <p><strong>ID:</strong> {invoice.id}</p>
                            <p><strong>Date:</strong> {new Date(invoice.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className="border-t dark:border-gray-700 pt-4 mb-8">
                        <h4 className="font-bold mb-1">Bill To:</h4>
                        <p>{invoice.customerName}</p>
                        <p>{invoice.customerEmail}</p>
                        {invoice.customerPhone && <p>{invoice.customerPhone}</p>}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-primary-dark">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Description</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium uppercase">Qty</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium uppercase">Price</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-2 whitespace-nowrap">{item.description}</td>
                                        <td className="px-4 py-2 text-right">{item.quantity}</td>
                                        <td className="px-4 py-2 text-right">{item.price.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right">{(item.quantity * item.price).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t-2 border-gray-300 dark:border-gray-600">
                                <tr>
                                    <td colSpan={3} className="text-right font-bold pt-4">Grand Total</td>
                                    <td className="text-right font-bold pt-4 text-lg">₦{invoice.total.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div className={`mt-8 text-center p-4 rounded-lg font-bold text-xl ${invoice.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                        STATUS: {invoice.status.toUpperCase()}
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText="Send"
            />

            <ConfirmationModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                title={alertModal.title}
                message={alertModal.message}
                confirmText="OK"
                showCancelButton={false}
            />
        </div>
    );
}

export default InvoiceViewModal;
