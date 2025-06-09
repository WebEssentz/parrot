import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user as userTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// This endpoint receives Clerk webhook events (e.g., user.created)
// Set your Clerk dashboard to POST to /api/webhooks/clerk

export async function createOrUpdateUser(clerkUser: any) {
  // Insert user with minimal info (username, birthday can be empty)
  // Upsert by email (if exists, update; else, insert)
  const email = clerkUser.email_addresses?.[0]?.email_address || clerkUser.emailAddress || clerkUser.email;
  if (!email) return;
  const existing = await db.select().from(userTable).where(eq(userTable.email, email));
  if (existing.length > 0) {
    // Optionally update fields if needed
    return existing[0];
  }
  const newUser = await db.insert(userTable).values({
    email,
    firstName: clerkUser.first_name || '',
    lastName: clerkUser.last_name || '',
    profilePic: clerkUser.image_url || '',
    username: clerkUser.username || null, // Use null if not set
    birthday: '', // Not set yet
  }).returning();
  return newUser[0];
}

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();
    // Example: handle user.created event
    if (event.type === 'user.created') {
      // You can perform onboarding logic here, e.g.,
      // - Notify your backend
      // - Create a user record in your DB
      // - Trigger onboarding flows
      // For demo, just log the event
      console.log('New Clerk user created:', event.data);
      // Add user to DB (username/birthday can be empty)
      await createOrUpdateUser(event.data);
      // Optionally: trigger onboarding logic here
    }
    // Respond 200 OK to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Webhook error', { status: 400 });
  }
}
