/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 * some code use @tenserflow/body-segmentation
 *
 */

import * as tf from '@tensorflow/tfjs-core';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import { Segmentation } from '@tensorflow-models/body-segmentation/dist/shared/calculators/interfaces/common_interfaces';
export type ImageType =
  | HTMLCanvasElement
  | HTMLImageElement
  | ImageBitmap
  | tf.Tensor3D
  | ImageData
  | HTMLVideoElement
  | SVGImageElement
  | OffscreenCanvas
  | VideoFrame;
type Canvas = HTMLCanvasElement | OffscreenCanvas;
const CANVAS_NAMES = {
  blurred: 'blurred',
  blurredMask: 'blurred-mask',
  mask: 'mask',
  drawImage: 'draw-image',
};
const offScreenCanvases: { [name: string]: Canvas } = {};

export async function drawWithCompositing(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  image: ImageType,
  compositeOperation: GlobalCompositeOperation
) {
  ctx.globalCompositeOperation = compositeOperation;
  if (image instanceof tf.Tensor) {
    const pixels = await tf.browser.toPixels(image);
    const [height, width] = getInputSize(image);
    image = new ImageData(pixels, width, height);
  } else if (image instanceof ImageData) {
    ctx.putImageData(image, 0, 0);
  } else {
    await ctx.drawImage(image, 0, 0);
  }
}
export function getInputSize(input: ImageType): [number, number] {
  if (
    (typeof HTMLCanvasElement !== 'undefined' && input instanceof HTMLCanvasElement) ||
    (typeof OffscreenCanvas !== 'undefined' && input instanceof OffscreenCanvas) ||
    (typeof HTMLImageElement !== 'undefined' && input instanceof HTMLImageElement)
  ) {
    return getSizeFromImageLikeElement(input);
  } else if (typeof ImageData !== 'undefined' && input instanceof ImageData) {
    return [input.height, input.width];
  } else if (typeof HTMLVideoElement !== 'undefined' && input instanceof HTMLVideoElement) {
    return getSizeFromVideoElement(input);
  } else if (input instanceof tf.Tensor) {
    return [input.shape[0], input.shape[1]];
  } else {
    throw new Error(`error: Unknown input type: ${input}.`);
  }
}
function getSizeFromImageLikeElement(input: HTMLImageElement | HTMLCanvasElement | OffscreenCanvas): [number, number] {
  if ('offsetHeight' in input && input.offsetHeight !== 0 && 'offsetWidth' in input && input.offsetWidth !== 0) {
    return [input.offsetHeight, input.offsetWidth];
  } else if (input.height != null && input.width != null) {
    return [input.height, input.width];
  } else {
    throw new Error(`HTMLImageElement must have height and width attributes set.`);
  }
}

function getSizeFromVideoElement(input: HTMLVideoElement): [number, number] {
  if (input.hasAttribute('height') && input.hasAttribute('width')) {
    // Prioritizes user specified height and width.
    // We can't test the .height and .width properties directly,
    // because they evaluate to 0 if unset.
    return [input.height, input.width];
  } else {
    return [input.videoHeight, input.videoWidth];
  }
}

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

function createOffScreenCanvas(): Canvas {
  if (typeof document !== 'undefined') {
    return document.createElement('canvas');
  } else if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(0, 0);
  } else {
    throw new Error('Cannot create a canvas in this context');
  }
}

function ensureOffscreenCanvasCreated(id: string): Canvas {
  if (!offScreenCanvases[id]) {
    offScreenCanvases[id] = createOffScreenCanvas();
  }
  return offScreenCanvases[id];
}

/**
 * Draw image data on a canvas.
 */
function renderImageDataToCanvas(image: ImageData, canvas: Canvas) {
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;

  ctx.putImageData(image, 0, 0);
}
function renderImageDataToOffScreenCanvas(image: ImageData, canvasName: string): Canvas {
  const canvas = ensureOffscreenCanvasCreated(canvasName);
  renderImageDataToCanvas(image, canvas);

  return canvas;
}
/**
 * Draw image on a 2D rendering context.
 */
async function drawImage(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  image: ImageType,
  dx: number,
  dy: number,
  dw?: number,
  dh?: number
) {
  if (image instanceof tf.Tensor) {
    const pixels = await tf.browser.toPixels(image);
    const [height, width] = getInputSize(image);
    image = new ImageData(pixels, width, height);
  }
  if (image instanceof ImageData) {
    image = renderImageDataToOffScreenCanvas(image, CANVAS_NAMES.drawImage);
  }
  if (dw == null || dh == null) {
    ctx.drawImage(image, dx, dy);
  } else {
    ctx.drawImage(image, dx, dy, dw, dh);
  }
}

// method copied from bGlur in https://codepen.io/zhaojun/pen/zZmRQe
async function cpuBlur(canvas: Canvas, image: ImageType, blur: number) {
  const ctx = canvas.getContext('2d')!;

  let sum = 0;
  const delta = 5;
  const alphaLeft = 1 / (2 * Math.PI * delta * delta);
  const step = blur < 3 ? 1 : 2;
  for (let y = -blur; y <= blur; y += step) {
    for (let x = -blur; x <= blur; x += step) {
      const weight = alphaLeft * Math.exp(-(x * x + y * y) / (2 * delta * delta));
      sum += weight;
    }
  }
  for (let y = -blur; y <= blur; y += step) {
    for (let x = -blur; x <= blur; x += step) {
      ctx.globalAlpha = ((alphaLeft * Math.exp(-(x * x + y * y) / (2 * delta * delta))) / sum) * blur;
      await drawImage(ctx, image, x, y);
    }
  }
  ctx.globalAlpha = 1;
}
async function drawAndBlurImageOnCanvas(image: ImageType, blurAmount: number, canvas: Canvas) {
  const [height, width] = getInputSize(image);
  const ctx = canvas.getContext('2d')!;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  if (isSafari()) {
    await cpuBlur(canvas, image, blurAmount);
  } else {
    // tslint:disable:no-any
    (ctx as any).filter = `blur(${blurAmount}px)`;
    await drawImage(ctx, image, 0, 0, width, height);
  }
  ctx.restore();
}
/**
 * Draw image on a canvas.
 */
async function renderImageToCanvas(image: ImageType, canvas: Canvas) {
  const [height, width] = getInputSize(image);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  await drawImage(ctx, image, 0, 0, width, height);
}
async function drawAndBlurImageOnOffScreenCanvas(
  image: ImageType,
  blurAmount: number,
  offscreenCanvasName: string
): Promise<Canvas> {
  const canvas = ensureOffscreenCanvasCreated(offscreenCanvasName);
  if (blurAmount === 0) {
    await renderImageToCanvas(image, canvas);
  } else {
    await drawAndBlurImageOnCanvas(image, blurAmount, canvas);
  }
  return canvas;
}
export function flipCanvasHorizontal(canvas: Canvas) {
  const ctx = canvas.getContext('2d')!;
  ctx.scale(-1, 1);
  ctx.translate(-canvas.width, 0);
}
async function createPersonMask(
  segmentation: Segmentation | Segmentation[],
  foregroundThreshold: number,
  edgeBlurAmount: number
): Promise<Canvas> {
  const backgroundMaskImage = await bodySegmentation.toBinaryMask(
    segmentation,
    { r: 0, g: 0, b: 0, a: 255 },
    { r: 0, g: 0, b: 0, a: 0 },
    false,
    foregroundThreshold
  );

  const backgroundMask = renderImageDataToOffScreenCanvas(backgroundMaskImage, CANVAS_NAMES.mask);
  if (edgeBlurAmount === 0) {
    return backgroundMask;
  } else {
    return drawAndBlurImageOnOffScreenCanvas(backgroundMask, edgeBlurAmount, CANVAS_NAMES.blurredMask);
  }
}
/**
 * 绘制虚拟背景，背景替换
 * @param canvas The canvas to be drawn onto
 *
 * @param image The original image to apply the mask to.
 *
 * @param segmentation  Single segmentation or array of segmentations.
 *
 * @param backgroundImage The image as banckground to be drawn onto
 *
 * @param foregroundThreshold Default to 0.5. The minimum probability
 * to color a pixel as foreground rather than background. The alpha channel
 * integer values will be taken as the probabilities (for more information refer
 * to `Segmentation` type's documentation).
 *
 * @param backgroundBlurAmount  How many pixels in the background blend into each
 * other.  Defaults to 3. Should be an integer between 1 and 20.
 *
 * @param edgeBlurAmount How many pixels to blur on the edge between the person
 * and the background by.  Defaults to 3. Should be an integer between 0 and 20.
 *
 * * @param flipHorizontal If the output should be flipped horizontally.  Defaults
 * to false.
 */
export async function drawVirtualBackground(
  canvas: Canvas,
  image: ImageType,
  segmentation: Segmentation | Segmentation[],
  backgroundImage: ImageType,
  foregroundThreshold = 0.5,
  backgroundBlurAmount = 3,
  edgeBlurAmount = 3,
  flipHorizontal = false
) {
  const ctx = canvas.getContext('2d')! as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  // canvas.width = image.width;
  // canvas.height = image.height;
  const blurredImage = await drawAndBlurImageOnOffScreenCanvas(
    backgroundImage,
    backgroundBlurAmount,
    CANVAS_NAMES.blurred
  );
  if (Array.isArray(segmentation) && segmentation.length === 0) {
    ctx.drawImage(blurredImage, 0, 0);
    return;
  }
  const personMask = await createPersonMask(segmentation, foregroundThreshold, edgeBlurAmount);
  ctx.save();
  if (flipHorizontal) {
    flipCanvasHorizontal(canvas);
  }
  // draw the original image on the final canvas
  const [height, width] = getInputSize(image);
  await drawImage(ctx, image, 0, 0, width, height);
  //`destination-in`仅保留现有画布内容和新形状重叠的部分。其他的都是透明的。
  // 绘制出人像部分，其余部分透明
  await drawWithCompositing(ctx, personMask, 'destination-in');
  //`destination-over` 在现有画布内容的后面绘制新的图形。
  // 背景图片绘制在人像后面
  await drawWithCompositing(ctx, blurredImage, 'destination-over');
  ctx.restore();
}
