import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MinusIcon } from '../components/icons';
import { fetchFaqs } from '../services/api';
import { FAQ } from '../types';
import { defaultFaqs } from '../services/defaultData';
import PageWrapper from '../components/PageWrapper';

const FAQItem: React.FC<{ faq: { question: string, answer: string }, isOpen: boolean, onToggle: () => void }> = ({ faq, isOpen, onToggle }) => {
    return (
        <div className="border-b border-gray-200 dark:border-gray-700 py-6">
            <dt>
                <button onClick={onToggle} className="w-full flex justify-between items-start text-left text-gray-400">
                    <span className="text-lg font-medium text-primary dark:text-white">{faq.question}</span>
                    <span className="ml-6 h-7 flex items-center">
                        {isOpen ? <MinusIcon className="h-6 w-6 text-secondary" /> : <PlusIcon className="h-6 w-6 text-gray-400 dark:text-gray-300" />}
                    </span>
                </button>
            </dt>
            {isOpen && (
                <dd className="mt-4 pr-12">
                    <p className="text-base text-gray-600 dark:text-gray-300">{faq.answer}</p>
                </dd>
            )}
        </div>
    );
}

const FAQPage: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadFaqs = async () => {
            try {
                const data = await fetchFaqs();
                setFaqs(data);
            } catch (error) {
                console.error("Failed to load FAQs, using defaults:", error);
                setFaqs(defaultFaqs);
            } finally {
                setLoading(false);
            }
        };
        loadFaqs();
    }, []);

    const handleToggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <PageWrapper>
            {/* Hero Section */}
            <section className="bg-primary py-20">
                 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
                    <h1 className="text-4xl font-extrabold sm:text-5xl">Frequently Asked Questions</h1>
                    <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-300">
                        Find quick answers to common questions about our services.
                    </p>
                </div>
            </section>
            
            {/* FAQ List Section */}
            <section className="py-16 md:py-24 bg-light-bg dark:bg-dark-bg">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-8">
                        {loading ? (
                             <div className="text-center">Loading FAQs...</div>
                        ) : (
                            <dl className="space-y-2">
                            {faqs.map((faq, index) => (
                                <FAQItem
                                    key={faq.id}
                                    faq={faq}
                                    isOpen={openIndex === index}
                                    onToggle={() => handleToggle(index)}
                                />
                            ))}
                            </dl>
                        )}
                    </div>
                    <div className="mt-12 text-center">
                        <h3 className="text-xl font-semibold text-primary dark:text-white">Can't find your answer?</h3>
                        <p className="mt-2 text-gray-600 dark:text-gray-300">
                            Our team is here to help. Contact us for any specific inquiries.
                        </p>
                        <Link to="/contact" className="mt-6 inline-block px-6 py-3 bg-secondary text-white font-bold rounded-md hover:bg-opacity-90 transition-colors">
                            Contact Support
                        </Link>
                    </div>
                </div>
            </section>
        </PageWrapper>
    );
};

export default FAQPage;