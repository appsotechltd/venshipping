
import { Shipment, Service, FAQ, HomepageContent, Slide, SiteSettings, Customer, Invoice, InvoiceWithDetails, User, Address, PhoneNumber, NewsletterSubscriber, Testimonial, ShipmentInstallment } from '../types';

const API_BASE_URL = window.location.hostname === 'localhost' ? '/api/web' : 'https://api.venshipping.com/api/web';

// The login token is kept next to the saved user and sent with every request.
const TOKEN_KEY = 'token';
export const getToken = (): string | null => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (token: string | null) => {
    try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    } catch { /* storage unavailable: the session just won't persist */ }
};

const apiFetch = (url: string, init: RequestInit = {}): Promise<Response> => {
    const token = getToken();
    const headers = new Headers(init.headers);
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...init, headers });
};

// Converts a locally-formatted Nigerian number (e.g. "08143919153") or an
// already-international one into the digits-only format wa.me requires.
export const toWhatsAppLink = (rawNumber: string, message?: string): string => {
    let digits = rawNumber.replace(/\D/g, '');
    if (digits.startsWith('0')) {
        digits = '234' + digits.slice(1);
    }
    const query = message ? `?text=${encodeURIComponent(message)}` : '';
    return `https://wa.me/${digits}${query}`;
};

// Helper to handle responses safely
const handleResponse = async (response: Response) => {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }
        return data;
    } else {
        // If not JSON, it's likely an HTML error page or text
        const text = await response.text();
        if (text.trim().startsWith('<')) {
            throw new Error(`Received HTML response (likely 404 or 500) instead of JSON. Status: ${response.status}`);
        }
        if (!response.ok) {
            throw new Error(`Server Error (${response.status}): ${text.slice(0, 100)}...`);
        }
        // If successful but not JSON (shouldn't happen for our API), return text
        return text;
    }
};

// ===================================
// AUTH API
// ===================================
export const loginUser = async (email: string, password: string): Promise<User> => {
    const response = await apiFetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(response);
    setToken(data.token || null);
    return data.user;
};

export const changePassword = async (data: any): Promise<{ success: boolean; message: string }> => {
    const response = await apiFetch(`${API_BASE_URL}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse(response);
};

export const forgotPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiFetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    return handleResponse(response);
};

export const resetPassword = async (data: any): Promise<{ success: boolean; message: string }> => {
    const response = await apiFetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse(response);
};


// ===================================
// CUSTOMER DATA API
// ===================================
export const fetchCustomerShipments = async (customerId: number): Promise<Shipment[]> => {
    const response = await apiFetch(`${API_BASE_URL}/customer/shipments/${customerId}`);
    return handleResponse(response);
};

export const fetchCustomerInvoices = async (customerId: number): Promise<InvoiceWithDetails[]> => {
    const response = await apiFetch(`${API_BASE_URL}/customer/invoices/${customerId}`);
    return handleResponse(response);
};

export const customerSendDocument = async (id: string, method: 'email' | 'whatsapp'): Promise<{ success: boolean, message: string }> => {
    const response = await apiFetch(`${API_BASE_URL}/customer/documents/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
    });
    return handleResponse(response);
};


// ===================================
// PUBLIC API (CONTENT FETCHING)
// ===================================

export const fetchTrackingData = async (trackingId: string): Promise<Shipment> => {
    const response = await apiFetch(`${API_BASE_URL}/track/${trackingId}`);
    return handleResponse(response);
};

export const fetchServices = async (): Promise<Service[]> => {
    const response = await apiFetch(`${API_BASE_URL}/content/services`);
    return handleResponse(response);
};

export const fetchServiceById = async (id: string): Promise<Service> => {
    const response = await apiFetch(`${API_BASE_URL}/content/services/${id}`);
    return handleResponse(response);
};

export const fetchFaqs = async (): Promise<FAQ[]> => {
    const response = await apiFetch(`${API_BASE_URL}/content/faqs`);
    return handleResponse(response);
};

export const fetchHomepageContent = async (): Promise<HomepageContent> => {
    const response = await apiFetch(`${API_BASE_URL}/content/homepage`);
    return handleResponse(response);
};

export const fetchSlides = async (): Promise<Slide[]> => {
    const response = await apiFetch(`${API_BASE_URL}/content/slides`);
    return handleResponse(response);
};

export const fetchSiteSettings = async (): Promise<SiteSettings> => {
    const response = await apiFetch(`${API_BASE_URL}/content/settings`);
    return handleResponse(response);
};

export const submitContactForm = async (formData: { name: string; email: string; subject: string; message: string; }): Promise<any> => {
    const response = await apiFetch(`${API_BASE_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
    });
    return handleResponse(response);
};

// ===================================
// TESTIMONIALS
// ===================================
export const fetchTestimonials = async (): Promise<Testimonial[]> => {
    const response = await apiFetch(`${API_BASE_URL}/content/testimonials`);
    return handleResponse(response);
};

export const submitTestimonial = async (data: { name: string; company?: string; message: string; rating: number }): Promise<{ success: boolean; message: string }> => {
    const response = await apiFetch(`${API_BASE_URL}/testimonials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse(response);
};

export const adminFetchTestimonials = async (): Promise<Testimonial[]> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/testimonials`);
    return handleResponse(res);
};

export const adminUpdateTestimonialStatus = async (id: number, status: 'approved' | 'rejected' | 'pending'): Promise<Testimonial> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/testimonials/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
    });
    return handleResponse(res);
};

export const adminDeleteTestimonial = async (id: number): Promise<void> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/testimonials/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete testimonial');
};


// ===================================
// ADMIN API (CONTENT & DATA MANAGEMENT)
// ===================================

// Shipments
export const adminFetchShipments = async (): Promise<Shipment[]> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/shipments`);
    return handleResponse(res);
};
export const adminCreateShipment = async (shipment: Omit<Shipment, 'trackingId'>): Promise<Shipment> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/shipments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shipment)
    });
    return handleResponse(res);
};
export const adminUpdateShipment = async (shipment: Shipment): Promise<Shipment> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/shipments/${shipment.trackingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shipment)
    });
    return handleResponse(res);
};
export const adminDeleteShipment = async (trackingId: string): Promise<void> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/shipments/${trackingId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete shipment');
};
export const adminCreateInstallment = async (trackingId: string, data: { quantity: number; containerNumber?: string; photoUrl?: string }): Promise<ShipmentInstallment> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/shipments/${trackingId}/installments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    return handleResponse(res);
};
export const adminDeleteInstallment = async (trackingId: string, installmentId: number): Promise<void> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/shipments/${trackingId}/installments/${installmentId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete installment');
};

// Customers
export const adminFetchCustomers = async (): Promise<Customer[]> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/customers`);
    return handleResponse(res);
};
export const adminCreateCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/customers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(customer)
    });
    return handleResponse(res);
};
export const adminUpdateCustomer = async (customer: Customer): Promise<Customer> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/customers/${customer.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(customer)
    });
    return handleResponse(res);
};
export const adminDeleteCustomer = async (id: number): Promise<void> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/customers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete customer');
};

// Invoices
export const adminFetchInvoices = async (): Promise<InvoiceWithDetails[]> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/invoices`);
    return handleResponse(res);
};
export const adminCreateInvoice = async (invoice: Omit<Invoice, 'id'>): Promise<Invoice> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/invoices`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invoice)
    });
    return handleResponse(res);
};
export const adminUpdateInvoice = async (invoice: Invoice): Promise<Invoice> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/invoices/${invoice.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invoice)
    });
    return handleResponse(res);
};
export const adminDeleteInvoice = async (id: string): Promise<void> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/invoices/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete invoice');
};
export const adminSendDocument = async (id: string, method: 'email' | 'whatsapp'): Promise<{ success: boolean, message: string }> => {
    const response = await apiFetch(`${API_BASE_URL}/admin/documents/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
    });
    return handleResponse(response);
};


// Site Settings
export const adminFetchSettings = async (): Promise<SiteSettings> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/settings`);
    return handleResponse(res);
};
export const adminUpdateSettings = async (settings: SiteSettings): Promise<SiteSettings> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings)
    });
    return handleResponse(res);
};

// Homepage Content
export const adminUpdateHomepageContent = async (content: HomepageContent): Promise<any> => {
    const response = await apiFetch(`${API_BASE_URL}/admin/homepage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
    });
    return handleResponse(response);
};

// Services
export const adminCreateService = async (service: Omit<Service, 'id'>): Promise<Service> => {
    const response = await apiFetch(`${API_BASE_URL}/admin/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service),
    });
    return handleResponse(response);
};
export const adminUpdateService = async (service: Service): Promise<Service> => {
    const response = await apiFetch(`${API_BASE_URL}/admin/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service),
    });
    return handleResponse(response);
};
export const adminDeleteService = async (id: string): Promise<void> => {
    const response = await apiFetch(`${API_BASE_URL}/admin/services/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete service.');
};

// FAQs
export const adminCreateFaq = async (faq: Omit<FAQ, 'id'>): Promise<FAQ> => {
    const response = await apiFetch(`${API_BASE_URL}/admin/faqs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(faq),
    });
    return handleResponse(response);
};
export const adminUpdateFaq = async (faq: FAQ): Promise<FAQ> => {
    const response = await apiFetch(`${API_BASE_URL}/admin/faqs/${faq.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(faq),
    });
    return handleResponse(response);
};
export const adminDeleteFaq = async (id: number): Promise<void> => {
    const response = await apiFetch(`${API_BASE_URL}/admin/faqs/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete FAQ.');
};

// Slides
export const adminFetchSlides = async (): Promise<Slide[]> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/slides`);
    return handleResponse(res);
};
export const adminCreateSlide = async (slide: Omit<Slide, 'id'>): Promise<Slide> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/slides`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(slide)
    });
    return handleResponse(res);
};
export const adminUpdateSlide = async (slide: Slide): Promise<Slide> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/slides/${slide.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(slide)
    });
    return handleResponse(res);
};
export const adminDeleteSlide = async (id: number): Promise<void> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/slides/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete slide');
};

// ===================================
// POPUP SETTINGS
// ===================================
export const fetchPopupSettings = async (): Promise<Record<string, string>> => {
    const res = await apiFetch(`${API_BASE_URL}/content/popup`);
    return handleResponse(res);
};
export const adminUpdatePopup = async (settings: Record<string, string>): Promise<any> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/popup`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings)
    });
    return handleResponse(res);
};

// ===================================
// BOOKING PAGE CONTENT
// ===================================
export const fetchBookingPageContent = async (): Promise<Record<string, string>> => {
    const res = await apiFetch(`${API_BASE_URL}/content/booking-page`);
    return handleResponse(res);
};
export const adminUpdateBookingPage = async (content: Record<string, string>): Promise<any> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/booking-page`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content)
    });
    return handleResponse(res);
};

// ===================================
// ADDRESSES
// ===================================

export const fetchAddresses = async (): Promise<Address[]> => {
    const res = await apiFetch(`${API_BASE_URL}/content/addresses`);
    return handleResponse(res);
};
export const adminFetchAddresses = async (): Promise<Address[]> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/addresses`);
    return handleResponse(res);
};
export const adminCreateAddress = async (data: Omit<Address, 'id'>): Promise<Address> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/addresses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    return handleResponse(res);
};
export const adminUpdateAddress = async (data: Address): Promise<Address> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/addresses/${data.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    return handleResponse(res);
};
export const adminDeleteAddress = async (id: number): Promise<void> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/addresses/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete address');
};

// ===================================
// PHONE NUMBERS
// ===================================
export const fetchPhones = async (): Promise<PhoneNumber[]> => {
    const res = await apiFetch(`${API_BASE_URL}/content/phones`);
    return handleResponse(res);
};
export const adminFetchPhones = async (): Promise<PhoneNumber[]> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/phones`);
    return handleResponse(res);
};
export const adminCreatePhone = async (data: Omit<PhoneNumber, 'id'>): Promise<PhoneNumber> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/phones`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    return handleResponse(res);
};
export const adminUpdatePhone = async (data: PhoneNumber): Promise<PhoneNumber> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/phones/${data.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    return handleResponse(res);
};
export const adminDeletePhone = async (id: number): Promise<void> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/phones/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete phone number');
};

// ===================================
// NEWSLETTER
// ===================================
export const subscribeNewsletter = async (email: string, name?: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiFetch(`${API_BASE_URL}/newsletter/subscribe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name })
    });
    return handleResponse(res);
};
export const adminFetchSubscribers = async (): Promise<NewsletterSubscriber[]> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/newsletter/subscribers`);
    return handleResponse(res);
};
export const adminDeleteSubscriber = async (id: number): Promise<void> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/newsletter/subscribers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete subscriber');
};
export const adminSendNewsletter = async (subject: string, body: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiFetch(`${API_BASE_URL}/admin/newsletter/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, body })
    });
    return handleResponse(res);
};

// ===================================
// UPLOADS
// ===================================
export const uploadFile = async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiFetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
    return handleResponse(response);
};
