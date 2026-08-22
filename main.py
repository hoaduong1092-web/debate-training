# main.py
import json
import base64
import os
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import tempfile
import openai

# ========== CẤU HÌNH ==========
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # nếu có key thì dùng thật, không thì giả lập
USE_REAL_STT = bool(OPENAI_API_KEY)

app = FastAPI(title="AI Debate Coach - PoC")

# ========== ĐỊNH NGHĨA EVENT ENVELOPE ==========
class ClientEvent(BaseModel):
    event_type: str
    session_id: str
    sequence_id: int
    timestamp_ms: int
    payload: dict

# ========== HÀM XỬ LÝ AUDIO ==========
async def transcribe_audio(audio_bytes: bytes) -> str:
    if USE_REAL_STT:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            with open(tmp_path, "rb") as f:
                transcript = openai.Audio.transcribe(
                    model="whisper-1",
                    file=f,
                    response_format="text"
                )
            return transcript.strip()
        finally:
            os.unlink(tmp_path)
    else:
        await asyncio.sleep(0.5)
        return "Đây là bài nói giả lập của người dùng. Tôi nghĩ rằng chúng ta nên cân nhắc lại vấn đề này."

def generate_ai_response(user_transcript: str) -> str:
    return f"Tôi hiểu quan điểm của bạn: '{user_transcript[:50]}...'. Nhưng tôi có một số phản biện: ..."

# ========== WEBSOCKET ENDPOINT ==========
@app.websocket("/ws/debate/{session_id}")
async def debate_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    print(f"Client connected to session: {session_id}")
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                event = ClientEvent(**data)
            except Exception as e:
                await websocket.send_text(json.dumps({
                    "event_type": "SERVER_ERROR",
                    "session_id": session_id,
                    "timestamp_ms": 0,
                    "payload": {"error": f"Invalid message: {str(e)}"}
                }))
                continue

            if event.event_type == "CLIENT_AUDIO_CHUNK":
                audio_b64 = event.payload.get("audio_base64", "")
                if not audio_b64:
                    await websocket.send_text(json.dumps({
                        "event_type": "SERVER_ERROR",
                        "session_id": session_id,
                        "timestamp_ms": event.timestamp_ms,
                        "payload": {"error": "Missing audio_base64"}
                    }))
                    continue

                try:
                    audio_bytes = base64.b64decode(audio_b64)
                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "event_type": "SERVER_ERROR",
                        "session_id": session_id,
                        "timestamp_ms": event.timestamp_ms,
                        "payload": {"error": f"Invalid base64: {str(e)}"}
                    }))
                    continue

                transcript = await transcribe_audio(audio_bytes)

                await websocket.send_text(json.dumps({
                    "event_type": "SERVER_TRANSCRIPT_DELTA",
                    "session_id": session_id,
                    "timestamp_ms": event.timestamp_ms + 100,
                    "payload": {
                        "transcript_id": "mock-transcript-001",
                        "delta_text": transcript,
                        "is_final": True
                    }
                }))

                ai_response = generate_ai_response(transcript)
                await websocket.send_text(json.dumps({
                    "event_type": "SERVER_AI_ANALYSIS",
                    "session_id": session_id,
                    "timestamp_ms": event.timestamp_ms + 500,
                    "payload": {
                        "coach_type": "LOGIC",
                        "severity": "INFO",
                        "analysis": ai_response,
                        "score": 7.5
                    }
                }))

                await websocket.send_text(json.dumps({
                    "event_type": "SERVER_VOICE_FEEDBACK",
                    "session_id": session_id,
                    "timestamp_ms": event.timestamp_ms + 200,
                    "payload": {
                        "wpm": 145,
                        "wpm_status": "OPTIMAL",
                        "warning_signal": None
                    }
                }))

            elif event.event_type == "CLIENT_PING":
                await websocket.send_text(json.dumps({
                    "event_type": "SERVER_PONG",
                    "session_id": session_id,
                    "timestamp_ms": event.timestamp_ms,
                    "payload": {}
                }))

            elif event.event_type == "CLIENT_FINISH_SPEECH":
                await websocket.send_text(json.dumps({
                    "event_type": "SERVER_INFO",
                    "session_id": session_id,
                    "timestamp_ms": event.timestamp_ms,
                    "payload": {"message": "Speech finished"}
                }))

            else:
                await websocket.send_text(json.dumps({
                    "event_type": "SERVER_ERROR",
                    "session_id": session_id,
                    "timestamp_ms": event.timestamp_ms,
                    "payload": {"error": f"Unsupported event: {event.event_type}"}
                }))

    except WebSocketDisconnect:
        print(f"Client disconnected: {session_id}")
    except Exception as e:
        print(f"Unexpected error: {e}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass

# ========== RUN ==========
if __name__ == "__main__":
    import uvicorn
    port = 8001  # hardcode để test nếu env không hoạt động
    # hoặc dùng: port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)