# FILE: app/api/flow/start.py

import os
import uuid
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
from livekit import api

# --- IMPORTANT ---
# These must be set as Environment Variables in your Vercel project settings.
# Do not hardcode them here.
LIVEKIT_URL = os.environ.get('LIVEKIT_URL')
LIVEKIT_API_KEY = os.environ.get('LIVEKIT_API_KEY')
LIVEKIT_API_SECRET = os.environ.get('LIVEKIT_API_SECRET')

class handler(BaseHTTPRequestHandler):
    """
    Vercel Serverless Function to initialize a LiveKit "Flow" session.
    It creates a room, a token for the user, and a token for the Avurna agent.
    """
    def do_POST(self):
        if not all([LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET]):
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'LiveKit server environment variables not configured.'}).encode('utf-8'))
            return

        try:
            # For security, you'd get the user identity from a secure session/token.
            # For now, we'll use a generic one from the request or generate one.
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            body = json.loads(post_data)
            user_identity = body.get('identity', f"user-{uuid.uuid4()}")
            
            # 1. Create a unique room name for this session
            room_name = f"flow-session-{uuid.uuid4()}"
            room_service = api.RoomService(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)

            # This is an idempotent call. It creates the room if it doesn't exist.
            # You could configure room properties here if needed.
            room = room_service.create_room(api.CreateRoomRequest(name=room_name))

            # 2. Create a token for the user (React Frontend)
            user_token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET) \
                .with_identity(user_identity) \
                .with_name(user_identity) \
                .with_can_publish(True) \
                .with_can_subscribe(True) \
                .with_room_join(True, room_name)

            # 3. Create a separate token for the Avurna Agent
            agent_identity = f"agent-avurna-{room_name}"
            agent_token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET) \
                .with_identity(agent_identity) \
                .with_name("Avurna") \
                .with_can_publish(True) \
                .with_can_subscribe(True) \
                .with_room_join(True, room_name) \
                .with_metadata(json.dumps({ "agent": True })) # Crucial for identifying the agent

            # 4. Send all necessary info back to the frontend
            response_data = {
                'user_token': user_token.to_jwt(),
                'agent_token': agent_token.to_jwt(),
                'livekit_url': LIVEKIT_URL,
                'room_name': room_name,
            }

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))