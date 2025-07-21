// FILE: app/api/upload/route.ts

import { NextResponse } from 'next/server';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '@clerk/nextjs/server';

import { storage } from '@/lib/firebase';
import { db } from '@/lib/db';
import { attachment as attachmentTable } from '@/lib/db/schema';

const getFormattedDateTime = () => {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-');
};

export async function POST(request: Request) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        // --- MODIFIED: chatId is now correctly treated as optional ---
        const chatId = formData.get('chatId') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
        }

        const originalFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const formattedDateTime = getFormattedDateTime();
        const uniqueFileName = `AVURNA_${formattedDateTime}_${originalFileName}`;
        const storagePath = `avurna_uploads/${userId}/${uniqueFileName}`;
        const storageRef = ref(storage, storagePath);

        const fileBuffer = await file.arrayBuffer();
        const snapshot = await uploadBytes(storageRef, fileBuffer, {
            contentType: file.type,
        });

        const downloadUrl = await getDownloadURL(snapshot.ref);

        const newAttachment = await db
            .insert(attachmentTable)
            .values({
                // --- MODIFIED: Pass chatId, which can be a string or null ---
                chatId: chatId,
                userId: userId,
                fileName: uniqueFileName,
                fileType: file.type,
                fileSize: file.size,
                storagePath: storagePath,
                downloadUrl: downloadUrl,
            })
            .returning();

        if (!newAttachment || newAttachment.length === 0) {
            return NextResponse.json({ error: 'Failed to save file metadata.' }, { status: 500 });
        }

        // Return the full attachment record to the client
        return NextResponse.json({
            message: 'File uploaded and metadata saved successfully.',
            attachmentRecord: newAttachment[0],
        }, { status: 200 });

    } catch (error) {
        console.error('Error in upload route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}