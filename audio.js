/**
 * ══════════════════════════════════════════════════════════════
 * KirbySage — Gestor de Audio Dinámico (Corregido)
 * Archivo: audio.js
 * ══════════════════════════════════════════════════════════════
 */

const AudioManager = (() => {
  let currentTrack = null;
  let isMuted = true; 
  let currentState = '';

const tracks = {
    intro: 'music/intro.mp3',
    game: [
      'music/game1.mp3', 
      'music/game2.mp3', 
      'music/game3.mp3', 
      'music/game4.mp3', 
      'music/game5.mp3'
    ],
    result: 'music/resultado.mp3',
    fail: 'music/game_over.mp3' 
  };

  function playState(state) {
    if (isMuted) return; 

    // SOLUCIÓN: Si ya estamos en ese estado y la pista existe, solo la reanudamos
    if (currentState === state && currentTrack) {
      currentTrack.play().catch(err => console.warn(err));
      return; 
    }

    if (currentTrack) {
      currentTrack.pause();
      currentTrack.currentTime = 0; 
    }

    currentState = state;
    let src = '';

    if (state === 'intro') {
      src = tracks.intro;
    } else if (state === 'game') {
      src = tracks.game[Math.floor(Math.random() * tracks.game.length)];
    } else if (state === 'result') {
      src = tracks.result;
    } else if (state === 'fail') {
      src = tracks.fail;
    }

    currentTrack = new Audio(src);
    currentTrack.loop = true;
    currentTrack.volume = 0.25;
    
    currentTrack.play().catch(err => {
      console.warn("Esperando interacción del usuario.");
    });
  }

  function toggleMusic() {
    isMuted = !isMuted;
    const btn = document.getElementById('music-toggle');

    if (isMuted) {
      // Si silenciamos, pausamos la pista actual
      if (currentTrack) currentTrack.pause();
      if (btn) btn.innerHTML = "🎵 Activar Música";
    } else {
      // Si activamos, cambiamos el botón
      if (btn) btn.innerHTML = "🔇 Silenciar Música";
      
      // SOLUCIÓN: Si ya hay una pista pausada, la reanudamos. Si no, tocamos la intro.
      if (currentTrack && currentState !== '') {
        currentTrack.play().catch(err => console.warn(err));
      } else {
        playState('intro'); 
      }
    }
  }

  function forcePlay(state) {
    isMuted = false;
    const btn = document.getElementById('music-toggle');
    if (btn) btn.innerHTML = "🔇 Silenciar Música";
    playState(state);
  }

  return {
    toggle: toggleMusic,
    playState: playState,
    forcePlay: forcePlay
  };
})();