// File: app/api/flow/start/route.ts
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

// These are read from your .env.local file by Next.js automatically
const livekitUrl = process.env.LIVEKIT_URL!;
const livekitApiKey = process.env.LIVEKIT_API_KEY!;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET!;

export async function POST(req: Request) {
  // Check for environment variables
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
    await roomService.createRoom({ name: roomName });

    // 2. Create a token for the user (React Frontend)
    const userToken = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: userIdentity,
      name: userIdentity,
    });
    userToken.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

    // 3. Create a token for the Avurna Agent (Not strictly needed by the frontend, but good practice)
    // You can remove this if you only need the user token on the client.
    const agentIdentity = `agent-avurna-${roomName}`;
    const agentToken = new AccessToken(livekitApiKey, livekitApiSecret, {
        identity: agentIdentity,
        name: "Avurna",
        metadata: JSON.stringify({ agent: true }),
    });
    agentToken.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, roomAdmin: true });

    // 4. Send all necessary info back to the frontend
    const responseData = {
      user_token: await userToken.toJwt(),
      agent_token: await agentToken.toJwt(), // You might not need to send this to the client
      livekit_url: livekitUrl,
      room_name: roomName,
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (e: any) {
    // Log the full error on the server for debugging
    console.error("Error in /api/flow/start:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}