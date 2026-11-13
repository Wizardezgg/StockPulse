import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreSettings extends Document {
  storeId: string;
  storeName: string;
  currency: string;
  defaultTaxRate: number;
  lowStockThreshold: number;
  address: string;
  phone: string;
  updatedBy: string;
  updatedAt: Date;
}

const StoreSettingsSchema = new Schema<IStoreSettings>(
  {
    storeId: { type: String, default: 'SP-8840-CA', unique: true },
    storeName: { type: String, default: 'StockPulse Flagship Store' },
    currency: { type: String, default: 'USD' },
    defaultTaxRate: { type: Number, default: 8.25 },
    lowStockThreshold: { type: Number, default: 5 },
    address: { type: String, default: '742 Evergreen Blvd, Suite 100' },
    phone: { type: String, default: '(555) 234-8901' },
    updatedBy: { type: String, default: 'Sarah Lin' }
  },
  { timestamps: true }
);

export const StoreSettingsModel =
  mongoose.models.StoreSettings || mongoose.model<IStoreSettings>('StoreSettings', StoreSettingsSchema);
