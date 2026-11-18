const openingCanvas = document.querySelector('#prologue canvas');
const openingArt = openingCanvas.getContext('2d');
let openingFrame;
let openingSound;
let openingStartedAt;
let lastOpeningSignal;

function openingBlock(color, x, y, width, height) {
  openingArt.fillStyle = color;
  openingArt.fillRect(Math.round(x), y, width, height);
}

function drawOpeningWalker(x, y, seconds) {
  const sprite = villageSprites.manager;
  const step = Math.floor(seconds * 8) % 2;
  openingBlock('#262e38', x + 6, y + 45, 34, 4);
  sprite.pixels.forEach((row, sy) => [...row].forEach((pixel, sx) => {
    if (pixel === '.') return;
    const color = { c: '#303b50', l: '#617188', w: '#eeeadd' }[pixel] || sprite.colors[pixel];
    openingBlock(color, x + sx * 3, y + sy * 3 + (sy > 11 && (sx < 8 ? step : !step) ? 2 : 0), 3, 3);
  }));
  openingBlock('#362c2b', x + 33, y + 32, 12, 10);
  openingBlock('#8d6d4c', x + 34, y + 33, 10, 7);
}

function drawStation(seconds) {
  openingBlock('#87979c', 0, 0, 384, 216);
  for (let x = 8; x < 384; x += 48) {
    openingBlock('#53676d', x, 0, 43, 92);
    openingBlock('#697d80', x + 3, 0, 36, 85);
    openingBlock('#a0afb0', x + 11, 0, 3, 85);
  }
  openingBlock('#b6ba9f', 0, 89, 384, 60);
  for (let y = 90; y < 145; y += 8) {
    openingBlock('#818976', 0, y, 384, 1);
    for (let x = y % 16; x < 384; x += 16) openingBlock('#818976', x, y, 1, 8);
  }
  openingBlock('#347849', 0, 39, 384, 13);
  openingBlock('#265c40', 109, 26, 166, 44);
  openingBlock('#70a26b', 114, 29, 156, 36);
  openingBlock('#e1ddbd', 119, 32, 146, 30);
  openingArt.fillStyle = '#243b32';
  openingArt.font = 'bold 15px sans-serif';
  openingArt.fillText('뚝섬', 165, 48);
  openingArt.font = '8px monospace';
  openingArt.fillText('Ttukseom', 164, 58);
  openingArt.fillText('210', 237, 51);
  openingBlock('#81644c', 196, 116, 121, 7);
  openingBlock('#454b49', 205, 123, 5, 23);
  openingBlock('#454b49', 303, 123, 5, 23);
  openingBlock('#8f9185', 0, 146, 384, 70);
  openingBlock('#c2af68', 0, 197, 384, 6);
  const train = -(Math.max(0, seconds - .65) ** 2) * 240;
  openingBlock('#545e68', train, 54, 145, 110);
  openingBlock('#c0c9c7', train, 58, 145, 98);
  openingBlock('#508061', train, 111, 145, 11);
  openingBlock('#526874', train + 10, 70, 39, 28);
  openingBlock('#526874', train + 105, 70, 28, 28);
  openingBlock('#37434d', train + 57, 64, 40, 89);
  drawOpeningWalker(66 + seconds * 49, 119 + Math.min(29, Math.round(seconds * 18)), seconds);
}

function drawCrossing(seconds, impact = 0) {
  openingBlock('#667784', 0, 0, 384, 216);
  for (let x = 0; x < 384; x += 47) {
    openingBlock('#536775', x, 18 + x % 29, 43, 73);
    openingBlock('#839098', x + 7, 49, 6, 10);
    openingBlock('#819096', x + 24, 49, 6, 10);
  }
  openingBlock('#a1a395', 0, 82, 384, 15);
  openingBlock('#3e4652', 0, 97, 384, 94);
  openingBlock('#8e9087', 0, 191, 384, 25);
  for (let y = 101; y < 189; y += 14) openingBlock('#bdc4bc', 118, y, 149, 5);
  openingBlock('#283443', 277, 45, 4, 53);
  openingBlock('#232e3a', 267, 42, 17, 29);
  openingBlock('#88ba89', 273, 49, 4, 4);
  openingBlock('#88ba89', 271, 54, 8, 4);
  openingBlock('#88ba89', 272, 58, 6, 6);
  drawOpeningWalker(170 + Math.round(impact * 18), 43 + Math.round(seconds * 43) + Math.round(impact * 8), seconds);
  if (impact > 0) {
    const car = 384 - Math.round(impact * 296);
    openingBlock('#d9ceaa', car - 48, 143, 52, 4);
    openingBlock('#d9ceaa', car - 36, 173, 40, 4);
    openingBlock('#1d2833', car + 8, 138, 111, 47);
    openingBlock('#384e59', car + 2, 144, 117, 35);
    openingBlock('#9fafaf', car + 40, 146, 38, 30);
    openingBlock('#f0dfad', car + 2, 148, 8, 6);
    openingBlock('#f0dfad', car + 2, 170, 8, 6);
    openingBlock('#ac8762', 178 + Math.round(impact * 39), 182, 11, 5);
  }
}

function playOpeningSound(water) {
  if (!wantsMusic || audioContext?.state !== 'running') return;
  openingSound?.stop();
  const now = audioContext.currentTime;
  const envelope = audioContext.createGain();
  envelope.connect(audioContext.destination);
  const duration = water ? .85 : .11;
  if (water) {
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.linearRampToValueAtTime(320, now + duration);
    openingSound = audioContext.createBufferSource();
    openingSound.buffer = buffer;
    openingSound.connect(filter).connect(envelope);
  } else {
    openingSound = audioContext.createOscillator();
    openingSound.frequency.value = 780;
    openingSound.connect(envelope);
  }
  envelope.gain.setValueAtTime(.001, now);
  envelope.gain.linearRampToValueAtTime(water ? .16 : .035, now + .04);
  envelope.gain.exponentialRampToValueAtTime(.001, now + duration);
  openingSound.onended = () => envelope.disconnect();
  openingSound.start(now);
  openingSound.stop(now + duration);
}

function stopPrologue() {
  cancelAnimationFrame(openingFrame);
  openingCanvas.style.filter = '';
  openingSound?.stop();
  openingSound = undefined;
}

function playOpening() {
  stopPrologue();
  pauseVillageMusic();
  openingStartedAt = performance.now();
  lastOpeningSignal = -1;
  function frame(time) {
    const seconds = (time - openingStartedAt) / 1000;
    if (seconds >= 8.9) { finishPrologue(true); return; }
    if (seconds < 3.2) {
      drawStation(motionPreference.matches ? 2 : seconds);
    } else if (seconds < 5.9) {
      drawCrossing(motionPreference.matches ? 1.6 : seconds - 3.2);
      const signal = Math.floor((seconds - 3.2) * 3);
      if (signal !== lastOpeningSignal) playOpeningSound(false);
      lastOpeningSignal = signal;
    } else {
      if (lastOpeningSignal >= 0) {
        openingSound?.stop();
        openingSound = undefined;
        lastOpeningSignal = -3;
      }
      if (seconds < 7.6) {
        const fade = Math.max(0, (seconds - 6.32) / 1.28);
        drawCrossing(2.1, motionPreference.matches ? .65 : Math.min(1, (seconds - 5.89) / .55));
        openingCanvas.style.filter = motionPreference.matches ? '' : 'blur(' + fade * 8 + 'px)';
        openingBlock('rgba(8, 12, 16, ' + fade + ')', 0, 0, 384, 216);
      } else {
        openingCanvas.style.filter = '';
        openingBlock('#080c10', 0, 0, 384, 216);
      }
      if (seconds >= 8.1 && lastOpeningSignal !== -2) {
        playOpeningSound(true);
        lastOpeningSignal = -2;
      }
    }
    openingFrame = requestAnimationFrame(frame);
  }
  openingFrame = requestAnimationFrame(frame);
}
