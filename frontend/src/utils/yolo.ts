import * as tf from '@tensorflow/tfjs';
import type { Alert } from '../types/alert';
import { v4 as uuidv4 } from 'uuid';


const baseURL = import.meta.env.VITE_API_URL;

let model: tf.GraphModel | null = null;

export async function loadModel(): Promise<void> {
  model = await tf.loadGraphModel('/models/model.json');
  console.log("✅ Custom YOLO TensorFlow.js model loaded");
}


export async function runYOLOOnFrame(imageData: ImageData, timestamp: number): Promise<Alert | null> {
  if (!model) {
    console.warn("⚠️ Model not loaded");
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);

  const inputTensor = tf.tidy(() => {
    const imgTensor = tf.browser.fromPixels(canvas);
    const resized = tf.image.resizeBilinear(imgTensor, [640, 640]);
    const normalized = resized.div(255.0);
    const batched = normalized.expandDims(0);
    return batched;
  });

  let outputs: tf.Tensor[] | tf.NamedTensorMap;
  try {
    outputs = await model.executeAsync(inputTensor) as tf.Tensor[];
  } catch (err) {
    console.error("❌ Model inference failed", err);
    tf.dispose(inputTensor);
    return null;
  }

  tf.dispose(inputTensor);

  const [boxes, scores, classes, validDetections] = Array.isArray(outputs)
    ? outputs
    : [outputs['boxes'], outputs['scores'], outputs['classes'], outputs['valid_detections']];

  const boxesData = await boxes.array() as number[][][];
  const scoresData = await scores.array() as number[][];
  const classData = await classes.array() as number[][];
  const detections = (await validDetections.data())[0];

  // const labels = ['person', 'bicycle', 'car', 'motorbike', 'bus', 'truck']; // Adjust if needed
  const labels = [
    'person', 'bicycle', 'car', 'motorbike', 'aeroplane', 'bus',
    'train', 'truck', 'boat', 'traffic light', 'fire hydrant',
    'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog',
    'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe',
    'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
    'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat',
    'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
    'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl',
    'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot',
    'hot dog', 'pizza', 'donut', 'cake', 'chair', 'sofa', 'pottedplant',
    'bed', 'diningtable', 'toilet', 'tvmonitor', 'laptop', 'mouse',
    'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster',
    'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors',
    'teddy bear', 'hair drier', 'toothbrush'
  ];


  let personCount = 0;
  const triggeredTypes: string[] = [];

  for (let i = 0; i < detections; i++) {
    const score = scoresData[0][i];
    const classIdx = classData[0][i];
    const label = labels[classIdx] || `class${classIdx}`;
    console.log("📦 Detected:", label, score.toFixed(2));
    const [ymin, xmin, ymax, xmax] = boxesData[0][i];

    // Draw bounding box
    const x = xmin * canvas.width;
    const y = ymin * canvas.height;
    const width = (xmax - xmin) * canvas.width;
    const height = (ymax - ymin) * canvas.height;

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    ctx.font = '12px Arial';
    ctx.fillStyle = 'red';
    ctx.fillText(`${label} (${score.toFixed(2)})`, x, y > 10 ? y - 5 : y + 15);

    // Count people
    if (label === 'person') personCount++;

    // Type B: Vehicle in frame
    if ((label === 'car' || label === 'bus') && score > 0.3) {
      if (!triggeredTypes.includes('Type B')) triggeredTypes.push('Type B');
    }

    // Type C: High-confidence detection
    if (['car', 'bus', 'bicycle'].includes(label) && score > 0.6) {
      if (!triggeredTypes.includes('Type C')) triggeredTypes.push('Type C');
    }
  }

  // Type A: Too many people
  if (personCount > 6) {
    triggeredTypes.push('Type A');
  }

  tf.dispose([boxes, scores, classes, validDetections]);

  if (triggeredTypes.length === 0) return null;

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg")
  );

  // Upload blob to backend
  const filename = `video_alert_${timestamp}s.jpg`;
  const formData = new FormData();
  formData.append("frame", blob, filename);

  let frameUrl = "";
  try {
    // const imageResponse = await fetch("http://localhost:4000/upload-frame", {
    const imageResponse = await fetch(`${baseURL}/upload-frame`, {
      method: "POST",
      body: formData,
    });
    const data = await imageResponse.json();
    frameUrl = data.imageUrl;
  } catch (err) {
    console.error("❌ Failed to upload frame image", err);
  }




  return {
    id: uuidv4(),
    timestamp: new Date(Date.now() + timestamp * 1000).toISOString(),
    type: triggeredTypes.join(', '),
    message: `Triggered ${triggeredTypes.join(', ')}`,
    frameUrl,
    details: `People: ${personCount}, Rules matched: ${triggeredTypes.join(', ')} at t=${timestamp}s.`,
  };
}


// Only for testing
export function _setModelForTest(mock: tf.GraphModel | null): void {
  model = mock;
}


