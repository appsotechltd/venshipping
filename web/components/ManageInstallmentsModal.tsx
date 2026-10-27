import React, { useState } from 'react';
import { Shipment } from '../types';
import * as api from '../services/api';
import FileUpload from './FileUpload';
import { CloseIcon, DeleteIcon, PlusIcon } from './icons';

interface ManageInstallmentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    shipment: Shipment | null;
    onChanged: () => void;
}

const ManageInstallmentsModal: React.FC<ManageInstallmentsModalProps> = ({ isOpen, onClose, shipment, onChanged }) => {
    const [quantity, setQuantity] = useState('');
    const [containerNumber, setContainerNumber] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen || !shipment) return null;

    const installments = shipment.installments || [];
    const fulfilled = installments.reduce((sum, i) => sum + i.quantity, 0);
    const remaining = Math.max(0, (shipment.orderedQuantity || 0) - fulfilled);

    const resetForm = () => { setQuantity(''); setContainerNumber(''); setPhotoUrl(''); setError(''); };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quantity || Number(quantity) <= 0) {
            setError('Enter a quantity greater than 0.');
            return;
        }
        setIsSaving(true);
        setError('');
        try {
            await api.adminCreateInstallment(shipment.trackingId, {
                quantity: Number(quantity),
                containerNumber: containerNumber || undefined,
                photoUrl: photoUrl || undefined,
            });
            resetForm();
            onChanged();
        } catch (err) {
            setError('Failed to add installment.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.adminDeleteInstallment(shipment.trackingId, id);
            onChanged();
        } catch (err) {
            setError('Failed to delete installment.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 flex-shrink-0">
                    <h3 className="text-xl font-bold">Installments: {shipment.trackingId}</h3>
                    <button type="button" onClick={onClose}><CloseIcon className="h-6 w-6" /></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="p-4 bg-gray-50 dark:bg-primary-dark/50 rounded-md">
                        <p className="font-semibold">{shipment.itemDescription}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {fulfilled} of {shipment.orderedQuantity} {shipment.unit} fulfilled ({remaining} {shipment.unit} remaining)
                        </p>
                    </div>

                    {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}

                    <div className="space-y-3">
                        {installments.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No installments recorded yet.</p>}
                        {installments.map(inst => (
                            <div key={inst.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-primary-dark/50 rounded-md">
                                {inst.photoUrl && <img src={inst.photoUrl} alt="Installment proof" className="h-14 w-14 object-cover rounded-md flex-shrink-0" />}
                                {inst.qrCodeDataUrl && <img src={inst.qrCodeDataUrl} alt="QR code" className="h-14 w-14 flex-shrink-0" />}
                                <div className="flex-grow">
                                    <p className="font-semibold">{inst.quantity} {shipment.unit}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Container: {inst.containerNumber || 'N/A'}</p>
                                    <p className="text-xs text-gray-400">{new Date(inst.createdAt).toLocaleString()}</p>
                                </div>
                                <button onClick={() => handleDelete(inst.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 p-2 rounded-full flex-shrink-0"><DeleteIcon className="h-5 w-5" /></button>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleAdd} className="p-4 border dark:border-gray-700 rounded-md space-y-3">
                        <h4 className="font-semibold">Add Installment</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder={`Quantity (${shipment.unit})`} required className="p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                            <input value={containerNumber} onChange={e => setContainerNumber(e.target.value)} placeholder="Container Number" className="p-2 bg-gray-100 dark:bg-primary-dark rounded-md" />
                        </div>
                        <FileUpload onUpload={setPhotoUrl} label="Upload Proof Photo" />
                        {photoUrl && <img src={photoUrl} alt="Preview" className="h-16 w-16 object-cover rounded-md" />}
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-secondary text-white font-bold rounded-md disabled:bg-gray-400 flex items-center gap-2">
                            <PlusIcon className="h-4 w-4" /> {isSaving ? 'Adding...' : 'Add Installment'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ManageInstallmentsModal;
