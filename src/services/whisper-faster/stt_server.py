<<<<<<< HEAD
import os
import sys

# Aggressive Windows DLL path fix for PyTorch WinError 126
torch_lib = r"C:\Users\dell\AppData\Local\Programs\Python\Python311\Lib\site-packages\torch\lib"
if os.path.exists(torch_lib):
    os.environ["PATH"] = torch_lib + os.pathsep + os.environ.get("PATH", "")
    if hasattr(os, "add_dll_directory"):
        os.add_dll_directory(torch_lib)

from fastapi import FastAPI, UploadFile, File, HTTPException
from faster_whisper import WhisperModel
import tempfile
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

logger.info("Loading Whisper model...")
model = WhisperModel("base", device="cpu", compute_type="int8")
logger.info("Whisper model loaded successfully.")


@app.get("/health")
async def health():
    return {"status": "ok", "model": "base"}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    tmp_path = None
    try:
        # Write uploaded bytes to a temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            contents = await file.read()
            if not contents:
                raise HTTPException(status_code=400, detail="Empty audio file received")
            tmp.write(contents)
            tmp_path = tmp.name

        logger.info(f"Transcribing file: {tmp_path} ({len(contents)} bytes)")

        segments, info = model.transcribe(tmp_path, language="en")
        text = " ".join([segment.text.strip() for segment in segments])

        logger.info(f"Transcription result: '{text[:80]}...' " if len(text) > 80 else f"Transcription result: '{text}'")
        return {"text": text, "language": info.language, "duration": info.duration}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Always clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
=======
from fastapi import FastAPI, UploadFile, File
from faster_whisper import WhisperModel
import tempfile

app = FastAPI()

model = WhisperModel("base", device="cpu")

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):

    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    segments, info = model.transcribe(tmp_path)

    text = " ".join([segment.text for segment in segments])

    return {"text": text}
>>>>>>> f7d3ecc0f0aed34526767a07aeca7b7791b24abf
