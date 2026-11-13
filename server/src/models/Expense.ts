import mongoose, { Schema, Document } from 'mongoose';

export type ExpenseCategory = 'Rent' | 'Utilities' | 'Salaries' | 'Logistics' | 'Supplies' | 'Other';

export interface IExpense extends Document {
  title: string;
  vendorNote: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  paymentMethod: string;
  recordedBy: string;
  createdAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true, trim: true },
    vendorNote: { type: String, default: '' },
    category: {
      type: String,
      enum: ['Rent', 'Utilities', 'Salaries', 'Logistics', 'Supplies', 'Other'],
      required: true
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: String, required: true },
    paymentMethod: { type: String, default: 'Bank Direct Debit' },
    recordedBy: { type: String, required: true }
  },
  { timestamps: true }
);

export const ExpenseModel = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
