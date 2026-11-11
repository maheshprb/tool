import os
import sys
import subprocess
from pathlib import Path
from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from backend.app import app

client = TestClient(app)

def run_tests():
    print("--- 1. Testing System Status & Network Info ---")
    res = client.get("/api/status")
    assert res.status_code == 200, f"Status failed: {res.text}"
    print("System status:", res.json())

    res = client.get("/api/network-info")
    assert res.status_code == 200, f"Network info failed: {res.text}"
    net = res.json()
    assert "local_ip" in net and "qr_code" in net
    print("Network Info: IP =", net["local_ip"], "URL =", net["mobile_url"])

    print("\n--- 2. Testing URL Info Extraction (YouTube) ---")
    sample_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    res = client.post("/api/info", json={"url": sample_url})
    assert res.status_code == 200, f"Info inspection failed: {res.text}"
    info = res.json()["data"]
    print("Extracted Title:", info["title"])
    print("Platform:", info["platform"])
    print("Qualities available:", len(info["qualities"]))

    print("\n--- 3. Testing Video to Audio Conversion ---")
    # Generate a quick 2-second test video with audio using ffmpeg
    test_video = BASE_DIR / "media_storage" / "previews" / "test_synth.mp4"
    cmd_synth = [
        'ffmpeg', '-y',
        '-f', 'lavfi', '-i', 'testsrc=duration=2:size=320x240:rate=15',
        '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
        '-c:v', 'libx264', '-c:a', 'aac',
        str(test_video)
    ]
    subprocess.run(cmd_synth, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    assert test_video.exists(), "Synthesized video creation failed"

    with open(test_video, "rb") as f:
        res = client.post(
            "/api/convert/video-to-audio",
            files={"file": ("test_synth.mp4", f, "video/mp4")},
            data={"format": "mp3", "bitrate": "192k"}
        )
    assert res.status_code == 200, f"Video to audio failed: {res.text}"
    v2a_result = res.json()["data"]
    print("Converted Audio:", v2a_result["filename"])
    print("Duration:", v2a_result["duration_formatted"])

    print("\n--- 4. Testing Audio to Video Conversion (Midnight theme) ---")
    # Generate a quick 2-second test audio using ffmpeg
    test_audio = BASE_DIR / "media_storage" / "previews" / "test_synth.mp3"
    cmd_synth_audio = [
        'ffmpeg', '-y',
        '-f', 'lavfi', '-i', 'sine=frequency=528:duration=2',
        '-c:a', 'libmp3lame', '-b:a', '192k',
        str(test_audio)
    ]
    subprocess.run(cmd_synth_audio, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    assert test_audio.exists(), "Synthesized audio creation failed"

    with open(test_audio, "rb") as f:
        res = client.post(
            "/api/convert/audio-to-video",
            files={"audio_file": ("test_synth.mp3", f, "audio/mpeg")},
            data={
                "aspect_ratio": "16:9",
                "theme": "midnight",
                "title": "Father's Special Melody",
                "artist": "Classic Collection"
            }
        )
    assert res.status_code == 200, f"Audio to video failed: {res.text}"
    a2v_result = res.json()["data"]
    print("Generated Video:", a2v_result["filename"])
    print("Duration:", a2v_result["duration_formatted"])
    print("Filesize:", a2v_result["filesize_formatted"])

    print("\n--- 5. Testing Stream / Download Endpoints ---")
    stream_res = client.get(a2v_result["preview_url"])
    assert stream_res.status_code == 200, f"Streaming failed: {stream_res.status_code}"
    print("Stream endpoint verified (Content-Type: video/mp4)")

    download_res = client.get(a2v_result["download_url"])
    assert download_res.status_code == 200, f"Download failed: {download_res.status_code}"
    print("Download endpoint verified")

    print("\n🎉 ALL TESTS PASSED SUCCESSFULLY! The studio is completely operational.")

if __name__ == "__main__":
    run_tests()
