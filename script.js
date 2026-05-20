const $ = id => document.getElementById(id);
const canvas = $("simCanvas");
const ctx = canvas.getContext("2d");
const statusText = $("statusText");

function resizeCanvas(){canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight;}
window.addEventListener("resize", resizeCanvas); resizeCanvas();

const state = {running:true, gravity:9.81, friction:0.02, mass:5, springK:120, springDamping:1.5, springRest:0.08, timeScale:1, ballRadius:16};
const ball = {t:0.1, velocity:12};
const spring = {compression:0, velocity:0, visualCompression:0, compressionScale:8, maxCompression:0.24, settleEps:0.0003};
let h1 = 2.0, h2 = 0.5, h3 = 2.5, maxEnergySeen = 1;

const sliders = ["velocity","position","gravity","friction","mass","spring","timeScale","h1","h2","h3","springRest","springDamping","compressionScale"];

function updateLabels(){
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
  $("springRestLabel").textContent = `${$("springRest").value} t`;
  $("springDampingLabel").textContent = $("springDamping").value;
  $("compressionScaleLabel").textContent = `${$("compressionScale").value}x`;
}

function syncState(){
  state.gravity = parseFloat($("gravity").value); state.friction = parseFloat($("friction").value); state.mass = parseFloat($("mass").value);
  state.springK = parseFloat($("spring").value); state.springDamping = parseFloat($("springDamping").value); state.springRest = parseFloat($("springRest").value);
  state.timeScale = parseFloat($("timeScale").value); h1 = parseFloat($("h1").value); h2 = parseFloat($("h2").value); h3 = parseFloat($("h3").value);
  spring.compressionScale = parseFloat($("compressionScale").value);
}

sliders.forEach(id => $(id).addEventListener("input", ()=>{updateLabels(); syncState();}));
$("playBtn").onclick = ()=>{state.running = true;};
$("pauseBtn").onclick = ()=>{state.running = false;};
$("resetBtn").onclick = resetBall;

function resetBall(){ball.t = parseFloat($("position").value)/100; ball.velocity = parseFloat($("velocity").value); maxEnergySeen = 1; spring.compression = 0; spring.velocity = 0; spring.visualCompression = 0;}

function smoothstep(t){return t*t*(3-2*t);} function lerp(a,b,t){return a+(b-a)*t;} function metersToY(m){return canvas.height-120-m*120;}
function terrain(t){
  const x=t*canvas.width;
  if(t<0.18)return {x,y:metersToY(h1)};
  if(t<0.42)return {x,y:lerp(metersToY(h1),metersToY(h2),smoothstep((t-0.18)/(0.24)))};
  if(t<0.58)return {x,y:metersToY(h2)};
  if(t<0.82)return {x,y:lerp(metersToY(h2),metersToY(h3),smoothstep((t-0.58)/(0.24)))};
  return {x,y:metersToY(h3)};
}
function terrainSlope(t){const eps=0.0001,p1=terrain(Math.max(0,t-eps)),p2=terrain(Math.min(1,t+eps)); return (p2.y-p1.y)/(p2.x-p1.x);}

function getSpringContactT(){
  return Math.max(0.88, Math.min(0.94, (canvas.width - 175) / canvas.width));
}

function getWallStopT(){
  return Math.max(0.965, Math.min(0.992, (canvas.width - 42) / canvas.width));
}

function updatePhysics(dt){
  if(!state.running) return;

  const simDt = dt * state.timeScale;
  const slope = terrainSlope(ball.t);
  const gravityForce = state.gravity*slope*0.9;
  const frictionForce = -state.friction*ball.velocity;
  let accel = gravityForce+frictionForce;

  ball.velocity += accel*simDt;
  ball.t += ball.velocity*0.06*simDt;

  if(ball.t<0){ball.t=0; ball.velocity *= -0.25;}

  const springContactT = getSpringContactT();
  const wallStopT = getWallStopT();
  const compressionTarget = Math.max(0, ball.t - springContactT - state.springRest);
  const boundedTarget = Math.min(spring.maxCompression, compressionTarget);

  if(compressionTarget > 0 || spring.compression > spring.settleEps || spring.velocity > spring.settleEps){
    const springAccel = (state.springK * (boundedTarget - spring.compression) - state.springDamping * spring.velocity) / Math.max(0.1, state.mass);
    spring.velocity += springAccel * simDt;
    spring.compression += spring.velocity * simDt;

    if(spring.compression < 0){
      spring.compression = 0;
      spring.velocity = 0;
    }

    if(spring.compression > spring.maxCompression){
      spring.compression = spring.maxCompression;
      if(spring.velocity > 0) spring.velocity *= -0.15;
    }

    const springImpulse = (state.springK * spring.compression + state.springDamping * spring.velocity) / Math.max(0.1, state.mass);
    if(ball.t >= springContactT - 0.0001){
      ball.velocity -= springImpulse * simDt * 0.05;
    }
  } else {
    spring.compression = 0;
    spring.velocity = 0;
  }

  const compressedLimitT = wallStopT - spring.compression;
  if(ball.t > compressedLimitT){
    ball.t = compressedLimitT;
    if(ball.velocity > 0){
      const rebound = 0.25 + Math.min(0.65, spring.compression * 3.2);
      ball.velocity = -Math.abs(ball.velocity) * rebound;
    }
  }

  const visualTarget = Math.min(1, spring.compression / spring.maxCompression);
  const smoothRate = 1 - Math.exp(-20 * simDt);
  spring.visualCompression += (visualTarget - spring.visualCompression) * Math.min(1, smoothRate);

  statusText.textContent = state.running ? `Running · v=${ball.velocity.toFixed(2)} m/s · x=${(ball.t*100).toFixed(1)}% · spring=${(spring.compression*100).toFixed(1)}%` : "Paused";
}

function updateEnergy(){
  const p=terrain(ball.t); const h=(canvas.height-p.y-120)/120;
  const PE=state.mass*state.gravity*h, KE=0.5*state.mass*ball.velocity*ball.velocity;
  const compM=spring.compression*spring.compressionScale; const EE=0.5*state.springK*compM*compM; const ME=PE+KE+EE;
  maxEnergySeen = Math.max(maxEnergySeen, ME);
  [["peBar","peValue",PE],["keBar","keValue",KE],["eeBar","eeValue",EE],["meBar","meValue",ME]].forEach(([bar,val,x])=>{ $(bar).style.width=`${(x/maxEnergySeen)*100}%`; $(val).textContent=`${x.toFixed(1)} J`;});
}

function drawTerrain(){ctx.beginPath(); for(let i=0;i<=500;i++){const p=terrain(i/500); i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);} ctx.lineTo(canvas.width,canvas.height); ctx.lineTo(0,canvas.height); ctx.closePath();
  const g=ctx.createLinearGradient(0,0,0,canvas.height); g.addColorStop(0,"#cbd5e1"); g.addColorStop(1,"#94a3b8"); ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle="#475467"; ctx.lineWidth=5; ctx.stroke();}

function drawSpring(){
  const springContactT = getSpringContactT();
  const base=terrain(springContactT);
  const wallX=canvas.width-34;
  const y=base.y-8;

  const compression = spring.visualCompression;
  const compressionPx = compression * 78;
  const restLength = Math.max(72, wallX - base.x - 22);
  const minLength = 26;
  const length = Math.max(minLength, restLength - compressionPx);
  const coils = 18;
  const coilPitch = length / coils;
  const amp = Math.min(coilPitch * 0.62, lerp(14, 5, compression));
  const kick = Math.min(3.5, Math.abs(ball.velocity) * 0.2) * (compression > 0.01 ? 1 : 0.35);
  const wiggle = Math.sin(performance.now()*0.028) * kick;

  ctx.lineCap="round";
  ctx.lineJoin="round";

  ctx.strokeStyle="#64748b";
  ctx.lineWidth=6;
  const bumperX = wallX - length;

  ctx.beginPath();
  ctx.moveTo(base.x+6, y);
  ctx.lineTo(bumperX-4, y);
  ctx.stroke();

  const springGradient = ctx.createLinearGradient(wallX, y, bumperX, y);
  springGradient.addColorStop(0, "#f8fafc");
  springGradient.addColorStop(1, "#94a3b8");

  ctx.strokeStyle=springGradient;
  ctx.lineWidth=5;
  ctx.beginPath();
  for(let i=0;i<=coils*22;i++){
    const t=i/(coils*22);
    const x=wallX-t*length;
    const yy=y+Math.sin(t*Math.PI*coils*2)*(amp+wiggle);
    i===0?ctx.moveTo(x,yy):ctx.lineTo(x,yy);
  }
  ctx.stroke();

  const headX = bumperX;
  ctx.strokeStyle="#334155";
  ctx.lineWidth=5;
  ctx.beginPath();
  ctx.moveTo(headX, y-13);
  ctx.lineTo(headX, y+13);
  ctx.stroke();

  const wallGradient=ctx.createLinearGradient(wallX-16,y-72,wallX+16,y+72);
  wallGradient.addColorStop(0,"#cbd5e1");
  wallGradient.addColorStop(1,"#475569");
  ctx.fillStyle=wallGradient;
  ctx.fillRect(wallX,y-72,18,144);
}

function drawBall(x,y){ctx.beginPath(); ctx.arc(x+10,y+14,state.ballRadius,0,Math.PI*2); ctx.fillStyle="rgba(0,0,0,0.16)"; ctx.fill();
  const g=ctx.createRadialGradient(x-5,y-8,5,x,y,28); g.addColorStop(0,"#ffffff"); g.addColorStop(1,"#ef4444"); ctx.beginPath(); ctx.arc(x,y,state.ballRadius,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();}

updateLabels(); syncState(); resetBall();
let last = performance.now();
function animate(now){const dt=(now-last)/1000; last=now; ctx.clearRect(0,0,canvas.width,canvas.height); updatePhysics(dt); drawTerrain(); drawSpring(); const p=terrain(ball.t); drawBall(p.x,p.y-18); updateEnergy(); requestAnimationFrame(animate);} requestAnimationFrame(animate);
