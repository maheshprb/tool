import os
import shutil
import uuid
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .utils import get_local_ip, generate_qr_data_url, cleanup_old_files, sanitize_filename, get_storage_dirs
from .downloader import get_media_info, download_video_stream, extract_audio_stream
from .converter import convert_video_to_audio, convert_audio_to_video

BASE_DIR = Path(__file__).resolve().parent.parent
DOWNLOADS_DIR, PREVIEWS_DIR, UPLOADS_DIR = get_storage_dirs()
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(title="Media Studio", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UrlRequest(BaseModel):
    url: str
    quality: Optional[str] = "best"
    bitrate: Optional[str] = "320"

@app.on_event("startup")
async def startup_event():
    # Cleanup any old media files older than 24 hours on launch
    try:
        cleanup_old_files(DOWNLOADS_DIR, max_age_seconds=86400)
        cleanup_old_files(PREVIEWS_DIR, max_age_seconds=86400)
        cleanup_old_files(UPLOADS_DIR, max_age_seconds=86400)
    except Exception:
        pass

@app.get("/api/status")
async def get_status():
    return {
        "status": "online",
        "name": "Media Studio",
        "ffmpeg": True,
        "ytdlp": True
    }

@app.get("/api/network-info")
async def get_network_info():
    local_ip = get_local_ip()
    port = 8000
    mobile_url = f"http://{local_ip}:{port}"
    qr_data_url = generate_qr_data_url(mobile_url)
    return {
        "local_ip": local_ip,
        "port": port,
        "mobile_url": mobile_url,
        "qr_code": qr_data_url
    }

@app.post("/api/info")
async def inspect_url(req: UrlRequest):
    if not req.url or not req.url.strip():
        raise HTTPException(status_code=400, detail="Please enter a valid link.")
    try:
        info = get_media_info(req.url.strip())
        return {"success": True, "data": info}
    except Exception as e:
        error_msg = str(e)
        if "is not a valid URL" in error_msg:
            detail = "The link provided is not a valid video URL."
        elif "Private video" in error_msg or "login" in error_msg.lower():
            detail = "This video is private or requires an account login to view."
        else:
            detail = f"Could not fetch details: {error_msg.split(';')[0]}"
        raise HTTPException(status_code=400, detail=detail)

@app.post("/api/download-video")
async def download_video(req: UrlRequest, background_tasks: BackgroundTasks):
    if not req.url:
        raise HTTPException(status_code=400, detail="Please provide a valid URL.")
    try:
        result = download_video_stream(req.url.strip(), quality_id=req.quality or "best")
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@app.post("/api/extract-audio")
async def extract_audio_from_url(req: UrlRequest, background_tasks: BackgroundTasks):
    if not req.url:
        raise HTTPException(status_code=400, detail="Please provide a valid URL.")
    try:
        result = extract_audio_stream(req.url.strip(), bitrate=req.bitrate or "320")
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio extraction failed: {str(e)}")

@app.post("/api/convert/video-to-audio")
async def api_video_to_audio(
    file: UploadFile = File(...),
    format: str = Form("mp3"),
    bitrate: str = Form("320k")
):
    temp_upload = None
    try:
        file_ext = Path(file.filename).suffix
        temp_id = str(uuid.uuid4())[:8]
        temp_upload = UPLOADS_DIR / f"upload_{temp_id}{file_ext}"
        
        with open(temp_upload, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        result = convert_video_to_audio(
            input_video_path=str(temp_upload),
            output_format=format.lower(),
            bitrate=bitrate
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        if temp_upload and temp_upload.exists():
            temp_upload.unlink(missing_ok=True)

@app.post("/api/convert/audio-to-video")
async def api_audio_to_video(
    audio_file: UploadFile = File(...),
    custom_image: Optional[UploadFile] = File(None),
    aspect_ratio: str = Form("16:9"),
    theme: str = Form("midnight"),
    title: Optional[str] = Form(""),
    artist: Optional[str] = Form("")
):
    temp_audio = None
    temp_image = None
    try:
        # Save uploaded audio
        audio_ext = Path(audio_file.filename).suffix
        temp_id = str(uuid.uuid4())[:8]
        temp_audio = UPLOADS_DIR / f"audio_{temp_id}{audio_ext}"
        with open(temp_audio, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
            
        # Save optional custom image
        custom_img_path = None
        if custom_image and custom_image.filename:
            img_ext = Path(custom_image.filename).suffix
            temp_image = UPLOADS_DIR / f"art_{temp_id}{img_ext}"
            with open(temp_image, "wb") as buffer:
                shutil.copyfileobj(custom_image.file, buffer)
            custom_img_path = str(temp_image)
            
        result = convert_audio_to_video(
            input_audio_path=str(temp_audio),
            aspect_ratio=aspect_ratio,
            theme_key=theme,
            custom_image_path=custom_img_path,
            track_title=title or Path(audio_file.filename).stem,
            artist_name=artist or "Personal Collection"
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio-to-Video generation failed: {str(e)}")
    finally:
        if temp_audio and temp_audio.exists():
            temp_audio.unlink(missing_ok=True)
        if temp_image and temp_image.exists():
            temp_image.unlink(missing_ok=True)

@app.get("/api/media/{filename}")
async def stream_media(filename: str):
    """Stream media file directly for in-browser video / audio playback preview."""
    file_path = DOWNLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Media file not found.")
    
    media_type = "video/mp4"
    if filename.endswith(".mp3"):
        media_type = "audio/mpeg"
    elif filename.endswith(".m4a") or filename.endswith(".aac"):
        media_type = "audio/mp4"
    elif filename.endswith(".wav"):
        media_type = "audio/wav"
        
    return FileResponse(path=file_path, media_type=media_type)

@app.get("/api/media/download/{filename}")
async def download_media(filename: str):
    """Direct file download attachment with proper user-friendly file name."""
    file_path = DOWNLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File expired or not found.")
        
    # Strip random UUID prefix if present for clean download name
    parts = filename.split("_", 1)
    clean_name = parts[1] if len(parts) > 1 else filename
    
    return FileResponse(
        path=file_path,
        filename=clean_name,
        media_type="application/octet-stream"
    )

@app.get("/api/previews/{filename}")
async def get_preview_image(filename: str):
    file_path = PREVIEWS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Preview image not found.")
    return FileResponse(path=file_path, media_type="image/jpeg")

# Fallback root route to serve index.html directly
@app.get("/")
async def root():
    for candidate in [BASE_DIR / "public" / "index.html", BASE_DIR / "frontend" / "index.html"]:
        if candidate.exists():
            return FileResponse(candidate)
    return {"status": "online", "name": "Media Studio"}

# Mount frontend / public assets safely for both local server and cloud runtimes
static_dir = BASE_DIR / "public" if (BASE_DIR / "public").exists() else BASE_DIR / "frontend"
if static_dir.exists():
    try:
        app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="frontend")
    except Exception as e:
        pass
