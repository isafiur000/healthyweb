var $AutoTextComoleteList = [];
var drawPad;
var qrvalue;

/* //Audio Record
var chunkList = [];
let mediaRecorder;
let audioChunks = [];
let recordingTimer;
let isRecording = false;
let chunkIndex = 0; */

function openFullscreen() {
  var elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
    elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
    elem.msRequestFullscreen();
  }
}

function closeFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { /* Safari */
    document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE11 */
    document.msExitFullscreen();
  }
}

function changeScreenMode() {
  if( $( "body" ).hasClass( "dark" )) {
    $( "body" ).removeClass( "dark" );
    } else {
    $( "body" ).addClass( "dark" );
  }
}

function richtextformat(command, value) {
  document.execCommand(command, false, value);
}

function numcheck(e, value) {
  var unicode = e.charCode ? e.charCode : e.keyCode;
  if (value.indexOf(".") != -1)
    if (unicode == 46) return false;
  if (unicode != 8)
    if ((unicode < 48 || unicode > 57) && unicode != 46) return false;
}

function setCookie(name,value,days) {
  var expires = "";
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + (days*24*60*60*1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

// Conversion
function ExportToExcel(TableID,type, fn, dl) {
  var elt = document.getElementById(TableID);
  var wb = XLSX.utils.table_to_book(elt, { sheet: "sheet1" });
  return dl ?
  XLSX.write(wb, { bookType: type, bookSST: true, type: 'base64' }):
  XLSX.writeFile(wb, fn || ('MySheetName.' + (type || 'xlsx')));
}

function html2pdfdocs(xoutput, xpapsize, xorient, xtopmargin, xleftmargin, xbottommargin, xrightmargin) {
  // Get the element.
  var element = document.getElementById('printable@report');

  // Generate the PDF.
  html2pdf().from(element).set({
      margin: [xtopmargin, xleftmargin, xbottommargin, xrightmargin],
      filename: xoutput,
      html2canvas: { scale: 1 },
      jsPDF: {orientation: xorient, unit: 'mm', format: xpapsize, compressPDF: false}
  }).save();
}

// autocomplete for textarea
function textautocomplete(id, idx) {

  var tributeAttributes = {
    autocompleteMode: true,
    noMatchTemplate: "",
    values: $AutoTextComoleteList,

    menuItemTemplate: function(item) {
      return item.string;
    }
  };

  var tributeAutocompleteTestArea = new Tribute(
    Object.assign(
      {
        menuContainer: document.getElementById( idx )
      },
      tributeAttributes
    )
  );
  tributeAutocompleteTestArea.attach(
    document.getElementById( id )
  );
}

// autocomplete for contenteditable div
function htmlautocomplete(id, idx) {

  var tributeAttributes = {
    autocompleteMode: true,
    noMatchTemplate: "",
    values: $AutoTextComoleteList,
    selectTemplate: function(item) {
      if (typeof item === "undefined") return null;
      if (this.range.isContentEditable(this.current.element)) {
        return (
          '<span contenteditable="false"><a>' +
          item.original.key +
          "</a></span>"
        );
      }

      return item.original.value;
    },
    menuItemTemplate: function(item) {
      return item.string;
    }
  };
  var tributeAutocompleteTest = new Tribute(
    Object.assign(
      {
        menuContainer: document.getElementById( idx )
      },
      tributeAttributes
    )
  );
  tributeAutocompleteTest.attach(
    document.getElementById(id)
  );

}

//Download canvas chart
function canvasDownload (target, type) {
  let canvas = document.getElementById(target);
  let anchor = document.createElement("a");
  anchor.download = "download." + type;
  anchor.href = canvas.toDataURL("image/" + type);
  anchor.click();
  anchor.remove();
}

//upload blob
async function sendBlobData(key, blob) {
  const form = new FormData();

  console.log('Blob size:', blob.size, 'type:', blob.type);
  form.append('file', blob);
  form.append('name', blob.name);

  console.log('$root =', $root);
  const url = $root + '/upload:' + key;
  console.log('POSTing to:', url);
  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed: ' + res.status);
  return key;
}

//skecthpad drawing
function clearSketchPad() {
  drawPad.clear();
}

function downloadSketchPadAsImage() {
  var adata = drawPad.canvas.toDataURL("image/png");
  download(adata, "PenDrawing.png", "image/png");
}

function uploadSketchPadAsImage(key) {
  return new Promise((resolve, reject) => {
      drawPad.canvas.toBlob(blob => {
          if (!blob) return reject(new Error('Blob creation failed'));
          sendBlobData(key, blob).then(resolve, reject);
      }, 'image/png');
  });
}

async function handleUpload(key) {
  const key1 = await uploadSketchPadAsImage(key);
  console.log(key1);   // ← now it's the real key string,
  return key1;
  // use key here
}

//QR Scan
function domReady(fn) {
  if (
      document.readyState === "complete" ||
    document.readyState === "interactive"
    ) {
    setTimeout(fn, 1000);
    } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

domReady(function () {
    // If found you qr code
    function onScanSuccess(decodeText, decodeResult) {
      qrvalue = decodeText, decodeResult;
      //alert("You QR String is : " + qrvalue);
    }

    let htmlscanner = new Html5QrcodeScanner(
      "my-qr-reader",
      { fps: 10, qrbos: 250, supportedScanTypes: [ Html5QrcodeScanType.SCAN_TYPE_CAMERA ] }
    );
    htmlscanner.render(onScanSuccess);
});

/* //Record audio and upload every 15 sec
async function startAudioRecording() {
  if (isRecording) {
    console.warn("Recording already in progress.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = 'audio/webm';

    mediaRecorder = new MediaRecorder(stream, { mimeType });

    audioChunks = [];
    chunkIndex = 0;
    isRecording = true;

    // Not async — don't await inside the event handler
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
        chunkIndex++;
        const index = chunkIndex;
        const chunkKey = chunkList[index];
        handleNewChunk(event.data, chunkKey, mimeType);
      }
    };

    mediaRecorder.onstop = () => {
      console.log("Recording stopped.");
      isRecording = false;
      stream.getTracks().forEach(track => track.stop());
      audioChunks = [];
    };

    mediaRecorder.onerror = (event) => {
      console.error("MediaRecorder error:", event.error);
      isRecording = false;
    };

    // Emit a chunk every 15 seconds
    mediaRecorder.start(15000);
    console.log("Recording started... (chunk every 15s)");

    } catch (err) {
    console.error("Failed to start recording:", err);
    isRecording = false;
  }
}

async function handleNewChunk(chunk, key, mimeType) {
  try {
    const namedBlob = new File([chunk], key, {
        type: mimeType || 'audio/webm',
    });

    await sendBlobData(key, namedBlob);
    console.log(`Uploaded ${key}`);
    } catch (err) {
    console.error(`Failed to upload chunk ${key}:`, err);
  }
}

function stopAudioRecording() {
  if (recordingTimer) {
    clearTimeout(recordingTimer);
    recordingTimer = null;
  }

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    } else {
    console.warn("No active recording to stop.");
  }
} */
