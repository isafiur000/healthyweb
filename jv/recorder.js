let mediaRecorder;
let audioChunks = [];
let audioBlob = null; // <-- keep the blob around for uploading

const startBtn = document.querySelector('.record-btn');
const stopBtn = document.querySelector('.stop-btn');
const uploadBtn = document.querySelector('.upload-btn');
const audioPlayback = document.querySelector('.audio-preview');
const statusEl = document.querySelector('.audio-status');

startBtn.addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.start();
    audioChunks = [];

    mediaRecorder.addEventListener('dataavailable', event => {
        audioChunks.push(event.data);
    });

    mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayback.src = audioUrl;
    });

    startBtn.disabled = true;
    stopBtn.disabled = false;
});

stopBtn.addEventListener('click', () => {
    mediaRecorder.stop();
    startBtn.disabled = false;
    stopBtn.disabled = true;
});

uploadBtn.addEventListener('click', async () => {
  if (!audioBlob) return;

  uploadBtn.disabled = true;
  statusEl.textContent = 'Uploading...';

  const formData = new FormData();
  // 'audio' here is the field name your server will read
  console.log('Blob size:', audioBlob.size, 'type:', audioBlob.type);
  formData.append('file', audioBlob);
  formData.append('name', audioBlob.name);
  //formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);

  try {
    console.log('$root =', $root);
    const url = $root + '/upload:' + key;
    console.log('POSTing to:', url);
    const response = await fetch(url, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Upload failed: ' + response.status);

    const result = await response.json();
    statusEl.textContent = 'Upload successful: ' + JSON.stringify(result);
  } catch (err) {
    statusEl.textContent = 'Upload failed: ' + err.message;
    uploadBtn.disabled = false; // let user retry
  }
});

