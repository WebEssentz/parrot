# Generated with 💚 by Avurna AI (2025)
# For educational/demo use. Review before production.

import os
import asyncio
import base64
import io
import traceback

import cv2
import pyaudio
import PIL.Image
import mss
import numpy as np # Moved numpy import to the top for global availability

import argparse

from google import genai
from google.genai import types

FORMAT = pyaudio.paInt16
CHANNELS = 1
SEND_SAMPLE_RATE = 16000
RECEIVE_SAMPLE_RATE = 24000
CHUNK_SIZE = 1024

MODEL = "models/gemini-2.5-flash-preview-native-audio-dialog"

DEFAULT_MODE = "camera"

client = genai.Client(
    http_options={"api_version": "v1beta"},
    api_key="AIzaSyCqPKydBeOt2Woccd7y3OI8RCdubh9-9Rw", # API key kept hardcoded as per spezon's request.
)

tools = [
    types.Tool(google_search=types.GoogleSearch()),
]

CONFIG = types.LiveConnectConfig(
    response_modalities=[
        "AUDIO",
    ],
    media_resolution="MEDIA_RESOLUTION_MEDIUM",
    speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Zephyr")
        )
    ),
    realtime_input_config=types.RealtimeInputConfig(turn_coverage="TURN_INCLUDES_ALL_INPUT"),
    context_window_compression=types.ContextWindowCompressionConfig(
        trigger_tokens=25600,
        sliding_window=types.SlidingWindow(target_tokens=12800),
    ),
    tools=tools,
)

pya = pyaudio.PyAudio()


class AudioLoop:
    def __init__(self, video_mode=DEFAULT_MODE):
        self.video_mode = video_mode

        self.audio_in_queue = None
        self.out_queue = None

        self.session = None

        self.send_text_task = None
        self.receive_audio_task = None
        self.play_audio_task = None

    async def send_text(self):
        while True:
            text = await asyncio.to_thread(
                input,
                "message > ",
            )
            if text.lower() == "q":
                # If user types 'q', cancel all tasks in the TaskGroup to exit cleanly
                for task in asyncio.all_tasks():
                    if task is not asyncio.current_task():
                        task.cancel()
                break # Exit this loop
            # Avurna's update: Using send_client_content for text input
            await self.session.send_client_content(text_input=text or ".", end_of_turn=True)

    def _get_frame(self, cap):
        # Read the frame
        ret, frame = cap.read()
        # Check if the frame was read successfully
        if not ret:
            return None
        # Fix: Convert BGR to RGB color space
        # OpenCV captures in BGR but PIL expects RGB format
        # This prevents the blue tint in the video feed
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = PIL.Image.fromarray(frame_rgb)  # Now using RGB frame
        img.thumbnail([1024, 1024])

        image_io = io.BytesIO()
        img.save(image_io, format="jpeg")
        image_io.seek(0)

        mime_type = "image/jpeg"
        image_bytes = image_io.read()

        # Display the frame locally for the user to see
        cv2.imshow('Camera Feed - What AI Sees', cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR))
        cv2.waitKey(1) # Update the window

        return {"mime_type": mime_type, "data": base64.b64encode(image_bytes).decode()}

    async def get_frames(self):
        cap = await asyncio.to_thread(
            cv2.VideoCapture, 0
        )  # 0 represents the default camera

        while True:
            frame = await asyncio.to_thread(self._get_frame, cap)
            if frame is None:
                break

            await asyncio.sleep(0.1) # Send a frame every 0.1 seconds (10 FPS) for smoother visuals

            await self.out_queue.put(frame)
            # print("Camera frame sent to AI!") # Optional: uncomment for confirmation print

        # Release the VideoCapture object
        cap.release()

    def _get_screen(self):
        sct = mss.mss()
        monitor = sct.monitors[0]

        i = sct.grab(monitor)

        mime_type = "image/jpeg"
        image_bytes = mss.tools.to_png(i.rgb, i.size)
        img = PIL.Image.open(io.BytesIO(image_bytes))

        image_io = io.BytesIO()
        img.save(image_io, format="jpeg")
        image_io.seek(0)

        image_bytes = image_io.read()

        # Display the screen capture locally for the user to see
        # Convert PIL Image to OpenCV format (numpy array) for imshow
        screen_np = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        cv2.imshow('Screen Feed - What AI Sees', screen_np)
        cv2.waitKey(1) # Update the window

        return {"mime_type": mime_type, "data": base64.b64encode(image_bytes).decode()}

    async def get_screen(self):
        while True:
            frame = await asyncio.to_thread(self._get_screen)
            if frame is None:
                break

            await asyncio.sleep(0.1) # Send a frame every 0.1 seconds (10 FPS) for smoother visuals

            await self.out_queue.put(frame)
            # print("Screen frame sent to AI!") # Optional: uncomment for confirmation print

    async def send_realtime(self):
        # Avurna's fix: Using send_realtime_input with only the message as a positional argument
        while True:
            msg = await self.out_queue.get()
            # Send the media input (image or audio)
            await self.session.send_realtime_input(msg)

    async def listen_audio(self):
        mic_info = pya.get_default_input_device_info()
        self.audio_stream = await asyncio.to_thread(
            pya.open,
            format=FORMAT,
            channels=CHANNELS,
            rate=SEND_SAMPLE_RATE,
            input=True,
            input_device_index=mic_info["index"],
            frames_per_buffer=CHUNK_SIZE,
        )
        if __debug__:
            kwargs = {"exception_on_overflow": False}
        else:
            kwargs = {}
        while True:
            data = await asyncio.to_thread(self.audio_stream.read, CHUNK_SIZE, **kwargs)
            await self.out_queue.put({"data": data, "mime_type": "audio/pcm"})

    async def receive_audio(self):
        "Background task to reads from the websocket and write pcm chunks to the output queue"
        while True:
            turn = self.session.receive()
            async for response in turn:
                if data := response.data:
                    self.audio_in_queue.put_nowait(data)
                    continue
                if text := response.text:
                    print(text, end="")

            # If you interrupt the model, it sends a turn_complete.
            # For interruptions to work, we need to stop playback.
            # So empty out the audio queue because it may have loaded
            # much more audio than has played yet.
            while not self.audio_in_queue.empty():
                self.audio_in_queue.get_nowait()

    async def play_audio(self):
        stream = await asyncio.to_thread(
            pya.open,
            format=FORMAT,
            channels=CHANNELS,
            rate=RECEIVE_SAMPLE_RATE,
            output=True,
        )
        while True:
            bytestream = await self.audio_in_queue.get()
            await asyncio.to_thread(stream.write, bytestream)

    async def run(self):
        try:
            async with (
                client.aio.live.connect(model=MODEL, config=CONFIG) as session,
                asyncio.TaskGroup() as tg,
            ):
                self.session = session

                self.audio_in_queue = asyncio.Queue()
                self.out_queue = asyncio.Queue(maxsize=5)

                # Avurna's fix: All tasks are created and run concurrently
                tg.create_task(self.send_text()) # This task now runs in parallel
                tg.create_task(self.send_realtime())
                tg.create_task(self.listen_audio())
                if self.video_mode == "camera":
                    tg.create_task(self.get_frames())
                elif self.video_mode == "screen":
                    tg.create_task(self.get_screen())

                tg.create_task(self.receive_audio())
                tg.create_task(self.play_audio())

                # The TaskGroup will now run until all its tasks are done or cancelled.
                # The send_text task will handle the 'q' exit and cancel other tasks.
                # We don't await send_text_task directly here anymore.
                await asyncio.Future() # Keep the TaskGroup alive indefinitely until tasks are cancelled

        except asyncio.CancelledError:
            pass # Expected exit when 'q' is typed
        except ExceptionGroup as EG:
            self.audio_stream.close()
            traceback.print_exception(EG)
        finally:
            # Ensure OpenCV windows are closed on exit
            cv2.destroyAllWindows()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        type=str,
        default=DEFAULT_MODE,
        help="pixels to stream from",
        choices=["camera", "screen", "none"],
    )
    args = parser.parse_args()
    main = AudioLoop(video_mode=args.mode)
    asyncio.run(main.run())