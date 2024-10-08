// Copyright 2023 The MediaPipe Authors.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//      http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
    ImageEmbedder,
    FilesetResolver
  } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
  
  const demosSection = document.getElementById("demos");
  
  let imageEmbedder;
  let runningMode = "IMAGE";
  
  // Before we can use ImageEmbedder class we must wait for it to finish
  // loading. Machine Learning models can be large and take a moment to
  // get everything needed to run.
  const createImageEmbedder = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
  
    imageEmbedder = await ImageEmbedder.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite`
      },
      runningMode: runningMode
      // quantize: true
    });
  
    demosSection.classList.remove("invisible");
  };
  createImageEmbedder();
  
  /********************************************************************
   // Demo 1: Grab a bunch of images from the page and Embedder them
   // upon click.
   ********************************************************************/
  
  // In this demo, we have put all our clickable images in divs with the
  // CSS class 'detectionOnClick'. Lets get all the elements that have
  // this class.
  const imageContainers = document.getElementsByClassName("embedOnClick");
  
  // Now let's go through all of these and add a click event listener.
  for (let imageContainer of imageContainers) {
    // Add event listener to the child element whichis the img element.
    imageContainer.children[0].addEventListener("click", handleClick);
  }
  
  /**
   * Get embeddings of images on click
   */
  const imageResult = document.getElementById("im_result");
  const videoResult = document.getElementById("video_result");
  const embedding1 = document.getElementById("embed1");
  const embedding2 = document.getElementById("embed2");
  
  async function handleClick(event) {
    if (!imageEmbedder) {
      console.log("Wait for objectDetector to load before clicking");
      return;
    }
    // if video mode is initialized, set runningMode to image
    if (runningMode === "VIDEO") {
      runningMode = "IMAGE";
      await imageEmbedder.setOptions({ runningMode: runningMode });
    }
    if (imageContainers.length == 2) {
      const imageEmbedderResult0 = imageEmbedder.embed(
        imageContainers[0].children[0]
      );
      const imageEmbedderResult1 = imageEmbedder.embed(
        imageContainers[1].children[0]
      );
      embedding1.className = "embedding";
      embedding2.className = "embedding";
      const truncatedEmbedding0 =
        imageEmbedderResult0.embeddings[0].floatEmbedding;
      truncatedEmbedding0.length = 4;
      const truncatedEmbedding1 =
        imageEmbedderResult1.embeddings[0].floatEmbedding;
      truncatedEmbedding1.length = 4;
      embedding1.innerText = `Float Embedding: ${truncatedEmbedding0}...`;
      embedding2.innerText = `Float Embedding: ${truncatedEmbedding1}...`;
      // Compute cosine similarity.
      const similarity = ImageEmbedder.cosineSimilarity(
        imageEmbedderResult0.embeddings[0],
        imageEmbedderResult1.embeddings[0]
      );
      console.log(similarity);
      imageResult.className = "";
      imageResult.innerText = "Image similarity: " + similarity.toFixed(2);
    }
    // Write predictions to a new paragraph element and add to the DOM.
  }
  
  /********************************************************************
   // Demo 2: Continuously grab image from webcam stream and Embedder it.
   ********************************************************************/
  
  const video = document.getElementById("webcam");
  let enableWebcamButton;
  const getFile = document.getElementById("getFile");
  let uploadImageEmbedderResult;
  
  getFile.addEventListener("change", preview_image, false);
  
  function preview_image(event) {
    let reader = new FileReader();
    const output = document.getElementById("uploadImage");
    reader.onload = function () {
      output.src = reader.result;
      setTimeout(async function () {
        if (runningMode === "VIDEO") {
          runningMode = "IMAGE";
          await imageEmbedder.setOptions({ runningMode: runningMode });
        }
        uploadImageEmbedderResult = await imageEmbedder.embed(output);
        document.getElementById("uploadImageButton").classList.add("removed");
      }, 100);
    };
    reader.readAsDataURL(event.target.files[0]);
  }
  
  // Check if webcam access is supported.
  function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
  
  // If webcam supported, add event listener to button for when user
  // wants to activate it.
  if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
  } else {
    console.warn("getUserMedia() is not supported by your browser");
  }
  
  // Enable the live webcam view and start detection.
  async function enableCam(event) {
    if (!imageEmbedder) {
      alert("ImageEmbedder still loading");
      return;
    }
  
    // Hide the button.
    enableWebcamButton.classList.add("removed");
  
    // getUsermedia parameters
    const constraints = {
      video: true
    };
  
    // Activate the webcam stream.
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (stream) {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
      })
      .catch((err) => {
        console.error(err);
        /* handle the error */
      });
  }
  
  async function predictWebcam() {
    // if image mode is initialized, create a new embedder with video runningMode
    if (runningMode === "IMAGE") {
      runningMode = "VIDEO";
      await imageEmbedder.setOptions({ runningMode: runningMode });
    }
  
    // Embed image using imageEmbedder.embedForVideo().
    const startTimeMs = performance.now();
    const embedderResult = await imageEmbedder.embedForVideo(video, startTimeMs);
  
    if (uploadImageEmbedderResult != null) {
      const similarity = ImageEmbedder.cosineSimilarity(
        uploadImageEmbedderResult.embeddings[0],
        embedderResult.embeddings[0]
      );
      videoResult.className = "";
      videoResult.innerText = "Image similarity: " + similarity.toFixed(2);
    }
  
    // Call this function again to keep predicting when the browser is ready
    window.requestAnimationFrame(predictWebcam);
  }
  