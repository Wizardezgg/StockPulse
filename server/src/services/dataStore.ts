import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

export type UserRole = 'owner' | 'manager' | 'cashier';
export type MovementType = 'sale' | 'restock' | 'adjustment' | 'return';
export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'due';
export type POStatus = 'draft' | 'ordered' | 'received' | 'cancelled';
export type ExpenseCategory = 'Rent' | 'Utilities' | 'Salaries' | 'Logistics' | 'Supplies' | 'Other';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  storeName: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  supplierName: string;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  reorderLevel: number;
  dailyVelocity: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
}

export interface StockMovementRecord {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: MovementType;
  quantityDelta: number;
  previousQty: number;
  newQty: number;
  referenceId?: string;
  note: string;
  performedBy: string;
  createdAt: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalSpent: number;
  totalDue: number;
  lastPurchaseAt: string;
  createdAt: string;
}

export interface SaleItemRecord {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  costPrice: number;
  unitPrice: number;
  subtotal: number;
}

export interface SaleRecord {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  items: SaleItemRecord[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  status: 'paid' | 'partial' | 'overdue';
  cashierName: string;
  createdAt: string;
}

export interface PurchaseOrderItemRecord {
  productId: string;
  name: string;
  sku: string;
  qtyOrdered: number;
  unitCost: number;
}

export interface PurchaseOrderRecord {
  id: string;
  poNumber: string;
  supplierName: string;
  items: PurchaseOrderItemRecord[];
  totalCost: number;
  status: POStatus;
  receivedAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  vendorNote: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  paymentMethod: string;
  recordedBy: string;
  createdAt: string;
}

export interface StoreSettingsRecord {
  storeId: string;
  storeName: string;
  currency: string;
  defaultTaxRate: number;
  lowStockThreshold: number;
  address: string;
  phone: string;
  updatedBy: string;
  updatedAt: string;
}

export interface StoreDatabase {
  users: UserRecord[];
  products: ProductRecord[];
  movements: StockMovementRecord[];
  customers: CustomerRecord[];
  sales: SaleRecord[];
  purchaseOrders: PurchaseOrderRecord[];
  expenses: ExpenseRecord[];
  settings: StoreSettingsRecord;
  counters: {
    invoiceSeq: number;
    poSeq: number;
  };
}

const DATA_FILE = process.env.STOCKPULSE_DATA_FILE || path.resolve(process.cwd(), 'data', 'stockpulse.json');

function createSeedData(): StoreDatabase {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000).toISOString();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 3600 * 1000).toISOString();

  const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);

  const products: ProductRecord[] = [
    {
      id: 'prod-1',
      name: 'Arabica Coffee Beans 500g',
      sku: 'SKU-BEV-001',
      barcode: '890100100001',
      category: 'Beverages',
      supplierName: 'Highland Roasters Supply',
      costPrice: 11.2,
      sellingPrice: 18.5,
      stockQty: 14,
      reorderLevel: 15,
      dailyVelocity: 4.5,
      unit: 'packs',
      isActive: true,
      createdAt: daysAgo(45)
    },
    {
      id: 'prod-2',
      name: 'Oat Milk Barista Ed. 1L',
      sku: 'SKU-BEV-042',
      barcode: '890100100042',
      category: 'Beverages',
      supplierName: 'Nordic Dairy Alternatives',
      costPrice: 2.8,
      sellingPrice: 4.75,
      stockQty: 8,
      reorderLevel: 12,
      dailyVelocity: 4.0,
      unit: 'units',
      isActive: true,
      createdAt: daysAgo(40)
    },
    {
      id: 'prod-3',
      name: 'Artisan Sourdough Batard',
      sku: 'SKU-BAK-108',
      barcode: '890100100108',
      category: 'Bakery',
      supplierName: 'Hearthstone Wholesale Bakery',
      costPrice: 3.1,
      sellingPrice: 6.5,
      stockQty: 22,
      reorderLevel: 10,
      dailyVelocity: 4.4,
      unit: 'loaves',
      isActive: true,
      createdAt: daysAgo(35)
    },
    {
      id: 'prod-4',
      name: 'Vanilla Bean Pure Syrup 750ml',
      sku: 'SKU-BEV-089',
      barcode: '890100100089',
      category: 'Beverages',
      supplierName: 'Botanical Flavor Co.',
      costPrice: 6.4,
      sellingPrice: 12.0,
      stockQty: 5,
      reorderLevel: 10,
      dailyVelocity: 2.5,
      unit: 'bottles',
      isActive: true,
      createdAt: daysAgo(32)
    },
    {
      id: 'prod-5',
      name: 'Cold Brew Bottle 330ml',
      sku: 'SKU-BEV-015',
      barcode: '890100100015',
      category: 'Beverages',
      supplierName: 'Highland Roasters Supply',
      costPrice: 2.9,
      sellingPrice: 5.25,
      stockQty: 31,
      reorderLevel: 10,
      dailyVelocity: 2.2,
      unit: 'bottles',
      isActive: true,
      createdAt: daysAgo(30)
    },
    {
      id: 'prod-6',
      name: 'Dark Roast Espresso Blend',
      sku: 'SKU-BEV-003',
      barcode: '890100100003',
      category: 'Beverages',
      supplierName: 'Highland Roasters Supply',
      costPrice: 9.8,
      sellingPrice: 16.0,
      stockQty: 12,
      reorderLevel: 14,
      dailyVelocity: 3.0,
      unit: 'bags',
      isActive: true,
      createdAt: daysAgo(28)
    },
    {
      id: 'prod-7',
      name: 'Matcha Ceremonial Grade 100g',
      sku: 'SKU-BEV-077',
      barcode: '890100100077',
      category: 'Beverages',
      supplierName: 'Kyoto Leaf Imports',
      costPrice: 14.5,
      sellingPrice: 24.0,
      stockQty: 3,
      reorderLevel: 8,
      dailyVelocity: 3.0,
      unit: 'tins',
      isActive: true,
      createdAt: daysAgo(25)
    },
    {
      id: 'prod-8',
      name: 'Almond Croissant Buttered',
      sku: 'SKU-BAK-112',
      barcode: '890100100112',
      category: 'Bakery',
      supplierName: 'Hearthstone Wholesale Bakery',
      costPrice: 1.9,
      sellingPrice: 4.25,
      stockQty: 27,
      reorderLevel: 10,
      dailyVelocity: 6.5,
      unit: 'pcs',
      isActive: true,
      createdAt: daysAgo(22)
    },
    {
      id: 'prod-9',
      name: 'Organic Chai Concentrate',
      sku: 'SKU-BEV-055',
      barcode: '890100100055',
      category: 'Beverages',
      supplierName: 'Botanical Flavor Co.',
      costPrice: 5.1,
      sellingPrice: 9.5,
      stockQty: 19,
      reorderLevel: 8,
      dailyVelocity: 2.0,
      unit: 'cartons',
      isActive: true,
      createdAt: daysAgo(20)
    },
    {
      id: 'prod-10',
      name: 'Sea Salt Kettle Chips',
      sku: 'SKU-SNK-201',
      barcode: '890100100201',
      category: 'Snacks',
      supplierName: 'Pacific Provisions',
      costPrice: 1.4,
      sellingPrice: 3.5,
      stockQty: 42,
      reorderLevel: 12,
      dailyVelocity: 3.5,
      unit: 'bags',
      isActive: true,
      createdAt: daysAgo(18)
    },
    {
      id: 'prod-11',
      name: 'Thermal Receipt Paper Rolls (Box)',
      sku: 'SKU-ESS-301',
      barcode: '890100100301',
      category: 'Essentials',
      supplierName: 'Metro Retail Supplies Co.',
      costPrice: 18.0,
      sellingPrice: 32.0,
      stockQty: 15,
      reorderLevel: 5,
      dailyVelocity: 0.3,
      unit: 'boxes',
      isActive: true,
      createdAt: daysAgo(15)
    },
    {
      id: 'prod-12',
      name: 'Wireless Barcode Scanner Pro',
      sku: 'SKU-ELC-401',
      barcode: '890100100401',
      category: 'Electronics',
      supplierName: 'Apex POS Hardware',
      costPrice: 45.0,
      sellingPrice: 89.0,
      stockQty: 6,
      reorderLevel: 3,
      dailyVelocity: 0.15,
      unit: 'units',
      isActive: true,
      createdAt: daysAgo(12)
    }
  ];

  const customers: CustomerRecord[] = [
    {
      id: 'cust-1',
      name: 'Greenhouse Cafe',
      phone: '+1 (555) 234-8901',
      email: 'orders@greenhousecafe.com',
      address: '120 Oak Street',
      totalSpent: 4120.0,
      totalDue: 860.0,
      lastPurchaseAt: hoursAgo(2),
      createdAt: daysAgo(90)
    },
    {
      id: 'cust-2',
      name: 'Marcus Vance',
      phone: '+1 (555) 782-4419',
      email: 'marcus.vance@vancecorp.io',
      address: '45 Pine Avenue',
      totalSpent: 1840.5,
      totalDue: 418.0,
      lastPurchaseAt: daysAgo(1),
      createdAt: daysAgo(75)
    },
    {
      id: 'cust-3',
      name: 'Artisan Bakery',
      phone: '+1 (555) 901-3320',
      email: 'billing@artisanbakery.co',
      address: '88 Market Lane',
      totalSpent: 3210.0,
      totalDue: 680.0,
      lastPurchaseAt: daysAgo(4),
      createdAt: daysAgo(60)
    },
    {
      id: 'cust-4',
      name: 'Elena Rostova',
      phone: '+1 (555) 438-9210',
      email: 'elena.r@studio.org',
      address: '302 Riverwalk',
      totalSpent: 945.2,
      totalDue: 0,
      lastPurchaseAt: daysAgo(6),
      createdAt: daysAgo(50)
    },
    {
      id: 'cust-5',
      name: 'Blue Mist Organics',
      phone: '+1 (555) 612-8844',
      email: 'supply@bluemist.co',
      address: '19 Harbor Blvd',
      totalSpent: 2450.0,
      totalDue: 182.0,
      lastPurchaseAt: daysAgo(10),
      createdAt: daysAgo(45)
    },
    {
      id: 'cust-6',
      name: 'Claire Bennett',
      phone: '+1 (555) 304-1189',
      email: 'claire.bennett@mail.com',
      totalSpent: 1260.8,
      totalDue: 0,
      lastPurchaseAt: daysAgo(13),
      createdAt: daysAgo(40)
    },
    {
      id: 'cust-7',
      name: 'David Kalu',
      phone: '+1 (555) 774-9023',
      email: 'david.kalu@mail.com',
      totalSpent: 680.0,
      totalDue: 0,
      lastPurchaseAt: daysAgo(19),
      createdAt: daysAgo(30)
    }
  ];

  const sales: SaleRecord[] = [
    {
      id: 'sale-1',
      invoiceNumber: '#INV-8841',
      customerId: 'cust-4',
      customerName: 'Elena Rostova',
      items: [
        { productId: 'prod-1', name: 'Arabica Coffee Beans 500g', sku: 'SKU-BEV-001', qty: 5, costPrice: 11.2, unitPrice: 18.5, subtotal: 92.5 },
        { productId: 'prod-4', name: 'Vanilla Bean Pure Syrup 750ml', sku: 'SKU-BEV-089', qty: 4, costPrice: 6.4, unitPrice: 12.0, subtotal: 48.0 }
      ],
      subtotal: 140.5,
      discount: 0,
      tax: 2.0,
      totalAmount: 142.5,
      paidAmount: 142.5,
      dueAmount: 0,
      paymentMethod: 'card',
      status: 'paid',
      cashierName: 'Sarah Lin',
      createdAt: hoursAgo(1)
    },
    {
      id: 'sale-2',
      invoiceNumber: '#INV-8840',
      customerId: 'cust-1',
      customerName: 'Greenhouse Cafe',
      items: [
        { productId: 'prod-1', name: 'Arabica Coffee Beans 500g', sku: 'SKU-BEV-001', qty: 20, costPrice: 11.2, unitPrice: 18.5, subtotal: 370.0 },
        { productId: 'prod-6', name: 'Dark Roast Espresso Blend', sku: 'SKU-BEV-003', qty: 25, costPrice: 9.8, unitPrice: 16.0, subtotal: 400.0 },
        { productId: 'prod-2', name: 'Oat Milk Barista Ed. 1L', sku: 'SKU-BEV-042', qty: 18, costPrice: 2.8, unitPrice: 4.75, subtotal: 85.5 }
      ],
      subtotal: 855.5,
      discount: 0,
      tax: 4.5,
      totalAmount: 860.0,
      paidAmount: 500.0,
      dueAmount: 360.0,
      paymentMethod: 'due',
      status: 'partial',
      cashierName: 'Sarah Lin',
      createdAt: hoursAgo(3)
    },
    {
      id: 'sale-3',
      invoiceNumber: '#INV-8839',
      customerName: 'Walk-in Customer',
      items: [
        { productId: 'prod-5', name: 'Cold Brew Bottle 330ml', sku: 'SKU-BEV-015', qty: 2, costPrice: 2.9, unitPrice: 5.25, subtotal: 10.5 },
        { productId: 'prod-8', name: 'Almond Croissant Buttered', sku: 'SKU-BAK-112', qty: 3, costPrice: 1.9, unitPrice: 4.25, subtotal: 12.75 }
      ],
      subtotal: 23.25,
      discount: 0,
      tax: 1.55,
      totalAmount: 24.8,
      paidAmount: 24.8,
      dueAmount: 0,
      paymentMethod: 'cash',
      status: 'paid',
      cashierName: 'Sarah Lin',
      createdAt: hoursAgo(4)
    },
    {
      id: 'sale-4',
      invoiceNumber: '#INV-8838',
      customerId: 'cust-2',
      customerName: 'Marcus Vance',
      items: [
        { productId: 'prod-7', name: 'Matcha Ceremonial Grade 100g', sku: 'SKU-BEV-077', qty: 10, costPrice: 14.5, unitPrice: 24.0, subtotal: 240.0 },
        { productId: 'prod-12', name: 'Wireless Barcode Scanner Pro', sku: 'SKU-ELC-401', qty: 2, costPrice: 45.0, unitPrice: 89.0, subtotal: 178.0 }
      ],
      subtotal: 418.0,
      discount: 0,
      tax: 0,
      totalAmount: 418.0,
      paidAmount: 0,
      dueAmount: 418.0,
      paymentMethod: 'due',
      status: 'overdue',
      cashierName: 'Sarah Lin',
      createdAt: daysAgo(1)
    },
    {
      id: 'sale-5',
      invoiceNumber: '#INV-8837',
      customerId: 'cust-6',
      customerName: 'Claire Bennett',
      items: [
        { productId: 'prod-3', name: 'Artisan Sourdough Batard', sku: 'SKU-BAK-108', qty: 6, costPrice: 3.1, unitPrice: 6.5, subtotal: 39.0 },
        { productId: 'prod-9', name: 'Organic Chai Concentrate', sku: 'SKU-BEV-055', qty: 3, costPrice: 5.1, unitPrice: 9.5, subtotal: 28.5 }
      ],
      subtotal: 67.5,
      discount: 0,
      tax: 0.7,
      totalAmount: 68.2,
      paidAmount: 68.2,
      dueAmount: 0,
      paymentMethod: 'mobile',
      status: 'paid',
      cashierName: 'Sarah Lin',
      createdAt: daysAgo(2)
    },
    {
      id: 'sale-6',
      invoiceNumber: '#INV-8836',
      customerId: 'cust-3',
      customerName: 'Artisan Bakery',
      items: [
        { productId: 'prod-1', name: 'Arabica Coffee Beans 500g', sku: 'SKU-BEV-001', qty: 30, costPrice: 11.2, unitPrice: 18.5, subtotal: 555.0 },
        { productId: 'prod-2', name: 'Oat Milk Barista Ed. 1L', sku: 'SKU-BEV-042', qty: 25, costPrice: 2.8, unitPrice: 4.75, subtotal: 118.75 }
      ],
      subtotal: 673.75,
      discount: 0,
      tax: 6.25,
      totalAmount: 680.0,
      paidAmount: 0,
      dueAmount: 680.0,
      paymentMethod: 'due',
      status: 'partial',
      cashierName: 'Sarah Lin',
      createdAt: daysAgo(4)
    },
    {
      id: 'sale-7',
      invoiceNumber: '#INV-8835',
      customerName: 'Walk-in Customer',
      items: [
        { productId: 'prod-8', name: 'Almond Croissant Buttered', sku: 'SKU-BAK-112', qty: 40, costPrice: 1.9, unitPrice: 4.25, subtotal: 170.0 },
        { productId: 'prod-10', name: 'Sea Salt Kettle Chips', sku: 'SKU-SNK-201', qty: 35, costPrice: 1.4, unitPrice: 3.5, subtotal: 122.5 },
        { productId: 'prod-1', name: 'Arabica Coffee Beans 500g', sku: 'SKU-BEV-001', qty: 45, costPrice: 11.2, unitPrice: 18.5, subtotal: 832.5 }
      ],
      subtotal: 1125.0,
      discount: 0,
      tax: 0,
      totalAmount: 1125.0,
      paidAmount: 1125.0,
      dueAmount: 0,
      paymentMethod: 'card',
      status: 'paid',
      cashierName: 'Sarah Lin',
      createdAt: daysAgo(5)
    }
  ];

  const purchaseOrders: PurchaseOrderRecord[] = [
    {
      id: 'po-1',
      poNumber: '#PO-1042',
      supplierName: 'Highland Roasters Supply',
      items: [
        { productId: 'prod-1', name: 'Arabica Coffee Beans 500g', sku: 'SKU-BEV-001', qtyOrdered: 25, unitCost: 11.2 },
        { productId: 'prod-6', name: 'Dark Roast Espresso Blend', sku: 'SKU-BEV-003', qtyOrdered: 15, unitCost: 9.8 }
      ],
      totalCost: 427.0,
      status: 'ordered',
      createdBy: 'Sarah Lin',
      createdAt: hoursAgo(18)
    },
    {
      id: 'po-2',
      poNumber: '#PO-1041',
      supplierName: 'Kyoto Leaf Imports',
      items: [{ productId: 'prod-7', name: 'Matcha Ceremonial Grade 100g', sku: 'SKU-BEV-077', qtyOrdered: 18, unitCost: 14.5 }],
      totalCost: 261.0,
      status: 'draft',
      createdBy: 'Sarah Lin',
      createdAt: daysAgo(2)
    },
    {
      id: 'po-3',
      poNumber: '#PO-1040',
      supplierName: 'Hearthstone Wholesale Bakery',
      items: [
        { productId: 'prod-3', name: 'Artisan Sourdough Batard', sku: 'SKU-BAK-108', qtyOrdered: 30, unitCost: 3.1 },
        { productId: 'prod-8', name: 'Almond Croissant Buttered', sku: 'SKU-BAK-112', qtyOrdered: 40, unitCost: 1.9 }
      ],
      totalCost: 169.0,
      status: 'received',
      receivedAt: daysAgo(3),
      createdBy: 'Sarah Lin',
      createdAt: daysAgo(5)
    }
  ];

  const expenses: ExpenseRecord[] = [
    {
      id: 'exp-1',
      title: 'Downtown Retail Store Lease - May',
      vendorNote: 'Commercial Realty Trust • Direct Debit • Recurring',
      category: 'Rent',
      amount: 1850.0,
      date: daysAgo(2).slice(0, 10),
      paymentMethod: 'Bank Direct Debit',
      recordedBy: 'Sarah Lin',
      createdAt: daysAgo(2)
    },
    {
      id: 'exp-2',
      title: 'Commercial Electric & Power Grid',
      vendorNote: 'Metro Utilities Board • Automatic ACH',
      category: 'Utilities',
      amount: 250.0,
      date: daysAgo(4).slice(0, 10),
      paymentMethod: 'ACH Transfer',
      recordedBy: 'Sarah Lin',
      createdAt: daysAgo(4)
    },
    {
      id: 'exp-3',
      title: 'Store Staff Bi-weekly Payroll',
      vendorNote: 'Direct Deposit Service (3 Associates)',
      category: 'Salaries',
      amount: 820.0,
      date: daysAgo(6).slice(0, 10),
      paymentMethod: 'ACH Transfer',
      recordedBy: 'Sarah Lin',
      createdAt: daysAgo(6)
    },
    {
      id: 'exp-4',
      title: 'Inbound Courier & Freight Shipping',
      vendorNote: 'SwiftLogistics Express • Inv #89201',
      category: 'Logistics',
      amount: 180.0,
      date: daysAgo(8).slice(0, 10),
      paymentMethod: 'Company Card',
      recordedBy: 'Sarah Lin',
      createdAt: daysAgo(8)
    },
    {
      id: 'exp-5',
      title: 'POS Thermal Receipt Rolls & Bags',
      vendorNote: 'Metro Retail Supplies Co. • Card ending 9014',
      category: 'Supplies',
      amount: 65.0,
      date: daysAgo(12).slice(0, 10),
      paymentMethod: 'Company Card',
      recordedBy: 'Sarah Lin',
      createdAt: daysAgo(12)
    },
    {
      id: 'exp-6',
      title: 'High-speed Fiber Internet',
      vendorNote: 'Telecom Global • Static IP Package • Auto-bill',
      category: 'Utilities',
      amount: 110.0,
      date: daysAgo(15).slice(0, 10),
      paymentMethod: 'Bank Direct Debit',
      recordedBy: 'Sarah Lin',
      createdAt: daysAgo(15)
    },
    {
      id: 'exp-7',
      title: 'Weekly Deep Cleaning Service',
      vendorNote: 'Pristine Spaces Crew • Cash receipt attached',
      category: 'Supplies',
      amount: 95.0,
      date: daysAgo(18).slice(0, 10),
      paymentMethod: 'Petty Cash',
      recordedBy: 'Sarah Lin',
      createdAt: daysAgo(18)
    },
    {
      id: 'exp-8',
      title: 'Water & Sanitation Utility',
      vendorNote: 'City Water Authority • Statement #0429',
      category: 'Utilities',
      amount: 50.0,
      date: daysAgo(20).slice(0, 10),
      paymentMethod: 'ACH Transfer',
      recordedBy: 'Sarah Lin',
      createdAt: daysAgo(20)
    }
  ];

  const movements: StockMovementRecord[] = [
    {
      id: 'mov-1',
      productId: 'prod-1',
      productName: 'Arabica Coffee Beans 500g',
      sku: 'SKU-BEV-001',
      type: 'sale',
      quantityDelta: -5,
      previousQty: 19,
      newQty: 14,
      referenceId: '#INV-8841',
      note: 'POS Checkout sale',
      performedBy: 'Sarah Lin',
      createdAt: hoursAgo(1)
    },
    {
      id: 'mov-2',
      productId: 'prod-4',
      productName: 'Vanilla Bean Pure Syrup 750ml',
      sku: 'SKU-BEV-089',
      type: 'sale',
      quantityDelta: -4,
      previousQty: 9,
      newQty: 5,
      referenceId: '#INV-8841',
      note: 'POS Checkout sale',
      performedBy: 'Sarah Lin',
      createdAt: hoursAgo(1)
    },
    {
      id: 'mov-3',
      productId: 'prod-3',
      productName: 'Artisan Sourdough Batard',
      sku: 'SKU-BAK-108',
      type: 'restock',
      quantityDelta: 30,
      previousQty: 4,
      newQty: 34,
      referenceId: '#PO-1040',
      note: 'Received Purchase Order #PO-1040',
      performedBy: 'Sarah Lin',
      createdAt: daysAgo(3)
    }
  ];

  return {
    users: [
      {
        id: 'user-owner-1',
        name: 'Sarah Lin',
        email: 'sarah.lin@stockpulse.io',
        passwordHash: defaultPasswordHash,
        role: 'owner',
        storeName: 'StockPulse Flagship Store',
        isActive: true,
        createdAt: daysAgo(120)
      }
    ],
    products,
    movements,
    customers,
    sales,
    purchaseOrders,
    expenses,
    settings: {
      storeId: 'SP-8840-CA',
      storeName: 'StockPulse Flagship Store',
      currency: 'USD',
      defaultTaxRate: 8.25,
      lowStockThreshold: 5,
      address: '742 Evergreen Blvd, Suite 100',
      phone: '(555) 234-8901',
      updatedBy: 'Sarah Lin',
      updatedAt: hoursAgo(2)
    },
    counters: {
      invoiceSeq: 8842,
      poSeq: 1043
    }
  };
}

class DataStore {
  private db: StoreDatabase;
  private filePath: string;

  constructor(filePath: string = DATA_FILE) {
    this.filePath = filePath;
    this.db = this.load();
  }

  private load(): StoreDatabase {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw) as StoreDatabase;
        if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.users)) {
          return parsed;
        }
      }
    } catch {
      // Fallback to fresh seed if corrupted
    }
    const seed = createSeedData();
    this.save(seed);
    return seed;
  }

  private save(data: StoreDatabase = this.db): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  public getState(): StoreDatabase {
    return this.db;
  }

  public reset(): void {
    this.db = createSeedData();
    this.save();
  }

  public persist(): void {
    this.save();
  }

  public nextInvoiceNumber(): string {
    const num = this.db.counters.invoiceSeq++;
    this.save();
    return `#INV-${num}`;
  }

  public nextPoNumber(): string {
    const num = this.db.counters.poSeq++;
    this.save();
    return `#PO-${num}`;
  }

  public generateId(prefix: string): string {
    return `${prefix}-${randomUUID().slice(0, 8)}`;
  }
}

export const dataStore = new DataStore();
