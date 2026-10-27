
import { Service, FAQ, Slide, HomepageContent, SiteSettings } from '../types';

export const defaultSiteSettings: SiteSettings = {
    companyName: 'Ven International Logistics Ltd',
    email: 'support@venshipping.com',
    phone: '08143919153',
    whatsapp: '08143919153',
    address: 'NIGERIA WAREHOUSE, No:3 Clifford Amuche close, Ajao estate, around Eleganza',
    website: 'https://venshipping.com',
};

export const defaultServices: Service[] = [
    {
        id: 'air-cargo',
        name: 'Air Cargo',
        shortDescription: 'Fast and reliable air freight for urgent and high-value goods.',
        longDescription: 'Our Air Cargo service is the perfect solution for time-sensitive shipments. We leverage a vast network of air carriers to ensure your goods are delivered swiftly and securely from any city in China to Nigeria. This service is ideal for electronics, documents, perishable goods, and high-value items requiring minimal transit time.',
        iconName: 'PlaneIcon',
        image: '/images/header2.jpg',
        keyFeatures: [
            'Fastest transit times (typically 5-10 days).',
            'Enhanced security for high-value items.',
            'Real-time tracking from departure to arrival.',
            'Ideal for perishable and time-critical shipments.'
        ]
    },
    {
        id: 'sea-shipping',
        name: 'Sea Shipping',
        shortDescription: 'Cost-effective sea freight for large and heavy shipments.',
        longDescription: 'For larger, heavier, or less urgent shipments, our Sea Shipping service offers a reliable and economical solution. We provide flexible options including Full Container Load (FCL), Less than Container Load (LCL), and Half Container Load (HCL) to match your volume and budget. We manage the entire process, from port-to-port to your final destination.',
        iconName: 'ShipIcon',
        image: '/images/header3.jpg',
        keyFeatures: [
            'Most cost-effective for bulk and heavy items.',
            'FCL, LCL, and HCL options available.',
            'Global port coverage and reliable schedules.',
            'Secure handling of all types of cargo.'
        ]
    },
    {
        id: 'custom-clearance',
        name: 'Custom Clearance',
        shortDescription: 'Hassle-free customs brokerage for smooth import/export.',
        longDescription: 'Navigating customs can be complex. Our expert team handles all customs clearance procedures in both China and Nigeria, ensuring your shipments comply with all regulations. We manage documentation, duties, and taxes to prevent delays and ensure your goods are cleared smoothly and efficiently.',
        iconName: 'CustomsIcon',
        image: '/images/image1.jpg',
        keyFeatures: [
            'Expert handling of import and export documentation.',
            'Accurate calculation and payment of duties/taxes.',
            'Compliance with all Nigerian and Chinese customs laws.',
            'Reduced risk of delays and penalties.'
        ]
    },
    {
        id: 'groupage',
        name: 'Groupage Shipping',
        shortDescription: 'Consolidate smaller shipments to save on shipping costs.',
        longDescription: 'Our Groupage (or LCL) service is designed for businesses with shipments that don\'t require a full container. We consolidate your cargo with others, so you only pay for the space you use. It\'s a smart, economical way to ship smaller volumes without compromising on service quality.',
        iconName: 'GroupageIcon',
        image: '/images/image2.jpg',
        keyFeatures: [
            'Pay only for the container space you use.',
            'Cost-effective solution for small to medium shipments.',
            'Regular consolidation schedules for reliability.',
            'Full tracking capabilities for your portion of the cargo.'
        ]
    },
    {
        id: 'rmb-exchange',
        name: 'Exchange of RMB',
        shortDescription: 'Facilitate your trade with competitive RMB exchange services.',
        longDescription: 'To support your business transactions with suppliers in China, we offer a secure and convenient RMB exchange service. Convert your Nigerian Naira (NGN) to Chinese Yuan (RMB) at competitive rates, simplifying your procurement and payment processes.',
        iconName: 'RmbIcon',
        image: '/images/image3.jpg',
        keyFeatures: [
            'Competitive exchange rates.',
            'Fast and secure transactions.',
            'Simplify payments to Chinese suppliers.',
            'Transparent process with no hidden fees.'
        ]
    },
    {
        id: 'export-to-china',
        name: 'Export to China',
        shortDescription: 'Seamless export solutions from Nigeria to the Chinese market.',
        longDescription: 'Tap into the vast Chinese market with our specialized export services from Nigeria. We assist with logistics, documentation, and customs to ensure your products reach China efficiently. Whether you\'re exporting raw materials or finished goods, we provide a reliable bridge to one of the world\'s largest economies.',
        iconName: 'ChinaFlag',
        image: '/images/header4.jpg',
        keyFeatures: [
            'End-to-end export logistics management.',
            'Expert guidance on Chinese import regulations.',
            'Air and sea freight options available.',
            'Secure and timely delivery to all major Chinese ports.'
        ]
    }
];

export const defaultFaqs: FAQ[] = [
    { id: 1, question: "How long does shipping take from China to Nigeria?", answer: "This depends on the shipping method. Air cargo is the fastest, typically taking 5-10 days. Sea shipping is more economical for larger shipments but takes longer, usually around 30-45 days." },
    { id: 2, question: "How is the shipping cost calculated?", answer: "Shipping costs are based on several factors, including the mode of transport (air or sea), the weight and volume of the goods (volumetric weight), the origin city in China, and the destination in Nigeria. For an accurate price, please book a shipping and provide details." },
    { id: 3, question: "What kind of items can I ship?", answer: "We can ship a wide variety of goods, including electronics, machinery, textiles, auto parts, furniture, and general merchandise. However, we do not handle prohibited, illegal, or hazardous materials. Please contact us if you are unsure about your item." },
    { id: 4, question: "Do you provide door-to-door service?", answer: "Yes, we offer a comprehensive door-to-door service. This includes picking up the goods from your supplier in China, handling all shipping and customs procedures, and delivering them to your specified address in Nigeria." },
    { id: 5, question: "What is the difference between FCL and LCL?", answer: "FCL (Full Container Load) means you book an entire container for your exclusive use. LCL (Less than Container Load), also known as groupage, means you share container space with other importers and only pay for the volume your goods occupy. FCL is better for large shipments, while LCL is more cost-effective for smaller ones." }
];

export const defaultHomepageContent: HomepageContent = {
    whyUsPoints: [
        { title: 'Expert Team', description: 'Our experienced professionals provide tailored logistics solutions.' },
        { title: 'Global Network', description: 'Extensive network ensuring your cargo reaches its destination on time.' },
        { title: 'Customer First', description: 'We prioritize your needs, offering dedicated support and transparency.' },
        { title: 'Secure & Reliable', description: 'Your shipments are handled with the utmost care and security.' },
    ],
    stats: [
        { label: 'Projects Completed', value: '500+' },
        { label: 'Happy Clients', value: '300+' },
        { label: 'Years of Experience', value: '10+' },
    ],
    aboutStory: "Ven International Logistics Ltd was founded with a clear mission: to simplify the complexities of international trade between China and Nigeria. We saw the challenges businesses faced—from navigating customs to ensuring timely delivery—and built a company dedicated to solving them.\nToday, we are a leading logistics provider, known for our reliability, efficiency, and unwavering commitment to our clients' success. Our expert team combines deep industry knowledge with a passion for service, ensuring your cargo is in the safest hands from origin to destination.",
    aboutMission: "To provide exceptional, reliable, and cost-effective logistics and shipping solutions that empower businesses to thrive in the global marketplace, fostering strong trade relationships between China and Nigeria.",
    aboutVision: "To be the most trusted and innovative logistics partner in the China-Nigeria trade corridor, setting new standards for excellence, transparency, and customer satisfaction in the industry."
};

export const defaultSlides: Slide[] = [
    { id: 1, type: 'video', url: '/videos/slide1.mp4', title: 'Seamless Global Logistics', subtitle: 'Connecting continents with efficiency and care. Your journey starts with us.', sortOrder: 1 },
    { id: 2, type: 'image', url: '/images/slide2.jpg', title: 'Reliable Sea Freight Solutions', subtitle: 'FCL, LCL, and Groupage shipping tailored to your needs. Cost-effective and secure.', sortOrder: 2 },
    { id: 3, type: 'image', url: '/images/slide3.jpg', title: 'Swift Air Cargo Services', subtitle: 'When time is critical, our air freight services deliver your goods with unmatched speed.', sortOrder: 3 },
    { id: 4, type: 'image', url: '/images/slide4.jpg', title: 'Comprehensive Warehousing', subtitle: 'Secure storage and efficient handling at our state-of-the-art facilities.', sortOrder: 4 },
];
