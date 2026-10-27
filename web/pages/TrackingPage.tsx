import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchTrackingData } from '../services/api';
import { Shipment } from '../types';
import PageWrapper from '../components/PageWrapper';
import TrackingResult from '../components/ShipmentTrackingResult';

const TrackingPanel: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [trackingId, setTrackingId] = useState('');
    const [shipment, setShipment] = useState<Shipment | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const performLookup = async (idToLookup: string) => {
        const trimmedId = idToLookup.trim();
        setShipment(null);
        setError(null);

        if (!trimmedId) {
            setError('Please enter a tracking ID.');
            return;
        }

        if (!trimmedId.toUpperCase().startsWith('VEN') || trimmedId.length < 10) {
            setError('Invalid Tracking ID format. Please check the ID and try again.');
            return;
        }

        setIsLoading(true);
        try {
            const data = await fetchTrackingData(trimmedId);
            setShipment(data);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        await performLookup(trackingId);
    };

    useEffect(() => {
        const idFromUrl = searchParams.get('id');
        if (idFromUrl) {
            setTrackingId(idFromUrl);
            performLookup(idFromUrl);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div>
            <form onSubmit={handleTrack} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4">
                <input
                    type="text"
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    placeholder="e.g., VEN123456789"
                    className="w-full px-5 py-3 text-lg bg-white dark:bg-primary-dark rounded-md border-gray-300 dark:border-gray-600 border focus:ring-secondary focus:border-secondary transition"
                    aria-label="Tracking ID"
                />
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-8 py-3 bg-secondary text-white font-bold rounded-md hover:bg-opacity-90 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center text-lg"
                >
                    {isLoading ? (
                         <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : 'Track'}
                </button>
            </form>
            <div className="mt-8">
                {error && <p className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-4 rounded-md max-w-2xl mx-auto">{error}</p>}
                {shipment && <TrackingResult shipment={shipment} variant="full" />}
            </div>
        </div>
    );
};

const TrackingPage: React.FC = () => {
    return (
        <PageWrapper className="bg-light-bg dark:bg-dark-bg py-16 md:py-24 min-h-[70vh]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-primary dark:text-white sm:text-5xl">Track Your Shipment</h1>
                    <p className="mt-4 text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">Enter your tracking ID below to get real-time updates on your shipment's journey from origin to destination.</p>
                </div>
                <div className="mt-12">
                   <TrackingPanel />
                </div>
            </div>
        </PageWrapper>
    );
};

export default TrackingPage;
