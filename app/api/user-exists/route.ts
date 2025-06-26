import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user as userTable } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';

// GET /api/user-exists?userId=clerk_user_id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    if (!userId && !email) {
      return NextResponse.json({ exists: false, error: 'Missing userId or email' }, { status: 400 });
    }
    let user = [];
    if (userId && email) {
      user = await db.select().from(userTable).where(or(eq(userTable.id, userId), eq(userTable.email, email)));
    } else if (userId) {
      user = await db.select().from(userTable).where(eq(userTable.id, userId));
    } else if (email) {
      user = await db.select().from(userTable).where(eq(userTable.email, email));
    }
    return NextResponse.json({ exists: user.length > 0 });
  } catch (error) {
    return NextResponse.json({ exists: false, error: 'Server error' }, { status: 500 });
  }
}
