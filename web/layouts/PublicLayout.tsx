import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import SubHeader from '../components/SubHeader';
import Footer from '../components/Footer';
import Chatbot from '../components/Chatbot';

const PublicLayout: React.FC = () => {
    return (
        <>
            <SubHeader />
            <Header />
            <main>
                <Outlet />
            </main>
            <Footer />
            <Chatbot />
        </>
    );
};

export default PublicLayout;
