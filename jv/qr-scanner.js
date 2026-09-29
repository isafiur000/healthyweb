
(function () {
    'use strict';

    // ---------- DOM refs ----------
    const video = document.querySelector('.qr-video');
    const statusText = document.querySelector('.status-text');
    const qrResult = document.querySelector('.qr-result');
    const startBtn = document.querySelector('.startBtn');
    const stopBtn = document.querySelector('.stopBtn');
    const copyBtn = document.querySelector('.copyBtn');
    const clearBtn = document.querySelector('.clearBtn');

    // ---------- State ----------
    let stream = null;
    let animationFrameId = null;
    let isScanning = false;
    let lastScannedTime = 0;
    let barcodeDetector = null;

    const hasBarcodeDetector = ('BarcodeDetector' in window);

    // ---------- Helpers ----------
    function setStatus(message, isActive) {
      statusText.innerHTML = message;
    }

    function updateButtons() {
      startBtn.disabled = isScanning;
      stopBtn.disabled = !isScanning;
    }

    /**
    * Sets the QR result using innerHTML (as requested).
    * Dispatches a custom 'qr-scanned' event with the decoded value.
    */
    function emitResult(value) {
      // ✅ Set value using innerHTML
      qrResult.innerHTML = value;

      const event = new CustomEvent('qr-scanned', { detail: { value } });
      document.dispatchEvent(event);
    }

    function getResultValue() {
      // Read back what was set via innerHTML
      return qrResult.innerHTML;
    }

    // ---------- Stop scanner (camera + loop) ----------
    function stopScanner() {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
      if (video.srcObject) {
        video.srcObject = null;
      }
      isScanning = false;
      setStatus('Stopped', false);
      updateButtons();
    }

    // ---------- Start scanner ----------
    async function startScanner() {
      // Ensure previous session is fully stopped
      stopScanner();

      // Reset cooldown so the first code can be scanned immediately
      lastScannedTime = 0;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
        });

        video.srcObject = stream;
        await video.play();

        isScanning = true;
        updateButtons();

        // ---- Set up BarcodeDetector if supported ----
        if (hasBarcodeDetector) {
          try {
            barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
            setStatus('Scanning… (BarcodeDetector)', true);
            } catch (e) {
            console.warn('BarcodeDetector init failed:', e);
            barcodeDetector = null;
            setStatus('Scanning… (jsQR fallback)', true);
          }
          } else {
          setStatus('Scanning… (jsQR)', true);
        }

        // Start detection loop
        scanLoop();

        } catch (err) {
        console.error('Camera error:', err);
        let msg = 'Camera access denied or unavailable';
        if (err.name === 'NotAllowedError') msg = 'Permission denied — allow camera access';
        if (err.name === 'NotFoundError') msg = 'No camera found';
        setStatus(msg, false);
        isScanning = false;
        updateButtons();
        stopScanner();
      }
    }

    // ---------- Detection loop ----------
    async function scanLoop() {
      if (!isScanning) return;

      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameId = requestAnimationFrame(scanLoop);
        return;
      }

      const now = Date.now();
      let decodedText = null;

      // ---- 1. Native BarcodeDetector ----
      if (hasBarcodeDetector && barcodeDetector) {
        try {
          const barcodes = await barcodeDetector.detect(video);
          if (barcodes.length > 0) {
            decodedText = barcodes[0].rawValue;
          }
          } catch (e) {
          // Ignore frame errors
        }
      }

      // ---- 2. jsQR fallback ----
      if (!decodedText && typeof jsQR === 'function') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
          });
          if (code && code.data) {
            decodedText = code.data;
          }
        }
      }

      // ---- Process result ----
      if (decodedText) {
        emitResult(decodedText);

        if (navigator.vibrate) navigator.vibrate(100);
        // 🔴 Auto-stop the scanner on a valid QR code
        stopScanner('✅ QR code scanned — camera stopped', 'success');
        return; // exit loop (no new animation frame scheduled)
      }

      if (isScanning) {
        setStatus('🔍 Scanning for QR code…', 'active');
        animationFrameId = requestAnimationFrame(scanLoop);
      }
    }

    // ---------- Copy / Clear ----------
    async function copyResult() {
      const text = getResultValue();
      if (!text || text === '—' || text.trim() === '') {
        setStatus('Nothing to copy', false);
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        setStatus('📋 Copied to clipboard', true);
        setTimeout(() => {
            if (isScanning) setStatus('🔍 Scanning for QR code…', true);
        }, 1200);
        } catch (err) {
        console.warn('Copy failed:', err);
        setStatus('Copy failed', false);
      }
    }

    function clearResult() {
      qrResult.textContent = '—';
      setStatus('Result cleared', true);
      setTimeout(() => {
          if (isScanning) setStatus('🔍 Scanning for QR code…', true);
      }, 600);
    }

    // ---------- jsQR library loader (only if needed) ----------
    function loadJsQRLibrary() {
      return new Promise((resolve) => {
          if (typeof jsQR === 'function') {
            resolve(true);
            return;
          }
          const script = document.createElement('script');
          script.src = 'js/jsQR.min.js';
          script.async = true;
          script.onload = () => {
            console.log('✅ jsQR loaded');
            resolve(true);
          };
          script.onerror = () => {
            console.warn('⚠️ Failed to load jsQR');
            resolve(false);
          };
          document.head.appendChild(script);
      });
    }

    // ---------- Event listeners ----------
    startBtn.addEventListener('click', startScanner);
    stopBtn.addEventListener('click', stopScanner);
    copyBtn.addEventListener('click', copyResult);
    clearBtn.addEventListener('click', clearResult);

    window.addEventListener('beforeunload', stopScanner);

    // ---------- Init: preload jsQR but don't start camera yet ----------
    (async function init() {
        await loadJsQRLibrary();
        setStatus('Ready — click Start Scanner', false);
        updateButtons();
    })();

    // Expose a public API (optional)
    window.QRScanner = {
      start: startScanner,
      stop: stopScanner,
      getResult: () => getResultValue(),
    };
})();