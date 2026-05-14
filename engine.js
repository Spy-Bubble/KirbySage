/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   GameSage — Motor Gráfico Mixto (HD-2D)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
// 1. INICIALIZAR VANTA.JS (Nubes automáticas)
VANTA.CLOUDS({
  el: "#vanta-bg",
  mouseControls: false,
  touchControls: false,
  gyroControls: false,
  minHeight: 200.00,
  minWidth: 200.00,
  backgroundColor: 0x110022, 
  skyColor: 0x1a1a40,        
  cloudColor: 0x2d1b4e,      
  cloudShadowColor: 0x0a0a1a, 
  sunColor: 0x000000,        
  sunGlareColor: 0x000000,
  sunPosition: [0, 0, 0],
  speed: 0.6                 
});

// 2. CANVAS FRONTAL (Nieve Estelar)
const canvas = document.getElementById('bg-canvas');
const ctx    = canvas.getContext('2d');
let entities = [];

function resizeCanvas() { 
  canvas.width = window.innerWidth; 
  canvas.height = window.innerHeight; 
}

function initDreamLand() {
  entities = [];
  const area = canvas.width * canvas.height;
  
  // Nieve / Estrellas que caen
  for (let i = 0; i < area / 12000; i++) {
    entities.push({
      type: 'falling-star',
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1, // Variedad de tamaños
      speedY: Math.random() * 0.4 + 0.1, // Velocidad de caída lenta
      speedX: (Math.random() - 0.5) * 0.2, // Deriva por el viento
      swayOffset: Math.random() * Math.PI * 2, // Desfase del balanceo
      swaySpeed: Math.random() * 0.02 + 0.01,  // Velocidad del balanceo
      baseOpacity: Math.random() * 0.7 + 0.3
    });
  }
}

// ESTRELLA REALISTA (Punto de luz con resplandor)
function drawRealisticStar(ctx, x, y, radius, opacity) {
  if (opacity <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  
  // Efecto de halo estelar suave
  ctx.shadowBlur = radius * 4;
  ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
  
  ctx.fill();
  ctx.restore();
}

function renderFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const time = Date.now();

  entities.forEach(p => {
    if (p.type === 'falling-star') {
      // 1. Movimiento de caída
      p.y += p.speedY;
      
      // 2. Movimiento de balanceo (Sway) tipo hoja/copo de nieve
      p.x += Math.sin(time * p.swaySpeed + p.swayOffset) * 0.3 + p.speedX;
      
      // 3. Sistema de Desvanecimiento (Fade Out)
      let currentOpacity = p.baseOpacity;
      const fadeStart = canvas.height * 0.7; // Empiezan a desvanecerse al 70% de la pantalla
      
      if (p.y > fadeStart) {
        // Cálculo matemático para restar opacidad conforme bajan
        currentOpacity = p.baseOpacity * (1 - (p.y - fadeStart) / (canvas.height * 0.3));
      }

      // 4. Reiniciar arriba cuando mueren o desaparecen
      if (p.y > canvas.height || currentOpacity <= 0) {
        p.y = -10;
        p.x = Math.random() * canvas.width;
      }

      drawRealisticStar(ctx, p.x, p.y, p.size, currentOpacity);
    }
  });
  requestAnimationFrame(renderFrame);
}

window.addEventListener('resize', () => { resizeCanvas(); initDreamLand(); });
resizeCanvas(); initDreamLand(); renderFrame();

/* LÓGICA DEL MOTOR */
let KB = {
  questions: JSON.parse(localStorage.getItem('gs_q')) || BASE_QUESTIONS.map(q => ({ ...q })),
  rules:     JSON.parse(localStorage.getItem('gs_r')) || BASE_RULES.map(r => ({ ...r })),
  info:      JSON.parse(localStorage.getItem('gs_i')) || { ...BASE_INFO },
};

function saveKB() {
  localStorage.setItem('gs_q', JSON.stringify(KB.questions));
  localStorage.setItem('gs_r', JSON.stringify(KB.rules));
  localStorage.setItem('gs_i', JSON.stringify(KB.info));
}

let G = {};
function newState() { G = { facts: new Set(), answered: new Set(), chain: [], totalRules: KB.rules.length, currentQ: null }; }

function isAlive(rule) {
  for (const cond of rule.c) {
    if (cond.startsWith('no_')) { if (G.facts.has(cond.slice(3))) return false; } 
    else { if (G.facts.has('no_' + cond)) return false; }
  }
  return true;
}

function runFC() {
  let changed = true;
  while (changed) {
    changed = false;
    for (const rule of KB.rules) {
      if (G.facts.has(rule.t)) continue;
      if (!isAlive(rule))      continue;
      if (rule.c.every(c => G.facts.has(c))) {
        G.facts.add(rule.t); G.chain.push(rule); changed = true;
        logLine(`[REGLA] SI: ${rule.c.join(' + ')}`, 'fired'); logLine(`  → ${rule.t}`, 'fired');
      }
    }
  }
}

function bestQuestion() {
  const alive = KB.rules.filter(r => isAlive(r)); const score = {};
  for (const rule of alive) {
    for (const cond of rule.c) {
      const qid = cond.startsWith('no_') ? cond.slice(3) : cond;
      if (G.answered.has(qid)) continue;
      if (!KB.questions.find(q => q.id === qid)) continue;
      score[qid] = (score[qid] || 0) + 1;
    }
  }
  const top = Object.entries(score).sort((a, b) => b[1] - a[1]);
  if (!top.length) return null; return KB.questions.find(q => q.id === top[0][0]) || null;
}

function findConclusion() {
  for (const fact of G.facts) { if (KB.rules.some(r => r.t === fact)) return fact; }
  return null;
}

function showPhase(id) { document.querySelectorAll('.phase').forEach(p => p.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function logLine(txt, type = '') { const box = document.getElementById('log-box'); if (!box) return; const div = document.createElement('div'); div.className = 'log-line' + (type === 'fired' ? ' log-fired' : type === 'warn' ? ' log-warn' : ' log-fact'); div.textContent = '> ' + txt; box.appendChild(div); box.scrollTop = box.scrollHeight; }

function updatePanel() {
  const wrap = document.getElementById('facts-wrap'); wrap.innerHTML = ''; let any = false;
  for (const f of G.facts) {
    const span = document.createElement('span');
    if (f.startsWith('no_')) { span.className = 'tag tag-no'; span.textContent = '✗ ' + f.slice(3); } 
    else { span.className = 'tag tag-yes'; span.textContent = '✓ ' + f; }
    wrap.appendChild(span); any = true;
  }
  if (!any) wrap.innerHTML = '<span style="color:var(--ink-faint);font-size:.7rem">ninguno aún…</span>';
  document.getElementById('alive-num').textContent = KB.rules.filter(r => isAlive(r)).length;
}

function updateProgress() {
  const done = G.answered.size;
  const max = Math.min(KB.questions.length, 25);
  const percentage = Math.min(100, (done / max) * 100);
  document.getElementById('q-num').textContent = done + 1; 
  document.getElementById('q-total').textContent = max;
  document.getElementById('prog-fill').style.width = percentage + '%';
  
  // 3. ¡AÑADIMOS ESTO PARA MOVER EL GIF!
  document.getElementById('prog-kirby').style.left = percentage + '%';
}

function updateStats() {
  document.getElementById('stat-games').textContent = KB.rules.length;
  document.getElementById('stat-rules').textContent = KB.rules.length;
  document.getElementById('stat-qs').textContent    = KB.questions.length;
}

// Función para regresar al menú principal con la música correcta
function goToHome() {
  AudioManager.playState('intro');
  showPhase('phase-intro');
}

function startGame() {
  newState(); 
  document.getElementById('log-box').innerHTML = `<div class="log-line">> Motor iniciado.</div>`;
  updateStats(); 
  showPhase('phase-questioning'); 
  displayNextQuestion();
  
  // Usamos forcePlay para quitar el silencio forzosamente al arrancar
  AudioManager.forcePlay('game'); 
}

function displayNextQuestion() {
  const q = bestQuestion(); if (!q) { endRound(); return; } G.currentQ = q; updateProgress(); updatePanel();
  document.getElementById('q-text').textContent = q.text; logLine('Pregunta: ' + q.id);
}

function answer(val) {
  if (!G.currentQ) return; const q = G.currentQ; G.answered.add(q.id);
  if (val === true) {
    G.facts.add(q.id); logLine('Sí → ' + q.id, 'fact');
    if (typeof MUTEX_GROUPS !== 'undefined') {
      for (const group of MUTEX_GROUPS) { if (group.includes(q.id)) { for (const other of group) { if (other !== q.id) G.facts.add('no_' + other); } } }
    }
  } else if (val === false) { G.facts.add('no_' + q.id); logLine('No → no_' + q.id, 'fact'); } 
  else { logLine('No sé → omitiendo', 'warn'); }

  runFC(); updatePanel();
  const conclusion = findConclusion();
  if (conclusion) { showThinking(conclusion); return; }
  if (G.answered.size >= 25) { endRound(); return; }
  displayNextQuestion();
}

function showThinking(conclusion) { showPhase('phase-thinking'); setTimeout(() => { showResult(conclusion); }, 1500); }

function showResult(conclusion) {
  const info = KB.info[conclusion] || { e: '⭐', d: 'Habilidad', img: '' };
  const imgEl = document.getElementById('res-img'); const emojiEl = document.getElementById('res-emoji');
  if (info.img && info.img.trim() !== '') { imgEl.src = info.img; imgEl.style.display = 'block'; emojiEl.style.display = 'none'; } 
  else { imgEl.style.display = 'none'; emojiEl.style.display = 'block'; emojiEl.textContent = info.e; }
  
  document.getElementById('res-name').textContent  = conclusion;
  document.getElementById('res-desc').textContent  = info.d;
  document.getElementById('res-chain').textContent = Array.from(G.facts).filter(f => !f.startsWith('no_')).join(', ');
  AudioManager.playState('result'); // Cambiar música de victoria
  showPhase('phase-result');
}

function endRound() { AudioManager.playState('fail'); showPhase('phase-learning'); }

function learnGame() {
  const gameName = document.getElementById('l-game').value.trim();
  const featRaw  = document.getElementById('l-feat').value.trim();
  
  if (!gameName || !featRaw) {
    alert("¡Poyo! Por favor llena todos los campos.");
    return;
  }

  // VALIDACIÓN DE DUPLICADOS INTELIGENTE
  const cleanInput = gameName.toLowerCase().replace('kirby', '').trim();

  const exists = KB.rules.find(r => {
    const ruleName = r.t; // El nombre base en el código
    const cleanRule = ruleName.toLowerCase().replace('kirby', '').trim();
    
    // 1. Comparación directa (Inglés/Código)
    if (cleanRule === cleanInput || cleanInput.includes(cleanRule)) return true;

    // 2. Búsqueda en el Diccionario de ALIAS
    if (typeof ALIASES !== 'undefined' && ALIASES[ruleName]) {
      return ALIASES[ruleName].some(alias => {
        const cleanAlias = alias.toLowerCase();
        return cleanAlias === cleanInput || cleanInput.includes(cleanAlias);
      });
    }
    return false;
  });

  if (exists) {
    alert(`¡Un momento! La habilidad '${exists.t}' ya está registrada (o es una traducción). ¡No hace falta repetirla!`);
    return;
  }

  // --- Lógica de guardado habitual ---
  const isYes = document.querySelector('input[name="l-ans"]:checked').value === "yes";
  const featId = featRaw.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
  
  if (!KB.questions.find(q => q.id === featId)) {
    KB.questions.push({ id: featId, text: `¿${featRaw}?` });
  }

  const newConditions = Array.from(G.facts);
  newConditions.push(isYes ? featId : 'no_' + featId);

  KB.rules.push({ c: [...new Set(newConditions)], t: gameName });
  if (!KB.info[gameName]) KB.info[gameName] = { e: '⭐', d: "Habilidad nueva aprendida", img: '' };

  saveKB(); 
  alert(`¡Aprendido! Ahora ya sé qué es ${gameName}.`);
  startGame();
}

function resetMemory() { if (!confirm('¿Resetear a datos de fábrica?')) return; localStorage.clear(); location.reload(); }

// Inicialización de la pantalla al cargar
updateStats(); 
AudioManager.playState('intro');

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MOTOR DE GIFs FLOTANTES (PARAGUAS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function spawnGifs() {
  const cantidadGifs = 8; 
  
  for(let i = 0; i < cantidadGifs; i++) {
    let img = document.createElement('img');
    
    // Agregamos la ruta de la carpeta img/
    img.src = 'img/kirby paraguas.gif'; 
    
    img.className = 'kirby-gif-float';
    img.style.left = (Math.random() * 95) + 'vw';
    img.style.animationDuration = (Math.random() * 10 + 12) + 's, 3s'; 
    img.style.animationDelay = (Math.random() * 10) + 's, 0s';
    
    document.body.appendChild(img);
  }
}

// Ejecutar la inyección cuando la página termine de cargar
window.addEventListener('load', spawnGifs);