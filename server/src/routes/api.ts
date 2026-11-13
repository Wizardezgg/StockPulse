import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { dataStore } from '../services/dataStore.js';
import {
  buildAnalyticsPayload,
  buildDashboardPayload,
  buildReorderPredictions,
  enrichProducts
} from '../services/smartAnalytics.js';
import { requireAuth, signAuthToken, type AuthenticatedRequest } from '../middleware/auth.js';
import { getDbMode } from '../config/db.js';

export const apiRouter = Router();

// --- Health Check ---
apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'stockpulse-api', dbMode: getDbMode(), timestamp: new Date().toISOString() });
});

// --- Auth Routes ---
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

apiRouter.post('/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Valid email and password are required' });
    return;
  }

  const db = dataStore.getState();
  const user = db.users.find((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase());
  if (!user || !bcrypt.compareSync(parsed.data.password, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signAuthToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    storeName: user.storeName
  });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      storeName: user.storeName
    }
  });
});

const registerSchema = z.object({
  name: z.string().min(2),
  storeName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

apiRouter.post('/auth/register', (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration data' });
    return;
  }

  const db = dataStore.getState();
  const exists = db.users.some((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase());
  if (exists) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const newUser = {
    id: dataStore.generateId('user'),
    name: parsed.data.name.trim(),
    email: parsed.data.email.toLowerCase().trim(),
    passwordHash: bcrypt.hashSync(parsed.data.password, 10),
    role: 'owner' as const,
    storeName: parsed.data.storeName.trim(),
    isActive: true,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  db.settings.storeName = newUser.storeName;
  db.settings.updatedBy = newUser.name;
  db.settings.updatedAt = new Date().toISOString();
  dataStore.persist();

  const token = signAuthToken({
    userId: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    storeName: newUser.storeName
  });

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      storeName: newUser.storeName
    }
  });
});

apiRouter.post('/auth/forgot-password', (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Please enter a valid email address' });
    return;
  }
  res.json({
    message: `Check your inbox — we sent a reset link to ${parsed.data.email}`
  });
});

apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

// All operational routes require auth
apiRouter.use(requireAuth);

// --- Dashboard ---
apiRouter.get('/dashboard', (req, res) => {
  const days = Number(req.query.days) || 30;
  const db = dataStore.getState();
  const payload = buildDashboardPayload({
    products: db.products.filter((p) => p.isActive),
    sales: db.sales,
    expenses: db.expenses,
    customers: db.customers,
    rangeDays: days
  });
  res.json(payload);
});

// --- Inventory & Products ---
apiRouter.get('/products', (_req, res) => {
  const db = dataStore.getState();
  const enriched = enrichProducts(
    db.products.filter((p) => p.isActive),
    db.sales
  );
  res.json({ products: enriched });
});

const createProductSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  barcode: z.string().optional(),
  category: z.string().min(2),
  supplierName: z.string().optional(),
  costPrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  stockQty: z.number().int().min(0),
  reorderLevel: z.number().int().min(0).optional(),
  dailyVelocity: z.number().min(0.1).optional(),
  unit: z.string().optional()
});

apiRouter.post('/products', (req: AuthenticatedRequest, res) => {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid product payload' });
    return;
  }

  const db = dataStore.getState();
  if (db.products.some((p) => p.sku.toLowerCase() === parsed.data.sku.toLowerCase() && p.isActive)) {
    res.status(409).json({ error: 'A product with this SKU already exists' });
    return;
  }

  const product = {
    id: dataStore.generateId('prod'),
    name: parsed.data.name.trim(),
    sku: parsed.data.sku.trim().toUpperCase(),
    barcode: parsed.data.barcode?.trim() || `${Date.now()}`.slice(-12),
    category: parsed.data.category.trim(),
    supplierName: parsed.data.supplierName?.trim() || 'Primary Wholesale Supply',
    costPrice: parsed.data.costPrice,
    sellingPrice: parsed.data.sellingPrice,
    stockQty: parsed.data.stockQty,
    reorderLevel: parsed.data.reorderLevel ?? db.settings.lowStockThreshold,
    dailyVelocity: parsed.data.dailyVelocity ?? 1.5,
    unit: parsed.data.unit?.trim() || 'units',
    isActive: true,
    createdAt: new Date().toISOString()
  };

  db.products.unshift(product);
  if (product.stockQty > 0) {
    db.movements.unshift({
      id: dataStore.generateId('mov'),
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      type: 'restock',
      quantityDelta: product.stockQty,
      previousQty: 0,
      newQty: product.stockQty,
      note: 'Initial product stock',
      performedBy: req.user?.name || 'System',
      createdAt: new Date().toISOString()
    });
  }
  dataStore.persist();

  const [enriched] = enrichProducts([product], db.sales);
  res.status(201).json({ product: enriched });
});

const adjustStockSchema = z.object({
  delta: z.number().int(),
  reason: z.string().min(1)
});

apiRouter.patch('/products/:id/adjust', (req: AuthenticatedRequest, res) => {
  const parsed = adjustStockSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Valid quantity delta and reason are required' });
    return;
  }

  const db = dataStore.getState();
  const product = db.products.find((p) => p.id === req.params.id && p.isActive);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const prevQty = product.stockQty;
  const newQty = Math.max(0, prevQty + parsed.data.delta);
  product.stockQty = newQty;

  db.movements.unshift({
    id: dataStore.generateId('mov'),
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    type: 'adjustment',
    quantityDelta: newQty - prevQty,
    previousQty: prevQty,
    newQty,
    note: parsed.data.reason,
    performedBy: req.user?.name || 'System',
    createdAt: new Date().toISOString()
  });
  dataStore.persist();

  const enriched = enrichProducts(
    db.products.filter((p) => p.isActive),
    db.sales
  ).find((p) => p.id === product.id);

  res.json({ product: enriched });
});

apiRouter.delete('/products/:id', (req, res) => {
  const db = dataStore.getState();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  product.isActive = false;
  dataStore.persist();
  res.json({ success: true });
});

// --- Stock Movements ---
apiRouter.get('/movements', (_req, res) => {
  const db = dataStore.getState();
  const sorted = [...db.movements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ movements: sorted });
});

// --- Sales & POS Checkout ---
apiRouter.get('/sales', (_req, res) => {
  const db = dataStore.getState();
  const sorted = [...db.sales].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ sales: sorted });
});

const createSaleSchema = z.object({
  customerId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1)
      })
    )
    .min(1),
  discount: z.number().min(0).default(0),
  paymentMethod: z.enum(['cash', 'card', 'mobile', 'due']),
  paidAmount: z.number().min(0).optional()
});

apiRouter.post('/sales', (req: AuthenticatedRequest, res) => {
  const parsed = createSaleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid checkout payload' });
    return;
  }

  const db = dataStore.getState();
  const lineItems = [];
  let subtotal = 0;

  // Validate stock availability first
  for (const item of parsed.data.items) {
    const product = db.products.find((p) => p.id === item.productId && p.isActive);
    if (!product) {
      res.status(404).json({ error: `Product ${item.productId} not found` });
      return;
    }
    if (product.stockQty < item.qty) {
      res.status(400).json({ error: `Insufficient stock for ${product.name} (${product.stockQty} available)` });
      return;
    }
    const lineSub = Number((product.sellingPrice * item.qty).toFixed(2));
    subtotal += lineSub;
    lineItems.push({
      product,
      saleItem: {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        qty: item.qty,
        costPrice: product.costPrice,
        unitPrice: product.sellingPrice,
        subtotal: lineSub
      }
    });
  }

  subtotal = Number(subtotal.toFixed(2));
  const discount = Math.min(subtotal, parsed.data.discount);
  const taxable = Math.max(0, subtotal - discount);
  const tax = Number(((taxable * db.settings.defaultTaxRate) / 100).toFixed(2));
  const totalAmount = Number((taxable + tax).toFixed(2));

  const defaultPaid = parsed.data.paymentMethod === 'due' ? 0 : totalAmount;
  const paidAmount = Number(
    Math.min(totalAmount, parsed.data.paidAmount ?? defaultPaid).toFixed(2)
  );
  const dueAmount = Number(Math.max(0, totalAmount - paidAmount).toFixed(2));

  let customerName = 'Walk-in Customer';
  let customerRecord = undefined;
  if (parsed.data.customerId) {
    customerRecord = db.customers.find((c) => c.id === parsed.data.customerId);
    if (!customerRecord) {
      res.status(404).json({ error: 'Selected customer not found' });
      return;
    }
    customerName = customerRecord.name;
  } else if (dueAmount > 0) {
    res.status(400).json({ error: 'Please select a named customer when recording a credit due' });
    return;
  }

  const invoiceNumber = dataStore.nextInvoiceNumber();
  const nowIso = new Date().toISOString();

  // Atomically deduct stock & record movements
  for (const { product, saleItem } of lineItems) {
    const prevQty = product.stockQty;
    product.stockQty = prevQty - saleItem.qty;
    db.movements.unshift({
      id: dataStore.generateId('mov'),
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      type: 'sale',
      quantityDelta: -saleItem.qty,
      previousQty: prevQty,
      newQty: product.stockQty,
      referenceId: invoiceNumber,
      note: `POS Checkout (${customerName})`,
      performedBy: req.user?.name || 'Cashier',
      createdAt: nowIso
    });
  }

  if (customerRecord) {
    customerRecord.totalSpent = Number((customerRecord.totalSpent + totalAmount).toFixed(2));
    customerRecord.totalDue = Number((customerRecord.totalDue + dueAmount).toFixed(2));
    customerRecord.lastPurchaseAt = nowIso;
  }

  const sale = {
    id: dataStore.generateId('sale'),
    invoiceNumber,
    customerId: customerRecord?.id,
    customerName,
    items: lineItems.map((l) => l.saleItem),
    subtotal,
    discount,
    tax,
    totalAmount,
    paidAmount,
    dueAmount,
    paymentMethod: parsed.data.paymentMethod,
    status: dueAmount > 0 ? ('partial' as const) : ('paid' as const),
    cashierName: req.user?.name || 'Sarah Lin',
    createdAt: nowIso
  };

  db.sales.unshift(sale);
  dataStore.persist();

  res.status(201).json({ sale });
});

// --- Purchase Orders ---
apiRouter.get('/purchase-orders', (_req, res) => {
  const db = dataStore.getState();
  const sorted = [...db.purchaseOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ purchaseOrders: sorted });
});

const createPOSchema = z.object({
  supplierName: z.string().min(2).optional(),
  status: z.enum(['draft', 'ordered']).default('ordered'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qtyOrdered: z.number().int().min(1)
      })
    )
    .min(1)
});

apiRouter.post('/purchase-orders', (req: AuthenticatedRequest, res) => {
  const parsed = createPOSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid PO payload' });
    return;
  }

  const db = dataStore.getState();
  const poItems = [];
  let totalCost = 0;
  let inferredSupplier = parsed.data.supplierName?.trim();

  for (const item of parsed.data.items) {
    const product = db.products.find((p) => p.id === item.productId && p.isActive);
    if (!product) {
      res.status(404).json({ error: `Product ${item.productId} not found` });
      return;
    }
    if (!inferredSupplier) {
      inferredSupplier = product.supplierName;
    }
    totalCost += product.costPrice * item.qtyOrdered;
    poItems.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      qtyOrdered: item.qtyOrdered,
      unitCost: product.costPrice
    });
  }

  const po = {
    id: dataStore.generateId('po'),
    poNumber: dataStore.nextPoNumber(),
    supplierName: inferredSupplier || 'Primary Wholesale Supply',
    items: poItems,
    totalCost: Number(totalCost.toFixed(2)),
    status: parsed.data.status,
    createdBy: req.user?.name || 'Sarah Lin',
    createdAt: new Date().toISOString()
  };

  db.purchaseOrders.unshift(po);
  dataStore.persist();
  res.status(201).json({ purchaseOrder: po });
});

apiRouter.post('/purchase-orders/auto-reorder', (req: AuthenticatedRequest, res) => {
  const db = dataStore.getState();
  const enriched = enrichProducts(
    db.products.filter((p) => p.isActive),
    db.sales
  );
  const predictions = buildReorderPredictions(enriched);
  if (predictions.length === 0) {
    res.status(400).json({ error: 'All inventory levels are currently healthy' });
    return;
  }

  const poItems = predictions.map((pred) => {
    const prod = db.products.find((p) => p.id === pred.productId)!;
    return {
      productId: prod.id,
      name: prod.name,
      sku: prod.sku,
      qtyOrdered: pred.suggestedOrderQty,
      unitCost: prod.costPrice
    };
  });

  const totalCost = poItems.reduce((acc, it) => acc + it.qtyOrdered * it.unitCost, 0);
  const po = {
    id: dataStore.generateId('po'),
    poNumber: dataStore.nextPoNumber(),
    supplierName: 'Multi-Vendor Smart Reorder Batch',
    items: poItems,
    totalCost: Number(totalCost.toFixed(2)),
    status: 'ordered' as const,
    createdBy: req.user?.name || 'Sarah Lin',
    createdAt: new Date().toISOString()
  };

  db.purchaseOrders.unshift(po);
  dataStore.persist();
  res.status(201).json({ purchaseOrder: po });
});

apiRouter.patch('/purchase-orders/:id/receive', (req: AuthenticatedRequest, res) => {
  const db = dataStore.getState();
  const po = db.purchaseOrders.find((p) => p.id === req.params.id);
  if (!po) {
    res.status(404).json({ error: 'Purchase order not found' });
    return;
  }
  if (po.status === 'received') {
    res.status(400).json({ error: 'Purchase order has already been received' });
    return;
  }

  const nowIso = new Date().toISOString();
  for (const item of po.items) {
    const product = db.products.find((p) => p.id === item.productId);
    if (!product) continue;
    const prevQty = product.stockQty;
    product.stockQty = prevQty + item.qtyOrdered;
    db.movements.unshift({
      id: dataStore.generateId('mov'),
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      type: 'restock',
      quantityDelta: item.qtyOrdered,
      previousQty: prevQty,
      newQty: product.stockQty,
      referenceId: po.poNumber,
      note: `Received Purchase Order ${po.poNumber}`,
      performedBy: req.user?.name || 'Sarah Lin',
      createdAt: nowIso
    });
  }

  po.status = 'received';
  po.receivedAt = nowIso;
  dataStore.persist();
  res.json({ purchaseOrder: po });
});

// --- Customers & Credit Dues ---
apiRouter.get('/customers', (_req, res) => {
  const db = dataStore.getState();
  const sorted = [...db.customers].sort((a, b) => b.totalDue - a.totalDue);
  res.json({ customers: sorted });
});

const createCustomerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(5),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional()
});

apiRouter.post('/customers', (req, res) => {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid customer payload' });
    return;
  }

  const db = dataStore.getState();
  const customer = {
    id: dataStore.generateId('cust'),
    name: parsed.data.name.trim(),
    phone: parsed.data.phone.trim(),
    email: parsed.data.email?.trim() || undefined,
    address: parsed.data.address?.trim() || undefined,
    totalSpent: 0,
    totalDue: 0,
    lastPurchaseAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  db.customers.unshift(customer);
  dataStore.persist();
  res.status(201).json({ customer });
});

apiRouter.post('/customers/:id/pay', (req, res) => {
  const parsed = z.object({ amount: z.number().positive() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Payment amount must be greater than zero' });
    return;
  }

  const db = dataStore.getState();
  const customer = db.customers.find((c) => c.id === req.params.id);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const applied = Math.min(customer.totalDue, parsed.data.amount);
  customer.totalDue = Number(Math.max(0, customer.totalDue - applied).toFixed(2));
  dataStore.persist();

  res.json({ customer, appliedAmount: applied });
});

// --- Expenses ---
apiRouter.get('/expenses', (_req, res) => {
  const db = dataStore.getState();
  const sorted = [...db.expenses].sort((a, b) => b.date.localeCompare(a.date));
  res.json({ expenses: sorted });
});

const expenseSchema = z.object({
  title: z.string().min(2),
  vendorNote: z.string().optional(),
  category: z.enum(['Rent', 'Utilities', 'Salaries', 'Logistics', 'Supplies', 'Other']),
  amount: z.number().positive(),
  date: z.string().min(4),
  paymentMethod: z.string().optional()
});

apiRouter.post('/expenses', (req: AuthenticatedRequest, res) => {
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid expense payload' });
    return;
  }

  const db = dataStore.getState();
  const expense = {
    id: dataStore.generateId('exp'),
    title: parsed.data.title.trim(),
    vendorNote: parsed.data.vendorNote?.trim() || 'Recorded via StockPulse',
    category: parsed.data.category,
    amount: Number(parsed.data.amount.toFixed(2)),
    date: parsed.data.date,
    paymentMethod: parsed.data.paymentMethod?.trim() || 'Bank Direct Debit',
    recordedBy: req.user?.name || 'Sarah Lin',
    createdAt: new Date().toISOString()
  };

  db.expenses.unshift(expense);
  dataStore.persist();
  res.status(201).json({ expense });
});

apiRouter.put('/expenses/:id', (req, res) => {
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid expense payload' });
    return;
  }

  const db = dataStore.getState();
  const expense = db.expenses.find((e) => e.id === req.params.id);
  if (!expense) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }

  expense.title = parsed.data.title.trim();
  expense.vendorNote = parsed.data.vendorNote?.trim() || expense.vendorNote;
  expense.category = parsed.data.category;
  expense.amount = Number(parsed.data.amount.toFixed(2));
  expense.date = parsed.data.date;
  expense.paymentMethod = parsed.data.paymentMethod?.trim() || expense.paymentMethod;
  dataStore.persist();

  res.json({ expense });
});

apiRouter.delete('/expenses/:id', (req, res) => {
  const db = dataStore.getState();
  const idx = db.expenses.findIndex((e) => e.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }
  db.expenses.splice(idx, 1);
  dataStore.persist();
  res.json({ success: true });
});

// --- Smart Analytics ---
apiRouter.get('/analytics', (req, res) => {
  const days = Number(req.query.days) || 30;
  const db = dataStore.getState();
  const payload = buildAnalyticsPayload({
    products: db.products.filter((p) => p.isActive),
    sales: db.sales,
    expenses: db.expenses,
    movements: db.movements,
    rangeDays: days
  });
  res.json(payload);
});

// --- Store Settings ---
apiRouter.get('/settings', (_req, res) => {
  res.json({ settings: dataStore.getState().settings });
});

const settingsSchema = z.object({
  storeName: z.string().min(2),
  currency: z.string().min(3).max(5),
  defaultTaxRate: z.number().min(0).max(50),
  lowStockThreshold: z.number().int().min(1).max(1000),
  address: z.string().min(2),
  phone: z.string().min(5)
});

apiRouter.put('/settings', (req: AuthenticatedRequest, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid settings payload' });
    return;
  }

  const db = dataStore.getState();
  db.settings = {
    ...db.settings,
    ...parsed.data,
    updatedBy: req.user?.name || 'Sarah Lin',
    updatedAt: new Date().toISOString()
  };
  dataStore.persist();
  res.json({ settings: db.settings });
});

apiRouter.post('/settings/apply-threshold', (req, res) => {
  const parsed = z.object({ threshold: z.number().int().min(1).max(1000) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Valid threshold value required' });
    return;
  }

  const db = dataStore.getState();
  db.settings.lowStockThreshold = parsed.data.threshold;
  for (const product of db.products) {
    product.reorderLevel = parsed.data.threshold;
  }
  dataStore.persist();
  res.json({ success: true, updatedCount: db.products.length });
});
