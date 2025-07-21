// /src/app/api/attachments/[attachmentId]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Assuming you have a Drizzle DB instance
import { attachment } from '@/lib/db/schema'; // Your Drizzle schema for attachment
import { eq } from 'drizzle-orm';
import { auth } from "@clerk/nextjs/server"; // Assuming Clerk for user authentication/authorization

export async function GET(
  req: Request,
  { params }: { params: { attachmentId: string } }
) {
  try {
    const { userId } = await auth(); // Get the authenticated user ID
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { attachmentId } = params;

    if (!attachmentId) {
      return new NextResponse('Attachment ID is required', { status: 400 });
    }

    // Fetch the attachment details from the database
    const result = await db
      .select()
      .from(attachment)
      .where(eq(attachment.id, attachmentId))
      .limit(1);

    const attachmentRecord = result[0];

    if (!attachmentRecord) {
      return new NextResponse('Attachment not found', { status: 404 });
    }

    // Optional: Add authorization check if only the uploader can see details
    if (attachmentRecord.userId !== userId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Return the relevant attachment info
    return NextResponse.json({
      id: attachmentRecord.id,
      fileName: attachmentRecord.fileName,
      fileType: attachmentRecord.fileType,
      fileSize: attachmentRecord.fileSize,
      downloadUrl: attachmentRecord.downloadUrl,
      createdAt: attachmentRecord.createdAt, // You might want to format this on the client
      // Add any other fields from your attachment schema you wish to expose
    });

  } catch (error) {
    console.error('Error fetching attachment details:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}