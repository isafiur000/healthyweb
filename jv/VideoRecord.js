
var videokey;
let mediaStream   = null;
let mediaRecorder = null;
let chunks        = [];       // raw data chunks during recording
let blob          = null;     // final combined blob

// ---------- 2. DOM ----------
const preview     = document.querySelector('.preview');      // <video>
const playback    = document.querySelector('.playback');     // <video>
const startBtn    = document.querySelector('.startBtn');     // <button>
const recordBtn   = document.querySelector('.recordBtn');    // <button>
const downloadBtn = document.querySelector('.downloadBtn');  // <button>
const uploadBtn   = document.querySelector('.uploadBtn');    // <button>
const statusEl    = document.querySelector('.statusBar');       // <div>

// ---------- 4. Pick a supported mime type ----------
function pickMimeType() {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4'
  ];
  return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

// ---------- 5. Start camera ----------
startBtn.addEventListener('click', async () => {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true
      });
      preview.srcObject = mediaStream;
      recordBtn.disabled = false;
      startBtn.disabled  = true;
      setStatus('Camera ready.');
      } catch (err) {
      setStatus('❌ Camera error: ' + err.message);
    }
});

// ---------- 6. Toggle recording ----------
recordBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      stopRecording();
      } else {
      startRecording();
    }
});

function startRecording() {
  if (!mediaStream) return;

  chunks = [];
  blob   = null;
  playback.style.display = 'none';
  playback.src = '';
  downloadBtn.disabled = true;
  uploadBtn.disabled   = true;

  const mimeType = pickMimeType();
  const options  = mimeType ? { mimeType } : {};

  try {
    mediaRecorder = new MediaRecorder(mediaStream, options);
    } catch (e) {
    setStatus('❌ MediaRecorder error: ' + e.message);
    return;
  }

  // Collect chunks during recording
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  // Fired when we call .stop()
  // Inside startRecording(), replace onstop with:
  mediaRecorder.onstop = () => {
    const actualType = mediaRecorder.mimeType || 'video/webm';
    blob = new Blob(chunks, { type: actualType });

    playback.src = URL.createObjectURL(blob);
    playback.style.display = 'block';
    playback.load();

    downloadBtn.disabled = false;
    uploadBtn.disabled   = false;

    recordBtn.textContent = 'Start Recording';
    recordBtn.classList.remove('stop');

    stopCamera();   // <── closes camera

    setStatus(`✅ Recording done (${(blob.size / 1024).toFixed(1)} KB)`);
  };

  mediaRecorder.start(1000);          // emit a chunk every second
  recordBtn.textContent = 'Stop Recording';
  recordBtn.classList.add('stop');
  setStatus('🔴 Recording…');
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  preview.srcObject = null;
  startBtn.disabled  = false;
  recordBtn.disabled = true;
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

// ---------- 7. Download locally ----------
downloadBtn.addEventListener('click', () => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `recording-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// ---------- 8. Upload to backend ----------
uploadBtn.addEventListener('click', async () => {
    if (!blob) return;

    const formData = new FormData();
    console.log('Blob size:', blob.size, 'type:', blob.type);
    formData.append('file', blob);
    formData.append('name', blob.name);

    uploadBtn.disabled = true;
    setStatus('⏫ Uploading…');

    try {
      console.log('$root =', $root);
      const url = $root + '/upload:' + videokey;
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

// Release camera when leaving the page
window.addEventListener('beforeunload', () => {
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
});