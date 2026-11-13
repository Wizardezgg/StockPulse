import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { dataStore } from '../src/services/dataStore.js';

const app = createApp();

describe('StockPulse API Integration Tests', () => {
  let token = '';

  beforeEach(async () => {
    dataStore.reset();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sarah.lin@stockpulse.io', password: 'Password123!' });
    expect(res.status).toBe(200);
    token = res.body.token;
  });

  it('GET /api/health returns service status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('stockpulse-api');
  });

  it('registers a new store owner and rejects duplicate email', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Alex Morgan',
      storeName: 'Morgan Market',
      email: 'alex@morganmarket.io',
      password: 'Password123!'
    });
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();
    expect(reg.body.user.storeName).toBe('Morgan Market');

    const dup = await request(app).post('/api/auth/register').send({
      name: 'Alex Morgan',
      storeName: 'Morgan Market',
      email: 'alex@morganmarket.io',
      password: 'Password123!'
    });
    expect(dup.status).toBe(409);
  });

  it('creates a product and adjusts stock with audit movement', async () => {
    const created = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Colombian Supremo Beans 250g',
        sku: 'SKU-BEV-098',
        category: 'Beverages',
        costPrice: 4.5,
        sellingPrice: 8.9,
        stockQty: 24,
        dailyVelocity: 3
      });

    expect(created.status).toBe(201);
    expect(created.body.product.sku).toBe('SKU-BEV-098');
    expect(created.body.product.marginPercent).toBeCloseTo(49.4, 1);

    const prodId = created.body.product.id;
    const adjusted = await request(app)
      .patch(`/api/products/${prodId}/adjust`)
      .set('Authorization', `Bearer ${token}`)
      .send({ delta: -4, reason: 'Damaged / Spoilage' });

    expect(adjusted.status).toBe(200);
    expect(adjusted.body.product.stockQty).toBe(20);

    const movements = await request(app)
      .get('/api/movements')
      .set('Authorization', `Bearer ${token}`);
    expect(movements.status).toBe(200);
    expect(movements.body.movements[0].sku).toBe('SKU-BEV-098');
    expect(movements.body.movements[0].quantityDelta).toBe(-4);
  });

  it('completes POS checkout, deducts stock, and records customer credit due', async () => {
    const productsRes = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`);
    const beans = productsRes.body.products.find((p: { sku: string }) => p.sku === 'SKU-BEV-001');
    const initialStock = beans.stockQty;

    const customersRes = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${token}`);
    const customer = customersRes.body.customers[0];
    const initialDue = customer.totalDue;

    const saleRes = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: customer.id,
        items: [{ productId: beans.id, qty: 2 }],
        discount: 0,
        paymentMethod: 'due',
        paidAmount: 10
      });

    expect(saleRes.status).toBe(201);
    expect(saleRes.body.sale.dueAmount).toBeGreaterThan(0);

    // Verify stock deducted
    const afterProducts = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`);
    const updatedBeans = afterProducts.body.products.find((p: { id: string }) => p.id === beans.id);
    expect(updatedBeans.stockQty).toBe(initialStock - 2);

    // Verify customer due increased and can be paid down
    const afterCustomers = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${token}`);
    const updatedCustomer = afterCustomers.body.customers.find((c: { id: string }) => c.id === customer.id);
    expect(updatedCustomer.totalDue).toBeCloseTo(initialDue + saleRes.body.sale.dueAmount, 2);

    const payRes = await request(app)
      .post(`/api/customers/${customer.id}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 50 });
    expect(payRes.status).toBe(200);
    expect(payRes.body.customer.totalDue).toBeCloseTo(updatedCustomer.totalDue - 50, 2);
  });

  it('creates and receives a Purchase Order with automatic restock', async () => {
    const productsRes = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`);
    const matcha = productsRes.body.products.find((p: { sku: string }) => p.sku === 'SKU-BEV-077');
    const beforeQty = matcha.stockQty;

    const poRes = await request(app)
      .post('/api/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'ordered',
        items: [{ productId: matcha.id, qtyOrdered: 15 }]
      });

    expect(poRes.status).toBe(201);
    expect(poRes.body.purchaseOrder.status).toBe('ordered');

    const receiveRes = await request(app)
      .patch(`/api/purchase-orders/${poRes.body.purchaseOrder.id}/receive`)
      .set('Authorization', `Bearer ${token}`);
    expect(receiveRes.status).toBe(200);
    expect(receiveRes.body.purchaseOrder.status).toBe('received');

    const afterProducts = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`);
    const updatedMatcha = afterProducts.body.products.find((p: { id: string }) => p.id === matcha.id);
    expect(updatedMatcha.stockQty).toBe(beforeQty + 15);
  });

  it('returns Smart Analytics, Dashboard KPIs, Expenses CRUD, and Settings persistence', async () => {
    const dash = await request(app)
      .get('/api/dashboard?days=30')
      .set('Authorization', `Bearer ${token}`);
    expect(dash.status).toBe(200);
    expect(dash.body.reorderPredictions.length).toBeGreaterThan(0);
    expect(dash.body.abcSummary.classes.length).toBe(3);

    const analytics = await request(app)
      .get('/api/analytics?days=30')
      .set('Authorization', `Bearer ${token}`);
    expect(analytics.status).toBe(200);
    expect(analytics.body.topSellers.length).toBe(5);

    const exp = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Packaging Boxes',
        category: 'Supplies',
        amount: 45,
        date: '2026-11-12'
      });
    expect(exp.status).toBe(201);

    const settingsRes = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        storeName: 'StockPulse Uptown',
        currency: 'USD',
        defaultTaxRate: 7.5,
        lowStockThreshold: 6,
        address: '100 Main St',
        phone: '(555) 111-2222'
      });
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body.settings.storeName).toBe('StockPulse Uptown');
  });
});
