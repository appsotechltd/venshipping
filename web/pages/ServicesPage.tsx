
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchServices } from '../services/api';
import { Service } from '../types';
import { iconMap, ShipIcon } from '../components/icons';
import { defaultServices } from '../services/defaultData';
import PageWrapper from '../components/PageWrapper';

const shippingTypes = [
    { name: 'Full Container Load (FCL)', description: 'Exclusive use of a container for your shipment, offering maximum security and space.' },
    { name: 'Less than Container Load (LCL)', description: 'Share container space with other shippers, a cost-effective option for smaller shipments.' },
    { name: 'Groupage Shipping', description: 'We consolidate several small shipments into one large shipment to reduce costs for everyone.' },
    { name: 'Express Shipping', description: 'The fastest shipping option available, combining air freight with expedited ground services.' },
]

const ServicesPage: React.FC = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadServices = async () => {
            try {
                const data = await fetchServices();
                setServices(data);
            } catch (error) {
                console.error("Failed to load services, using defaults:", error);
                setServices(defaultServices);
            } finally {
                setLoading(false);
            }
        };
        loadServices();
    }, []);

    return (
        <PageWrapper>
            {/* Hero Section */}
            <section className="relative h-[500px] flex items-center justify-center bg-primary">
                <div className="absolute inset-0 bg-black opacity-50"></div>
                <img src="/images/header2.jpg" className="absolute inset-0 w-full h-full object-cover" alt="Air cargo" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
                    <h1 className="text-4xl font-extrabold sm:text-5xl md:text-6xl">Our Logistics Services</h1>
                    <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-200">A complete suite of services designed to handle every aspect of your shipping needs from China to Nigeria.</p>
                </div>
            </section>

            {/* Main Services Grid */}
            <section className="py-16 md:py-24 bg-light-bg dark:bg-dark-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold text-primary dark:text-white sm:text-4xl">What We Offer</h2>
                        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Comprehensive logistics solutions tailored for you.</p>
                    </div>
                    {loading ? (
                        <div className="text-center">Loading services...</div>
                    ) : (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {services.map(service => {
                                const IconComponent = iconMap[service.iconName] || ShipIcon;
                                return (
                                    <Link to={`/services/${service.id}`} key={service.id} className="p-8 bg-white dark:bg-dark-card rounded-lg shadow-lg flex flex-col hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group">
                                        <div className="flex-shrink-0">
                                            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-secondary/10 mx-auto mb-6">
                                                <IconComponent className="h-10 w-10 text-secondary" />
                                            </div>
                                            <h3 className="text-xl font-bold text-primary dark:text-white text-center">{service.name}</h3>
                                        </div>
                                        <div className="flex-grow mt-4">
                                            <p className="text-base text-gray-600 dark:text-gray-300 text-center">{service.shortDescription}</p>
                                        </div>
                                        <div className="text-center mt-6">
                                            <span className="text-secondary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Learn More &rarr;</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Shipping Types Section */}
            <section className="py-16 md:py-24 bg-white dark:bg-dark-card">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold text-primary dark:text-white sm:text-4xl">Shipping From China 🇨🇳 to Nigeria 🇳🇬</h2>
                        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">We specialize in a variety of shipping methods to suit your specific needs.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {shippingTypes.map((type) => (
                            <div key={type.name} className="p-6 bg-light-bg dark:bg-dark-bg rounded-lg shadow-md">
                                <h3 className="text-lg font-bold text-primary dark:text-white">{type.name}</h3>
                                <p className="mt-2 text-gray-600 dark:text-gray-300">{type.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </PageWrapper>
    );
};

export default ServicesPage;
