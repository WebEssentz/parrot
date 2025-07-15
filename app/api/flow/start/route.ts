import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

const livekitUrl = process.env.LIVEKIT_URL!;
const livekitApiKey = process.env.LIVEKIT_API_KEY!;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET!;

export async function POST(req: Request) {
  if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
    return NextResponse.json(
      { error: 'LiveKit server environment variables not configured.' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const userIdentity = body.identity || `user-${Date.now()}`;
    const roomName = `flow-session-${Date.now()}`;

    // 1. Create a room
    const roomService = new RoomServiceClient(livekitUrl, livekitApiKey, livekitApiSecret);
    await roomService.createRoom({ name: roomName }); // This room creation will trigger the webhook!

    // 2. Create a token for the user (React Frontend)
    const userToken = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: userIdentity,
      name: userIdentity,
    });
    userToken.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

    // 3. Send only necessary info back to the frontend
    const responseData = {
      user_token: await userToken.toJwt(),
      livekit_url: livekitUrl,
      room_name: roomName,
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (e: any) {
    console.error("Error in /api/flow/start:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}