// FILE: app/api/attachments/delete-record/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db'; // Your existing Drizzle instance
import { attachment as attachmentTable } from '@/lib/db/schema'; // Your existing schema

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = await req.json();
    const { attachmentId } = body;

    if (!attachmentId) {
      return new NextResponse(JSON.stringify({ error: "Missing attachment ID" }), { status: 400 });
    }

    // Security Check: Verify the user deleting the record is the one who owns it.
    const records = await db.select().from(attachmentTable).where(eq(attachmentTable.id, attachmentId));
    if (records.length > 0 && records[0].userId !== userId) {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    // Action: Delete the record from your database.
    await db.delete(attachmentTable).where(eq(attachmentTable.id, attachmentId));
    
    return new NextResponse(JSON.stringify({ success: true, message: "Attachment record deleted." }), { status: 200 });

  } catch (error) {
    console.error("Error deleting attachment record from DB:", error);
    return new NextResponse(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}