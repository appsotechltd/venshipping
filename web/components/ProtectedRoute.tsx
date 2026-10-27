
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    // Fix: Changed JSX.Element to React.ReactElement to resolve namespace error.
    children: React.ReactElement;
    role: 'admin' | 'customer';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        // You can add a loading spinner here
        return <div>Loading...</div>;
    }

    if (!user) {
        // Redirect them to the login page, but save the current location they were
        // trying to go to. This allows us to send them along to that page after they login,
        // which is a nicer user experience than dropping them off on the home page.
        return <Navigate to={`/${role}`} state={{ from: location }} replace />;
    }

    if (user.role !== role) {
        // If user is logged in but trying to access a page they don't have permission for
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;