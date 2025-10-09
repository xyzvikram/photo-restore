// script.js — simple frontend "restore" simulation, no server
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewArea = document.getElementById('previewArea');
const canvas = document.getElementById('canvas');
const restoreBtn = document.getElementById('restoreBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const progress = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');

let img = new Image();
let originalImageData = null;

function showPreview() {
  previewArea.hidden = false;
  drawImageToCanvas(img);
  downloadBtn.disabled = true;
}

function drawImageToCanvas(image) {
  const ctx = canvas.getContext('2d');
  // limit canvas size for performance but preserve aspect ratio
  const maxDim = 1000;
  let w = image.width;
  let h = image.height;
  if (w > maxDim || h > maxDim) {
    const ratio = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0,0,w,h);
  ctx.drawImage(image, 0, 0, w, h);
  originalImageData = ctx.getImageData(0, 0, w, h);
}

function handleFile(file) {
  if (!file.type.startsWith('image/')) return alert('Please upload an image file.');
  const reader = new FileReader();
  reader.onload = (e) => {
    img = new Image();
    img.onload = () => showPreview();
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => {
  if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
});

/* Drag & drop visual */
;['dragenter','dragover'].forEach(evt => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault(); e.stopPropagation();
    dropZone.style.borderColor = 'rgba(110,231,183,0.26)';
  });
});
;['dragleave','drop'].forEach(evt => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault(); e.stopPropagation();
    dropZone.style.borderColor = '';
  });
});
dropZone.addEventListener('drop', (e) => {
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleFile(e.dataTransfer.files[0]);
  }
});

/* Simulated "restore" algorithm — client-side */
function simulateRestore() {
  if (!originalImageData) return;
  restoreBtn.disabled = true;
  progress.hidden = false;
  progressBar.style.width = '0%';
  let pct = 0;

  // fake progress
  const progInterval = setInterval(() => {
    pct += Math.random() * 12;
    if (pct > 98) pct = 98;
    progressBar.style.width = pct + '%';
  }, 300);

  // do some simple image processing after a short simulated time
  setTimeout(() => {
    clearInterval(progInterval);
    progressBar.style.width = '100%';

    // apply a lightweight unsharp mask-like effect + brightness/contrast improvement
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0,0,canvas.width,canvas.height);
    const out = new Uint8ClampedArray(data.data.length);

    // simple convolution kernel (sharpen)
    const kernel = [
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0
    ];
    const kw = 3;
    const kh = 3;
    const w = canvas.width;
    const h = canvas.height;

    for (let y=0;y<h;y++){
      for (let x=0;x<w;x++){
        for (let c=0;c<3;c++){
          let idx = (y*w + x)*4 + c;
          let acc = 0;
          for (let ky=0; ky<kh; ky++){
            for (let kx=0; kx<kw; kx++){
              const sx = x + kx - 1;
              const sy = y + ky - 1;
              if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
              const sidx = (sy*w + sx)*4 + c;
              acc += data.data[sidx] * kernel[ky*kw + kx];
            }
          }
          // clamp
          out[idx] = Math.min(255, Math.max(0, acc));
        }
        // alpha channel - keep original
        out[(y*w + x)*4 + 3] = data.data[(y*w + x)*4 + 3];
      }
    }

    // copy out to imageData and improve brightness/contrast
    for (let i=0;i<out.length;i+=4){
      // a small boost to brightness/contrast
      out[i] = Math.min(255, Math.max(0, (out[i]-16) * 1.06 + 8));
      out[i+1] = Math.min(255, Math.max(0, (out[i+1]-16) * 1.06 + 8));
      out[i+2] = Math.min(255, Math.max(0, (out[i+2]-16) * 1.06 + 8));
    }

    const newImage = new ImageData(out, canvas.width, canvas.height);
    ctx.putImageData(newImage, 0, 0);

    // subtle denoise by drawing a very slightly blurred copy blended on top
    ctx.globalAlpha = 0.06;
    ctx.filter = 'blur(0.7px)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;

    // enable download
    downloadBtn.disabled = false;
    progress.hidden = true;
    restoreBtn.disabled = false;
  }, 1800 + Math.random()*1200);
}

restoreBtn.addEventListener('click', simulateRestore);

downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'restored-image.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

resetBtn.addEventListener('click', () => {
  if (!originalImageData) return;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(originalImageData, 0, 0);
  downloadBtn.disabled = true;
});
