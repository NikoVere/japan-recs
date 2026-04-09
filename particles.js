/* ═══════════════════════════════════════════
   SAKURA PARTICLE SYSTEM
   Cherry blossom petals with physics,
   gyroscope wind, and touch interaction
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  const MAX_PARTICLES = 120;
  const AMBIENT_COUNT = 6;
  const BURST_COUNT = 30;
  const MICRO_BURST = 8;

  // Petal color palette (sakura pinks and whites)
  const PETAL_COLORS = [
    'rgba(255, 183, 197, ',  // soft pink
    'rgba(255, 150, 170, ',  // medium pink
    'rgba(255, 200, 210, ',  // light pink
    'rgba(255, 220, 230, ',  // near white pink
    'rgba(255, 130, 160, ',  // deeper pink
    'rgba(255, 240, 245, ',  // almost white
  ];

  // Confetti colors for shake-to-discover
  const CONFETTI_COLORS = [
    'rgba(255, 183, 197, ',
    'rgba(255, 215, 0, ',    // gold
    'rgba(198, 40, 40, ',    // red
    'rgba(255, 255, 255, ',  // white
    'rgba(255, 150, 170, ',  // pink
  ];

  let canvas, ctx;
  let particles = [];
  let gyroGamma = 0;   // left-right tilt (-90 to 90)
  let gyroBeta = 0;    // front-back tilt (-180 to 180)
  let gyroEnabled = false;
  let ambientInterval = null;
  let animFrame = null;
  let isRunning = false;

  // ── Particle class ──
  class Petal {
    constructor(x, y, opts = {}) {
      this.x = x;
      this.y = y;
      this.size = opts.size || 3 + Math.random() * 6;
      this.aspectRatio = 0.6 + Math.random() * 0.3; // ellipse shape
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.08;
      this.vx = opts.vx || (Math.random() - 0.5) * 2;
      this.vy = opts.vy || -1 - Math.random() * 3;
      this.gravity = opts.gravity || 0.06 + Math.random() * 0.06;
      this.windResponse = 0.3 + Math.random() * 0.4;
      this.opacity = opts.opacity || 0.4 + Math.random() * 0.5;
      this.fadeRate = opts.fadeRate || 0.003 + Math.random() * 0.004;
      this.life = 1.0;
      this.color = opts.color || PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
      this.wobblePhase = Math.random() * Math.PI * 2;
      this.wobbleSpeed = 0.02 + Math.random() * 0.03;
      this.wobbleAmp = 0.3 + Math.random() * 0.5;
      this.airResistance = 0.98;
    }

    update(time) {
      // Gravity
      this.vy += this.gravity;

      // Wind: ambient sine wave + gyro influence
      const ambientWind = Math.sin(time * 0.001 + this.wobblePhase) * this.wobbleAmp;
      const gyroWind = gyroEnabled ? gyroGamma * 0.02 * this.windResponse : 0;
      this.vx += (ambientWind * 0.02) + (gyroWind * 0.05);

      // Air resistance
      this.vx *= this.airResistance;
      this.vy *= this.airResistance;

      // Position
      this.x += this.vx;
      this.y += this.vy;

      // Rotation
      this.rotation += this.rotationSpeed;

      // Wobble phase
      this.wobblePhase += this.wobbleSpeed;

      // Fade
      this.life -= this.fadeRate;

      return this.life > 0 && this.y < canvas.height + 50;
    }

    draw() {
      const alpha = this.opacity * Math.max(0, this.life);
      if (alpha < 0.01) return;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = alpha;

      // Draw petal as rotated ellipse
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size, this.size * this.aspectRatio, 0, 0, Math.PI * 2);
      ctx.fillStyle = this.color + alpha + ')';
      ctx.fill();

      // Subtle highlight on one side
      ctx.beginPath();
      ctx.ellipse(-this.size * 0.2, -this.size * 0.1, this.size * 0.4, this.size * 0.2, 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, ' + (alpha * 0.3) + ')';
      ctx.fill();

      ctx.restore();
    }
  }

  // ── Init ──
  function init() {
    canvas = document.getElementById('sakura-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'sakura-canvas';
      canvas.style.cssText = 'position:fixed;inset:0;z-index:50;pointer-events:none;width:100%;height:100%;';
      document.body.appendChild(canvas);
    }
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    // Start animation loop
    if (!isRunning) {
      isRunning = true;
      loop(performance.now());
    }

    // Start ambient mode
    startAmbient();

    // Touch interaction: tap anywhere for micro-burst
    document.addEventListener('touchstart', onTouch, { passive: true });
    document.addEventListener('click', onClick);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
  }

  // ── Animation loop ──
  function loop(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    particles = particles.filter(p => p.update(time));
    particles.forEach(p => p.draw());

    animFrame = requestAnimationFrame(loop);
  }

  // ── Ambient mode: gentle continuous drift ──
  function startAmbient() {
    if (ambientInterval) return;
    ambientInterval = setInterval(() => {
      if (particles.length < MAX_PARTICLES) {
        const x = Math.random() * window.innerWidth;
        const y = -20;
        particles.push(new Petal(x, y, {
          gravity: 0.02 + Math.random() * 0.03,
          fadeRate: 0.001 + Math.random() * 0.002,
          opacity: 0.2 + Math.random() * 0.3,
          size: 2 + Math.random() * 4,
          vy: 0.3 + Math.random() * 0.5,
          vx: (Math.random() - 0.5) * 0.5,
        }));
      }
    }, 800);
  }

  // ── Burst mode: triggered by interaction ──
  function burst(x, y, count, opts = {}) {
    const available = MAX_PARTICLES - particles.length;
    const n = Math.min(count || BURST_COUNT, available);

    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i / n) + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 4;
      particles.push(new Petal(x, y, {
        vx: Math.cos(angle) * speed * (opts.spread || 1),
        vy: Math.sin(angle) * speed * (opts.spread || 1) - 2,
        gravity: 0.08 + Math.random() * 0.05,
        fadeRate: 0.005 + Math.random() * 0.005,
        opacity: 0.5 + Math.random() * 0.4,
        size: opts.size || (3 + Math.random() * 5),
        color: opts.colors ? opts.colors[Math.floor(Math.random() * opts.colors.length)] : undefined,
      }));
    }
  }

  // ── Confetti burst (for shake-to-discover) ──
  function confettiBurst(x, y) {
    burst(x, y, 40, {
      spread: 1.5,
      size: 4 + Math.random() * 4,
      colors: CONFETTI_COLORS,
    });
  }

  // ── Rain from top (pull-down effect) ──
  function rain(count) {
    const n = Math.min(count || 20, MAX_PARTICLES - particles.length);
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        particles.push(new Petal(Math.random() * window.innerWidth, -10 - Math.random() * 50, {
          vy: 1 + Math.random() * 2,
          vx: (Math.random() - 0.5) * 1,
          gravity: 0.04 + Math.random() * 0.03,
          fadeRate: 0.002 + Math.random() * 0.003,
          opacity: 0.4 + Math.random() * 0.4,
        }));
      }, i * 50);
    }
  }

  // ── Touch handler ──
  function onTouch(e) {
    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      // Only micro-burst if touching empty space (not a button/link/card)
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el && (el.tagName === 'A' || el.tagName === 'BUTTON' || el.closest('.place-card') || el.closest('.city-pill') || el.closest('.nav'))) {
        return; // Don't spawn on interactive elements
      }
      burst(touch.clientX, touch.clientY, MICRO_BURST, { spread: 0.6, size: 2 + Math.random() * 3 });
    }
  }

  function onClick(e) {
    // Desktop fallback for touch
    if ('ontouchstart' in window) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && (el.tagName === 'A' || el.tagName === 'BUTTON' || el.closest('.place-card') || el.closest('.city-pill'))) {
      return;
    }
    burst(e.clientX, e.clientY, MICRO_BURST, { spread: 0.6, size: 2 + Math.random() * 3 });
  }

  // ── Gyroscope ──
  function initGyro() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ — need permission
      return; // Will be called from the permission prompt
    } else if ('DeviceOrientationEvent' in window) {
      // Android / older iOS
      enableGyro();
    }
  }

  function requestGyroPermission() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      return DeviceOrientationEvent.requestPermission().then(state => {
        if (state === 'granted') {
          enableGyro();
          return true;
        }
        return false;
      });
    }
    return Promise.resolve(false);
  }

  function enableGyro() {
    gyroEnabled = true;
    window.addEventListener('deviceorientation', (e) => {
      gyroGamma = e.gamma || 0; // left-right tilt
      gyroBeta = e.beta || 0;   // front-back tilt
    }, { passive: true });
  }

  // ── Shake detection ──
  let lastShake = 0;
  let shakeCallback = null;

  function initShakeDetection(callback) {
    shakeCallback = callback;
    if ('DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', onDeviceMotion, { passive: true });
    }
  }

  function onDeviceMotion(e) {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;
    const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    const now = Date.now();
    if (magnitude > 25 && now - lastShake > 2000) {
      lastShake = now;
      if (shakeCallback) shakeCallback();
    }
  }

  // ── Public API ──
  window.SakuraParticles = {
    init,
    burst,
    confettiBurst,
    rain,
    initGyro,
    requestGyroPermission,
    initShakeDetection,
    getGyro: () => ({ gamma: gyroGamma, beta: gyroBeta, enabled: gyroEnabled }),
  };

})();
