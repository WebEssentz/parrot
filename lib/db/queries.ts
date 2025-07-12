// FILE: lib/db/queries.ts

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { chat } from './schema';
import { eq } from 'drizzle-orm';

// Use DATABASE_URL from .env
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new Error('Failed to update chat visibility by id');
  }
}
