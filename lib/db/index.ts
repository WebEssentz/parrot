// FILE: lib/db/index.ts

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/lib/db/schema'; // <-- The important import

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const sql = neon(process.env.DATABASE_URL);

// --- THIS IS THE FIX (FOR NEON) ---
// Pass the complete schema object as the second argument to the drizzle function.
export const db = drizzle(sql, { schema });