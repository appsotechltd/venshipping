import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchServiceById } from '../services/api';
import { Service } from '../types';
import { CheckCircleIcon, iconMap, ShipIcon } from '../components/icons';
import { defaultServices } from '../services/defaultData';
import PageWrapper from '../components/PageWrapper';

const ServiceDetailPage: React.FC = () => {
    const { serviceId } = useParams<{ serviceId: string }>();
    const navigate = useNavigate();
    const [service, setService] = useState<Service | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (serviceId) {
            const loadService = async () => {
                setLoading(true);
                try {
                    const data = await fetchServiceById(serviceId);
                    setService(data);
                } catch (error) {
                    console.error("Failed to load service details, using default:", error);
                    const defaultService = defaultServices.find(s => s.id === serviceId);
                    setService(defaultService || null);
                } finally {
                    setLoading(false);
                }
            };
            loadService();
        } else {
            setService(null);
            setLoading(false);
        }
    }, [serviceId]);

    if (loading) {
        return <div className="min-h-[60vh] flex justify-center items-center">Loading...</div>;
    }

    if (!service) {
        return (
            <PageWrapper>
                <div className="text-center py-20 min-h-[60vh] flex flex-col justify-center items-center">
                    <h1 className="text-4xl font-extrabold text-primary dark:text-white">Service Not Found</h1>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">The service you are looking for does not exist.</p>
                    <Link to="/services" className="mt-8 inline-block px-8 py-3 bg-secondary text-white font-bold rounded-md hover:bg-opacity-90 transition-colors">
                        Back to Services
                    </Link>
                </div>
            </PageWrapper>
        );
    }
    
    const IconComponent = iconMap[service.iconName] || ShipIcon;

    return (
        <PageWrapper>
            {/* Hero Section */}
            <section className="relative py-24 md:py-32 bg-primary">
                <div className="absolute inset-0 bg-black opacity-50"></div>
                <img src={service.image} className="absolute inset-0 w-full h-full object-cover" alt={service.name}/>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
                    <div className="inline-block bg-secondary/20 p-4 rounded-full mb-4">
                        <IconComponent className="h-12 w-12 text-secondary" />
                    </div>
                    <h1 className="text-4xl font-extrabold sm:text-5xl md:text-6xl">{service.name}</h1>
                    <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-200">{service.shortDescription}</p>
                </div>
            </section>

            {/* Service Details Section */}
            <section className="py-16 md:py-24 bg-light-bg dark:bg-dark-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-12">
                    
                    {/* Main Content */}
                    <div className="md:col-span-2">
                        <h2 className="text-3xl font-extrabold text-primary dark:text-white mb-4">Service Overview</h2>
                        <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 space-y-4">
                             <p>{service.longDescription}</p>
                        </div>

                        <h3 className="text-2xl font-bold text-primary dark:text-white mt-12 mb-6">Key Features</h3>
                        <ul className="space-y-4">
                            {service.keyFeatures.map((feature, index) => (
                                <li key={index} className="flex items-start">
                                    <CheckCircleIcon className="flex-shrink-0 h-6 w-6 text-green-500 mr-3 mt-1" />
                                    <span className="text-lg text-gray-700 dark:text-gray-200">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Sidebar */}
                    <aside className="md:col-span-1">
                        <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6 sticky top-24">
                            <h3 className="text-xl font-bold text-primary dark:text-white mb-4">Need this Service?</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">Let us handle your logistics. Book your shipping today.</p>
                            <Link to="/quote" className="w-full text-center block px-6 py-3 bg-secondary text-white font-bold rounded-md hover:bg-opacity-90 transition-colors">
                                Book a Shipping
                            </Link>
                            <button onClick={() => navigate(-1)} className="w-full text-center block mt-4 px-6 py-3 bg-gray-200 dark:bg-primary-dark text-primary dark:text-white font-bold rounded-md hover:bg-gray-300 dark:hover:bg-primary transition-colors">
                                &larr; Go Back
                            </button>
                        </div>
                    </aside>
                </div>
            </section>
        </PageWrapper>
    );
};

export default ServiceDetailPage;