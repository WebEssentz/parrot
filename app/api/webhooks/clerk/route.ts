// app/api/user/route.ts

import { db } from '@/lib/db';
import { user as userTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server'; // <-- CHANGE: Import currentUser
import { NextResponse } from 'next/server';

// This function now performs a safe "upsert"
export async function createOrUpdateUser(clerkUser: any) {
  const email = clerkUser.email_addresses?.[0]?.email_address || '';
  if (!email) {
    console.error("Webhook received for user without an email address:", clerkUser.id);
    return; // Can't proceed without an email
  }
  
  // --- THE FIX IS HERE ---
  await db.insert(userTable).values({
    id: clerkUser.id,
    email: email,
    firstName: clerkUser.first_name || '',
    lastName: clerkUser.last_name || '',
    profilePic: clerkUser.image_url || '',
    username: clerkUser.username || null,
  })
  .onConflictDoUpdate({ 
    target: userTable.id, // Conflict target is the primary key
    set: {
      email: email,
      firstName: clerkUser.first_name || '',
      lastName: clerkUser.last_name || '',
      profilePic: clerkUser.image_url || '',
      username: clerkUser.username || null,
      // You can add an 'updatedAt' field here if you have one
    } 
  });
}

// This endpoint will find a user by their Clerk ID, or create them if they don't exist.
export async function POST(request: Request) {
  // --- THE FIX IS HERE ---
  // Use currentUser() to get the full user object.
  const clerkUser = await currentUser();

  // If there's no user, they are not logged in.
  if (!clerkUser || !clerkUser.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // 1. Try to find the user in our DB using their ID
    const existingUser = await db.select().from(userTable).where(eq(userTable.id, clerkUser.id));
    
    // 2. If the user exists, return them immediately
    if (existingUser.length > 0) {
      return NextResponse.json(existingUser[0]);
    }

    // 3. If the user does NOT exist, create them
    const email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
    if (!email) {
       return NextResponse.json({ error: 'User has no email address' }, { status: 400 });
    }
    
    const newUser = await db.insert(userTable).values({
      id: clerkUser.id,
      email: email,
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      profilePic: clerkUser.imageUrl || '',
      username: clerkUser.username || null,
    }).returning();
    
    return NextResponse.json(newUser[0], { status: 201 });

  } catch (error) {
    console.error("Error in get-or-create user endpoint:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}