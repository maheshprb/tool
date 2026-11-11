import os
import subprocess
import uuid
from pathlib import Path
from .utils import sanitize_filename, format_duration, format_filesize
from .visualizer import generate_background_card, process_custom_image_to_aspect

DOWNLOADS_DIR = Path(__file__).parent.parent / "media_storage" / "downloads"
PREVIEWS_DIR = Path(__file__).parent.parent / "media_storage" / "previews"
UPLOADS_DIR = Path(__file__).parent.parent / "media_storage" / "uploads"

DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

def get_media_duration(file_path: str) -> float:
    """Use ffprobe to get media duration in seconds."""
    cmd = [
        'ffprobe',
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        file_path
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return float(res.stdout.strip())
    except Exception:
        return 0.0

def convert_video_to_audio(input_video_path: str, output_format: str = "mp3", bitrate: str = "320k") -> dict:
    """Convert any video file to audio (mp3, m4a, wav, aac, flac)."""
    input_path = Path(input_video_path)
    file_id = str(uuid.uuid4())[:8]
    clean_stem = sanitize_filename(input_path.stem)
    output_filename = f"{file_id}_{clean_stem}.{output_format}"
    output_path = DOWNLOADS_DIR / output_filename
    
    # Configure encoder and flags based on format
    cmd = ['ffmpeg', '-y', '-i', str(input_path), '-vn']
    
    if output_format == "mp3":
        cmd.extend(['-c:a', 'libmp3lame', '-b:a', bitrate])
    elif output_format == "m4a" or output_format == "aac":
        cmd.extend(['-c:a', 'aac', '-b:a', bitrate])
    elif output_format == "wav":
        cmd.extend(['-c:a', 'pcm_s16le'])
    elif output_format == "flac":
        cmd.extend(['-c:a', 'flac'])
    else:
        cmd.extend(['-c:a', 'libmp3lame', '-b:a', '192k'])
        
    cmd.append(str(output_path))
    
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    
    duration = get_media_duration(str(output_path))
    filesize = output_path.stat().st_size if output_path.exists() else 0
    
    return {
        'file_id': file_id,
        'filename': output_path.name,
        'title': clean_stem,
        'format': output_format.upper(),
        'duration_seconds': duration,
        'duration_formatted': format_duration(duration),
        'filesize_bytes': filesize,
        'filesize_formatted': format_filesize(filesize),
        'preview_url': f"/api/media/{output_path.name}",
        'download_url': f"/api/media/download/{output_path.name}"
    }

def convert_audio_to_video(
    input_audio_path: str,
    aspect_ratio: str = "16:9",
    theme_key: str = "midnight",
    custom_image_path: str = None,
    track_title: str = "Audio Recording",
    artist_name: str = "Father Collection"
) -> dict:
    """Combine audio with a custom image or luxury aesthetic backdrop into standard MP4."""
    input_audio = Path(input_audio_path)
    file_id = str(uuid.uuid4())[:8]
    clean_stem = sanitize_filename(track_title or input_audio.stem)
    output_filename = f"{file_id}_{clean_stem}.mp4"
    output_path = DOWNLOADS_DIR / output_filename
    
    # 1. Prepare visual backdrop
    if custom_image_path and os.path.exists(custom_image_path):
        backdrop_path = str(PREVIEWS_DIR / f"custom_{file_id}_{aspect_ratio.replace(':', 'x')}.jpg")
        process_custom_image_to_aspect(custom_image_path, aspect_ratio, backdrop_path)
    else:
        backdrop_path = str(PREVIEWS_DIR / f"preset_{file_id}_{aspect_ratio.replace(':', 'x')}.jpg")
        generate_background_card(
            theme_key=theme_key,
            aspect_ratio=aspect_ratio,
            title=track_title or input_audio.stem,
            artist=artist_name,
            output_path=backdrop_path
        )
        
    # 2. Encode to universal MP4 with FFmpeg
    cmd = [
        'ffmpeg', '-y',
        '-loop', '1',
        '-framerate', '2',
        '-i', backdrop_path,
        '-i', str(input_audio),
        '-c:v', 'libx264',
        '-tune', 'stillimage',
        '-preset', 'veryfast',
        '-crf', '22',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-pix_fmt', 'yuv420p',
        '-shortest',
        str(output_path)
    ]
    
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    
    duration = get_media_duration(str(output_path))
    filesize = output_path.stat().st_size if output_path.exists() else 0
    
    return {
        'file_id': file_id,
        'filename': output_path.name,
        'title': clean_stem,
        'aspect_ratio': aspect_ratio,
        'duration_seconds': duration,
        'duration_formatted': format_duration(duration),
        'filesize_bytes': filesize,
        'filesize_formatted': format_filesize(filesize),
        'preview_url': f"/api/media/{output_path.name}",
        'download_url': f"/api/media/download/{output_path.name}",
        'thumbnail_url': f"/api/previews/{Path(backdrop_path).name}"
    }
