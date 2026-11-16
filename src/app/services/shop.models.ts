export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  icon: string;
  color: string;
  image_url?: string | null;
}

export interface CartItem {
  productId: string;
  quantity: number;
}
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}
export interface Order {
  id: string;
  created_at: string;
  status: 'pending' | 'ready' | 'delivered';
  payment_status: 'simulated' | 'unpaid' | 'paid';
  total: number;
  items: OrderItem[];
}

export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'mochila',
    name: 'Mochila Urbana',
    category: 'Accesorios',
    description: 'Tu día, bien organizado. Compartimento para portátil y acabado resistente.',
    price: 129900,
    stock: 12,
    icon: 'bag-handle-outline',
    color: '#eee8db',
  },
  {
    id: 'audifonos',
    name: 'Audífonos Flow',
    category: 'Tecnología',
    description: 'Dale ritmo a tu rutina con un diseño cómodo e inalámbrico.',
    price: 189900,
    stock: 8,
    icon: 'headset-outline',
    color: '#e0e8e3',
  },
  {
    id: 'termo',
    name: 'Termo Essential',
    category: 'Hogar',
    description: 'Acero inoxidable, 500 ml y el tamaño ideal para llevar contigo.',
    price: 64900,
    stock: 20,
    icon: 'water-outline',
    color: '#e5e5ee',
  },
  {
    id: 'reloj',
    name: 'Reloj Tempo',
    category: 'Tecnología',
    description: 'Un compañero ligero para acompañar tus actividades diarias.',
    price: 219900,
    stock: 6,
    icon: 'watch-outline',
    color: '#f0e2d9',
  },
  {
    id: 'libreta',
    name: 'Libreta Ideas',
    category: 'Accesorios',
    description: 'Páginas para lo que viene. Tapa dura y papel de 90 gramos.',
    price: 34900,
    stock: 30,
    icon: 'book-outline',
    color: '#ece6ef',
  },
  {
    id: 'lampara',
    name: 'Lámpara Aura',
    category: 'Hogar',
    description: 'Luz cálida y diseño sencillo para darle vida a tu espacio.',
    price: 99900,
    stock: 10,
    icon: 'bulb-outline',
    color: '#f1ead6',
  },
];
