import React from 'react';
import { Shipment } from '../types';
import { ShipIcon, PlaneIcon, CheckCircleIcon, TruckIcon, PackageIcon, CustomsIcon, BuildingArrivalIcon } from './icons';

const getTimelineIcon = (status: string, carrier: string) => {
    const s = status.toLowerCase();
    if (s.includes('delivered')) return <CheckCircleIcon className="w-6 h-6 text-white" />;
    if (s.includes('out for delivery')) return <TruckIcon className="w-5 h-5" />;
    if (s.includes('customs')) return <CustomsIcon className="w-5 h-5" />;
    if (s.includes('arrived at destination')) return <BuildingArrivalIcon className="w-5 h-5" />;
    if (s.includes('in transit') || s.includes('departed')) {
        return carrier.toLowerCase().includes('air') ? <PlaneIcon className="w-5 h-5" /> : <ShipIcon className="w-5 h-5" />;
    }
    if (s.includes('picked up')) return <PackageIcon className="w-5 h-5" />;
    return <div className="w-2 h-2 bg-secondary rounded-full"></div>;
};

export const ShipmentTimeline: React.FC<{ shipment: Shipment }> = ({ shipment }) => {
    return (
        <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3">
            {shipment.history.map((event, index) => (
                <li key={index} className="mb-10 ml-8">
                    <span className={`absolute flex items-center justify-center w-8 h-8 rounded-full -left-4 ring-4 ring-white dark:ring-dark-card ${event.status.toLowerCase().includes('delivered') ? 'bg-green-500' : 'bg-secondary'}`}>
                        {getTimelineIcon(event.status, shipment.carrier)}
                    </span>
                    <h3 className="flex items-center mb-1 text-lg font-semibold text-primary dark:text-white">{event.status}</h3>
                    <time className="block mb-2 text-sm font-normal leading-none text-gray-500 dark:text-gray-400">{new Date(event.date).toDateString()} at {event.time}</time>
                    <p className="text-base font-normal text-gray-600 dark:text-gray-300">{event.location}</p>
                    <p className="text-sm font-normal text-gray-500 dark:text-gray-400">{event.details}</p>
                </li>
            ))}
        </ol>
    );
};

const ShipmentStageProgressBar: React.FC<{ status: string }> = ({ status }) => {
    const stages = ['Processing', 'In Transit', 'Arrived', 'Delivered'];

    const getStageIndex = (currentStatus: string): number => {
        const s = currentStatus.toLowerCase();
        if (s.includes('delivered')) return 3;
        if (s.includes('arrived at destination') || s.includes('out for delivery')) return 2;
        if (s.includes('in transit') || s.includes('departed') || s.includes('customs')) return 1;
        if (s.includes('picked up') || s.includes('processing')) return 0;
        return 0;
    };

    const currentStageIndex = getStageIndex(status);

    return (
        <div className="w-full px-2 sm:px-4" aria-label="Shipment progress">
            <div className="flex">
                {stages.map((stage, index) => (
                    <div key={stage} className="flex-1 flex items-center justify-center relative">
                        <div className="flex flex-col items-center text-center z-10">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-500 ${index <= currentStageIndex ? 'bg-secondary text-white' : 'bg-gray-200 dark:bg-primary-dark text-gray-500'}`}
                                aria-label={`Stage ${index + 1}: ${stage}, status: ${index <= currentStageIndex ? 'complete' : 'pending'}`}
                            >
                                {index < currentStageIndex || (index === currentStageIndex && status.toLowerCase().includes('delivered')) ? <CheckCircleIcon className="w-5 h-5" /> : index + 1}
                            </div>
                            <p className={`mt-2 text-xs sm:text-sm font-medium ${index <= currentStageIndex ? 'text-primary dark:text-white' : 'text-gray-400'}`}>{stage}</p>
                        </div>
                        {index < stages.length - 1 && (
                            <div className={`flex-1 h-1 absolute top-4 left-1/2 w-full transition-colors duration-500 ${index < currentStageIndex ? 'bg-secondary' : 'bg-gray-200 dark:bg-primary-dark'}`}></div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const FulfillmentProgress: React.FC<{ shipment: Shipment }> = ({ shipment }) => {
    const installments = shipment.installments || [];
    const fulfilled = shipment.fulfilledQuantity ?? installments.reduce((sum, i) => sum + i.quantity, 0);
    const ordered = shipment.orderedQuantity || 0;
    const pct = ordered > 0 ? Math.min(100, Math.round((fulfilled / ordered) * 100)) : 0;
    const containerCount = new Set(installments.map(i => i.containerNumber).filter(Boolean)).size;

    return (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-primary dark:text-white mb-4">Fulfillment Progress</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-2">
                {fulfilled} of {ordered} {shipment.unit} shipped
                {containerCount > 0 ? `, across ${containerCount} container${containerCount > 1 ? 's' : ''}` : ''}
            </p>
            <div className="w-full bg-gray-200 dark:bg-primary-dark rounded-full h-3 mb-6">
                <div className="bg-secondary h-3 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
            </div>
            {installments.length > 0 ? (
                <div className="space-y-3">
                    {installments.map(inst => (
                        <div key={inst.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-primary-dark/50 rounded-md">
                            {inst.photoUrl && <img src={inst.photoUrl} alt="Shipment proof" className="h-16 w-16 object-cover rounded-md flex-shrink-0" />}
                            <div>
                                <p className="font-semibold text-primary dark:text-white">{inst.quantity} {shipment.unit}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Container: {inst.containerNumber || 'N/A'}</p>
                                <p className="text-xs text-gray-400">{new Date(inst.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No installments recorded yet.</p>
            )}
        </div>
    );
};

interface TrackingResultProps {
    shipment: Shipment;
    variant?: 'full' | 'compact';
}

const TrackingResult: React.FC<TrackingResultProps> = ({ shipment, variant = 'full' }) => (
    <div className={`${variant === 'compact' ? 'mt-4' : 'mt-8'} bg-white dark:bg-dark-card shadow-xl rounded-lg overflow-hidden`}>
        <div className={`p-6 ${shipment.status === 'Delivered' ? 'bg-green-600' : 'bg-primary'} text-white`}>
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-sm font-medium">Tracking ID</p>
                    <p className="text-2xl font-bold">{shipment.trackingId}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-2xl font-bold">{shipment.status}</p>
                </div>
            </div>
        </div>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <ShipmentStageProgressBar status={shipment.status} />
        </div>
        {variant === 'full' && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-gray-200 dark:border-gray-700">
                <div><h4 className="font-bold text-primary dark:text-white">Origin</h4><p>{shipment.origin}</p></div>
                <div><h4 className="font-bold text-primary dark:text-white">Destination</h4><p>{shipment.destination}</p></div>
                <div><h4 className="font-bold text-primary dark:text-white">Est. Arrival</h4><p>{new Date(shipment.estimatedArrival).toDateString()}</p></div>
            </div>
        )}
        {variant === 'full' && (
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-primary dark:text-white mb-4">Shipment Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Carrier</h4>
                        <p className="font-semibold text-primary dark:text-white">{shipment.carrier}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Service</h4>
                        <p className="font-semibold text-primary dark:text-white">{shipment.service}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Weight</h4>
                        <p className="font-semibold text-primary dark:text-white">{shipment.weight}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Item</h4>
                        <p className="font-semibold text-primary dark:text-white">{shipment.itemDescription}</p>
                    </div>
                </div>
            </div>
        )}
        <FulfillmentProgress shipment={shipment} />
        <div className="p-6">
            <h3 className="text-xl font-bold text-primary dark:text-white mb-6">Shipment History</h3>
            <ShipmentTimeline shipment={shipment} />
        </div>
    </div>
);

export default TrackingResult;
