FROM python:3.11-slim

# Install system dependencies including native FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose Render PORT (defaults to 8000)
ENV PORT=8000
EXPOSE 8000

# Start Uvicorn bound to 0.0.0.0 and dynamic $PORT provided by Render
CMD sh -c "uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8000}"
