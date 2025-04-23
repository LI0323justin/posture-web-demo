const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('output');
const canvasCtx = canvasElement.getContext('2d');

// 初始化 MediaPipe Pose
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
});
pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

// 自動調整 canvas 大小以符合實際解析度
function resizeCanvas() {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
}

pose.onResults(results => {
  if (!results.poseLandmarks) return;
  resizeCanvas();

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  drawConnectors(canvasCtx, results.poseLandmarks, Pose.POSE_CONNECTIONS, {
    color: '#00FF00',
    lineWidth: Math.max(2, canvasElement.width * 0.002)
  });
  drawLandmarks(canvasCtx, results.poseLandmarks, {
    color: '#FF0000',
    radius: Math.max(2, canvasElement.width * 0.008)
  });

  const ls = results.poseLandmarks[11];
  const le = results.poseLandmarks[7];
  const lh = results.poseLandmarks[23];
  const angle = calculateAngle(le, ls, lh);

  canvasCtx.fillStyle = angle < 150 ? 'red' : 'green';
  canvasCtx.font = `bold ${Math.round(canvasElement.width / 20)}px Arial`;
  canvasCtx.fillText(`角度: ${Math.round(angle)}°`, 30, 60);
  canvasCtx.fillText(angle < 150 ? "駝背/前傾" : "良好坐姿", 30, 110);

  canvasCtx.restore();
});

function calculateAngle(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
  const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);
  const angle = Math.acos(dot / (magAB * magCB));
  return angle * (180 / Math.PI);
}

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({image: videoElement});
  },
  width: 640,
  height: 480,
  facingMode: 'environment' // 使用後鏡頭
});
camera.start();