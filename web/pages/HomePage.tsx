
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, ShipIcon, StarIcon } from '../components/icons';
import { fetchServices, fetchHomepageContent, fetchSlides, fetchTestimonials } from '../services/api';
import { Service, Slide, StatItem, Testimonial } from '../types';
import { iconMap } from '../components/icons';
import { defaultSlides, defaultHomepageContent, defaultServices } from '../services/defaultData';
import PageWrapper from '../components/PageWrapper';
import TestimonialFormModal from '../components/TestimonialFormModal';

const HeroSlider: React.FC<{ slides: Slide[] }> = ({ slides }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextSlide = useCallback(() => {
        if (slides.length === 0) return;
        setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, [slides.length]);

    const prevSlide = () => {
        if (slides.length === 0) return;
        setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length);
    };

    useEffect(() => {
        const slideInterval = setInterval(nextSlide, 7000);
        return () => clearInterval(slideInterval);
    }, [nextSlide]);

    if (slides.length === 0) {
        return (
            <div className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-primary">
                <p className="text-white">Loading slides...</p>
            </div>
        );
    }

    return (
        <div className="relative h-screen w-full overflow-hidden">
            {slides.map((slide, index) => (
                <div key={slide.id} className={`absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}>
                    {slide.type === 'video' ? (
                        <video className="w-full h-full object-cover" autoPlay loop muted playsInline src={slide.url} />
                    ) : (
                        <img className="w-full h-full object-cover" src={slide.url} alt={slide.title} />
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-50"></div>
                </div>
            ))}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-4 z-10">
                <h1 className="text-4xl md:text-6xl font-extrabold drop-shadow-lg animate-fade-in-down">{slides[currentIndex].title}</h1>
                <p className="mt-4 max-w-2xl text-lg md:text-xl drop-shadow-md animate-fade-in-up">{slides[currentIndex].subtitle}</p>
                <Link to="/quote" className="mt-8 px-8 py-3 bg-secondary hover:bg-opacity-90 text-white font-bold rounded-lg transition-transform transform hover:scale-105">
                    Book a Shipping
                </Link>
            </div>
            <button onClick={prevSlide} className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 p-2 rounded-full text-white z-20">
                <ChevronLeftIcon className="h-6 w-6" />
            </button>
            <button onClick={nextSlide} className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 p-2 rounded-full text-white z-20">
                <ChevronRightIcon className="h-6 w-6" />
            </button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
                {slides.map((_, index) => (
                    <button key={index} onClick={() => setCurrentIndex(index)} className={`h-2 w-2 rounded-full ${index === currentIndex ? 'bg-secondary' : 'bg-white/50'}`}></button>
                ))}
            </div>
        </div>
    );
};

interface WhyUsPoint {
    title: string;
    description: string;
}

const HomePage: React.FC = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [slides, setSlides] = useState<Slide[]>([]);
    const [whyUsPoints, setWhyUsPoints] = useState<WhyUsPoint[]>([]);
    const [stats, setStats] = useState<StatItem[]>([]);
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [isTestimonialModalOpen, setTestimonialModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadContent = async () => {
            try {
                setLoading(true);
                const [servicesData, homepageData, slidesData] = await Promise.all([
                    fetchServices(),
                    fetchHomepageContent(),
                    fetchSlides()
                ]);
                setServices(servicesData);
                setWhyUsPoints(homepageData.whyUsPoints);
                setStats(homepageData.stats || defaultHomepageContent.stats);
                setSlides(slidesData);
            } catch (error) {
                console.error("Failed to load homepage content, using defaults:", error);
                setServices(defaultServices);
                setWhyUsPoints(defaultHomepageContent.whyUsPoints);
                setStats(defaultHomepageContent.stats);
                setSlides(defaultSlides);
            } finally {
                setLoading(false);
            }
        };
        loadContent();

        fetchTestimonials().then(setTestimonials).catch(() => setTestimonials([]));
    }, []);

    return (
        <PageWrapper>
            <HeroSlider slides={slides} />

            {/* Stats Section */}
            {stats.length > 0 && (
                <section className="py-12 bg-primary dark:bg-primary-dark">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {stats.map((stat, index) => (
                            <div key={index}>
                                <p className="text-3xl md:text-4xl font-extrabold text-secondary">{stat.value}</p>
                                <p className="mt-2 text-sm md:text-base text-white/80">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Services Section */}
            <section className="py-16 md:py-24 bg-light-bg dark:bg-dark-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-extrabold text-primary dark:text-white sm:text-4xl">Our Services</h2>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Comprehensive logistics solutions tailored for you.</p>
                    <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {services.map(service => {
                            const IconComponent = iconMap[service.iconName] || ShipIcon;
                            return (
                                <Link key={service.id} to={`/services/${service.id}`} className="group block p-8 bg-white dark:bg-dark-card rounded-lg shadow-lg text-center transform hover:-translate-y-2 transition-transform duration-300">
                                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-secondary/10 mx-auto">
                                        <IconComponent className="h-10 w-10 text-secondary" />
                                    </div>
                                    <h3 className="mt-6 text-xl font-bold text-primary dark:text-white">{service.name}</h3>
                                    <p className="mt-2 text-base text-gray-600 dark:text-gray-300">{service.shortDescription}</p>
                                    <div className="text-center mt-4">
                                        <span className="text-secondary font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">Learn More &rarr;</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Why Choose Us Section */}
            <section className="py-16 md:py-24 bg-white dark:bg-dark-card">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="lg:text-center">
                        <h2 className="text-3xl font-extrabold text-primary dark:text-white sm:text-4xl">Why Choose Ven Logistics?</h2>
                        <p className="mt-4 max-w-2xl text-xl text-gray-500 dark:text-gray-400 lg:mx-auto">
                            Your success is our priority. We go the extra mile to ensure your logistics are seamless.
                        </p>
                    </div>

                    <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
                        <div className="space-y-10">
                            {whyUsPoints.map((point) => (
                                <div key={point.title} className="flex">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-secondary text-white">
                                            <CheckCircleIcon className="h-6 w-6" />
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <dt className="text-lg leading-6 font-bold text-primary dark:text-white">{point.title}</dt>

                                        <dd className="mt-2 text-base text-gray-600 dark:text-gray-300">{point.description}</dd>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-10 lg:mt-0">
                            <img className="rounded-lg shadow-xl max-h-[500px] w-full object-cover object-top" src="/images/about-us.jpg" alt="Logistics Team" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-16 md:py-24 bg-light-bg dark:bg-dark-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-extrabold text-primary dark:text-white sm:text-4xl">What Our Clients Say</h2>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">Real experiences from businesses we've shipped for.</p>

                    {testimonials.length > 0 ? (
                        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {testimonials.map(t => (
                                <div key={t.id} className="p-8 bg-white dark:bg-dark-card rounded-lg shadow-lg text-left flex flex-col">
                                    <div className="flex gap-1 mb-4">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <StarIcon key={star} className={`h-5 w-5 ${t.rating >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                                        ))}
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 flex-grow">"{t.message}"</p>
                                    <div className="mt-6">
                                        <p className="font-bold text-primary dark:text-white">{t.name}</p>
                                        {t.company && <p className="text-sm text-gray-500 dark:text-gray-400">{t.company}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-12 text-gray-500 dark:text-gray-400">Be the first to share your experience with us!</p>
                    )}

                    <button
                        onClick={() => setTestimonialModalOpen(true)}
                        className="mt-12 px-8 py-3 bg-secondary hover:bg-opacity-90 text-white font-bold rounded-lg transition-transform transform hover:scale-105"
                    >
                        Share Your Experience
                    </button>
                </div>
            </section>

            <TestimonialFormModal isOpen={isTestimonialModalOpen} onClose={() => setTestimonialModalOpen(false)} />
        </PageWrapper>
    );
};

export default HomePage;
