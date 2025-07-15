import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { messageVote } from '@/lib/db/schema';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { chatId, messageId, voteType } = body;

    // This check is now correct. chatId is not required.
    if (!messageId || !voteType) {
      return NextResponse.json({ message: 'Missing required fields: messageId and voteType are required.' }, { status: 400 });
    }

    if (voteType !== 'up' && voteType !== 'down') {
      return NextResponse.json({ message: 'Invalid vote type' }, { status: 400 });
    }

    // This insert will now work even if chatId is undefined.
    await db.insert(messageVote).values({
      userId,
      chatId,
      messageId,
      voteType,
    });

    return NextResponse.json({ message: 'Vote recorded successfully' }, { status: 201 });

  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ message: 'You have already voted on this message.' }, { status: 409 });
    }
    console.error('[VOTE_POST_ERROR]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}