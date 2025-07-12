// FILE: app/api/user/route.ts

import { db } from '@/lib/db';
import { user as userTable } from '@/lib/db/schema';
import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const clerkUser = await currentUser();

  if (!clerkUser || !clerkUser.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
    if (!email) {
       return NextResponse.json({ error: 'User has no email address' }, { status: 400 });
    }
    
    // --- THE DEFINITIVE FIX ---
    // We are telling Drizzle to perform an "upsert".
    // Try to insert the new user.
    // If a conflict occurs ON THE "User_email_unique" CONSTRAINT,
    // then DO UPDATE the existing record instead of throwing an error.
    const [user] = await db.insert(userTable).values({
      id: clerkUser.id,
      email: email,
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      profilePic: clerkUser.imageUrl || '',
      username: clerkUser.username || null,
    })
    .onConflictDoUpdate({
      target: userTable.email, // <-- The key change: target the email column
      set: {
        // When updating, we might want to update everything BUT the email
        id: clerkUser.id, // Update the ID in case it changed (e.g., user re-signed up)
        firstName: clerkUser.firstName || '',
        lastName: clerkUser.lastName || '',
        profilePic: clerkUser.imageUrl || '',
        username: clerkUser.username || null,
      }
    })
    .returning();

    return NextResponse.json(user);

  } catch (error) {
    console.error("Error in get-or-create user endpoint:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}