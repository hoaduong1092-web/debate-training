# client_test.py
import asyncio
import websockets
import json
import base64

async def test():
    uri = "ws://localhost:8001/ws/debate/test-session"
    try:
        async with websockets.connect(uri) as ws:
            print("✅ Connected to server")

            fake_audio = b'\x00' * 16000
            audio_b64 = base64.b64encode(fake_audio).decode()

            msg = {
                "event_type": "CLIENT_AUDIO_CHUNK",
                "session_id": "test-session",
                "sequence_id": 1,
                "timestamp_ms": 0,
                "payload": {
                    "audio_base64": audio_b64,
                    "is_speaking": True
                }
            }
            await ws.send(json.dumps(msg))
            print("📤 Sent audio chunk")

            for i in range(5):
                resp = await ws.recv()
                data = json.loads(resp)
                print(f"📥 [{i+1}] {data.get('event_type')}: {data.get('payload', {})}")

            ping = {
                "event_type": "CLIENT_PING",
                "session_id": "test-session",
                "sequence_id": 2,
                "timestamp_ms": 1000,
                "payload": {}
            }
            await ws.send(json.dumps(ping))
            print("📤 Sent ping")

            pong = await ws.recv()
            print(f"📥 Pong: {json.loads(pong)}")

            finish = {
                "event_type": "CLIENT_FINISH_SPEECH",
                "session_id": "test-session",
                "sequence_id": 3,
                "timestamp_ms": 2000,
                "payload": {}
            }
            await ws.send(json.dumps(finish))
            print("📤 Sent finish speech")

            final = await ws.recv()
            print(f"📥 Final: {json.loads(final)}")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())