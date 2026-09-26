var audiokey;   // module-level
let mediaRecorder;
let audioChunks = [];
let audioBlob = null;

const startBtn  = document.querySelector('.record-btn');
const stopBtn   = document.querySelector('.stop-btn');
const uploadBtn = document.querySelector('.upload-btn');
const audioPlayback = document.querySelector('.audio-preview');
const statusEl  = document.querySelector('.audio-status');

startBtn.addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.start();

    mediaRecorder.addEventListener('dataavailable', e => audioChunks.push(e.data));

    mediaRecorder.addEventListener('stop', () => {
        audioBlob = new Blob(audioChunks, { type: 'audio/webm' });   // fixed
        audioPlayback.src = URL.createObjectURL(audioBlob);
    });

    console.log('key =', audiokey);
    startBtn.disabled = true;
    stopBtn.disabled  = false;
});

stopBtn.addEventListener('click', () => {
    mediaRecorder.stop();
    startBtn.disabled = true;
    stopBtn.disabled  = false;
});

uploadBtn.addEventListener('click', async () => {
    if (!audioBlob) return;

    uploadBtn.disabled = true;
    // statusEl.textContent = 'Uploading...';

    const formData = new FormData();
    // 'audio' here is the field name your server will read
    console.log('Blob size:', audioBlob.size, 'type:', audioBlob.type);
    formData.append('file', audioBlob);
    formData.append('name', audioBlob.name);
    //formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);

    try {
      console.log('$root =', $root);
      const url = $root + '/upload:' + audiokey;
      console.log('POSTing to:', url);
      const response = await fetch(url, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Upload failed: ' + response.status);
      statusEl.textContent = 'Upload successful';
      } catch (err) {
         statusEl.textContent = 'Upload failed: ' + err.message;
         uploadBtn.disabled = false;
      }
});
