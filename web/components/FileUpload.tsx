import React, { useState } from 'react';
import { uploadFile } from '../services/api';

interface FileUploadProps {
    onUpload: (url: string) => void;
    accept?: string;
    label?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload, accept = 'image/*', label = 'Upload File' }) => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            const data = await uploadFile(file);
            onUpload(data.url);
        } catch (err) {
            console.error('Upload error:', err);
            setError('Failed to upload file. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="mt-1 flex flex-col items-start">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label}
            </label>
            <div className="flex items-center space-x-2">
                <label className="cursor-pointer bg-white dark:bg-dark-card border border-gray-300 dark:border-gray-600 rounded-md py-2 px-4 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary">
                    <span>{uploading ? 'Uploading...' : 'Choose File'}</span>
                    <input
                        type="file"
                        className="sr-only"
                        accept={accept}
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                </label>
                {uploading && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-secondary"></div>
                )}
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
};

export default FileUpload;
