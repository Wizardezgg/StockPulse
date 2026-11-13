import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalSpent: number;
  totalDue: number;
  lastPurchaseAt?: Date;
  createdAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    totalSpent: { type: Number, default: 0, min: 0 },
    totalDue: { type: Number, default: 0, min: 0 },
    lastPurchaseAt: { type: Date }
  },
  { timestamps: true }
);

export const CustomerModel = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
