var d=document,
    w="https://tally.so/widgets/embed.js",
    v=function(){
      "undefined"!=typeof Tally
        ? Tally.loadEmbeds()
        : d.querySelectorAll("iframe[data-tally-src]:not([src])")
          .forEach(function(e){
            e.src=e.dataset.tallySrc
          })
    };

if ("undefined"!=typeof Tally)
  v();
else if (d.querySelector('script[src="'+w+'"]')==null) {
  var s=d.createElement("script");
  s.src=w;
  s.onload=v;
  s.onerror=v;
  d.body.appendChild(s);
}

(function () {
  const canvas = document.getElementById('net-bg');
  const ctx = canvas.getContext('2d');
  let width, height, dpr;

  const COLORS = [
    '255, 47, 176',   // hot pink
    '214, 31, 143',   // magenta
    '160, 32, 240',   // violet
    '255, 130, 210',  // soft rose
  ];

  const NODE_COUNT_BASE = 90; // scaled by area
  const LINK_DIST = 130;
  const MOUSE_RADIUS = 170;
  const MOUSE_LINK_DIST = 220;

  let nodes = [];
  let mouse = { x: -9999, y: -9999, active: false };
  let ripples = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildNodes();
  }

  function buildNodes() {
    const area = width * height;
    const count = Math.round(NODE_COUNT_BASE * Math.min(2.2, area / (1400 * 800)));
    nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.2 + Math.random() * 1.8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.6 + Math.random() * 0.8
      });
    }
  }

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  });

  window.addEventListener('mouseleave', () => {
    mouse.active = false;
    mouse.x = -9999;
    mouse.y = -9999;
  });

  window.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    ripples.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      r: 0,
      alpha: 0.7,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    });
  });

  // Touch support: treat touchmove like mousemove so it's interactive on mobile too
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - rect.left;
      mouse.y = e.touches[0].clientY - rect.top;
      mouse.active = true;
    }
  }, { passive: true });

  window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      ripples.push({
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
        r: 0,
        alpha: 0.7,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    }
  }, { passive: true });

  let t0 = performance.now();

  function step(elapsed, dt) {
    // move + gently steer nodes away from the mouse (repel), with slow drift return
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;
      n.x = Math.max(0, Math.min(width, n.x));
      n.y = Math.max(0, Math.min(height, n.y));

      if (mouse.active) {
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < MOUSE_RADIUS && dist > 0.01) {
          const force = (1 - dist / MOUSE_RADIUS) * 0.6;
          n.x += (dx / dist) * force;
          n.y += (dy / dist) * force;
        }
      }
    }

    for (const r of ripples) {
      r.r += 3.2;
      r.alpha *= 0.965;
    }
    ripples = ripples.filter(r => r.alpha > 0.02);

  }

  function draw(elapsed) {
    ctx.clearRect(0, 0, width, height);

    // links between nearby nodes
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < LINK_DIST) {
          const alpha = (1 - dist / LINK_DIST) * 0.35;
          ctx.strokeStyle = `rgba(${a.color}, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // link to mouse if close, brighter than node-to-node links
      if (mouse.active) {
        const dx = a.x - mouse.x, dy = a.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < MOUSE_LINK_DIST) {
          const alpha = (1 - dist / MOUSE_LINK_DIST) * 0.55;
          ctx.strokeStyle = `rgba(255, 170, 225, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }

    // nodes
    for (const n of nodes) {
      const tw = 0.6 + 0.4 * Math.sin(elapsed * n.twinkleSpeed + n.twinklePhase);
      ctx.fillStyle = `rgba(${n.color}, ${0.55 * tw + 0.25})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // mouse glow
    if (mouse.active) {
      const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, MOUSE_RADIUS);
      grad.addColorStop(0, 'rgba(255, 130, 210, 0.18)');
      grad.addColorStop(1, 'rgba(255, 130, 210, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, MOUSE_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 220, 245, 0.9)';
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // click ripples
    for (const r of ripples) {
      ctx.strokeStyle = `rgba(${r.color}, ${r.alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function loop(now) {
    const elapsed = (now - t0) / 1000;
    step(elapsed);
    draw(elapsed);
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);
})();