import os
import sys
import webbrowser
import threading
import time
import uvicorn
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from backend.utils import get_local_ip

def open_browser():
    time.sleep(1.2)
    webbrowser.open("http://localhost:8000")

def main():
    local_ip = get_local_ip()
    port = 8000
    mobile_url = f"http://{local_ip}:{port}"
    
    print("\n" + "=" * 60)
    print("   MEDIA STUDIO — All-in-One Studio & Downloader")
    print("=" * 60)
    print(f"  • Computer Access :  http://localhost:{port}")
    print(f"  • Mobile Phone    :  {mobile_url}")
    print(f"  • Network Status  :  Online (Connected to Wi-Fi)")
    print("=" * 60)
    print("  Tip: On mobile devices, tap 'Use on Phone' to scan QR")
    print("  Press Ctrl+C to shut down.")
    print("=" * 60 + "\n")

    # Open browser on desktop in background
    threading.Thread(target=open_browser, daemon=True).start()

    # Start FastAPI server on all interfaces
    uvicorn.run(
        "backend.app:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )

if __name__ == "__main__":
    main()
