/**
 * @file humanseg gpu pipeline
 */

import { Runner, env, registerOp } from '@paddlejs/paddlejs-core';
import { GLHelper } from '@paddlejs/paddlejs-backend-webgl';
import segImg from './customOp/segImg';
import AppendDealOriginOpToNN from './customTransformer/appendCustomOpToNN';

interface LoadOptions {
  needPreheat?: boolean;
  enableLightModel?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
}

let runner = null as Runner;

const WIDTH = 398;
const HEIGHT = 224;

function registerCustomOp() {
  registerOp(segImg, 'segImg');
}

registerCustomOp();

const WEBGL_ATTRIBUTES = Object.assign({}, GLHelper.WEBGL_ATTRIBUTES, {
  alpha: true,
});

function createWebglContext(canvas: HTMLCanvasElement) {
  let gl = canvas.getContext('webgl2', WEBGL_ATTRIBUTES) as WebGLRenderingContext | null;
  console.log(gl, 'gllll');
  if (gl) {
    env.set('webglVersion', 2);
  } else {
    env.set('webglVersion', 1);
    gl = (canvas.getContext('webgl', WEBGL_ATTRIBUTES) ||
      canvas.getContext('experimental-webgl', WEBGL_ATTRIBUTES)) as WebGLRenderingContext;
  }

  return gl as WebGLRenderingContext;
}

const renderCanvas = document.createElement('canvas');
renderCanvas.width = 500;
renderCanvas.height = 280;
const gl = createWebglContext(renderCanvas);

let segImgOp = null;

export async function load(
  options: LoadOptions = {
    needPreheat: true,
    enableLightModel: false,
    canvasWidth: 500,
    canvasHeight: 280,
  },
  customModelPath: string
) {
  const modelPath = customModelPath || 'https://paddlejs.cdn.bcebos.com/models/humansegv2/model.json';

  runner = new Runner({
    modelPath: modelPath,
    needPreheat: options.needPreheat !== undefined ? options.needPreheat : true,
    feedShape: {
      fw: WIDTH,
      fh: HEIGHT,
    },
    fill: '#fff',
    mean: [0.5, 0.5, 0.5],
    std: [0.5, 0.5, 0.5],
    plugins: {
      preTransforms: [new AppendDealOriginOpToNN(options.canvasWidth, options.canvasHeight)],
    },
  });

  GLHelper.setWebGLRenderingContext(gl);

  env.set('webgl_pack_channel', true);
  env.set('webgl_gpu_pipeline', true);
  env.set('webgl_force_half_float_texture', true);

  await runner.init();
}

export async function preheat() {
  return await runner.preheat();
}

/**
 * draw human seg
 * @param {HTMLImageElement | HTMLVideoElement | HTMLCanvasElement} input the input image
 * @param {HTMLCanvasElement} canvas the dest canvas draws the pixels
 * @param {HTMLCanvasElement} back background canvas
 */
export async function drawHumanSeg(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  canvas: HTMLCanvasElement,
  back?: HTMLCanvasElement
) {
  if (!segImgOp) {
    segImgOp = runner.weightMap[runner.weightMap.length - 1].opData;
  }
  segImgOp.uniform.type.value = 1;
  await runner.predict(input);
  const backgroundSize = genBackgroundSize(input);
  canvas.width = input.width;
  canvas.height = input.height;
  const destCtx = canvas.getContext('2d');
  if (back) {
    destCtx.drawImage(back, -backgroundSize.bx, -backgroundSize.by, backgroundSize.bw, backgroundSize.bh);
  }
  destCtx.drawImage(gl.canvas, -backgroundSize.bx, -backgroundSize.by, backgroundSize.bw, backgroundSize.bh);
}

/**
 * draw human seg
 * @param {HTMLImageElement | HTMLVideoElement | HTMLCanvasElement} input the input image
 * @param {HTMLCanvasElement} canvas the dest canvas draws the pixels
 */
export async function blurBackground(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  canvas: HTMLCanvasElement
) {
  if (!segImgOp) {
    segImgOp = runner.weightMap[runner.weightMap.length - 1].opData;
  }
  segImgOp.uniform.type.value = 0;
  await runner.predict(input);
  canvas.width = input.width;
  canvas.height = input.height;
  const backgroundSize = genBackgroundSize(input);
  const destCtx = canvas.getContext('2d');
  destCtx.drawImage(gl.canvas, -backgroundSize.bx, -backgroundSize.by, backgroundSize.bw, backgroundSize.bh);
}

/**
 * draw human mask
 * @param {HTMLImageElement | HTMLVideoElement | HTMLCanvasElement} input the input image
 * @param {HTMLCanvasElement} canvas the dest canvas draws the pixels
 * @param {HTMLCanvasElement} back background canvas
 */
export async function drawMask(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  canvas: HTMLCanvasElement,
  back: HTMLCanvasElement
) {
  console.log(canvas, 'canvas');
  if (!segImgOp) {
    segImgOp = runner.weightMap[runner.weightMap.length - 1].opData;
  }
  segImgOp.uniform.type.value = 2;
  await runner.predict(input);
  canvas.width = input.width;
  canvas.height = input.height;
  const backgroundSize = genBackgroundSize(input);
  const destCtx = canvas.getContext('2d');
  destCtx.drawImage(back, -backgroundSize.bx, -backgroundSize.by, backgroundSize.bw, backgroundSize.bh);
  destCtx.drawImage(gl.canvas, -backgroundSize.bx, -backgroundSize.by, backgroundSize.bw, backgroundSize.bh);
}

// function genImageSize2(box_x: number, box_y: number, box_w: number, box_h: number, source_w: number, source_h: number) {
//   const dx = box_x,
//     dy = box_y,
//     dWidth = box_w,
//     dHeight = box_h;
//   if (source_w > source_h || (source_w == source_h && box_w < box_h)) {
//     dHeight = (source_h * dWidth) / source_w;
//     dy = box_y + (box_h - dHeight) / 2;
//   } else if (source_w < source_h || (source_w == source_h && box_w > box_h)) {
//     dWidth = (source_w * dHeight) / source_h;
//     dx = box_x + (box_w - dWidth) / 2;
//   }
//   return {
//     dx,
//     dy,
//     dWidth,
//     dHeight,
//   };
// }

function genBackgroundSize(inputElement) {
  // 缩放后的宽高
  let sw = WIDTH;
  let sh = HEIGHT;
  const ratio = sw / sh;
  const inputWidth = inputElement.naturalWidth || inputElement.width;
  const inputHeight = inputElement.naturalHeight || inputElement.height;
  console.log(inputWidth, inputHeight, 123123123);
  let x = 0;
  let y = 0;
  let bx = 0;
  let by = 0;
  let bh = inputHeight;
  let bw = inputWidth;
  const origin_ratio = inputWidth / inputHeight;
  // target的长宽比大些 就把原图的高变成target那么高

  console.log(ratio / origin_ratio);
  if (ratio / origin_ratio >= 1) {
    sw = sh * origin_ratio;
    x = Math.floor((WIDTH - sw) / 2);
    bw = bh * ratio;
    bx = Math.floor((bw - inputWidth) / 2);
  }
  // target的长宽比小些 就把原图的宽变成target那么宽
  else {
    sh = sw / origin_ratio;
    y = Math.floor((HEIGHT - sh) / 2);
    bh = bw / ratio;
    by = Math.floor((bh - inputHeight) / 2);
  }
  console.log({
    x,
    y,
    sw,
    sh,
    bx,
    by,
    bw,
    bh,
  });
  return {
    x,
    y,
    sw,
    sh,
    bx,
    by,
    bw,
    bh,
  };
}
