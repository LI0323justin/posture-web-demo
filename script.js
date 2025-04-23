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

function resizeCanvas() {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
}

pose.onResults(results => {
  if (!results.poseLandmarks) return;
  resizeCanvas();

  const ls = results.poseLandmarks[11]; // left shoulder
  const le = results.poseLandmarks[7];  // left ear
  const lh = results.poseLandmarks[23]; // left hip

  const leanValue = ls.y - lh.y;
  const headTilt = Math.atan2(le.y - ls.y, le.x - ls.x) * (180 / Math.PI);
  const isBadPosture = (leanValue > 0.05) || (headTilt > 25);

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  const points = [le, ls, lh];
  points.forEach(p => {
    canvasCtx.beginPath();
    canvasCtx.arc(p.x * canvasElement.width, p.y * canvasElement.height, 8, 0, 2 * Math.PI);
    canvasCtx.fillStyle = '#FF0000';
    canvasCtx.fill();
  });

  canvasCtx.fillStyle = isBadPosture ? 'red' : 'green';
  canvasCtx.font = `bold ${Math.round(canvasElement.width / 32)}px Arial`;
  canvasCtx.fillText(isBadPosture ? "駝背/前傾" : "良好坐姿", 30, 50);

  canvasCtx.font = `normal ${Math.round(canvasElement.width / 40)}px Arial`;
  canvasCtx.fillText(`頭傾角: ${Math.round(headTilt)}°`, 30, 90);
  canvasCtx.fillText(`肩臀差: ${leanValue.toFixed(2)}`, 30, 125);

  canvasCtx.restore();
});

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({image: videoElement});
  },
  width: 640,
  height: 480,
  facingMode: 'user'
});
camera.start();