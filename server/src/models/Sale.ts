import mongoose, { Schema, Document } from 'mongoose';

export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'due';

export interface ISaleItem {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  costPrice: number;
  unitPrice: number;
  subtotal: number;
}

export interface ISale extends Document {
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  items: ISaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  status: 'paid' | 'partial' | 'overdue';
  cashierName: string;
  createdAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    customerId: { type: String },
    customerName: { type: String, default: 'Walk-in Customer' },
    items: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        sku: { type: String, required: true },
        qty: { type: Number, required: true, min: 1 },
        costPrice: { type: Number, required: true, min: 0 },
        unitPrice: { type: Number, required: true, min: 0 },
        subtotal: { type: Number, required: true, min: 0 }
      }
    ],
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, enum: ['cash', 'card', 'mobile', 'due'], required: true },
    status: { type: String, enum: ['paid', 'partial', 'overdue'], default: 'paid' },
    cashierName: { type: String, required: true }
  },
  { timestamps: true }
);

export const SaleModel = mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema);
