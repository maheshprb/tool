import os
import re
import socket
import time
import io
import base64
import qrcode
from pathlib import Path

def get_local_ip() -> str:
    """Get the primary local IPv4 address of the machine."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Does not actually connect externally, just determines routing interface
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def generate_qr_data_url(data: str) -> str:
    """Generate a data URL string for a QR code of the given text."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#11141D", back_color="#FAF8F5")
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"

def sanitize_filename(name: str) -> str:
    """Sanitize filename to prevent illegal characters on Windows/Linux/Mac."""
    clean = re.sub(r'[\\/*?:"<>|]', '', name)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean[:120] if clean else "media_file"

def format_duration(seconds: int | float | None) -> str:
    """Format seconds into HH:MM:SS or MM:SS."""
    if not seconds:
        return "Unknown"
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"

def format_filesize(bytes_val: int | float | None) -> str:
    """Format bytes into KB, MB, GB."""
    if not bytes_val:
        return "Unknown size"
    bytes_val = float(bytes_val)
    if bytes_val >= 1024 * 1024 * 1024:
        return f"{bytes_val / (1024**3):.1f} GB"
    elif bytes_val >= 1024 * 1024:
        return f"{bytes_val / (1024**2):.1f} MB"
    elif bytes_val >= 1024:
        return f"{bytes_val / 1024:.1f} KB"
    return f"{int(bytes_val)} B"

def cleanup_old_files(directory: str | Path, max_age_seconds: int = 86400):
    """Remove files older than max_age_seconds (default 24h)."""
    try:
        now = time.time()
        p = Path(directory)
        if not p.exists():
            return
        for item in p.iterdir():
            if item.is_file():
                try:
                    if now - item.stat().st_mtime > max_age_seconds:
                        item.unlink(missing_ok=True)
                except Exception:
                    pass
    except Exception:
        pass

def get_storage_dirs():
    """Return storage paths, using /tmp in serverless/Vercel environments to prevent read-only errors."""
    base = Path(__file__).resolve().parent.parent
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        storage = Path("/tmp") / "media_storage"
    else:
        storage = base / "media_storage"

    downloads = storage / "downloads"
    previews = storage / "previews"
    uploads = storage / "uploads"

    try:
        downloads.mkdir(parents=True, exist_ok=True)
        previews.mkdir(parents=True, exist_ok=True)
        uploads.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

    return downloads, previews, uploads

def get_ffmpeg_binary() -> str:
    """Return path to ffmpeg executable, preferring system ffmpeg, then imageio-ffmpeg bundled binary."""
    try:
        import shutil
        sys_ffmpeg = shutil.which("ffmpeg")
        if sys_ffmpeg:
            return sys_ffmpeg
    except Exception:
        pass

    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"

def get_media_duration(file_path: str) -> float:
    """Extract media duration in seconds using ffprobe if present, or ffmpeg -i."""
    import subprocess
    import shutil
    ffmpeg_bin = get_ffmpeg_binary()
    ffprobe_bin = shutil.which("ffprobe")
    
    if ffprobe_bin:
        cmd = [
            ffprobe_bin,
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            file_path
        ]
        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            return float(res.stdout.strip())
        except Exception:
            pass

    try:
        res = subprocess.run([ffmpeg_bin, '-i', file_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        m = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", res.stderr)
        if m:
            hours, mins, secs = float(m.group(1)), float(m.group(2)), float(m.group(3))
            return hours * 3600 + mins * 60 + secs
    except Exception:
        pass
    return 0.0
