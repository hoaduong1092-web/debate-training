"""
VoiceStudio Local Microservice Server
Port: 8000
Compatible with VoiceStudio / OpenAI Audio API / Faster-Whisper DSP.
"""

import os
import io
import re
import tempfile
import asyncio
from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import edge_tts
from faster_whisper import WhisperModel

app = FastAPI(title="VoiceStudio Local Microservice", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_VI_VOICE = "vi-VN-HoaiMyNeural"  # Natural female Vietnamese voice
DEFAULT_VI_MALE_VOICE = "vi-VN-NamMinhNeural"  # Natural male Vietnamese voice
DEFAULT_EN_VOICE = "en-US-JennyNeural"

# ─── Global Faster-Whisper Model (Loaded ONCE on startup in CPU INT8) ──────────
model: Optional[WhisperModel] = None
try:
    print("[VoiceStudio] Initializing faster-whisper model (base, cpu, int8)...")
    model = WhisperModel("base", device="cpu", compute_type="int8")
    print("[VoiceStudio] Faster-whisper model initialized successfully!")
except Exception as e:
    print(f"[VoiceStudio] Warning: faster-whisper initialization failed ({e}). Will use fallback.")

# Alias for backward compatibility
stt_model = model

class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = "default_vi"
    voice: Optional[str] = None
    lang: Optional[str] = "vi"
    language: Optional[str] = None
    speed: Optional[float] = 1.0

class OpenAITTSRequest(BaseModel):
    model: Optional[str] = "tts-1"
    input: str
    voice: Optional[str] = "alloy"
    response_format: Optional[str] = "mp3"
    speed: Optional[float] = 1.0

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "VoiceStudio",
        "version": "1.0.0",
        "engine": "Neural-Local-Studio",
        "stt_engine": "faster-whisper-int8-cpu" if model else "offline",
        "voices": ["vi-VN-HoaiMyNeural", "vi-VN-NamMinhNeural", "en-US-JennyNeural"],
    }

speech_cache = {}

async def generate_speech_buffer(text: str, voice_name: str, speed: float = 1.0) -> bytes:
    clean_t = re.sub(r'[*#_`]', '', text)
    clean_t = re.sub(r'\s+', ' ', clean_t).strip()

    cache_key = f"{voice_name}_{speed}_{clean_t}"
    if cache_key in speech_cache:
        return speech_cache[cache_key]

    rate_str = f"+{int((speed - 1.0) * 100)}%" if speed >= 1.0 else f"-{int((1.0 - speed) * 100)}%"
    communicate = edge_tts.Communicate(clean_t, voice_name, rate=rate_str)
    audio_data = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.extend(chunk["data"])
    result = bytes(audio_data)

    if len(speech_cache) > 200:
        speech_cache.pop(next(iter(speech_cache)))
    speech_cache[cache_key] = result

    return result

def pick_voice(voice_id: Optional[str], lang: Optional[str]) -> str:
    v = (voice_id or "").lower()
    l = (lang or "vi").lower()
    if "nam" in v or "male" in v or "tung" in v:
        return DEFAULT_VI_MALE_VOICE
    if l.startswith("en"):
        return DEFAULT_EN_VOICE
    return DEFAULT_VI_VOICE

@app.post("/api/v1/tts")
@app.post("/tts")
@app.post("/synthesize")
async def tts_endpoint(req: TTSRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text provided")
    
    voice_choice = req.voice or req.voice_id
    lang_choice = req.language or req.lang or "vi"
    target_voice = pick_voice(voice_choice, lang_choice)

    try:
        audio_bytes = await generate_speech_buffer(text, target_voice, req.speed or 1.0)
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Type": "audio/mpeg",
                "Cache-Control": "public, max-age=86400",
                "X-VoiceStudio-Engine": "Neural-Local-Studio",
                "X-VoiceStudio-Voice": target_voice,
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis error: {str(e)}")

@app.post("/v1/audio/speech")
async def openai_tts_endpoint(req: OpenAITTSRequest):
    text = (req.input or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty input provided")
    
    target_voice = DEFAULT_VI_VOICE
    try:
        audio_bytes = await generate_speech_buffer(text, target_voice, req.speed or 1.0)
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Content-Type": "audio/mpeg"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI TTS error: {str(e)}")

@app.post("/api/v1/voice/analyze")
@app.post("/analyze")
async def analyze_voice(
    duration_ms: Optional[float] = Form(3000.0),
    language: Optional[str] = Form("vi"),
    audio: Optional[UploadFile] = File(None),
):
    dur_sec = max(1.0, (duration_ms or 3000.0) / 1000.0)
    
    if model is None or audio is None:
        return {
            "success": False,
            "error": "Faster-whisper STT model offline or empty audio provided",
            "duration_ms": duration_ms,
        }

    tmp_path = None
    try:
        # Save upload buffer to temporary webm/wav file for faster-whisper CTranslate2 reader
        suffix = ".webm"
        if audio.filename and "." in audio.filename:
            suffix = os.path.splitext(audio.filename)[1]
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            content = await audio.read()
            tmp.write(content)

        target_lang = "en" if (language and language.lower().startswith("en")) else "vi"
        
        # Fast CPU INT8 Inference (beam_size=5)
        segments, info = model.transcribe(tmp_path, beam_size=5, language=target_lang)
        transcript = " ".join([segment.text for segment in segments]).strip()

        words = [w for w in transcript.split() if w]
        word_count = len(words)
        wpm = int((word_count / (dur_sec / 60.0))) if dur_sec > 0 else 140

        return {
            "success": True,
            "transcript": transcript,
            "wpm": wpm,
            "word_count": word_count,
            "filler_count": 0,
            "pause_count": 1,
            "duration_ms": duration_ms,
            "stt_source": "voicestudio",
        }
    except Exception as e:
        print(f"[VoiceStudio] STT transcribe error: {e}")
        return {
            "success": False,
            "error": f"Transcription error: {str(e)}",
            "duration_ms": duration_ms,
        }
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

if __name__ == "__main__":
    import uvicorn
    print("[VoiceStudio] Starting VoiceStudio Local Microservice on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
