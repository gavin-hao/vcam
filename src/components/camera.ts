/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import { type CameraConfig, STATE, VIDEO_SIZE } from './params';

async function getDeviceIdForLabel(cameras: MediaDeviceInfo[], cameraLabel: string) {
  for (let i = 0; i < cameras.length; i++) {
    const camera = cameras[i];
    if (camera.label === cameraLabel) {
      return camera.deviceId;
    }
  }

  return undefined;
}
export async function getVideoInputs() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log('enumerateDevices() not supported.');
    return [];
  }

  const devices = await navigator.mediaDevices.enumerateDevices();

  const videoDevices = devices.filter((device) => device.kind === 'videoinput');

  return videoDevices;
}
export class Camera {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  constructor(video: HTMLVideoElement, output: HTMLCanvasElement) {
    this.video = video;
    this.canvas = output;
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Initiate a Camera instance and wait for the camera stream to be ready.
   * @param cameraParam From app `STATE.camera`.
   */
  static async setupCamera(cameraParam: CameraConfig, video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
    }
    const cameras = await getVideoInputs();
    const { targetFPS, sizeOption, cameraSelector } = cameraParam;
    const $size = VIDEO_SIZE[sizeOption];
    const deviceId = await getDeviceIdForLabel(cameras, cameraSelector);
    const videoConfig: MediaStreamConstraints = {
      audio: false,
      video: {
        deviceId,
        // Only setting the video to a specified size for large screen, on
        // mobile devices accept the default size.
        width: $size.width,
        height: $size.height,
        frameRate: {
          ideal: targetFPS,
        },
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(videoConfig);

    const camera = new Camera(video, canvas);
    camera.video.srcObject = stream;

    await new Promise((resolve) => {
      camera.video.onloadedmetadata = () => {
        resolve(video);
      };
    });

    camera.video.play();

    const videoWidth = camera.video.videoWidth;
    const videoHeight = camera.video.videoHeight;
    // Must set below two lines, otherwise video element doesn't show.
    camera.video.width = videoWidth;
    camera.video.height = videoHeight;

    camera.canvas.width = videoWidth;
    camera.canvas.height = videoHeight;
    // const canvasContainer = document.querySelector('.canvas-wrapper');
    // canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`;

    // Because the image from camera is mirrored, need to flip horizontally.
    camera.ctx?.translate(camera.video.videoWidth, 0);
    camera.ctx?.scale(-1, 1);

    return camera;
  }

  drawToCanvas(canvas: HTMLCanvasElement) {
    this.ctx?.drawImage(canvas, 0, 0, this.video.videoWidth, this.video.videoHeight);
  }

  drawFromVideo(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(this.video, 0, 0, this.video.videoWidth, this.video.videoHeight);
  }

  clearCtx() {
    this.ctx?.clearRect(0, 0, this.video.videoWidth, this.video.videoHeight);
  }
}
