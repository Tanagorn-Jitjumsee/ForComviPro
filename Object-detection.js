// Import the necessary modules from MediaPipe
import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
const { HandLandmarker, FilesetResolver, DrawingUtils } = vision;

// Get DOM elements
const demosSection = document.getElementById("demos");
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
let handLandmarker;
let runningMode = "VIDEO";
let webcamRunning = false;
const videoWidth = 480;

// Create the HandLandmarker instance
async function createHandLandmarker() {
  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU"
    },
    runningMode,
    numHands: 2 // Adjust this number based on how many hands you want to track
  });
  demosSection.classList.remove("invisible");
}
createHandLandmarker();

// Check if webcam access is supported
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Enable webcam button event listener
if (hasGetUserMedia()) {
  const enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection
function enableCam(event) {
  if (!handLandmarker) {
    console.log("Wait! handLandmarker not loaded yet.");
    return;
  }

  webcamRunning = !webcamRunning;
  event.target.innerText = webcamRunning ? "DISABLE PREDICTIONS" : "ENABLE PREDICTIONS";

  const constraints = {
    video: true
  };

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  });
}

let lastVideoTime = -1;
const drawingUtils = new DrawingUtils(canvasCtx);

// Continuously grab image from webcam stream and detect it
async function predictWebcam() {
  const videoAspect = video.videoHeight / video.videoWidth;
  video.style.width = videoWidth + "px";
  video.style.height = videoWidth * videoAspect + "px";
  canvasElement.style.width = videoWidth + "px";
  canvasElement.style.height = videoWidth * videoAspect + "px";
  canvasElement.width = video.videoWidth;
  canvasElement.height = video.videoHeight;

  // Start detecting the stream
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await handLandmarker.setOptions({ runningMode: runningMode });
  }

  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    const results = handLandmarker.detectForVideo(video, startTimeMs);
    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
        drawingUtils.drawConnectors(
          landmarks,
          HandLandmarker.HAND_CONNECTIONS, // Use the appropriate connector constant
          { color: "#00FF00", lineWidth: 5 }
        );
        drawingUtils.drawLandmarks(
          landmarks,
          { color: "#FF0000", lineWidth: 2 }
        );
      }
    }
  }

  // Call this function again to keep predicting
  if (webcamRunning) {
    window.requestAnimationFrame(predictWebcam);
  }
}
