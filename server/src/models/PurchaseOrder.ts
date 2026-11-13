import mongoose, { Schema, Document } from 'mongoose';

export type POStatus = 'draft' | 'ordered' | 'received' | 'cancelled';

export interface IPurchaseOrderItem {
  productId: string;
  name: string;
  sku: string;
  qtyOrdered: number;
  unitCost: number;
}

export interface IPurchaseOrder extends Document {
  poNumber: string;
  supplierName: string;
  items: IPurchaseOrderItem[];
  totalCost: number;
  status: POStatus;
  receivedAt?: Date;
  createdBy: string;
  createdAt: Date;
}

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber: { type: String, required: true, unique: true },
    supplierName: { type: String, required: true },
    items: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        sku: { type: String, required: true },
        qtyOrdered: { type: Number, required: true, min: 1 },
        unitCost: { type: Number, required: true, min: 0 }
      }
    ],
    totalCost: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['draft', 'ordered', 'received', 'cancelled'], default: 'ordered' },
    receivedAt: { type: Date },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);

export const PurchaseOrderModel =
  mongoose.models.PurchaseOrder || mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
