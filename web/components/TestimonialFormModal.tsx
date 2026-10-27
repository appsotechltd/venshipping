import React, { useState } from 'react';
import { CloseIcon, StarIcon } from './icons';
import { submitTestimonial } from '../services/api';

interface TestimonialFormModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TestimonialFormModal: React.FC<TestimonialFormModalProps> = ({ isOpen, onClose }) => {
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [message, setMessage] = useState('');
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const resetAndClose = () => {
        setName(''); setCompany(''); setMessage(''); setRating(5); setStatus('idle'); setError('');
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');
        setError('');
        try {
            await submitTestimonial({ name, company: company || undefined, message, rating });
            setStatus('success');
        } catch (err: any) {
            setError(err.message || 'Failed to submit testimonial.');
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h3 className="text-xl font-bold text-primary dark:text-white">Share Your Experience</h3>
                    <button type="button" onClick={resetAndClose} aria-label="Close"><CloseIcon className="h-6 w-6" /></button>
                </div>

                {status === 'success' ? (
                    <div className="p-6 text-center">
                        <p className="text-lg font-semibold text-primary dark:text-white">Thank you!</p>
                        <p className="mt-2 text-gray-600 dark:text-gray-300">Your testimonial has been submitted and will appear on the site once reviewed.</p>
                        <button onClick={resetAndClose} className="mt-6 px-6 py-2 bg-secondary text-white font-bold rounded-md">Close</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}

                        <div>
                            <label className="block text-sm font-semibold mb-1">Your Rating</label>
                            <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        aria-label={`${star} star${star > 1 ? 's' : ''}`}
                                    >
                                        <StarIcon className={`h-7 w-7 ${(hoverRating || rating) >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Your Name"
                            required
                            className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md"
                        />
                        <input
                            value={company}
                            onChange={e => setCompany(e.target.value)}
                            placeholder="Company (optional)"
                            className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md"
                        />
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Tell us about your experience..."
                            required
                            rows={4}
                            className="w-full p-2 bg-gray-100 dark:bg-primary-dark rounded-md"
                        />

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={resetAndClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md font-semibold">Cancel</button>
                            <button
                                type="submit"
                                disabled={status === 'submitting'}
                                className="px-4 py-2 bg-secondary text-white font-bold rounded-md disabled:bg-gray-400"
                            >
                                {status === 'submitting' ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default TestimonialFormModal;
