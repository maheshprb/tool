// Luxury Media Preview Player & Audio Waveform Engine

class AudioManager {
  constructor(canvasId, audioId, playBtnId, timeId, progressId) {
    this.canvas = document.getElementById(canvasId);
    this.audio = document.getElementById(audioId);
    this.playBtn = document.getElementById(playBtnId);
    this.timeDisplay = document.getElementById(timeId);
    this.progressBar = document.getElementById(progressId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.waveData = [];
    this.isPlaying = false;
    this.animFrame = null;

    if (this.canvas) {
      this.generateWaveData(64);
      this.setupCanvas();
      this.setupListeners();
    }
  }

  generateWaveData(count) {
    this.waveData = [];
    for (let i = 0; i < count; i++) {
      // Natural pleasing audio wave distribution
      const val = 0.2 + 0.7 * Math.abs(Math.sin(i * 0.18) * Math.cos(i * 0.08) + (Math.random() * 0.15));
      this.waveData.push(Math.min(1.0, val));
    }
  }

  setupCanvas() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
    this.draw(0);
  }

  setupListeners() {
    if (!this.audio) return;

    this.audio.addEventListener('timeupdate', () => {
      if (!this.audio.duration) return;
      const progress = this.audio.currentTime / this.audio.duration;
      if (this.progressBar) this.progressBar.value = progress * 100;
      this.updateTimeDisplay();
      this.draw(progress);
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.updatePlayBtn();
      this.draw(0);
    });

    if (this.progressBar) {
      this.progressBar.addEventListener('input', (e) => {
        if (!this.audio.duration) return;
        const seekTime = (e.target.value / 100) * this.audio.duration;
        this.audio.currentTime = seekTime;
        this.draw(e.target.value / 100);
      });
    }

    if (this.canvas) {
      this.canvas.addEventListener('click', (e) => {
        if (!this.audio.duration) return;
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const progress = Math.max(0, Math.min(1, clickX / rect.width));
        this.audio.currentTime = progress * this.audio.duration;
        this.draw(progress);
      });
    }
  }

  loadAudio(url, title = "") {
    if (!this.audio) return;
    this.audio.src = url;
    this.audio.load();
    this.isPlaying = false;
    this.updatePlayBtn();
    this.generateWaveData(64);
    this.draw(0);
  }

  togglePlay() {
    if (!this.audio || !this.audio.src) return;
    if (this.audio.paused) {
      this.audio.play();
      this.isPlaying = true;
    } else {
      this.audio.pause();
      this.isPlaying = false;
    }
    this.updatePlayBtn();
  }

  updatePlayBtn() {
    if (!this.playBtn) return;
    if (this.isPlaying) {
      this.playBtn.innerHTML = `
        <svg class="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="4" width="4" height="16" rx="1"></rect>
          <rect x="14" y="4" width="4" height="16" rx="1"></rect>
        </svg>
      `;
    } else {
      this.playBtn.innerHTML = `
        <svg class="w-6 h-6 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"></path>
        </svg>
      `;
    }
  }

  updateTimeDisplay() {
    if (!this.timeDisplay || !this.audio) return;
    const cur = this.formatTime(this.audio.currentTime);
    const dur = this.formatTime(this.audio.duration || 0);
    this.timeDisplay.textContent = `${cur} / ${dur}`;
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  draw(progress = 0) {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    this.ctx.clearRect(0, 0, width, height);

    const barCount = this.waveData.length;
    const barWidth = 3;
    const gap = (width - (barCount * barWidth)) / (barCount - 1);

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap);
      const barHeight = Math.max(4, this.waveData[i] * (height * 0.75));
      const y = (height - barHeight) / 2;
      const isPlayed = (i / barCount) <= progress;

      this.ctx.fillStyle = isPlayed ? '#E6C687' : 'rgba(255, 255, 255, 0.16)';
      
      // Rounded bar top/bottom
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, barWidth, barHeight, 2);
      this.ctx.fill();
    }
  }
}

// Global UI Toast Function
function showToast(message, type = "info") {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg class="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
  } else {
    iconSvg = '<svg class="w-5 h-5 text-amber-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
  }

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Helper to paste from clipboard effortlessly
async function pasteFromClipboard(targetInputId) {
  try {
    const text = await navigator.clipboard.readText();
    const input = document.getElementById(targetInputId);
    if (input) {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      showToast("Link pasted from clipboard", "success");
    }
  } catch (err) {
    const input = document.getElementById(targetInputId);
    if (input) input.focus();
    showToast("Please tap and hold the input box to paste", "info");
  }
}
