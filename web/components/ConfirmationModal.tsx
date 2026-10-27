import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    isDestructive?: boolean;
    showCancelButton?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    isDestructive = false,
    showCancelButton = true
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-primary dark:text-white">{title}</h3>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">{message}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-primary-dark/50 flex justify-end gap-3 rounded-b-lg">
                    {showCancelButton && (
                        <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Cancel</button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-md font-semibold text-white transition-colors ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-secondary hover:bg-opacity-90'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
