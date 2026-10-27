import React, { useState, useEffect } from 'react';
import { MailIcon, PhoneIcon, LocationIcon, WhatsAppIcon, CheckCircleIcon, GlobeIcon } from '../components/icons';
import { submitContactForm, fetchSiteSettings, fetchAddresses, fetchPhones, toWhatsAppLink } from '../services/api';
import { SiteSettings, Address, PhoneNumber } from '../types';
import { defaultSiteSettings } from '../services/defaultData';
import PageWrapper from '../components/PageWrapper';

const ContactPage: React.FC = () => {
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [settings, setSettings] = useState<Partial<SiteSettings>>({});
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [phones, setPhones] = useState<PhoneNumber[]>([]);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await fetchSiteSettings();
                setSettings(data);
            } catch {
                setSettings(defaultSiteSettings);
            }
            try {
                const addrs = await fetchAddresses();
                setAddresses(addrs);
            } catch {}
            try {
                const phs = await fetchPhones();
                setPhones(phs);
            } catch {}
        };
        loadSettings();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setStatus('submitting');
        try {
            await submitContactForm(formData);
            setStatus('success');
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (error) {
            setStatus('error');
            console.error("Failed to submit contact form:", error);
        }
    };

    return (
        <PageWrapper className="bg-light-bg dark:bg-dark-bg py-16 md:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-primary dark:text-white sm:text-5xl">Get in Touch</h1>
                    <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">We're here to help with all your logistics needs. Reach out to us anytime.</p>
                </div>

                <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Contact Info */}
                    <div className="lg:col-span-1 space-y-4">

                        {/* Multiple Addresses */}
                        {addresses.length > 0 ? (
                            addresses.map((addr) => (
                                <div key={addr.id} className="flex items-start p-6 bg-white dark:bg-dark-card rounded-lg shadow-md">
                                    <LocationIcon className="h-8 w-8 mt-1 mr-4 flex-shrink-0 text-secondary" />
                                    <div>
                                        <h3 className="text-lg font-bold text-primary dark:text-white">{addr.title || 'Our Office'}</h3>
                                        <p className="mt-1 text-gray-600 dark:text-gray-300">{addr.address}</p>
                                    </div>
                                </div>
                            ))
                        ) : settings.address ? (
                            <div className="flex items-start p-6 bg-white dark:bg-dark-card rounded-lg shadow-md">
                                <LocationIcon className="h-8 w-8 mt-1 mr-4 flex-shrink-0 text-secondary" />
                                <div>
                                    <h3 className="text-lg font-bold text-primary dark:text-white">Our Office</h3>
                                    <p className="mt-1 text-gray-600 dark:text-gray-300">{settings.address}</p>
                                </div>
                            </div>
                        ) : null}

                        {/* Email */}
                        {settings.email && (
                            <div className="flex items-start p-6 bg-white dark:bg-dark-card rounded-lg shadow-md">
                                <MailIcon className="h-8 w-8 mt-1 mr-4 flex-shrink-0 text-secondary" />
                                <div>
                                    <h3 className="text-lg font-bold text-primary dark:text-white">Email Us</h3>
                                    <a href={`mailto:${settings.email}`} className="mt-1 text-gray-600 dark:text-gray-300 hover:text-secondary">{settings.email}</a>
                                </div>
                            </div>
                        )}

                        {/* Multiple Phone Numbers */}
                        {phones.length > 0 ? (
                            phones.map((ph) => (
                                <div key={ph.id} className="flex items-start p-6 bg-white dark:bg-dark-card rounded-lg shadow-md">
                                    <PhoneIcon className="h-8 w-8 mt-1 mr-4 flex-shrink-0 text-secondary" />
                                    <div>
                                        <h3 className="text-lg font-bold text-primary dark:text-white">{ph.label || 'Call Us'}</h3>
                                        <a href={`tel:${ph.number}`} className="mt-1 text-gray-600 dark:text-gray-300 hover:text-secondary">{ph.number}</a>
                                    </div>
                                </div>
                            ))
                        ) : settings.phone ? (
                            <div className="flex items-start p-6 bg-white dark:bg-dark-card rounded-lg shadow-md">
                                <PhoneIcon className="h-8 w-8 mt-1 mr-4 flex-shrink-0 text-secondary" />
                                <div>
                                    <h3 className="text-lg font-bold text-primary dark:text-white">Call Us</h3>
                                    <a href={`tel:${settings.phone}`} className="mt-1 text-gray-600 dark:text-gray-300 hover:text-secondary">{settings.phone}</a>
                                </div>
                            </div>
                        ) : null}

                        {/* WhatsApp */}
                        {settings.whatsapp && (
                            <div className="flex items-start p-6 bg-white dark:bg-dark-card rounded-lg shadow-md">
                                <WhatsAppIcon className="h-8 w-8 mt-1 mr-4 flex-shrink-0 text-secondary" />
                                <div>
                                    <h3 className="text-lg font-bold text-primary dark:text-white">WhatsApp</h3>
                                    <a href={toWhatsAppLink(settings.whatsapp)} target="_blank" rel="noopener noreferrer" className="mt-1 text-gray-600 dark:text-gray-300 hover:text-secondary">{settings.whatsapp}</a>
                                </div>
                            </div>
                        )}

                        {/* Website */}
                        {settings.website && (
                            <div className="flex items-start p-6 bg-white dark:bg-dark-card rounded-lg shadow-md">
                                <GlobeIcon className="h-8 w-8 mt-1 mr-4 flex-shrink-0 text-secondary" />
                                <div>
                                    <h3 className="text-lg font-bold text-primary dark:text-white">Website</h3>
                                    <a href={settings.website} target="_blank" rel="noopener noreferrer" className="mt-1 text-gray-600 dark:text-gray-300 hover:text-secondary break-all">{settings.website.replace('https://', '')}</a>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-lg shadow-lg p-8">
                        {status === 'success' ? (
                            <div className="text-center flex flex-col items-center justify-center h-full">
                                <CheckCircleIcon className="h-16 w-16 text-green-500 mb-4" />
                                <h2 className="text-2xl font-bold text-primary dark:text-white">Message Sent!</h2>
                                <p className="mt-2 text-gray-600 dark:text-gray-300">Thank you for reaching out. We'll get back to you soon.</p>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-2xl font-bold text-primary dark:text-white mb-6">Send us a Message</h2>
                                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Your Name" required className="p-3 bg-gray-100 dark:bg-primary-dark rounded-md border-transparent focus:ring-2 focus:ring-secondary focus:border-transparent"/>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Your Email" required className="p-3 bg-gray-100 dark:bg-primary-dark rounded-md border-transparent focus:ring-2 focus:ring-secondary focus:border-transparent"/>
                                    <input type="text" name="subject" value={formData.subject} onChange={handleChange} placeholder="Subject" required className="md:col-span-2 p-3 bg-gray-100 dark:bg-primary-dark rounded-md border-transparent focus:ring-2 focus:ring-secondary focus:border-transparent"/>
                                    <textarea name="message" value={formData.message} onChange={handleChange} placeholder="Your Message" rows={6} required className="md:col-span-2 p-3 bg-gray-100 dark:bg-primary-dark rounded-md border-transparent focus:ring-2 focus:ring-secondary focus:border-transparent"></textarea>
                                    <button type="submit" disabled={status === 'submitting'} className="md:col-span-2 w-full mt-4 px-8 py-3 bg-secondary text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center">
                                       {status === 'submitting' ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Sending...
                                            </>
                                        ) : 'Submit Message'}
                                    </button>
                                </form>
                                {status === 'error' && <p className="text-red-500 text-center mt-4">Something went wrong. Please try again.</p>}
                            </>
                        )}
                    </div>
                </div>

                 {/* Map Section */}
                <div className="mt-16">
                    <h2 className="text-3xl font-extrabold text-primary dark:text-white sm:text-4xl text-center mb-8">Find Us Here</h2>
                    <div className="aspect-w-16 aspect-h-9 bg-gray-300 dark:bg-dark-card rounded-lg shadow-lg overflow-hidden">
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3963.987622967192!2d3.315025315367616!3d6.523490924978875!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103b8c5f3e46e80b%3A0x6c6c5e2d6f7b1e4b!2sAjao%20Estate!5e0!3m2!1sen!2sng!4v1689855512345!5m2!1sen!2sng"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen={true}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Office Location"
                        ></iframe>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

export default ContactPage;