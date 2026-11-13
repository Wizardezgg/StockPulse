import mongoose from 'mongoose';

export type DbMode = 'mongodb' | 'json-store';

let activeMode: DbMode = 'json-store';

export async function connectDatabase(): Promise<DbMode> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    activeMode = 'json-store';
    return activeMode;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000
    });
    activeMode = 'mongodb';
    return activeMode;
  } catch {
    activeMode = 'json-store';
    return activeMode;
  }
}

export function getDbMode(): DbMode {
  return activeMode;
}
