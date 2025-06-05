import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { user as userTable } from '@/lib/db/schema';

// You should set NEON_DATABASE_URL in your .env file
const sql = neon(process.env.NEON_DATABASE_URL!);
const db = drizzle(sql);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, username, profilePic, birthday } = body;

    if (!email || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await db.select().from(userTable).where(eq(userTable.email, email));
    if (existing.length > 0) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // Insert new user (now includes birthday)
    const [newUser] = await db
      .insert(userTable)
      .values({ email, username, profilePic, birthday })
      .returning();

    // Optionally: store birthday in a separate table or extend schema if needed

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error('User creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
