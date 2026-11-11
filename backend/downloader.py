import os
import uuid
import yt_dlp
from pathlib import Path
from .utils import sanitize_filename, format_duration, format_filesize, get_storage_dirs, get_ffmpeg_binary

DOWNLOADS_DIR, PREVIEWS_DIR, _ = get_storage_dirs()

def detect_platform(url: str) -> str:
    url_lower = url.lower()
    if "youtube.com" in url_lower or "youtu.be" in url_lower:
        return "youtube"
    elif "instagram.com" in url_lower:
        return "instagram"
    elif "facebook.com" in url_lower or "fb.watch" in url_lower or "fb.com" in url_lower:
        return "facebook"
    elif "tiktok.com" in url_lower:
        return "tiktok"
    elif "twitter.com" in url_lower or "x.com" in url_lower:
        return "twitter"
    return "universal"

def get_media_info(url: str) -> dict:
    """Extract metadata, available qualities, and thumbnail from URL."""
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'extract_flat': False,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        
    # Handle playlist/multi-video result
    if 'entries' in info and info['entries']:
        info = info['entries'][0]

    title = info.get('title') or "Untitled Media"
    uploader = info.get('uploader') or info.get('channel') or info.get('creator') or "Unknown Creator"
    duration = info.get('duration')
    thumbnail = info.get('thumbnail')
    platform = detect_platform(url)

    # Analyze available video formats
    formats_list = []
    seen_heights = set()
    raw_formats = info.get('formats') or []
    
    # Check for direct video stream URL for immediate in-browser preview
    direct_preview_url = None
    # For instagram/facebook or direct mp4 streams, find a progressive mp4 with both audio & video
    for f in reversed(raw_formats):
        if f.get('vcodec') != 'none' and f.get('acodec') != 'none' and f.get('url'):
            if f.get('ext') == 'mp4':
                direct_preview_url = f.get('url')
                break

    # Categorize resolutions
    available_qualities = []
    # Always provide 'best'
    available_qualities.append({
        'id': 'best',
        'label': 'Best Available Quality (Full HD/4K)',
        'height': 'best',
        'ext': 'mp4'
    })

    for f in raw_formats:
        h = f.get('height')
        if h and h >= 360 and h not in seen_heights and f.get('vcodec') != 'none':
            seen_heights.add(h)
            label = f"{h}p HD" if h >= 720 else f"{h}p"
            if h >= 1080:
                label = f"{h}p Full HD"
            available_qualities.append({
                'id': f"height_{h}",
                'height': h,
                'label': label,
                'ext': 'mp4'
            })

    # Sort available qualities descending by height
    available_qualities[1:] = sorted(
        available_qualities[1:], 
        key=lambda x: x['height'], 
        reverse=True
    )

    return {
        'title': title,
        'uploader': uploader,
        'duration_seconds': duration,
        'duration_formatted': format_duration(duration),
        'thumbnail': thumbnail,
        'platform': platform,
        'webpage_url': info.get('webpage_url', url),
        'qualities': available_qualities,
        'direct_preview_url': direct_preview_url,
    }

def download_video_stream(url: str, quality_id: str = "best") -> dict:
    """Download video with audio merged, return file path and metadata."""
    file_id = str(uuid.uuid4())[:8]
    output_template = str(DOWNLOADS_DIR / f"{file_id}_%(title).100s.%(ext)s")
    
    # Configure format selection (prioritize pre-merged progressive mp4 for fast cloud download)
    if quality_id == "best" or not quality_id.startswith("height_"):
        format_selector = "best[ext=mp4]/bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best"
    else:
        try:
            target_height = int(quality_id.replace("height_", ""))
            format_selector = (
                f"best[height<={target_height}][ext=mp4]/"
                f"bestvideo[height<={target_height}][ext=mp4]+bestaudio[ext=m4a]/"
                f"bestvideo[height<={target_height}]+bestaudio/"
                f"best"
            )
        except ValueError:
            format_selector = "best[ext=mp4]/best"

    ydl_opts = {
        'format': format_selector,
        'outtmpl': output_template,
        'merge_output_format': 'mp4',
        'ffmpeg_location': get_ffmpeg_binary(),
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
        'socket_timeout': 20,
        'retries': 3,
        'postprocessors': [{
            'key': 'FFmpegVideoConvertor',
            'preferedformat': 'mp4',
        }],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
        # Ensure mp4 extension
        if not filename.endswith(".mp4"):
            mp4_candidate = os.path.splitext(filename)[0] + ".mp4"
            if os.path.exists(mp4_candidate):
                filename = mp4_candidate

    target_path = Path(filename)
    if not target_path.exists():
        # Fallback search in downloads dir for this file_id
        matches = list(DOWNLOADS_DIR.glob(f"{file_id}_*.mp4"))
        if matches:
            target_path = matches[0]

    title = info.get('title', 'video')
    filesize = target_path.stat().st_size if target_path.exists() else 0

    return {
        'file_id': file_id,
        'filename': target_path.name,
        'full_path': str(target_path),
        'title': title,
        'filesize_bytes': filesize,
        'filesize_formatted': format_filesize(filesize),
        'preview_url': f"/api/media/{target_path.name}",
        'download_url': f"/api/media/download/{target_path.name}"
    }

def extract_audio_stream(url: str, bitrate: str = "320") -> dict:
    """Extract audio track from any URL and convert to high-fidelity MP3."""
    file_id = str(uuid.uuid4())[:8]
    output_template = str(DOWNLOADS_DIR / f"{file_id}_%(title).100s.%(ext)s")
    
    ydl_opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio/best',
        'outtmpl': output_template,
        'ffmpeg_location': get_ffmpeg_binary(),
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
        'socket_timeout': 20,
        'retries': 3,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': bitrate,
        }],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        raw_name = ydl.prepare_filename(info)
        base = os.path.splitext(raw_name)[0]
        mp3_name = f"{base}.mp3"

    target_path = Path(mp3_name)
    if not target_path.exists():
        matches = list(DOWNLOADS_DIR.glob(f"{file_id}_*.mp3"))
        if matches:
            target_path = matches[0]

    title = info.get('title', 'audio')
    filesize = target_path.stat().st_size if target_path.exists() else 0

    return {
        'file_id': file_id,
        'filename': target_path.name,
        'full_path': str(target_path),
        'title': title,
        'filesize_bytes': filesize,
        'filesize_formatted': format_filesize(filesize),
        'preview_url': f"/api/media/{target_path.name}",
        'download_url': f"/api/media/download/{target_path.name}"
    }
