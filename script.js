const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('output');
const canvasCtx = canvasElement.getContext('2d');

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

let frameCount = 0;

function resizeCanvas() {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
}

pose.onResults(results => {
  if (!results.poseLandmarks) return;
  frameCount++;
  if (frameCount % 2 !== 0) return;  // 每兩幀處理一次，減少壓力

  resizeCanvas();

  const ls = results.poseLandmarks[11];
  const le = results.poseLandmarks[7];
  const lh = results.poseLandmarks[23];

  const leanValue = ls.y - lh.y;
  const headTilt = Math.atan2(le.y - ls.y, le.x - ls.x) * (180 / Math.PI);
  const isBadPosture = (leanValue > 0.05) || (headTilt > 25);

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  drawLandmarks(canvasCtx, results.poseLandmarks, {
    color: '#FF0000',
    radius: Math.max(2, canvasElement.width * 0.006)
  });

  canvasCtx.fillStyle = isBadPosture ? 'red' : 'green';
  canvasCtx.font = `bold ${Math.round(canvasElement.width / 20)}px Arial`;
  canvasCtx.fillText(
    isBadPosture ? "駝背/前傾" : "良好坐姿", 30, 60
  );

  canvasCtx.restore();
});

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({image: videoElement});
  },
  width: 640,
  height: 480,
  facingMode: 'environment'
});
camera.start();