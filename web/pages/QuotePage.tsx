import React, { useState, useEffect } from 'react';
import { CheckCircleIcon } from '../components/icons';
import PageWrapper from '../components/PageWrapper';
import { fetchBookingPageContent } from '../services/api';

const initialFormData = {
  fullName: '',
  companyName: '',
  email: '',
  phoneNumber: '',
  originCity: '',
  originCountry: 'China',
  destinationCity: '',
  destinationCountry: 'Nigeria',
  shippingService: '',
  seaShippingType: '',
  cargoDescription: '',
  totalWeight: '',
  totalVolume: '',
  numberOfPieces: '',
  customsClearance: true,
  insurance: false,
  doorToDoor: false,
  additionalInfo: '',
};

const QuotePage: React.FC = () => {
    const [formData, setFormData] = useState(initialFormData);
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [formMessage, setFormMessage] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [sidebarContent, setSidebarContent] = useState<{ sidebar_title: string; sidebar_text: string }>({
        sidebar_title: 'Why Book With Us?',
        sidebar_text: '',
    });

    useEffect(() => {
        fetchBookingPageContent()
            .then((data) => {
                if (data.sidebar_title || data.sidebar_text) {
                    setSidebarContent({
                        sidebar_title: data.sidebar_title || 'Why Book With Us?',
                        sidebar_text: data.sidebar_text || '',
                    });
                }
            })
            .catch(() => {});
    }, []);

    const validate = (): { [key: string]: string } => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required.';
        if (!formData.email.trim()) {
            newErrors.email = 'Email Address is required.';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email address is invalid.';
        }
        if (!formData.shippingService) newErrors.shippingService = 'Please select a shipping service.';
        if (formData.shippingService === 'sea-shipping' && !formData.seaShippingType) {
            newErrors.seaShippingType = 'Please select a sea shipping type.';
        }
        if (!formData.cargoDescription.trim()) newErrors.cargoDescription = 'Cargo Description is required.';
        if (formData.totalWeight && isNaN(Number(formData.totalWeight))) newErrors.totalWeight = 'Weight must be a valid number.';
        if (formData.totalVolume && isNaN(Number(formData.totalVolume))) newErrors.totalVolume = 'Volume must be a valid number.';
        if (formData.numberOfPieces && (isNaN(Number(formData.numberOfPieces)) || !Number.isInteger(Number(formData.numberOfPieces)))) newErrors.numberOfPieces = 'Must be a whole number.';
        return newErrors;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (errors[name]) {
            setErrors(prev => { const ne = { ...prev }; delete ne[name]; return ne; });
        }
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({...prev, [name]: checked}));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const validationErrors = validate();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) {
            setStatus('error');
            setFormMessage('Please fix the errors below to continue.');
            return;
        }
        setStatus('submitting');
        setFormMessage('');
        console.log('--- Booking Request ---', formData);
        setTimeout(() => {
            setStatus('success');
            setFormMessage('Thank you for your booking request! Our team will review your details and get back to you with a personalized quote shortly.');
            setFormData(initialFormData);
            setErrors({});
            window.scrollTo(0, 0);
            setTimeout(() => setStatus('idle'), 8000);
        }, 1500);
    };

    const getInputClass = (fieldName: string) =>
        `p-3 bg-gray-100 dark:bg-primary-dark rounded-md border-transparent focus:ring-2 focus:ring-secondary ${errors[fieldName] ? 'border border-red-500' : ''}`;

    return (
        <PageWrapper>
            {/* Hero Section */}
            <section className="bg-primary py-20">
                 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
                    <h1 className="text-4xl font-extrabold sm:text-5xl">Book a Shipping</h1>
                    <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-300">
                        Provide us with your shipment details, and our experts will tailor a quote for you.
                    </p>
                </div>
            </section>

            {/* Form + Sidebar Section */}
            <section className="py-16 md:py-24 bg-light-bg dark:bg-dark-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                        {/* Sidebar */}
                        {sidebarContent.sidebar_text && (
                            <div className="lg:col-span-1 order-2 lg:order-1">
                                <div className="sticky top-28 bg-white dark:bg-dark-card rounded-2xl shadow-lg p-6 border-l-4 border-secondary">
                                    <h2 className="text-xl font-bold text-primary dark:text-white mb-4">
                                        {sidebarContent.sidebar_title}
                                    </h2>
                                    <div className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                                        {sidebarContent.sidebar_text}
                                    </div>

                                    {/* Quick contact CTA */}
                                    <div className="mt-6 p-4 bg-secondary/10 rounded-xl">
                                        <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Need help?</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            Contact us directly and we'll assist you with your booking.
                                        </p>
                                        <a
                                            href="#/contact"
                                            className="mt-3 inline-block px-4 py-2 bg-secondary text-white text-sm font-bold rounded-lg hover:bg-opacity-90 transition-colors"
                                        >
                                            Contact Us
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Form */}
                        <div className={`${sidebarContent.sidebar_text ? 'lg:col-span-2' : 'lg:col-span-3 max-w-4xl mx-auto w-full'} order-1 lg:order-2`}>
                            {status === 'success' ? (
                                <div className="bg-white dark:bg-dark-card rounded-lg shadow-2xl p-8 md:p-12 text-center">
                                    <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                    <h2 className="text-2xl font-bold text-primary dark:text-white">Booking Request Sent!</h2>
                                    <p className="mt-4 text-gray-600 dark:text-gray-300">{formMessage}</p>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-dark-card rounded-lg shadow-2xl p-8 md:p-12">
                                    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                                        {/* Contact Information */}
                                        <fieldset className="space-y-6">
                                            <legend className="text-xl font-bold text-primary dark:text-white border-b border-secondary pb-2">1. Your Contact Information</legend>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Full Name *" required className={`w-full ${getInputClass('fullName')}`}/>
                                                    {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                                                </div>
                                                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Company Name (Optional)" className={`w-full ${getInputClass('companyName')}`}/>
                                                <div>
                                                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email Address *" required className={`w-full ${getInputClass('email')}`}/>
                                                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                                </div>
                                                <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Phone Number" className={`w-full ${getInputClass('phoneNumber')}`}/>
                                            </div>
                                        </fieldset>

                                        {/* Shipment Details */}
                                        <fieldset className="space-y-6">
                                            <legend className="text-xl font-bold text-primary dark:text-white border-b border-secondary pb-2">2. Shipment Details</legend>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <input type="text" name="originCity" value={formData.originCity} onChange={handleChange} placeholder="Origin City (e.g., Guangzhou)" className={`w-full ${getInputClass('originCity')}`}/>
                                                <input type="text" name="destinationCity" value={formData.destinationCity} onChange={handleChange} placeholder="Destination City (e.g., Lagos)" className={`w-full ${getInputClass('destinationCity')}`}/>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Shipping Service *</label>
                                                <select name="shippingService" value={formData.shippingService} onChange={handleChange} required className={`w-full ${getInputClass('shippingService')}`}>
                                                    <option value="">-- Select a Service --</option>
                                                    <option value="air-cargo">Air Cargo</option>
                                                    <option value="sea-shipping">Sea Shipping</option>
                                                </select>
                                                {errors.shippingService && <p className="text-red-500 text-xs mt-1">{errors.shippingService}</p>}
                                            </div>
                                            {formData.shippingService === 'sea-shipping' && (
                                                <div>
                                                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Sea Shipping Type *</label>
                                                    <select name="seaShippingType" value={formData.seaShippingType} onChange={handleChange} required className={`w-full ${getInputClass('seaShippingType')}`}>
                                                        <option value="">-- Select a Type --</option>
                                                        <option value="fcl">Full Container Load (FCL)</option>
                                                        <option value="lcl">Less than Container Load (LCL/Groupage)</option>
                                                        <option value="hcl">Half Container Load (HCL)</option>
                                                    </select>
                                                    {errors.seaShippingType && <p className="text-red-500 text-xs mt-1">{errors.seaShippingType}</p>}
                                                </div>
                                            )}
                                        </fieldset>

                                        {/* Cargo Details */}
                                        <fieldset className="space-y-6">
                                            <legend className="text-xl font-bold text-primary dark:text-white border-b border-secondary pb-2">3. Cargo Details</legend>
                                            <div>
                                                <textarea name="cargoDescription" value={formData.cargoDescription} onChange={handleChange} placeholder="Brief Description of Goods *" rows={4} required className={`w-full ${getInputClass('cargoDescription')}`}></textarea>
                                                {errors.cargoDescription && <p className="text-red-500 text-xs mt-1">{errors.cargoDescription}</p>}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div>
                                                    <input type="text" name="totalWeight" value={formData.totalWeight} onChange={handleChange} placeholder="Total Weight (kg)" className={`w-full ${getInputClass('totalWeight')}`}/>
                                                    {errors.totalWeight && <p className="text-red-500 text-xs mt-1">{errors.totalWeight}</p>}
                                                </div>
                                                <div>
                                                    <input type="text" name="totalVolume" value={formData.totalVolume} onChange={handleChange} placeholder="Total Volume (CBM)" className={`w-full ${getInputClass('totalVolume')}`}/>
                                                    {errors.totalVolume && <p className="text-red-500 text-xs mt-1">{errors.totalVolume}</p>}
                                                </div>
                                                <div>
                                                    <input type="text" name="numberOfPieces" value={formData.numberOfPieces} onChange={handleChange} placeholder="Number of Pieces" className={`w-full ${getInputClass('numberOfPieces')}`}/>
                                                    {errors.numberOfPieces && <p className="text-red-500 text-xs mt-1">{errors.numberOfPieces}</p>}
                                                </div>
                                            </div>
                                        </fieldset>

                                        {/* Additional Services */}
                                        <fieldset>
                                            <legend className="text-xl font-bold text-primary dark:text-white border-b border-secondary pb-2">4. Additional Services</legend>
                                            <div className="mt-4 space-y-4">
                                                <div className="flex items-center">
                                                    <input id="customsClearance" name="customsClearance" type="checkbox" checked={formData.customsClearance} onChange={handleChange} className="h-4 w-4 text-secondary focus:ring-secondary border-gray-300 rounded"/>
                                                    <label htmlFor="customsClearance" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">Customs Clearance</label>
                                                </div>
                                                <div className="flex items-center">
                                                    <input id="insurance" name="insurance" type="checkbox" checked={formData.insurance} onChange={handleChange} className="h-4 w-4 text-secondary focus:ring-secondary border-gray-300 rounded"/>
                                                    <label htmlFor="insurance" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">Shipment Insurance</label>
                                                </div>
                                                <div className="flex items-center">
                                                    <input id="doorToDoor" name="doorToDoor" type="checkbox" checked={formData.doorToDoor} onChange={handleChange} className="h-4 w-4 text-secondary focus:ring-secondary border-gray-300 rounded"/>
                                                    <label htmlFor="doorToDoor" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">Door-to-Door Delivery</label>
                                                </div>
                                            </div>
                                        </fieldset>

                                        {/* Additional Info */}
                                        <fieldset>
                                            <legend className="text-xl font-bold text-primary dark:text-white border-b border-secondary pb-2">5. Additional Information</legend>
                                            <textarea name="additionalInfo" value={formData.additionalInfo} onChange={handleChange} placeholder="Is there anything else we should know?" rows={4} className={`mt-4 w-full ${getInputClass('additionalInfo')}`}></textarea>
                                        </fieldset>

                                        <div>
                                            <button type="submit" disabled={status === 'submitting'} className="w-full mt-4 px-8 py-4 bg-secondary text-white font-bold text-lg rounded-lg hover:bg-opacity-90 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center">
                                                {status === 'submitting' ? (
                                                    <>
                                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Sending...
                                                    </>
                                                ) : 'Submit Booking Request'}
                                            </button>
                                        </div>
                                        {formMessage && status === 'error' && (
                                            <div className="mt-4 text-center p-3 rounded-md bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200">
                                                {formMessage}
                                            </div>
                                        )}
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </PageWrapper>
    );
};

export default QuotePage;