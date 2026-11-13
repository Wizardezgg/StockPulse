import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'owner' | 'manager' | 'cashier';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  storeName: string;
  isActive: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['owner', 'manager', 'cashier'], default: 'owner' },
    storeName: { type: String, default: 'StockPulse Flagship Store' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
