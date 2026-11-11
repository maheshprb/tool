// Media Studio Controller

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Audio Managers for preview players
  window.audioExtractorPlayer = new AudioManager(
    'extractor-waveform',
    'extractor-audio-elem',
    'extractor-play-btn',
    'extractor-time-display',
    'extractor-seek-bar'
  );

  window.videoToAudioPlayer = new AudioManager(
    'v2a-waveform',
    'v2a-audio-elem',
    'v2a-play-btn',
    'v2a-time-display',
    'v2a-seek-bar'
  );

  initTabNavigation();
  initPlatformDetectors();
  initNetworkQrModal();
  initDownloaderFlow();
  initExtractorFlow();
  initVideoToAudioFlow();
  initAudioToVideoFlow();
});

// Tab Navigation Logic - Strict Tool Isolation & Mobile Ready
function initTabNavigation() {
  const tabButtons = document.querySelectorAll('[data-tab-target]');
  const tabContents = document.querySelectorAll('.tab-content');

  function switchTab(tabId) {
    // 1. Pause any playing media immediately across all tools
    document.querySelectorAll('audio, video').forEach(el => {
      try {
        if (!el.paused) el.pause();
      } catch (e) {}
    });

    // 2. Hide all tools, show ONLY the selected tool
    tabContents.forEach(el => {
      if (el.id === tabId) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // 3. Update tab buttons (top header options and bottom-first mobile nav)
    tabButtons.forEach(btn => {
      const isTarget = btn.getAttribute('data-tab-target') === tabId;
      if (btn.classList.contains('mobile-nav-item')) {
        const iconBox = btn.querySelector('.nav-icon-box');
        const label = btn.querySelector('span');
        if (isTarget) {
          btn.classList.add('active');
          btn.classList.remove('text-[#74766d]');
          btn.classList.add('text-[#292b25]');
          if (iconBox) {
            iconBox.classList.add('bg-[#292b25]', 'text-[#fffefa]', 'shadow-sm');
            iconBox.classList.remove('bg-transparent', 'text-[#74766d]');
          }
          if (label) {
            label.classList.add('font-semibold');
            label.classList.remove('font-medium');
          }
          btn.setAttribute('aria-selected', 'true');
        } else {
          btn.classList.remove('active');
          btn.classList.remove('text-[#292b25]');
          btn.classList.add('text-[#74766d]');
          if (iconBox) {
            iconBox.classList.remove('bg-[#292b25]', 'text-[#fffefa]', 'shadow-sm');
            iconBox.classList.add('bg-transparent', 'text-[#74766d]');
          }
          if (label) {
            label.classList.remove('font-semibold');
            label.classList.add('font-medium');
          }
          btn.setAttribute('aria-selected', 'false');
        }
      } else {
        if (isTarget) {
          btn.classList.add('active', 'is-active');
          btn.setAttribute('aria-selected', 'true');
        } else {
          btn.classList.remove('active', 'is-active');
          btn.setAttribute('aria-selected', 'false');
        }
      }
    });

    // 4. Re-draw waveform canvases if active tab has one
    setTimeout(() => {
      if (tabId === 'tab-extractor' && window.audioExtractorPlayer) {
        window.audioExtractorPlayer.setupCanvas();
      } else if (tabId === 'tab-v2a' && window.videoToAudioPlayer) {
        window.videoToAudioPlayer.setupCanvas();
      }
    }, 100);

    // 5. Scroll smoothly to top of workspace so mobile user starts at input
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab-target')));
  });

  // Responsive redraw on window orientation change / resize
  window.addEventListener('resize', () => {
    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return;
    if (activeTab.id === 'tab-extractor' && window.audioExtractorPlayer) {
      window.audioExtractorPlayer.setupCanvas();
    } else if (activeTab.id === 'tab-v2a' && window.videoToAudioPlayer) {
      window.videoToAudioPlayer.setupCanvas();
    }
  });
}

// Platform Detection helper
function detectPlatformFromUrl(url) {
  const u = (url || "").trim().toLowerCase();
  if (!u) return 'none';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('facebook.com') || u.includes('fb.watch') || u.includes('fb.com')) return 'facebook';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.startsWith('http://') || u.startsWith('https://')) return 'universal';
  return 'none';
}

function initPlatformDetectors() {
  const setupDetector = (inputId, cardId, indicatorId, clearBtnId, defaultHtml) => {
    const input = document.getElementById(inputId);
    const card = document.getElementById(cardId);
    const indicator = document.getElementById(indicatorId);
    const clearBtn = document.getElementById(clearBtnId);
    if (!input || !indicator) return;

    const updateDisplay = () => {
      const val = input.value.trim();
      const platform = detectPlatformFromUrl(val);

      // Manage Clear button visibility
      if (clearBtn) {
        if (val.length > 0) {
          clearBtn.classList.remove('hidden');
        } else {
          clearBtn.classList.add('hidden');
        }
      }

      // Reset glows on card
      if (card) {
        card.classList.remove(
          'platform-glow-youtube',
          'platform-glow-instagram',
          'platform-glow-facebook',
          'platform-glow-universal'
        );
      }

      if (platform === 'youtube') {
        indicator.innerHTML = `
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#eef0e7] border border-[#dfe2d3] text-[#596148] text-xs font-semibold">
            YouTube Link Detected
          </span>
        `;
        if (card) card.classList.add('platform-glow-youtube');
      } else if (platform === 'instagram') {
        indicator.innerHTML = `
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#eef0e7] border border-[#dfe2d3] text-[#596148] text-xs font-semibold">
            Instagram Link Detected
          </span>
        `;
        if (card) card.classList.add('platform-glow-instagram');
      } else if (platform === 'facebook') {
        indicator.innerHTML = `
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#eef0e7] border border-[#dfe2d3] text-[#596148] text-xs font-semibold">
            Facebook Link Detected
          </span>
        `;
        if (card) card.classList.add('platform-glow-facebook');
      } else if (platform === 'universal') {
        indicator.innerHTML = `
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#eef0e7] border border-[#dfe2d3] text-[#596148] text-xs font-semibold">
            Video Link Detected
          </span>
        `;
        if (card) card.classList.add('platform-glow-universal');
      } else {
        indicator.innerHTML = defaultHtml;
      }
    };

    input.addEventListener('input', updateDisplay);

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        updateDisplay();
        input.focus();
      });
    }
  };

  const defaultDlHtml = `
    <span class="text-slate-400 text-[11px] uppercase tracking-wider font-mono">Supported:</span>
    <span class="text-slate-500 text-xs">YouTube, Instagram, Facebook & web video</span>
  `;

  const defaultExtHtml = `
    <span class="text-slate-400 text-[11px] uppercase tracking-wider font-mono">Audio Extraction:</span>
    <span class="text-slate-500 text-xs">Converts link directly to MP3 stream</span>
  `;

  setupDetector('dl-url-input', 'dl-input-card', 'dl-platform-indicator', 'dl-clear-btn', defaultDlHtml);
  setupDetector('ext-url-input', 'ext-input-card', 'ext-platform-indicator', 'ext-clear-btn', defaultExtHtml);
}

// 1. VIDEO DOWNLOADER FLOW
function initDownloaderFlow() {
  const input = document.getElementById('dl-url-input');
  const inspectBtn = document.getElementById('dl-inspect-btn');
  const previewCard = document.getElementById('dl-preview-card');
  const downloadBtn = document.getElementById('dl-download-btn');
  const qualitySelect = document.getElementById('dl-quality-select');
  const loadingIndicator = document.getElementById('dl-loading');

  let currentInfo = null;

  async function triggerInspect() {
    const url = input.value.trim();
    if (!url) {
      showToast("Please enter or paste a video link first", "warning");
      return;
    }

    inspectBtn.disabled = true;
    loadingIndicator.classList.remove('hidden');
    previewCard.classList.add('hidden');

    try {
      const resp = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.detail || "Failed to inspect video details.");
      }

      currentInfo = data.data;
      displayVideoInfo(currentInfo);
      showToast("Video found! You can preview & download now", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      inspectBtn.disabled = false;
      loadingIndicator.classList.add('hidden');
    }
  }

  inspectBtn.addEventListener('click', triggerInspect);

  // Allow pressing Enter key in input
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerInspect();
    }
  });

  function displayVideoInfo(info) {
    document.getElementById('dl-preview-title').textContent = info.title;
    document.getElementById('dl-preview-author').textContent = info.uploader;
    document.getElementById('dl-preview-duration').textContent = info.duration_formatted;
    const thumbImg = document.getElementById('dl-preview-thumb');
    if (info.thumbnail) {
      thumbImg.src = info.thumbnail;
      thumbImg.style.display = 'block';
    } else {
      thumbImg.src = '';
      thumbImg.style.display = 'none';
    }

    // Populate qualities
    qualitySelect.innerHTML = '';
    info.qualities.forEach(q => {
      const opt = document.createElement('option');
      opt.value = q.id;
      opt.textContent = q.label;
      qualitySelect.appendChild(opt);
    });

    // Check if direct preview stream is playable
    const videoElem = document.getElementById('dl-preview-video');
    const thumbElem = document.getElementById('dl-thumb-container');
    const playDirectBtn = document.getElementById('dl-play-direct-btn');

    if (info.direct_preview_url) {
      videoElem.src = info.direct_preview_url;
      playDirectBtn.classList.remove('hidden');
      playDirectBtn.onclick = () => {
        thumbElem.classList.add('hidden');
        videoElem.classList.remove('hidden');
        videoElem.play();
      };
    } else {
      playDirectBtn.classList.add('hidden');
      videoElem.classList.add('hidden');
      thumbElem.classList.remove('hidden');
    }

    previewCard.classList.remove('hidden');
    previewCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function resetDownloader() {
    input.value = '';
    currentInfo = null;
    inspectBtn.disabled = false;
    loadingIndicator.classList.add('hidden');
    previewCard.classList.add('hidden');

    const videoElem = document.getElementById('dl-preview-video');
    const thumbElem = document.getElementById('dl-thumb-container');
    const playDirectBtn = document.getElementById('dl-play-direct-btn');
    const clearBtn = document.getElementById('dl-clear-btn');
    const platformIndicator = document.getElementById('dl-platform-indicator');

    if (videoElem) {
      videoElem.pause();
      videoElem.src = '';
      videoElem.classList.add('hidden');
    }
    if (thumbElem) thumbElem.classList.remove('hidden');
    if (playDirectBtn) playDirectBtn.classList.add('hidden');
    if (clearBtn) clearBtn.classList.add('hidden');
    if (platformIndicator) {
      platformIndicator.innerHTML = `
        <span class="text-slate-400 text-[11px] uppercase tracking-wider font-mono">Paste Link:</span>
        <span class="text-slate-500 text-xs">YouTube, Instagram, Facebook & web video</span>
      `;
    }
    const card = document.getElementById('dl-input-card');
    if (card) {
      card.classList.remove('platform-glow-youtube', 'platform-glow-instagram', 'platform-glow-facebook', 'platform-glow-universal');
    }
    input.focus();
    showToast("Downloader reset. Ready for a new link.", "info");
  }

  document.getElementById('dl-reset-btn')?.addEventListener('click', resetDownloader);
  document.getElementById('dl-preview-reset-btn')?.addEventListener('click', resetDownloader);
  document.getElementById('dl-preview-cancel-btn')?.addEventListener('click', resetDownloader);

  downloadBtn.addEventListener('click', async () => {
    if (!currentInfo) return;
    const url = input.value.trim();
    const quality = qualitySelect.value;

    downloadBtn.disabled = true;
    downloadBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2.5 h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Downloading & Merging MP4...
    `;

    try {
      const resp = await fetch('/api/download-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, quality })
      });
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.detail || "Download failed.");
      }

      const media = data.data;
      showToast("Download complete! Playing preview...", "success");

      // Load full downloaded MP4 into in-app player for immediate preview!
      const videoElem = document.getElementById('dl-preview-video');
      const thumbElem = document.getElementById('dl-thumb-container');
      const playDirectBtn = document.getElementById('dl-play-direct-btn');

      thumbElem.classList.add('hidden');
      playDirectBtn.classList.add('hidden');
      videoElem.classList.remove('hidden');
      videoElem.src = media.preview_url;
      videoElem.controls = true;
      videoElem.play();

      // Trigger automatic file download
      triggerBrowserDownload(media.download_url, media.filename);

      // Offer Share button if supported on mobile
      if (navigator.share) {
        setupShareAction(media.download_url, media.title);
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
        </svg>
        Download MP4 Video
      `;
    }
  });
}

// 2. AUDIO EXTRACTOR FLOW (Link -> MP3)
function initExtractorFlow() {
  const input = document.getElementById('ext-url-input');
  const extractBtn = document.getElementById('ext-extract-btn');
  const previewSection = document.getElementById('ext-preview-section');
  const saveBtn = document.getElementById('ext-save-btn');
  const loadingIndicator = document.getElementById('ext-loading');

  let currentMedia = null;

  async function triggerExtract() {
    const url = input.value.trim();
    if (!url) {
      showToast("Please enter or paste a link first", "warning");
      return;
    }

    // Read selected bitrate radio
    let selectedBitrate = "192";
    const bitrateRadios = document.querySelectorAll('input[name="ext-bitrate"]');
    bitrateRadios.forEach(r => { if (r.checked) selectedBitrate = r.value; });

    extractBtn.disabled = true;
    loadingIndicator.classList.remove('hidden');
    previewSection.classList.add('hidden');

    try {
      const resp = await fetch('/api/extract-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          bitrate: selectedBitrate
        })
      });
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.detail || "Extraction failed.");
      }

      currentMedia = data.data;
      document.getElementById('ext-preview-title').textContent = currentMedia.title;
      document.getElementById('ext-preview-filesize').textContent = currentMedia.filesize_formatted;

      // Load into waveform player!
      window.audioExtractorPlayer.loadAudio(currentMedia.preview_url, currentMedia.title);
      previewSection.classList.remove('hidden');
      previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      showToast("Audio extracted! Listen to preview below.", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      extractBtn.disabled = false;
      loadingIndicator.classList.add('hidden');
    }
  }

  extractBtn.addEventListener('click', triggerExtract);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerExtract();
    }
  });

  document.getElementById('extractor-play-btn').addEventListener('click', () => {
    window.audioExtractorPlayer.togglePlay();
  });

  function resetExtractor() {
    input.value = '';
    currentMedia = null;
    extractBtn.disabled = false;
    loadingIndicator.classList.add('hidden');
    previewSection.classList.add('hidden');

    const audioElem = document.getElementById('extractor-audio-elem');
    const clearBtn = document.getElementById('ext-clear-btn');
    const platformIndicator = document.getElementById('ext-platform-indicator');

    if (audioElem) {
      audioElem.pause();
      audioElem.src = '';
    }
    if (window.audioExtractorPlayer) {
      window.audioExtractorPlayer.isPlaying = false;
      window.audioExtractorPlayer.updatePlayBtn();
      window.audioExtractorPlayer.draw(0);
      const timeDisplay = document.getElementById('extractor-time-display');
      if (timeDisplay) timeDisplay.textContent = '0:00 / 0:00';
      const seekBar = document.getElementById('extractor-seek-bar');
      if (seekBar) seekBar.value = 0;
    }
    if (clearBtn) clearBtn.classList.add('hidden');
    if (platformIndicator) {
      platformIndicator.innerHTML = `
        <span class="text-slate-400 text-[11px] uppercase tracking-wider font-mono">Audio Extraction:</span>
        <span class="text-slate-500 text-xs">Converts link directly to MP3 stream</span>
      `;
    }
    const card = document.getElementById('ext-input-card');
    if (card) {
      card.classList.remove('platform-glow-youtube', 'platform-glow-instagram', 'platform-glow-facebook', 'platform-glow-universal');
    }
    const defaultRadio = document.querySelector('input[name="ext-bitrate"][value="320"]');
    if (defaultRadio) defaultRadio.checked = true;

    input.focus();
    showToast("Extractor reset. Ready for a new link.", "info");
  }

  document.getElementById('ext-reset-btn')?.addEventListener('click', resetExtractor);
  document.getElementById('ext-preview-reset-btn')?.addEventListener('click', resetExtractor);
  document.getElementById('ext-preview-cancel-btn')?.addEventListener('click', resetExtractor);

  saveBtn.addEventListener('click', () => {
    if (!currentMedia) return;
    triggerBrowserDownload(currentMedia.download_url, currentMedia.filename);
    showToast("Saving MP3 to device...", "success");
  });
}

// ==========================================
// CLIENT-SIDE AUDIO ENCODER & PROCESSOR (Zero-Upload for Vercel)
// ==========================================
function audioBufferToMp3Blob(audioBuffer, bitrateKbps = 192) {
  if (typeof lamejs === 'undefined') {
    return audioBufferToWavBlob(audioBuffer);
  }

  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const mp3encoder = new lamejs.Mp3Encoder(numChannels > 1 ? 2 : 1, sampleRate, bitrateKbps);
  const mp3Data = [];

  const left = audioBuffer.getChannelData(0);
  const leftInt16 = new Int16Array(left.length);
  for (let i = 0; i < left.length; i++) {
    const s = Math.max(-1, Math.min(1, left[i]));
    leftInt16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  let rightInt16 = null;
  if (numChannels > 1) {
    const right = audioBuffer.getChannelData(1);
    rightInt16 = new Int16Array(right.length);
    for (let i = 0; i < right.length; i++) {
      const s = Math.max(-1, Math.min(1, right[i]));
      rightInt16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
  }

  const chunkSize = 1152;
  for (let i = 0; i < leftInt16.length; i += chunkSize) {
    const leftChunk = leftInt16.subarray(i, i + chunkSize);
    let mp3buf;
    if (numChannels > 1) {
      const rightChunk = rightInt16.subarray(i, i + chunkSize);
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    } else {
      mp3buf = mp3encoder.encodeBuffer(leftChunk);
    }
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  const endBuf = mp3encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(endBuf);
  }

  return new Blob(mp3Data, { type: 'audio/mp3' });
}

function audioBufferToWavBlob(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const length = audioBuffer.length * blockAlign;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);

  function writeString(offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);

  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  return new Blob([view], { type: 'audio/wav' });
}

async function extractAudioClientSide(file, format = 'mp3', bitrateKbps = 192) {
  const arrayBuf = await file.arrayBuffer();
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtxClass) {
    throw new Error("Web Audio API not supported in this browser.");
  }
  const audioCtx = new AudioCtxClass();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
  
  if (format === 'wav') {
    return audioBufferToWavBlob(audioBuffer);
  }
  return audioBufferToMp3Blob(audioBuffer, bitrateKbps);
}

async function resizeImageClientSide(file, maxWidth = 1280, maxHeight = 1280, quality = 0.85) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// 3. VIDEO TO AUDIO CONVERTER FLOW (Upload File -> Audio)
function initVideoToAudioFlow() {
  const fileInput = document.getElementById('v2a-file-input');
  const dropZone = document.getElementById('v2a-dropzone');
  const fileInfo = document.getElementById('v2a-file-info');
  const fileNameDisplay = document.getElementById('v2a-filename');
  const fileSizeDisplay = document.getElementById('v2a-filesize');
  const convertBtn = document.getElementById('v2a-convert-btn');
  const formatSelect = document.getElementById('v2a-format-select');
  const bitrateSelect = document.getElementById('v2a-bitrate-select');
  const previewSection = document.getElementById('v2a-preview-section');
  const saveBtn = document.getElementById('v2a-save-btn');
  const loadingIndicator = document.getElementById('v2a-loading');

  let selectedFile = null;
  let currentResult = null;

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-amber-400');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-amber-400');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-amber-400');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  function handleFileSelected(file) {
    selectedFile = file;
    fileNameDisplay.textContent = file.name;
    fileSizeDisplay.textContent = formatBytes(file.size);
    fileInfo.classList.remove('hidden');
    convertBtn.disabled = false;
    showToast(`Video selected: ${file.name}`, "info");
  }

  convertBtn.addEventListener('click', async () => {
    if (!selectedFile) {
      showToast("Please choose a video file first", "warning");
      return;
    }

    const format = formatSelect.value;
    const bitrateStr = bitrateSelect.value;
    const bitrateNum = parseInt(bitrateStr) || 320;

    convertBtn.disabled = true;
    loadingIndicator.classList.remove('hidden');
    previewSection.classList.add('hidden');

    const loadingText = loadingIndicator.querySelector('span');
    if (loadingText) loadingText.textContent = "Extracting audio directly on your device...";

    // 1. In-browser audio decoding (Zero-upload, bypasses Vercel 4.5MB limit)
    let convertedLocally = false;
    try {
      const audioBlob = await extractAudioClientSide(selectedFile, format, bitrateNum);
      const cleanStem = selectedFile.name.replace(/\.[^/.]+$/, "");
      const outputFilename = `${cleanStem}.${format}`;
      const blobUrl = URL.createObjectURL(audioBlob);

      currentResult = {
        title: cleanStem,
        format: format.toUpperCase(),
        filename: outputFilename,
        filesize_formatted: formatBytes(audioBlob.size),
        preview_url: blobUrl,
        download_url: blobUrl,
        is_blob: true
      };

      document.getElementById('v2a-preview-title').textContent = currentResult.title;
      document.getElementById('v2a-preview-format').textContent = `${currentResult.format} • ${currentResult.filesize_formatted}`;

      window.videoToAudioPlayer.loadAudio(currentResult.preview_url, currentResult.title);
      previewSection.classList.remove('hidden');
      previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      showToast("Audio extracted! Ready to play & save.", "success");
      convertedLocally = true;
    } catch (clientErr) {
      console.warn("Client-side audio decode failed, falling back to server:", clientErr);
    }

    // 2. Server fallback if client decode couldn't parse the codec
    if (!convertedLocally) {
      if (selectedFile.size > 4.5 * 1024 * 1024) {
        showToast("Browser could not decode this video format, and file exceeds cloud upload limit (>4.5MB). Please use an MP4 or WebM video.", "error");
        convertBtn.disabled = false;
        loadingIndicator.classList.add('hidden');
        return;
      }

      try {
        if (loadingText) loadingText.textContent = "Processing via server engine...";
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('format', format);
        formData.append('bitrate', bitrateStr);

        const resp = await fetch('/api/convert/video-to-audio', {
          method: 'POST',
          body: formData
        });
        const data = await resp.json();

        if (!resp.ok) {
          throw new Error(data.detail || "Video to audio conversion failed.");
        }

        currentResult = data.data;
        document.getElementById('v2a-preview-title').textContent = currentResult.title;
        document.getElementById('v2a-preview-format').textContent = `${currentResult.format} • ${currentResult.filesize_formatted}`;

        window.videoToAudioPlayer.loadAudio(currentResult.preview_url, currentResult.title);
        previewSection.classList.remove('hidden');
        previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        showToast("Audio converted! Ready to play & save.", "success");
      } catch (err) {
        showToast(err.message, "error");
      }
    }

    convertBtn.disabled = false;
    loadingIndicator.classList.add('hidden');
  });

  document.getElementById('v2a-play-btn').addEventListener('click', () => {
    window.videoToAudioPlayer.togglePlay();
  });

  function resetVideoToAudio() {
    selectedFile = null;
    currentResult = null;
    fileInput.value = '';
    fileInfo.classList.add('hidden');
    convertBtn.disabled = true;
    loadingIndicator.classList.add('hidden');
    previewSection.classList.add('hidden');

    const audioElem = document.getElementById('v2a-audio-elem');
    if (audioElem) {
      audioElem.pause();
      audioElem.src = '';
    }
    if (window.videoToAudioPlayer) {
      window.videoToAudioPlayer.isPlaying = false;
      window.videoToAudioPlayer.updatePlayBtn();
      window.videoToAudioPlayer.draw(0);
      const timeDisplay = document.getElementById('v2a-time-display');
      if (timeDisplay) timeDisplay.textContent = '0:00 / 0:00';
      const seekBar = document.getElementById('v2a-seek-bar');
      if (seekBar) seekBar.value = 0;
    }
    if (formatSelect) formatSelect.value = 'mp3';
    if (bitrateSelect) bitrateSelect.value = '320k';
    showToast("Video converter reset. Select a video file.", "info");
  }

  document.getElementById('v2a-reset-btn')?.addEventListener('click', resetVideoToAudio);
  document.getElementById('v2a-preview-reset-btn')?.addEventListener('click', resetVideoToAudio);
  document.getElementById('v2a-preview-cancel-btn')?.addEventListener('click', resetVideoToAudio);

  saveBtn.addEventListener('click', () => {
    if (!currentResult) return;
    triggerBrowserDownload(currentResult.download_url, currentResult.filename);
    showToast("Saving audio file to your device...", "success");
  });
}

// 4. AUDIO TO VIDEO CONVERTER FLOW
function initAudioToVideoFlow() {
  const audioInput = document.getElementById('a2v-audio-input');
  const artInput = document.getElementById('a2v-art-input');
  const audioFileInfo = document.getElementById('a2v-audio-info');
  const customArtInfo = document.getElementById('a2v-art-info');
  const generateBtn = document.getElementById('a2v-generate-btn');
  const aspectRadios = document.querySelectorAll('input[name="a2v-aspect"]');
  const themeRadios = document.querySelectorAll('input[name="a2v-theme"]');
  const previewSection = document.getElementById('a2v-preview-section');
  const previewVideo = document.getElementById('a2v-preview-video');
  const saveBtn = document.getElementById('a2v-save-btn');
  const loadingIndicator = document.getElementById('a2v-loading');

  let selectedAudio = null;
  let selectedArt = null;
  let currentVideoResult = null;

  audioInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      selectedAudio = e.target.files[0];
      document.getElementById('a2v-audio-name').textContent = selectedAudio.name;
      audioFileInfo.classList.remove('hidden');
      generateBtn.disabled = false;
      showToast("Audio track uploaded", "info");
    }
  });

  artInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      selectedArt = e.target.files[0];
      document.getElementById('a2v-art-name').textContent = selectedArt.name;
      customArtInfo.classList.remove('hidden');
      showToast("Custom cover photo attached", "info");
    }
  });

  generateBtn.addEventListener('click', async () => {
    if (!selectedAudio) {
      showToast("Please select an audio file first", "warning");
      return;
    }

    let selectedAspect = "16:9";
    aspectRadios.forEach(r => { if (r.checked) selectedAspect = r.value; });

    let selectedTheme = "midnight";
    themeRadios.forEach(r => { if (r.checked) selectedTheme = r.value; });

    generateBtn.disabled = true;
    loadingIndicator.classList.remove('hidden');
    previewSection.classList.add('hidden');

    const loadingText = loadingIndicator.querySelector('span');
    if (loadingText) loadingText.textContent = "Preparing audio and theme backdrop...";

    try {
      let audioToSend = selectedAudio;
      // If audio file is large (> 3.8 MB), pre-compress on-device so it easily fits within Vercel's 4.5MB limit
      if (selectedAudio.size > 3.8 * 1024 * 1024) {
        if (loadingText) loadingText.textContent = "Optimizing audio track for fast upload...";
        try {
          const compressedBlob = await extractAudioClientSide(selectedAudio, 'mp3', 192);
          const cleanStem = selectedAudio.name.replace(/\.[^/.]+$/, "");
          audioToSend = new File([compressedBlob], `${cleanStem}.mp3`, { type: 'audio/mp3' });
        } catch (compErr) {
          console.warn("Client pre-compression skipped, trying raw upload:", compErr);
        }
      }

      let artToSend = selectedArt;
      // If custom image is large (> 1.5 MB), resize down to 1280px on-device
      if (selectedArt && selectedArt.size > 1.5 * 1024 * 1024) {
        try {
          const resizedBlob = await resizeImageClientSide(selectedArt, 1280, 1280, 0.85);
          artToSend = new File([resizedBlob], "cover.jpg", { type: 'image/jpeg' });
        } catch (imgErr) {
          console.warn("Client image resize skipped:", imgErr);
        }
      }

      if (loadingText) loadingText.textContent = "Rendering video with luxury theme backdrop...";

      const formData = new FormData();
      formData.append('audio_file', audioToSend);
      if (artToSend) {
        formData.append('custom_image', artToSend);
      }
      formData.append('aspect_ratio', selectedAspect);
      formData.append('theme', selectedTheme);
      formData.append('title', selectedAudio.name.replace(/\.[^/.]+$/, ""));
      formData.append('artist', "Personal Collection");

      const resp = await fetch('/api/convert/audio-to-video', {
        method: 'POST',
        body: formData
      });
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.detail || "Video generation failed.");
      }

      currentVideoResult = data.data;
      document.getElementById('a2v-preview-title').textContent = currentVideoResult.title;
      document.getElementById('a2v-preview-details').textContent = `${currentVideoResult.aspect_ratio} • ${currentVideoResult.duration_formatted} • ${currentVideoResult.filesize_formatted}`;

      previewVideo.src = currentVideoResult.preview_url;
      previewVideo.controls = true;
      previewSection.classList.remove('hidden');
      previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      previewVideo.play();

      showToast("Video created! You can watch it right now.", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      generateBtn.disabled = false;
      loadingIndicator.classList.add('hidden');
    }
  });

  function resetAudioToVideo() {
    selectedAudio = null;
    selectedArt = null;
    currentVideoResult = null;
    audioInput.value = '';
    artInput.value = '';
    audioFileInfo.classList.add('hidden');
    customArtInfo.classList.add('hidden');
    generateBtn.disabled = true;
    loadingIndicator.classList.add('hidden');
    previewSection.classList.add('hidden');

    if (previewVideo) {
      previewVideo.pause();
      previewVideo.src = '';
    }
    const defaultAspect = document.querySelector('input[name="a2v-aspect"][value="16:9"]');
    if (defaultAspect) defaultAspect.checked = true;
    const defaultTheme = document.querySelector('input[name="a2v-theme"][value="midnight"]');
    if (defaultTheme) defaultTheme.checked = true;

    showToast("Video creator reset. Select an audio file.", "info");
  }

  document.getElementById('a2v-reset-btn')?.addEventListener('click', resetAudioToVideo);
  document.getElementById('a2v-preview-reset-btn')?.addEventListener('click', resetAudioToVideo);
  document.getElementById('a2v-preview-cancel-btn')?.addEventListener('click', resetAudioToVideo);

  saveBtn.addEventListener('click', () => {
    if (!currentVideoResult) return;
    triggerBrowserDownload(currentVideoResult.download_url, currentVideoResult.filename);
    showToast("Downloading your video...", "success");
  });
}

// Phone Connect & QR Modal
async function initNetworkQrModal() {
  const openBtn = document.getElementById('open-qr-modal-btn');
  const closeBtn = document.getElementById('close-qr-modal-btn');
  const modal = document.getElementById('qr-modal');
  const qrImage = document.getElementById('qr-image');
  const qrUrlText = document.getElementById('qr-url-text');
  const copyUrlBtn = document.getElementById('qr-copy-url-btn');

  if (!openBtn || !modal) return;

  openBtn.addEventListener('click', async () => {
    try {
      const resp = await fetch('/api/network-info');
      const data = await resp.json();
      qrImage.src = data.qr_code;
      qrUrlText.textContent = data.mobile_url;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    } catch (e) {
      showToast("Could not load local network information", "error");
    }
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  });

  copyUrlBtn.addEventListener('click', () => {
    const text = qrUrlText.textContent;
    navigator.clipboard.writeText(text);
    showToast("Address copied! Open in your phone browser", "success");
  });
}

// Helpers
function triggerBrowserDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function setupShareAction(url, title) {
  try {
    navigator.share({
      title: title || 'Media Download',
      url: window.location.origin + url
    }).catch(() => {});
  } catch (e) {}
}

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
