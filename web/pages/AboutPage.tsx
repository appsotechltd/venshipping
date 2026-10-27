
import React, { useState, useEffect } from 'react';
import { CheckCircleIcon } from '../components/icons';
import { fetchHomepageContent } from '../services/api';
import { HomepageContent } from '../types';
import { defaultHomepageContent } from '../services/defaultData';
import PageWrapper from '../components/PageWrapper';


const values = [
    { name: 'Reliability', description: 'We are committed to providing dependable and consistent logistics services you can trust.', icon: <CheckCircleIcon className="h-6 w-6" /> },
    { name: 'Efficiency', description: 'We leverage technology and expertise to ensure your shipments are delivered in the most time and cost-effective manner.', icon: <CheckCircleIcon className="h-6 w-6" /> },
    { name: 'Customer-Centric', description: 'Our clients are at the heart of everything we do. We offer personalized support and transparent communication.', icon: <CheckCircleIcon className="h-6 w-6" /> },
    { name: 'Integrity', description: 'We conduct our business with the highest ethical standards, ensuring honesty and fairness in all our dealings.', icon: <CheckCircleIcon className="h-6 w-6" /> },
];

const AboutPage: React.FC = () => {
    const [content, setContent] = useState<Partial<HomepageContent>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadContent = async () => {
            try {
                const data = await fetchHomepageContent();
                setContent(data);
            } catch (error) {
                console.error("Failed to load about page content, using defaults:", error);
                setContent(defaultHomepageContent);
            } finally {
                setLoading(false);
            }
        };
        loadContent();
    }, []);

    return (
        <PageWrapper>
            {/* Hero Section */}
            <section className="relative py-24 md:py-32 bg-primary">
                <div className="absolute inset-0 bg-black opacity-50"></div>
                <img src={content.aboutHeroImage || "/images/header1.jpg"} className="absolute inset-0 w-full h-full object-cover" alt="Logistics container yard" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
                    <h1 className="text-4xl font-extrabold sm:text-5xl md:text-6xl">About Ven International Logistics</h1>
                    <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-200">Your trusted partner in bridging the distance between China and Nigeria with seamless logistics solutions.</p>
                </div>
            </section>

            {/* Our Story Section */}
            <section className="py-16 md:py-24 bg-light-bg dark:bg-dark-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-extrabold text-primary dark:text-white sm:text-4xl">Our Story</h2>
                            {loading ? <p>Loading...</p> : (
                                <div className="mt-4 space-y-4 text-lg text-gray-600 dark:text-gray-400">
                                    {content.aboutStory?.split('\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                                </div>
                            )}
                        </div>
                        <div>
                            <img className="rounded-lg shadow-xl max-h-[500px] w-full object-cover object-top" src={content.aboutStoryImage || "/images/about-us2.jpg"} alt="Logistics team planning" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Mission and Vision Section */}
            <section className="py-16 md:py-24 bg-white dark:bg-dark-card">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12">
                    <div className="p-8 bg-light-bg dark:bg-dark-bg rounded-lg">
                        <h3 className="text-2xl font-bold text-primary dark:text-white">Our Mission</h3>
                        {loading ? <p>Loading...</p> : <p className="mt-4 text-gray-600 dark:text-gray-300">{content.aboutMission}</p>}
                    </div>
                    <div className="p-8 bg-light-bg dark:bg-dark-bg rounded-lg">
                        <h3 className="text-2xl font-bold text-primary dark:text-white">Our Vision</h3>
                        {loading ? <p>Loading...</p> : <p className="mt-4 text-gray-600 dark:text-gray-300">{content.aboutVision}</p>}
                    </div>
                </div>
            </section>

            {/* Our Values Section */}
            <section className="py-16 md:py-24 bg-light-bg dark:bg-dark-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-extrabold text-primary dark:text-white sm:text-4xl">Our Core Values</h2>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">The principles that guide our every action.</p>
                    <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                        {values.map(value => (
                            <div key={value.name} className="p-6 bg-white dark:bg-dark-card rounded-lg shadow-md">
                                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-secondary text-white mx-auto">
                                    {value.icon}
                                </div>
                                <h3 className="mt-5 text-xl font-bold text-primary dark:text-white">{value.name}</h3>
                                <p className="mt-2 text-base text-gray-600 dark:text-gray-300">{value.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </PageWrapper>
    );
};

export default AboutPage;
