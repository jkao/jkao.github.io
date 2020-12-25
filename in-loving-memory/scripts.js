const pdfURL = 'in-loving-memory.pdf';

const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.js';


let PDF = undefined;;
let PAGE_NUMBER = 1;
let LOADING = false;
let SONG_NUMBER = 1;

// PDF page load fn
const loadPage = (pageNumber) => {
  if (!PDF) { return; }
  if (LOADING) { return; }

  LOADING = true;
  PDF.getPage(pageNumber).then(function(page) {
    const scale = 1;
    const viewport = page.getViewport({scale: scale});

    const canvas = document.getElementById("pdf");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport,
    };

    page.render(renderContext).promise.then(() => {
      LOADING = false;
    });
  }, function (error) {
    alert(error);
  });
};

// load the PDF
const loadingTask = pdfjsLib.getDocument(pdfURL);
loadingTask.promise.then(function(pdf) {
  PDF = pdf;
  loadPage(1);
});

// page controls
const loadNext = function() {
  if (!PDF) { return; }
  if (PAGE_NUMBER >= PDF.numPages) { return; }
  if (LOADING) { return; }
  loadPage(++PAGE_NUMBER);
};

const loadPrev = function() {
  if (!PDF) { return; }
  if (PAGE_NUMBER <= 1) { return; }
  if (LOADING) { return; }
  loadPage(--PAGE_NUMBER);
};

const next = document.getElementById("next-page");
next.onclick = function () { loadNext(); };

const canvas = document.getElementById("pdf");
pdf.onclick = function () { loadNext(); };

const prev = document.getElementById("prev-page");
prev.onclick = function () { loadPrev(); };

document.onkeydown = function(e) {
  const LEFT = 37;
  const RIGHT = 39;
  if (String(e.keyCode) === String(LEFT)) {
    loadPrev();
  } else if (String(e.keyCode) === String(RIGHT)) {
    loadNext();
  }
};

// autoplay
let AUTOPLAY = true;
setInterval(() => {
  if (AUTOPLAY) {
    loadNext();
  }
}, 7500);

const autoplayButton = document.getElementById("autoplay");
const setAutoplay = (autoplay) => {
  AUTOPLAY = autoplay;
  if (AUTOPLAY) {
    autoplayButton.classList.remove("fa-play");
    autoplayButton.classList.add("fa-pause");
  } else {
    autoplayButton.classList.remove("fa-pause");
    autoplayButton.classList.add("fa-play");
  }
};

autoplayButton.onclick = function() {
  setAutoplay(!AUTOPLAY);
};

// music
const getRandomSongNumber = () => {
  return Math.floor(Math.random() * Math.floor(2)) + 1;
};

let MUTED = false;
const muteButton = document.getElementById("mute");

const song1 = new Audio("song1.mp3");
const song2 = new Audio("song2.mp3");

const toggleVolume = () => {
  MUTED = !MUTED;

  song1.muted = MUTED;
  song2.muted = MUTED;

  if (MUTED) {
    muteButton.classList.remove("fa-volume-up");
    muteButton.classList.add("fa-volume-mute");
  } else {
    muteButton.classList.remove("fa-volume-mute");
    muteButton.classList.add("fa-volume-up");
  }
};

muteButton.onclick = function() {
  toggleVolume();
};

const playSong = (songNumber) => {
  if (songNumber === 1) {
    song1.currentTime = 7;
    song1.play();
  } else {
    song2.currentTime = 4;
    song2.play();
  }
};

song1.onended = function() {
  playSong(2);
};

song2.onended = function() {
  playSong(1);
};