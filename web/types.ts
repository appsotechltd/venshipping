
export interface TrackingEvent {
  date: string;
  time: string;
  status: string;
  location: string;
  details: string;
}

export interface ShipmentInstallment {
  id: number;
  trackingId: string;
  quantity: number;
  containerNumber: string | null;
  photoUrl: string | null;
  qrCodeDataUrl: string | null;
  createdAt: string;
}

export interface Shipment {
  trackingId: string;
  customerId?: number; // Optional link to a customer
  customerName?: string;
  origin: string;
  destination: string;
  status: string;
  estimatedArrival: string;
  shippedDate: string;
  carrier: string;
  service: string;
  weight: string;
  itemDescription: string;
  orderedQuantity: number;
  unit: string;
  history: TrackingEvent[];
  installments?: ShipmentInstallment[];
  fulfilledQuantity?: number;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  customerId: number;
  shipmentId?: string; // Optional link to a shipment
  date: string;
  status: 'Paid' | 'Unpaid';
  type: 'Invoice' | 'Proforma' | 'Receipt';
  items: InvoiceItem[];
}

// Used for displaying invoices with details joined from other tables
export interface InvoiceWithDetails extends Invoice {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  total: number;
}


export interface Service {
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  iconName: string; // Storing the name, not the component
  image: string;
  keyFeatures: string[];
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
}

export interface WhyUsPoint {
  title: string;
  description: string;
}

export interface StatItem {
  label: string;
  value: string;
}

export interface HomepageContent {
  whyUsPoints: WhyUsPoint[];
  stats: StatItem[];
  aboutStory: string;
  aboutMission: string;
  aboutVision: string;
  aboutHeroImage?: string;
  aboutStoryImage?: string;
}

export interface Slide {
  id: number;
  type: 'video' | 'image';
  url: string;
  title: string;
  subtitle: string;
  sortOrder: number;
}

export interface SiteSettings {
  [key: string]: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  companyName: string;
  website: string;
}

export interface Address {
  id: number;
  title: string;
  address: string;
  sortOrder: number;
}

export interface PhoneNumber {
  id: number;
  label: string;
  number: string;
  showInHeader: boolean;
  sortOrder: number;
}

export interface PopupSettings {
  enabled: boolean;
  title: string;
  content: string;
  bgColor: string;
  textColor: string;
}

export interface NewsletterSubscriber {
  id: number;
  email: string;
  name?: string;
  subscribedAt: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Testimonial {
  id: number;
  name: string;
  company?: string;
  message: string;
  rating: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

// --- AUTH TYPES ---
export interface User {
  id?: number; // Optional for admin
  name: string;
  email: string;
  role: 'admin' | 'customer';
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}
