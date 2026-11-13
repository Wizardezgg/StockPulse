export type UserRole = 'owner' | 'manager' | 'cashier';
export type StockStatus = 'healthy' | 'low' | 'critical';
export type ABCClass = 'A' | 'B' | 'C';
export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'due';
export type POStatus = 'draft' | 'ordered' | 'received' | 'cancelled';
export type ExpenseCategory = 'Rent' | 'Utilities' | 'Salaries' | 'Logistics' | 'Supplies' | 'Other';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeName: string;
}

export interface Product {
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
  marginPercent: number;
  estimatedDaysLeft: number;
  stockStatus: StockStatus;
  suggestedReorderQty: number;
  stockValue: number;
  abcClass: ABCClass;
  revenue30d: number;
  unitsSold30d: number;
  recommendedAction: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: 'sale' | 'restock' | 'adjustment' | 'return';
  quantityDelta: number;
  previousQty: number;
  newQty: number;
  referenceId?: string;
  note: string;
  performedBy: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalSpent: number;
  totalDue: number;
  lastPurchaseAt: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  costPrice: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  items: SaleItem[];
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

export interface PurchaseOrderItem {
  productId: string;
  name: string;
  sku: string;
  qtyOrdered: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  totalCost: number;
  status: POStatus;
  receivedAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface Expense {
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

export interface StoreSettings {
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

export interface DashboardPayload {
  kpis: {
    todaysRevenue: number;
    rangeRevenue: number;
    netProfit: number;
    netMarginPercent: number;
    totalAlertItems: number;
    criticalStockCount: number;
    lowStockCount: number;
    totalCustomerDues: number;
    dueAccountsCount: number;
  };
  chartSeries: Array<{
    label: string;
    revenue: number;
    netProfit: number;
    expenses: number;
  }>;
  reorderPredictions: Array<{
    productId: string;
    name: string;
    sku: string;
    stockQty: number;
    unit: string;
    estimatedDaysLeft: number;
    suggestedOrderQty: number;
    estimatedOrderCost: number;
    supplierName: string;
    urgency: 'critical' | 'low';
  }>;
  abcSummary: {
    totalAssetValue: number;
    classes: Array<{
      code: ABCClass;
      label: string;
      skuCount: number;
      sharePercent: number;
      value: number;
    }>;
  };
  recentSales: Sale[];
}

export interface AnalyticsPayload {
  profitability: {
    revenue: number;
    cogs: number;
    expenses: number;
    netProfit: number;
    netMarginPercent: number;
  };
  topSellers: Array<{
    productId: string;
    name: string;
    sku: string;
    unitsSold: number;
    revenue: number;
    marginPercent: number;
  }>;
  abcAudit: Product[];
  recentMovements: StockMovement[];
}
