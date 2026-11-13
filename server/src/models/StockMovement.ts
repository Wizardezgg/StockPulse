import mongoose, { Schema, Document } from 'mongoose';

export type MovementType = 'sale' | 'restock' | 'adjustment' | 'return';

export interface IStockMovement extends Document {
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
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    productId: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    type: { type: String, enum: ['sale', 'restock', 'adjustment', 'return'], required: true },
    quantityDelta: { type: Number, required: true },
    previousQty: { type: Number, required: true },
    newQty: { type: Number, required: true },
    referenceId: { type: String },
    note: { type: String, default: '' },
    performedBy: { type: String, required: true }
  },
  { timestamps: true }
);

export const StockMovementModel =
  mongoose.models.StockMovement || mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
