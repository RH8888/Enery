const $ = id => document.getElementById(id);

const canvas = $("simCanvas");
const ctx = canvas.getContext("2d");
const statusText = $("statusText");

function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const state = {
  running: true,
  gravity: 9.81,
  friction: 0.02,
  mass: 5,

  // SPRING
  springK: 120,
  springDamping: 1.5,

  timeScale: 1,
  ballRadius: 16
};

const ball = {
  t: 0.1,
  velocity: 12
};

const spring = {
  compression: 0,
  maxCompressionPx: 120,
  forceN: 0
};

let h1 = 2.0;
let h2 = 0.5;
let h3 = 2.5;

let maxEnergySeen = 1;

const sliders = [
  "velocity",
  "position",
  "gravity",
  "friction",
  "mass",
  "spring",
  "timeScale",
  "h1",
  "h2",
  "h3",
  "springDamping"
];

function updateLabels() {
  $("velocityLabel").textContent = `${$("velocity").value} m/s`;
  $("positionLabel").textContent = `${$("position").value}%`;
  $("gravityLabel").textContent = $("gravity").value;
  $("frictionLabel").textContent = $("friction").value;
  $("massLabel").textContent = `${$("mass").value} kg`;
  $("springLabel").textContent = `${$("spring").value} N/m`;
  $("timeScaleLabel").textContent = `${$("timeScale").value}x`;
  $("h1Label").textContent = `${$("h1").value} m`;
  $("h2Label").textContent = `${$("h2").value} m`;
  $("h3Label").textContent = `${$("h3").value} m`;
  $("springDampingLabel").textContent = $("springDamping").value;
}

function syncState() {
  state.gravity = parseFloat($("gravity").value);
  state.friction = parseFloat($("friction").value);
  state.mass = parseFloat($("mass").value);
  state.springK = parseFloat($("spring").value);
  state.springDamping = parseFloat($("springDamping").value);
  state.timeScale = parseFloat($("timeScale").value);

  h1 = parseFloat($("h1").value);
  h2 = parseFloat($("h2").value);
  h3 = parseFloat($("h3").value);
}

sliders.forEach(id => {
  $(id).addEventListener("input", () => {
    updateLabels();
    syncState();
  });
});

$("playBtn").onclick = () => { state.running = true; };
$("pauseBtn").onclick = () => { state.running = false; };
$("resetBtn").onclick = resetBall;

function resetBall() {
  ball.t = parseFloat($("position").value) / 100;
  ball.velocity = parseFloat($("velocity").value);
  spring.compression = 0;
  spring.forceN = 0;
  maxEnergySeen = 1;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function metersToY(m) {
  return canvas.height - 120 - m * 120; // 120 pixels = 1 meter spatial scale
}

function terrain(t) {
  const x = t * canvas.width;

  if (t < 0.18) return { x, y: metersToY(h1) };

  if (t < 0.42) {
    return {
      x,
      y: lerp(metersToY(h1), metersToY(h2), smoothstep((t - 0.18) / 0.24))
    };
  }

  if (t < 0.58) return { x, y: metersToY(h2) };

  if (t < 0.82) {
    return {
      x,
      y: lerp(metersToY(h2), metersToY(h3), smoothstep((t - 0.58) / 0.24))
    };
  }

  return { x, y: metersToY(h3) };
}

function terrainSlope(t) {
  const eps = 0.0001;
  const p1 = terrain(Math.max(0, t - eps));
  const p2 = terrain(Math.min(1, t + eps));
  return (p2.y - p1.y) / (p2.x - p1.x);
}

function getWallX() {
  return canvas.width - 34;
}

function getSpringRestLength() {
  return 140;
}

function getBallPixelX() {
  return terrain(ball.t).x;
}

function updatePhysics(dt) {
  if (!state.running) return;

  const simDt = dt * state.timeScale;
  
  // High-frequency sub-stepping loop ensures integration stability 
  // with large spring values (K and Damping coefficients)
  const substeps = 15;
  const sDt = simDt / substeps;

  for (let step = 0; step < substeps; step++) {
    const slope = terrainSlope(ball.t);
    const theta = Math.atan(slope);

    const gravityAccel = state.gravity * Math.sin(theta);
    const frictionAccel = -state.friction * ball.velocity;
    let accel = gravityAccel + frictionAccel;
    spring.forceN = 0;

    const wallX = getWallX();
    const restLength = getSpringRestLength();
    const springStartX = wallX - restLength;
    const ballX = getBallPixelX();
    const ballFrontX = ballX + state.ballRadius;

    const penetration = ballFrontX - springStartX;

    if (penetration > 0) {
      spring.compression = Math.min(penetration, restLength);

      const compressionMeters = spring.compression / 120;
      const springVelocity = ball.velocity * Math.cos(theta);

      // F = -kx - c*xDot (xDot > 0 means compressing into the spring).
      const rawSpringForce = (-state.springK * compressionMeters) - (state.springDamping * springVelocity);

      // A free spring cannot pull the ball, only push it away from the wall.
      const springForce = Math.min(0, rawSpringForce);
      spring.forceN = springForce;
      accel += springForce / state.mass;

      // Impenetrable wall at the spring anchor.
      if (ballFrontX > wallX) {
        const overlap = ballFrontX - wallX;
        ball.t -= overlap / canvas.width;
        if (ball.velocity > 0) ball.velocity = 0;
      }
    } else {
      spring.compression = 0;
    }

    // Semi-Implicit Symplectic Euler Integration Loop
    ball.velocity += accel * sDt;
    const vX = ball.velocity * Math.cos(theta);
    const dxPixels = vX * 120 * sDt;
    ball.t += dxPixels / canvas.width;

    // Outer Environment Boundaries
    if (ball.t < 0) {
      ball.t = 0;
      ball.velocity *= -0.25;
    }
    if (ball.t > 1) {
      ball.t = 1;
      ball.velocity *= -0.25;
    }
  }

  statusText.textContent = state.running
    ? `Running · v=${ball.velocity.toFixed(2)} m/s · spring=${spring.compression.toFixed(1)} px · Fs=${spring.forceN.toFixed(1)} N`
    : "Paused";
}

function updateEnergy() {
  const p = terrain(ball.t);
  const h = (canvas.height - p.y - 120) / 120;

  const PE = state.mass * state.gravity * h;
  const KE = 0.5 * state.mass * ball.velocity * ball.velocity;

  const compressionMeters = spring.compression / 120;
  const EE = 0.5 * state.springK * compressionMeters * compressionMeters;

  const ME = PE + KE + EE;

  maxEnergySeen = Math.max(maxEnergySeen, ME);

  [
    ["peBar", "peValue", PE],
    ["keBar", "keValue", KE],
    ["eeBar", "eeValue", EE],
    ["meBar", "meValue", ME]
  ].forEach(([bar, val, x]) => {
    $(bar).style.width = `${(x / maxEnergySeen) * 100}%`;
    $(val).textContent = `${x.toFixed(1)} J`;
  });
}

function drawTerrain() {
  ctx.beginPath();

  for (let i = 0; i <= 500; i++) {
    const p = terrain(i / 500);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }

  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();

  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#cbd5e1");
  g.addColorStop(1, "#94a3b8");

  ctx.fillStyle = g;
  ctx.fill();

  ctx.strokeStyle = "#475467";
  ctx.lineWidth = 5;
  ctx.stroke();
}

function drawSpring() {
  const wallX = getWallX();
  const base = terrain(0.9);
  const y = base.y - 8;
  
  const restLength = getSpringRestLength();
  const currentLength = Math.max(30, restLength - spring.compression);
  const springStartX = wallX - currentLength;
  const coils = 18;

  const amp = lerp(
    13,
    4,
    spring.compression / spring.maxCompressionPx
  );

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const springGradient = ctx.createLinearGradient(springStartX, y, wallX, y);
  springGradient.addColorStop(0, "#f8fafc");
  springGradient.addColorStop(1, "#64748b");

  ctx.strokeStyle = springGradient;
  ctx.lineWidth = 5;

  ctx.beginPath();

  for (let i = 0; i <= coils * 24; i++) {
    const t = i / (coils * 24);
    const x = springStartX + t * currentLength;
    const yy = y + Math.sin(t * Math.PI * coils * 2) * amp;

    if (i === 0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }

  ctx.stroke();

  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 6;

  ctx.beginPath();
  ctx.moveTo(springStartX, y - 14);
  ctx.lineTo(springStartX, y + 14);
  ctx.stroke();

  const wallGradient = ctx.createLinearGradient(
    wallX - 16,
    y - 72,
    wallX + 16,
    y + 72
  );
  wallGradient.addColorStop(0, "#cbd5e1");
  wallGradient.addColorStop(1, "#475569");

  ctx.fillStyle = wallGradient;
  ctx.fillRect(wallX, y - 72, 18, 144);
}

function drawBall(x, y) {
  ctx.beginPath();
  ctx.arc(x + 10, y + 14, state.ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.fill();

  const g = ctx.createRadialGradient(
    x - 5,
    y - 8,
    5,
    x,
    y,
    28
  );
  g.addColorStop(0, "#ffffff");
  g.addColorStop(1, "#ef4444");

  ctx.beginPath();
  ctx.arc(x, y, state.ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

updateLabels();
syncState();
resetBall();

let last = performance.now();

function animate(now) {
  const dt = Math.min((now - last) / 1000, 0.05); // Cap timestep to secure against background tab suspension
  last = now;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updatePhysics(dt);
  drawTerrain();
  drawSpring();

  const p = terrain(ball.t);
  drawBall(p.x, p.y - 18);

  updateEnergy();

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
