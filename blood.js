/* blood.ks - interactive ambient particle system
   Assumes images are placed in images/ folder inside the project.
*/

/* ---------------------------
   Configuration & resources
   --------------------------- */
const imageFiles = [
  '5gxpwn5vf5sa1.jpg',
  'bloobornesnow.jpg',
  'bloodbornel.jpg',
  '/bloodskeleton.jpg',
  '/bloodborne.webp',
  '/Yharnamgothic.webp',
  '/riverbloodborne.jpg'
];

const loreQuotes = [
  "They whisper in the dark — listen, hunter.",
  "The bells call to those who sleep. Wake them not.",
  "Blood is the old language. The city understands it.",
  "Some truths are best left undisturbed.",
  "A forgotten name, a stone without a story."
];

/* ---------------------------
   Canvas & Context
   --------------------------- */
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { alpha: true });

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

/* ---------------------------
   Image preload & background handling
   --------------------------- */
let bgImages = [];
let bgIndex = 0;
let bgOpacity = 1;

function preloadImages(files){
  return Promise.all(files.map(src => new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => { console.warn('Failed to load', src); res(null); };
    i.src = src;
  })));
}

preloadImages(imageFiles).then(imgs => {
  bgImages = imgs.filter(i => i);
  if(bgImages.length === 0) {
    console.error('No images loaded. Put images in images/ folder with the listed names.');
  }
  start();
});

/* ---------------------------
   Particle classes
   --------------------------- */
class Particle {
  constructor(x,y,opts = {}) {
    this.x = x; this.y = y;
    this.vx = opts.vx || (Math.random()-0.5) * (opts.speed || 0.4);
    this.vy = opts.vy || (Math.random()-0.5) * (opts.speed || 0.4);
    this.size = opts.size || (Math.random()*6 + 1);
    this.baseSize = this.size;
    this.color = opts.color || 'rgba(255,255,255,0.9)';
    this.alpha = opts.alpha || (Math.random()*0.6 + 0.15);
    this.life = opts.life || Infinity;
    this.age = 0;
    this.type = opts.type || 'ambient'; // ambient, spark, wisp, rune
    this.linkedImage = opts.linkedImage || null; // for lore reveal visuals
    this.interactive = opts.interactive || false;
  }
  step(dt){
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.age += dt;
    if(this.age > this.life) return false;
    return true;
  }
  draw(ctx){
    ctx.save();
    ctx.globalAlpha = this.alpha;
    if(this.type === 'spark'){
      // tiny glowing ember
      const g = ctx.createRadialGradient(this.x,this.y,this.size*0.1,this.x,this.y,this.size*6);
      g.addColorStop(0, 'rgba(255,200,80,1)');
      g.addColorStop(0.5,'rgba(255,70,20,0.8)');
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size*6, 0, Math.PI*2); ctx.fill();
    } else if(this.type === 'wisp'){
      // soft orb
      const g = ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.size*14);
      g.addColorStop(0, 'rgba(150,200,255,0.95)');
      g.addColorStop(1, 'rgba(20,30,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size*14, 0, Math.PI*2); ctx.fill();
    } else if(this.type === 'rune'){
      // small rotation symbol - simple representation
      ctx.fillStyle = 'rgba(200,160,255,' + (this.alpha*0.8) + ')';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size*3, 0, Math.PI*2);
      ctx.fill();
    } else {
      // ambient: small blurred dot
      ctx.fillStyle = `rgba(220,220,220,${this.alpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
      ctx.fill();
    }
    // optional linked image tiny preview
    if(this.linkedImage && this.alpha > 0.3){
      const iw = 48, ih = 30;
      ctx.globalAlpha = Math.min(1, this.alpha);
      ctx.drawImage(this.linkedImage, this.x - iw/2, this.y - ih/2, iw, ih);
    }
    ctx.restore();
  }
}

/* ---------------------------
   Particle system core
   --------------------------- */
let particles = [];
let lastTime = performance.now();
let running = true;
let weatherMode = 'ambient';
const densityControl = document.getElementById('density');

function spawnAmbient(count = 1){
  for(let i=0;i<count;i++){
    const x = Math.random()*canvas.width;
    const y = Math.random()*canvas.height;
    particles.push(new Particle(x,y,{
      vx: (Math.random()-0.5)*0.3,
      vy: (Math.random()*0.15 + 0.02),
      size: Math.random()*3+1,
      alpha: Math.random()*0.5+0.15,
      type: 'ambient',
      interactive: Math.random() < 0.02 // small chance to be clickable lore carrier
    }));
  }
}

function spawnAsh(count = 1){
  for(let i=0;i<count;i++){
    const x = Math.random()*canvas.width;
    const y = -10;
    particles.push(new Particle(x,y,{
      vx: (Math.random()-0.5)*0.2,
      vy: Math.random()*0.6 + 0.1,
      size: Math.random()*2 + 0.6,
      alpha: Math.random()*0.5+0.05,
      type: 'ambient',
      life: canvas.height/ (0.6 + Math.random()*0.4)
    }));
  }
}

function spawnSnow(count=1){
  for(let i=0;i<count;i++){
    const x = Math.random()*canvas.width;
    const y = -6;
    particles.push(new Particle(x,y,{
      vx: (Math.random()-0.5)*0.4,
      vy: Math.random()*0.8 + 0.2,
      size: Math.random()*3 + 1.2,
      alpha: Math.random()*0.6 + 0.2,
      type: 'ambient',
      life: canvas.height / 0.6
    }));
  }
}

function spawnRain(count=1){
  for(let i=0;i<count;i++){
    const x = Math.random()*canvas.width;
    const y = -6;
    particles.push(new Particle(x,y,{
      vx: (Math.random()-0.2)*1.0,
      vy: Math.random()*8 + 8,
      size: Math.random()*1.2 + 0.6,
      alpha: 0.6,
      type: 'ambient',
      life: canvas.height / 8
    }));
  }
}

function spawnSparks(count=1){
  for(let i=0;i<count;i++){
    const x = Math.random()*canvas.width;
    const y = Math.random()*canvas.height * 0.5;
    particles.push(new Particle(x,y,{
      vx: (Math.random()-0.5)*2,
      vy: (Math.random()-0.8)*1,
      size: Math.random()*2 + 0.4,
      alpha: Math.random()*0.9 + 0.1,
      type: 'spark',
      life: 100 + Math.random()*200
    }));
  }
}

function spawnWisp(x,y){
  particles.push(new Particle(x,y,{
    vx: (Math.random()-0.5)*0.5,
    vy: (Math.random()-0.5)*0.5,
    size: Math.random()*6 + 4,
    alpha: 0.9,
    type: 'wisp',
    life: 300 + Math.random()*800
  }));
}

function spawnRune(x,y){
  particles.push(new Particle(x,y,{
    vx: (Math.random()-0.5)*0.4,
    vy: (Math.random()-0.5)*0.4,
    size: Math.random()*4 + 2,
    alpha: 0.8,
    type: 'rune',
    life: 120 + Math.random()*200
  }));
}

/* Rare event generator (low probability) */
function maybeSpawnRare(dt){
  // chance scales with dt; roughly 0.002 per frame
  if(Math.random() < 0.002 * (dt/16)){
    // random rare: wisp or shooting star or rune
    const t = Math.random();
    if(t < 0.4) {
      // wisp drift across
      spawnWisp(Math.random()*canvas.width, Math.random()*canvas.height);
    } else if(t < 0.8) {
      // shooting star: fast particle across diagonal
      const y = Math.random()*canvas.height*0.4;
      particles.push(new Particle(0,y,{
        vx: 8 + Math.random()*6,
        vy: 1 + Math.random()*2,
        size: 2 + Math.random()*2,
        alpha: 1,
        type: 'spark',
        life: canvas.width / 8
      }));
    } else {
      // rune near centre
      spawnRune(canvas.width*0.5 + (Math.random()-0.5)*200, canvas.height*0.4 + (Math.random()-0.5)*200);
    }
  }
}

/* ---------------------------
   Weather transition logic
   --------------------------- */
let lastWeatherChange = 0;
function handleWeather(dt){
  const density = parseFloat(densityControl.value || '1');
  if(weatherMode === 'ambient'){
    spawnAmbient(1 * density);
  } else if(weatherMode === 'ash'){
    spawnAsh(2 * density);
    spawnAmbient(0.2 * density);
  } else if(weatherMode === 'snow'){
    spawnSnow(2 * density);
    spawnAmbient(0.1 * density);
  } else if(weatherMode === 'rain'){
    spawnRain(6 * density);
  } else if(weatherMode === 'sparks'){
    spawnSparks(2 * density);
    spawnAmbient(0.05* density);
  } else if(weatherMode === 'fog'){
    // fog: fewer particles but larger and slower
    spawnAmbient(0.6 * density);
  }

  // random auto-switch every 12-24 seconds
  lastWeatherChange += dt;
  if(lastWeatherChange > (12000 + Math.random()*12000)){
    lastWeatherChange = 0;
    const modes = ['ambient','ash','snow','rain','sparks','fog'];
    weatherMode = modes[Math.floor(Math.random()*modes.length)];
    document.getElementById('weatherSelect').value = weatherMode;
  }
}

/* ---------------------------
   Mouse interaction / input
   --------------------------- */
let mouse = { x: canvas.width/2, y: canvas.height/2, px: null, py: null, down:false};
canvas.addEventListener('mousemove', (e)=>{
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left);
  mouse.y = (e.clientY - rect.top);
});
canvas.addEventListener('mousedown', (e)=>{
  mouse.down = true;
  handleClick(mouse.x, mouse.y);
});
canvas.addEventListener('mouseup', ()=> mouse.down = false);

/* push particles around on mouse move */
function applyMouseGust(){
  if(mouse.px === null) { mouse.px = mouse.x; mouse.py = mouse.y; return; }
  const dx = mouse.x - mouse.px, dy = mouse.y - mouse.py;
  const speed = Math.sqrt(dx*dx + dy*dy);
  if(speed < 1) { mouse.px = mouse.x; mouse.py = mouse.y; return; }

  const force = Math.min(2, speed * 0.05);
  for(let p of particles){
    const dist2 = (p.x - mouse.x)*(p.x - mouse.x) + (p.y - mouse.y)*(p.y - mouse.y);
    if(dist2 < 20000){
      const d = Math.sqrt(dist2) + 0.001;
      p.vx += (dx/d) * force * (1 - d/150);
      p.vy += (dy/d) * force * (1 - d/150);
    }
  }
  mouse.px = mouse.x; mouse.py = mouse.y;
}

/* ---------------------------
   Click-to-reveal lore
   --------------------------- */
const lorePanel = document.getElementById('lore');
const loreContent = document.getElementById('loreContent');
document.getElementById('closeLore').addEventListener('click', ()=> lorePanel.classList.add('hidden'));

function handleClick(x,y){
  // find a nearby interactive particle
  for(let i = particles.length-1; i >= 0; i--){
    const p = particles[i];
    const dx = p.x - x, dy = p.y - y;
    if(Math.sqrt(dx*dx + dy*dy) < Math.max(12, p.size*6) && p.interactive){
      // reveal lore: show random quote and optionally the linked image
      const quote = loreQuotes[Math.floor(Math.random()*loreQuotes.length)];
      loreContent.innerHTML = `<p>${quote}</p>`;
      if(Math.random() < 0.6 && bgImages.length){
        // show a small image preview from background choices
        const img = bgImages[Math.floor(Math.random()*bgImages.length)];
        loreContent.innerHTML += `<img src="${img.src}" style="max-width:100%; margin-top:8px; border-radius:6px;">`;
      }
      lorePanel.classList.remove('hidden');
      // burst effect: spawn some sparks
      for(let s=0;s<12;s++){
        particles.push(new Particle(p.x, p.y, {
          vx: (Math.random()-0.5)*6,
          vy: (Math.random()-0.5)*6,
          size: Math.random()*2 + 0.8,
          alpha: 1,
          type: 'spark',
          life: 40 + Math.random()*80
        }));
      }
      // remove the clicked particle
      particles.splice(i,1);
      return;
    }
  }
  // if not clicking a particle, spawn a wisp near click
  spawnWisp(x,y);
}

/* ---------------------------
   Sound-reactive (WebAudio)
   --------------------------- */
let audioCtx = null, analyser = null, audioSource = null;
const fileInput = document.getElementById('audioFile');
const useMic = document.getElementById('useMic');

fileInput.addEventListener('change', (e) => {
  useMic.checked = false;
  setupAudioFromFile(e.target.files[0]);
});
useMic.addEventListener('change', async (e) => {
  if(useMic.checked){
    if(fileInput) fileInput.value = '';
    await setupAudioFromMic();
  } else {
    stopMic();
  }
});

function ensureAudioContext(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if(!analyser){
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
  }
}

/* play uploaded audio file */
function setupAudioFromFile(file){
  if(!file) return;
  ensureAudioContext();
  const url = URL.createObjectURL(file);
  const audio = new Audio(url);
  audio.loop = true;
  audio.crossOrigin = "anonymous";
  audio.play();
  if(audioSource) audioSource.disconnect();
  audioSource = audioCtx.createMediaElementSource(audio);
  audioSource.connect(analyser);
  analyser.connect(audioCtx.destination);
}

/* mic input */
let micStream = null;
async function setupAudioFromMic(){
  ensureAudioContext();
  try{
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if(audioSource) audioSource.disconnect();
    audioSource = audioCtx.createMediaStreamSource(micStream);
    audioSource.connect(analyser);
    // don't connect analyser to destination for mic
  } catch(err){ console.warn('Mic error', err); useMic.checked = false; }
}
function stopMic(){
  if(micStream){
    micStream.getTracks().forEach(t=>t.stop());
    micStream = null;
  }
}

/* feed analyser data to affect particles */
function applyAudioToParticles(){
  if(!analyser) return;
  const freq = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(freq);
  // compute a simple average of low/mid bands
  let lowSum = 0, count = 0;
  for(let i=0;i<freq.length/3;i++){ lowSum += freq[i]; count++; }
  const avg = (lowSum/count) / 255; // 0..1
  // bigger avg -> spawn extra sparks and pulse sizes
  if(avg > 0.25){
    // spawn extra sparks proportional to avg
    const n = Math.floor(avg * 6);
    spawnSparks(n);
  }
  // pulse size of wisps/ambient
  for(let p of particles){
    p.size = p.baseSize * (1 + avg*0.8);
  }
}

/* ---------------------------
   Drawing & main loop
   --------------------------- */
function drawBackground(){
  if(!bgImages.length) return;
  const img = bgImages[bgIndex % bgImages.length];
  if(!img) return;
  // draw with slight dark overlay
  ctx.save();
  ctx.globalAlpha = 1;
  // fill dark base
  ctx.fillStyle = '#050507';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  // draw scaled image keeping cover behavior
  const cw = canvas.width, ch = canvas.height;
  const iw = img.width, ih = img.height;
  const scale = Math.max(cw/iw, ch/ih);
  const iw2 = iw * scale, ih2 = ih * scale;
  const dx = (cw - iw2)/2, dy = (ch - ih2)/2;
  ctx.drawImage(img, dx, dy, iw2, ih2);
  // subtle vignette overlay
  ctx.globalCompositeOperation = 'multiply';
  const vg = ctx.createLinearGradient(0,0,0,ch);
  vg.addColorStop(0, 'rgba(0,0,0,0.25)');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,cw,ch);
  ctx.restore();
}

function loop(t){
  const dt = Math.min(60, t - lastTime);
  lastTime = t;
  if(running){
    // spawn based on weather
    handleWeather(dt);
    maybeSpawnRare(dt);
    applyMouseGust();
    // audio
    applyAudioToParticles();

    // update particles
    for(let i=particles.length-1;i>=0;i--){
      const ok = particles[i].step(dt);
      // remove if out of bounds a lot
      if(!ok || particles[i].x < -200 || particles[i].x > canvas.width + 200 || particles[i].y < -200 || particles[i].y > canvas.height + 400){
        particles.splice(i,1);
      }
    }
  }

  // draw
  drawBackground();
  // subtle overlay for atmosphere
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for(let p of particles){
    p.draw(ctx);
  }
  ctx.restore();

  requestAnimationFrame(loop);
}

/* ---------------------------
   Controls binding
   --------------------------- */
document.getElementById('toggleBtn').addEventListener('click', ()=>{
  running = !running;
  document.getElementById('toggleBtn').textContent = running ? 'Pause' : 'Play';
});
document.getElementById('weatherSelect').addEventListener('change', (e)=>{
  weatherMode = e.target.value;
});
document.getElementById('changeBgBtn').addEventListener('click', ()=>{
  bgIndex = (bgIndex + 1) % bgImages.length;
});
document.getElementById('resetBtn').addEventListener('click', ()=> particles = []);

/* keyboard shortcuts (space toggles) */
window.addEventListener('keydown', (e)=>{
  if(e.key === ' ') { running = !running; document.getElementById('toggleBtn').textContent = running ? 'Pause' : 'Play'; }
  if(e.key === 'n') { bgIndex = (bgIndex + 1) % bgImages.length; }
});

/* ---------------------------
   Start function (after images loaded)
   --------------------------- */
function start(){
  // initial spawn
  for(let i=0;i<300;i++) spawnAmbient(1);
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

/* export nothing needed - script attaches UI handlers already */
// No exports needed, everything is handled internally

// This script is self-contained and runs on page load                      
