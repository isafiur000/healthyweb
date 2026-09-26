
var imagekey;
const PHOTO_FORMAT = 'image/png';        // or 'image/jpeg'
const PHOTO_QUALITY = 0.92;               // 0..1, only for image/jpeg

// ---------- 2. DOM ----------
const preview     = document.querySelector('.preview');      // <video>
const snapshot    = document.querySelector('.snapshot');     // <img>
const startBtn    = document.querySelector('.startBtn');
const stopBtn     = document.querySelector('.stopBtn');
const captureBtn  = document.querySelector('.captureBtn');
const downloadBtn = document.querySelector('.downloadBtn');
const uploadBtn   = document.querySelector('.uploadBtn');
const statusEl    = document.querySelector('.status');

// ---------- 3. State ----------
let mediaStream = null;
let photoBlob   = null;   // final JPEG/PNG blob

// ---------- 4. Start camera ----------
startBtn.addEventListener('click', async () => {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
      });

      preview.srcObject = null;
      preview.srcObject = mediaStream;
      preview.muted       = true;
      preview.autoplay    = true;
      preview.playsInline = true;

      await preview.play();

      startBtn.disabled   = true;
      stopBtn.disabled    = false;
      captureBtn.disabled = false;
      setStatus('Camera ready.');
      } catch (err) {
      console.error(err);
      setStatus('❌ Camera error: ' + err.message);
    }
});

// ---------- 5. Stop camera ----------
stopBtn.addEventListener('click', () => {
    stopCamera();
    setStatus('Camera stopped.');
});

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  preview.srcObject = null;

  startBtn.disabled   = false;
  stopBtn.disabled    = true;
  captureBtn.disabled = true;
}

// ---------- 6. Capture photo ----------
captureBtn.addEventListener('click', () => {
    if (!mediaStream) return;

    const w = preview.videoWidth;
    const h = preview.videoHeight;

    if (!w || !h) {
      setStatus('❌ Video not ready yet.');
      return;
    }

    // Draw the current frame onto an offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(preview, 0, 0, w, h);

    // Convert canvas → blob (async)
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setStatus('❌ Failed to create image.');
          return;
        }

        photoBlob = blob;

        // Show snapshot in the <img>
        const url = URL.createObjectURL(blob);
        if (snapshot.dataset.url) URL.revokeObjectURL(snapshot.dataset.url);
        snapshot.src = url;
        snapshot.dataset.url = url;
        snapshot.style.display = 'block';

        downloadBtn.disabled = false;
        uploadBtn.disabled   = false;

        setStatus(` Photo captured (${(blob.size / 1024).toFixed(1)} KB)`);
        },
      PHOTO_FORMAT,
      PHOTO_QUALITY
    );
});

// ---------- 7. Download locally ----------
downloadBtn.addEventListener('click', () => {
  if (!photoBlob) return;

  const ext = PHOTO_FORMAT.includes('png') ? 'png' : 'jpg';
  const url = URL.createObjectURL(photoBlob);
  const a   = document.createElement('a');

  a.href     = url;
  a.download = `photo-${Date.now()}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// ---------- 8. Upload to backend ----------
uploadBtn.addEventListener('click', async () => {
  if (!photoBlob) return;

  const formData = new FormData();
  console.log('Blob size:', photoBlob.size, 'type:', photoBlob.type);
  formData.append('file', photoBlob);
  formData.append('name', photoBlob.name);

  uploadBtn.disabled = true;
  setStatus('⏫ Uploading…');

  try {
     console.log('$root =', $root);
     const url = $root + '/upload:' + imagekey;
     console.log('POSTing to:', url);
     const response = await fetch(url, { method: 'POST', body: formData });
     if (!response.ok) throw new Error('Upload failed: ' + response.status);
     setStatus('✅ Upload successful');
     } catch (err) {
        console.error(err);
        setStatus('❌ Upload failed: ' + err.message);
     } finally {
          uploadBtn.disabled = false;
    }
});

// ---------- 9. Helpers ----------
function setStatus(msg) {
   if (statusEl) statusEl.textContent = msg;
}

// Release the camera when the page unloads
window.addEventListener('beforeunload', () => {
   if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
});
