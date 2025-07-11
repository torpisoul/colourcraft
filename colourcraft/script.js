// script.js
let tonejsLoadFailed = false;
let toneJsStarted = false;
let gameFullyStarted = false;

// --- Game Configuration ---
const C_RED = 'red'; const C_YELLOW = 'yellow'; const C_BLUE = 'blue';
const C_ORANGE = 'orange'; const C_GREEN = 'green'; const C_PURPLE = 'purple';
const C_VERMILION = 'vermilion'; const C_AMBER = 'amber';
const C_CHARTREUSE = 'chartreuse'; const C_TEAL = 'teal';
const C_VIOLET = 'violet'; const C_MAGENTA = 'magenta';
const DEFAULT_CANVAS_COLOR = '#e2e8f0';

const allGameColors = {
    [C_RED]:    { name: 'Red', hex: '#FF0000', type: 'primary', id: C_RED },
    [C_YELLOW]: { name: 'Yellow', hex: '#FFFF00', type: 'primary', id: C_YELLOW },
    [C_BLUE]:   { name: 'Blue', hex: '#0000FF', type: 'primary', id: C_BLUE },
    [C_ORANGE]: { name: 'Orange', hex: '#FFA500', type: 'secondary', id: C_ORANGE, recipe: [C_RED, C_YELLOW].sort() },
    [C_GREEN]:  { name: 'Green', hex: '#00DD00', type: 'secondary', id: C_GREEN, recipe: [C_YELLOW, C_BLUE].sort() },
    [C_PURPLE]: { name: 'Purple', hex: '#A020F0', type: 'secondary', id: C_PURPLE, recipe: [C_BLUE, C_RED].sort() },
    [C_VERMILION]:  { name: 'Vermilion', hex: '#FF4500', type: 'tertiary', id: C_VERMILION, recipe: [C_RED, C_ORANGE].sort() },
    [C_AMBER]:      { name: 'Amber', hex: '#FFBF00', type: 'tertiary', id: C_AMBER, recipe: [C_YELLOW, C_ORANGE].sort() },
    [C_CHARTREUSE]: { name: 'Chartreuse', hex: '#7FFF00', type: 'tertiary', id: C_CHARTREUSE, recipe: [C_YELLOW, C_GREEN].sort() },
    [C_TEAL]:       { name: 'Teal', hex: '#008080', type: 'tertiary', id: C_TEAL, recipe: [C_BLUE, C_GREEN].sort() },
    [C_VIOLET]:     { name: 'Violet', hex: '#8A2BE2', type: 'tertiary', id: C_VIOLET, recipe: [C_BLUE, C_PURPLE].sort() },
    [C_MAGENTA]:    { name: 'Magenta', hex: '#FF00FF', type: 'tertiary', id: C_MAGENTA, recipe: [C_RED, C_PURPLE].sort() },
};

// --- Game State ---
let unlockedColorIds = [C_RED, C_YELLOW, C_BLUE];
let slot1Color = 'empty'; let slot2Color = 'empty';
let currentMode = 'creative';
let puzzleState = {
    targetColorId: null, targetColorName: '', startTime: null,
    timerIntervalId: null, score: 0, bonusCompletionsInRow: 0
};
const POINTS_CORRECT = 10; const POINTS_BONUS = 5; const BONUS_TIME_LIMIT_MS = 5000;

let draggedColorId = null;
let britishEnglishVoice = null;

// --- DOM Elements ---
let paletteGrid, slot1Div, slot2Div, resultPotDiv, resultPotText, messageArea,
    exploreModeBtn, puzzleModeBtn, creativeModeBtn,
    puzzleUi, targetColourDisplay, targetColourName, puzzleTimerDisplay,
    scoreArea, scoreValueDisplay,
    confettiCanvas, confettiCtx,
    explorePuzzleMixingArea, creativeModeMixingArea, creativeMixingCanvas,
    mainTitleElement, playButtonEl, playOverlayEl, gameContentEl, playOverlayTitleEl;

// --- Sound Effects (Tone.js) ---
let dropSound, successSound, muckyMixSound, alreadyMadeSound,
    melodySynth, bassSynth, rhythmSynth,
    backgroundMelodyPart, bassPart, rhythmPart;

// --- Utility Functions ---
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Script load error for ${src}`));
        document.head.appendChild(script);
    });
}

function arraysEqual(a, b) {
    if (a === b) return true; if (a == null || b == null) return false; if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; ++i) { if (a[i] !== b[i]) return false; } return true;
}

function hexToRgb(hex) {
    if (typeof hex !== 'string') {
        console.error("[hexToRgb] Received non-string input:", hex);
        return null;
    }
    const trimmedHex = hex.trim();
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(trimmedHex);
    if (!result) {
        console.error("[hexToRgb] Regex did not match for trimmedHex:", `'${trimmedHex}'`);
        return null;
    }
    try {
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
            console.error("[hexToRgb] parseInt resulted in NaN for one or more components.", result);
            return null;
        }
        return { r, g, b };
    } catch (e) {
        console.error("[hexToRgb] Error during parseInt:", e);
        return null;
    }
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

// --- Sound Initialization and Controls ---
function initSounds() {
    if (typeof Tone === 'undefined' || !toneJsStarted) { console.error("Tone.js object not available or Tone not started for initSounds."); return; }
    try {
        dropSound = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.01, release: 0.1 }, volume: -10 }).toDestination();
        successSound = new Tone.PolySynth(Tone.Synth, { volume: -8, envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2 } }).toDestination();
        alreadyMadeSound = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.05, release: 0.2 }, volume: -12 }).toDestination();
        muckyMixSound = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.05, decay: 0.2, sustain: 0, release: 0.1 }, volume: -15 }).toDestination();

        melodySynth = new Tone.Synth({ oscillator: { type: 'triangle8' }, envelope: { attack: 0.02, decay: 0.3, sustain: 0.1, release: 0.5 }, volume: -22 }).toDestination();
        bassSynth = new Tone.MonoSynth({ oscillator: { type: 'fmsine' }, envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.5 }, volume: -18 }).toDestination();
        rhythmSynth = new Tone.PluckSynth({ attackNoise: 0.5, dampening: 4000, resonance: 0.8, volume: -20 }).toDestination();

        const melodyPattern = [ 'C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4', null ];
        backgroundMelodyPart = new Tone.Sequence((time, note) => {
            if (note) melodySynth.triggerAttackRelease(note, '4n', time);
        }, melodyPattern, '2n').start(0);
        backgroundMelodyPart.loop = true;
        backgroundMelodyPart.humanize = "32n";

        const bassPattern = [ 'C2', null, 'G2', null, 'F2', null, 'C2', null ];
        bassPart = new Tone.Sequence((time, note) => {
            if (note) bassSynth.triggerAttackRelease(note, '2n', time);
        }, bassPattern, '1m').start(0);
        bassPart.loop = true;

        const rhythmPattern = [
            { time: '0:0', note: 'C4', duration: '16n'}, { time: '0:1:2', note: 'G3', duration: '16n'},
            { time: '0:2', note: 'C4', duration: '16n'}, { time: '0:3:2', note: 'G3', duration: '16n'}
        ];
        rhythmPart = new Tone.Part((time, value) => {
            rhythmSynth.triggerAttackRelease(value.note, value.duration, time);
        }, rhythmPattern).start(0);
        rhythmPart.loop = true; rhythmPart.loopEnd = '1m';

        console.log("Tone.js sounds and multi-layered music initialized successfully.");
    } catch (error) { console.error("Error initializing Tone.js sounds:", error); }
}

function playDropSound() { if (toneJsStarted && dropSound) dropSound.triggerAttackRelease('C5', '8n');}
function playSuccessSound() { if (toneJsStarted && successSound) { const now = Tone.now(); successSound.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '8n', now); successSound.triggerAttackRelease(['E4', 'G4', 'C5', 'E5'], '8n', now + 0.2); }}
function playAlreadyMadeSound() { if (toneJsStarted && alreadyMadeSound) alreadyMadeSound.triggerAttackRelease('A4', '4n');}
function playMuckyMixSound() { if (toneJsStarted && muckyMixSound) muckyMixSound.triggerAttackRelease('4n');}

function startBackgroundMusic() {
    if (toneJsStarted && Tone.Transport.state !== 'started') {
        Tone.Transport.bpm.value = 90;
        Tone.Transport.start("+0.1");
        console.log("Background music transport started.");
    } else if (toneJsStarted && Tone.Transport.state === 'started') {
        console.log("Background music transport already started.");
        if (backgroundMelodyPart && backgroundMelodyPart.state !== 'started') backgroundMelodyPart.start(0);
        if (bassPart && bassPart.state !== 'started') bassPart.start(0);
        if (rhythmPart && rhythmPart.state !== 'started') rhythmPart.start(0);
    } else {
        console.log("Background music not started - Tone.js not ready.");
    }
}

async function startAudioSystems() {
    if (tonejsLoadFailed) { console.warn("Cannot start audio systems because Tone.js failed to load."); return; }
    if (!toneJsStarted) {
        try {
            if (typeof Tone !== 'undefined' && Tone.start) {
                await Tone.start();
                if (Tone.context.state === 'running') {
                    console.log("Tone.js AudioContext is running.");
                    toneJsStarted = true;
                    initSounds();
                } else {
                    console.error(`Tone.js AudioContext did not start. State: ${Tone.context.state}`);
                    tonejsLoadFailed = true; // Mark as failed if context doesn't run
                }
            }
            else { console.error("Tone.js library is not loaded or Tone.start is not available. typeof Tone is currently:", typeof Tone); tonejsLoadFailed = true; }
        } catch (error) { console.error("Error starting Tone.js:", error); tonejsLoadFailed = true; }
    }
    loadVoices(); // Load voices regardless of Tone.js state, but after attempting Tone.start
}

// --- Speech Synthesis ---
function loadVoices() {
    if (typeof speechSynthesis === 'undefined') { console.warn("SpeechSynthesis API not available."); return; }
    const setVoice = () => {
        const voices = speechSynthesis.getVoices();
        britishEnglishVoice = voices.find(voice => voice.lang === 'en-GB' && voice.name.toLowerCase().includes('female')) ||
                              voices.find(voice => voice.lang === 'en-GB') ||
                              voices.find(voice => voice.lang.startsWith('en-GB'));
        if (!britishEnglishVoice) {
            britishEnglishVoice = voices.find(voice => voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female')) ||
                                  voices.find(voice => voice.lang.startsWith('en'));
        }
    };
    if (speechSynthesis.getVoices().length === 0 && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
            setVoice();
            speechSynthesis.onvoiceschanged = null; // Remove listener after voices are loaded
        };
    } else {
        setVoice();
    }
}

function speakMessage(message) {
    if (!message || !gameFullyStarted || typeof speechSynthesis === 'undefined') return;
    if (!britishEnglishVoice && speechSynthesis.getVoices().length > 0) { loadVoices(); } // Attempt to load voices if not already
    if (speechSynthesis.getVoices().length === 0) { console.warn("Speech synthesis voices not available to speak."); return; }

    const utterance = new SpeechSynthesisUtterance(message);
    if (britishEnglishVoice) {
        utterance.voice = britishEnglishVoice;
    } else {
        utterance.lang = 'en-GB'; // Fallback language
    }
    utterance.pitch = 1.1; utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
}

// --- UI and Game Logic Functions ---
function displayMessage(text, textColorClass = 'text-pink-500', duration = 3000) {
    if (!messageArea) return;
    if (messageArea.timeoutId) { // Clear existing timeout if any
        clearTimeout(messageArea.timeoutId);
    }
    // Remove old text color classes (assuming Tailwind structure like text-*-*)
    const existingColorClass = Array.from(messageArea.classList).find(cls => cls.startsWith('text-'));
    if (existingColorClass) {
        messageArea.classList.remove(existingColorClass);
    }

    messageArea.textContent = text;
    if (textColorClass) {
        messageArea.classList.add(textColorClass);
    }

    if (duration > 0) {
        messageArea.timeoutId = setTimeout(() => {
            messageArea.textContent = '';
            if (textColorClass) { // Also remove the class when clearing
                messageArea.classList.remove(textColorClass);
            }
        }, duration);
    }
}

function highlightParentSwatches(color1Id, color2Id) {
    if (!paletteGrid) return;
    const swatches = paletteGrid.querySelectorAll('.color-swatch-draggable');
    swatches.forEach(swatch => {
        const id = swatch.dataset.colorId;
        if (id === color1Id || id === color2Id) {
            swatch.classList.add('parent-highlight');
            setTimeout(() => swatch.classList.remove('parent-highlight'), 2000);
        }
    });
    // console.log(`Highlighting parents: ${color1Id}, ${color2Id}`); // Optional: for debugging
}

function requestAppFullScreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => console.warn(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`));
    } else if (elem.mozRequestFullScreen) { /* Firefox */
        elem.mozRequestFullScreen().catch(err => console.warn(`Error attempting to enable full-screen mode (Firefox): ${err.message} (${err.name})`));
    } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
        elem.webkitRequestFullscreen().catch(err => console.warn(`Error attempting to enable full-screen mode (WebKit): ${err.message} (${err.name})`));
    } else if (elem.msRequestFullscreen) { /* IE/Edge */
        elem.msRequestFullscreen().catch(err => console.warn(`Error attempting to enable full-screen mode (MS): ${err.message} (${err.name})`));
    }
}

function clearSlotVisual(slotDiv) {
    if (!slotDiv) return; slotDiv.style.backgroundColor = '#cbd5e1'; slotDiv.classList.remove('filled');
    slotDiv.innerHTML = `<span class="sr-only">Mixing Slot ${slotDiv.id === 'slot1' ? '1' : '2'}</span>`;
}

function setupConfettiCanvas() {  if (!confettiCanvas) return; confettiCanvas.width = window.innerWidth; confettiCanvas.height = window.innerHeight; }
function Particle(x, y, color) {  this.x = x; this.y = y; this.color = color; this.radius = Math.random() * 6 + 3; this.vx = Math.random() * 10 - 5; this.vy = Math.random() * -12 - 6; this.gravity = 0.35; this.opacity = 1; this.fade = 0.01 + Math.random() * 0.015;}
Particle.prototype.update = function() {  this.vy += this.gravity; this.x += this.vx; this.y += this.vy; this.opacity -= this.fade; };
Particle.prototype.draw = function() {  if(!confettiCtx) return; confettiCtx.beginPath(); confettiCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false); confettiCtx.fillStyle = this.color; confettiCtx.globalAlpha = this.opacity; confettiCtx.fill(); confettiCtx.closePath(); };
let confettiParticles = []; // Ensure confettiParticles is initialized
let confettiAnimationId;

function createConfetti(colorHex) {
    if (!gameFullyStarted || !confettiCtx) return;
    const potRect = (currentMode === 'creative' && creativeMixingCanvas) ? creativeMixingCanvas.getBoundingClientRect() : (resultPotDiv ? resultPotDiv.getBoundingClientRect() : null);
    if (!potRect) return;
    const centerX = potRect.left + potRect.width / 2; const centerY = potRect.top + potRect.height / 2;
    confettiParticles = []; const particleCount = 70 + Math.floor(Math.random() * 50) ; const colors = [colorHex, '#FFD700', '#FF69B4', '#00FFFF', '#32CD32'];
    for (let i = 0; i < particleCount; i++) { confettiParticles.push(new Particle(centerX, centerY, colors[Math.floor(Math.random() * colors.length)]));}
    animateConfetti();
}
function animateConfetti() {
    if (!confettiCtx) return; cancelAnimationFrame(confettiAnimationId); confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height); let stillAlive = false;
    confettiParticles.forEach(p => { p.update(); p.draw(); if (p.opacity > 0) stillAlive = true; });
    confettiCtx.globalAlpha = 1; if (stillAlive) { confettiAnimationId = requestAnimationFrame(animateConfetti); } else { confettiParticles = []; confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height); }
}

function renderPalette() {
    console.log("renderPalette called. Current mode:", currentMode);
    if (!paletteGrid) { console.error("paletteGrid is null in renderPalette"); return; }
    paletteGrid.innerHTML = ''; // Clear existing palette
    let colorsToDisplay = [];
    if (currentMode === 'creative') {
        colorsToDisplay = Object.values(allGameColors);
    } else {
        colorsToDisplay = Object.values(allGameColors).filter(c => unlockedColorIds.includes(c.id) || c.type === 'primary');
    }

    colorsToDisplay.sort((a,b) => { const typeOrder = { 'primary': 1, 'secondary': 2, 'tertiary': 3 }; if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type]; return a.name.localeCompare(b.name); });

    if (colorsToDisplay.length === 0) {
        console.warn("No colors to display in palette for mode:", currentMode);
    } else {
         console.log(`Rendering ${colorsToDisplay.length} swatches for palette.`);
    }

    colorsToDisplay.forEach(color => {
        const swatch = document.createElement('div'); swatch.className = 'color-swatch-draggable w-16 h-16 sm:w-20 sm:h-20';
        swatch.style.backgroundColor = color.hex;
        const rgb = hexToRgb(color.hex);
        if (rgb) {
            const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
            swatch.style.color = brightness > 125 ? '#1f2937' : '#FFFFFF';
        } else {
            swatch.style.color = '#1f2937'; // Default for safety
        }
        swatch.textContent = color.name; swatch.draggable = true; swatch.dataset.colorId = color.id;
        swatch.addEventListener('dragstart', handleDragStart); swatch.addEventListener('touchstart', handleTouchStart, { passive: false });
        paletteGrid.appendChild(swatch);
        if (color.justUnlocked && currentMode !== 'creative') { swatch.classList.add('animate-popIn'); delete color.justUnlocked; }
    });
}

let touchDragElement = null; let touchOffsetX, touchOffsetY;
function handleTouchStart(event) {
    if (!gameFullyStarted) return;
    event.preventDefault();
    const swatch = event.currentTarget;
    draggedColorId = swatch.dataset.colorId;
    // console.log("Touch Start - Dragged Color ID:", draggedColorId); // Optional: for debugging
    if (!draggedColorId) { console.warn("Touch Start: No color ID on dragged swatch"); return; }

    touchDragElement = swatch.cloneNode(true);
    touchDragElement.style.position = 'absolute';
    touchDragElement.style.opacity = '0.7';
    touchDragElement.style.pointerEvents = 'none';
    touchDragElement.style.zIndex = '2000'; // Ensure it's above other elements
    document.body.appendChild(touchDragElement);

    const touch = event.touches[0];
    const rect = swatch.getBoundingClientRect();
    touchOffsetX = touch.clientX - rect.left;
    touchOffsetY = touch.clientY - rect.top;
    moveTouchDragElement(touch.clientX, touch.clientY);

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
}
function moveTouchDragElement(x, y) {  if (touchDragElement) { touchDragElement.style.left = (x - touchOffsetX) + 'px'; touchDragElement.style.top = (y - touchOffsetY) + 'px'; } }

function handleTouchMove(event) {
    if (!gameFullyStarted || !touchDragElement) return;
    event.preventDefault();
    const touch = event.touches[0];
    moveTouchDragElement(touch.clientX, touch.clientY);

    const dropTargets = (currentMode === 'creative' && creativeMixingCanvas) ? [creativeMixingCanvas] :
                        (slot1Div && slot2Div ? [slot1Div, slot2Div] : []);

    dropTargets.forEach(target => {
        if(!target) return;
        const rect = target.getBoundingClientRect();
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            target.classList.add('dragging-over');
        } else {
            target.classList.remove('dragging-over');
        }
    });
}

function handleTouchEnd(event) {
     if (!gameFullyStarted || !touchDragElement) return;
     const touch = event.changedTouches[0];
     let droppedOnTarget = null;

     const potentialDropTargets = (currentMode === 'creative' && creativeMixingCanvas) ? [creativeMixingCanvas] :
                               (slot1Div && slot2Div ? [slot1Div, slot2Div] : []);

    for (const target of potentialDropTargets) {
        if (!target) continue;
        const rect = target.getBoundingClientRect();
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            droppedOnTarget = target;
            break;
        }
    }

     if (droppedOnTarget && draggedColorId) {
         handleDrop({ target: droppedOnTarget, colorId: draggedColorId });
     }

     if (document.body.contains(touchDragElement)) {
        document.body.removeChild(touchDragElement);
     }
     touchDragElement = null;
     document.removeEventListener('touchmove', handleTouchMove);
     document.removeEventListener('touchend', handleTouchEnd);

     const allDropTargetsForHighlight = [slot1Div, slot2Div, creativeMixingCanvas];
     allDropTargetsForHighlight.forEach(target => {if(target) target.classList.remove('dragging-over')});
     if (!droppedOnTarget) draggedColorId = null;
}

function handleDragStart(event) {
    if (!gameFullyStarted) { event.preventDefault(); return; }
    draggedColorId = event.target.dataset.colorId;
    // console.log("Drag Start - Dragged Color ID:", draggedColorId); // Optional: for debugging
    if (!draggedColorId) { console.warn("Drag Start: No color ID on dragged swatch"); event.preventDefault(); return; }
    event.dataTransfer.setData('text/plain', draggedColorId);
    event.dataTransfer.effectAllowed = 'move';
}
function handleDragOver(event) {  if (!gameFullyStarted || !event.currentTarget) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; event.currentTarget.classList.add('dragging-over');}
function handleDragLeave(event) {  if (!gameFullyStarted || !event.currentTarget) return; event.currentTarget.classList.remove('dragging-over');}

function handleDrop(eventOrData) {
    if (!gameFullyStarted) return;
    let targetEl, colorIdToDrop;
    if (eventOrData.target && eventOrData.colorId) { // From touch drop
        targetEl = eventOrData.target;
        colorIdToDrop = eventOrData.colorId;
    } else { // From D&D API
        eventOrData.preventDefault();
        targetEl = eventOrData.currentTarget;
        colorIdToDrop = eventOrData.dataTransfer.getData('text/plain');
    }
    // console.log("Handle Drop - Target ID:", targetEl ? targetEl.id : "null", "Color ID:", colorIdToDrop, "Current Mode:", currentMode); // Optional: for debugging

    if(!targetEl) { draggedColorId = null; console.log("Drop: No target element."); return; }
    targetEl.classList.remove('dragging-over');
    if (!allGameColors[colorIdToDrop]) { draggedColorId = null; console.log("Drop: Invalid color ID."); return;}

    playDropSound();
    if (currentMode === 'creative' && targetEl.id === 'creative-mixing-canvas') {
        // console.log("Drop: Creative mode, calling mixColorOntoCreativeCanvas"); // Optional: for debugging
        mixColorOntoCreativeCanvas(colorIdToDrop);
    } else if ((currentMode === 'explore' || currentMode === 'puzzle') && (targetEl.id === 'slot1' || targetEl.id === 'slot2')) {
        // console.log("Drop: Explore/Puzzle mode, setting slot color."); // Optional: for debugging
        targetEl.style.backgroundColor = allGameColors[colorIdToDrop].hex; targetEl.classList.add('filled');
        targetEl.innerHTML = `<span class="sr-only">${allGameColors[colorIdToDrop].name}</span>`; targetEl.dataset.color = colorIdToDrop;
        if (targetEl.id === 'slot1') slot1Color = colorIdToDrop;
        if (targetEl.id === 'slot2') slot2Color = colorIdToDrop;
        // console.log("Drop: Slot1:", slot1Color, "Slot2:", slot2Color); // Optional: for debugging
        if (slot1Color !== 'empty' && slot2Color !== 'empty') {
            // console.log("Calling handleMixColors for Explore/Puzzle"); // Optional: for debugging
            setTimeout(handleMixColors, 100);
        }
    } else {
        console.log("Drop: No valid drop condition met.");
    }
    draggedColorId = null;
}

function mixColorOntoCreativeCanvas(droppedColorId) {
    if (!creativeMixingCanvas) { console.error("creativeMixingCanvas is null in mixColorOntoCreativeCanvas"); return; }
    // console.log("Mixing onto Creative Canvas. Dropped:", droppedColorId); // Optional: for debugging
    const currentColorHex = creativeMixingCanvas.dataset.currentColorHex || DEFAULT_CANVAS_COLOR;
    const newColorHex = allGameColors[droppedColorId].hex;
    // console.log("Creative Canvas - Current:", currentColorHex, "New:", newColorHex); // Optional: for debugging

    const currentRgb = hexToRgb(currentColorHex);
    if (!currentRgb) {
        console.error(`Error converting CURRENT hex to RGB for creative mix. Current Hex: '${currentColorHex}'`);
        creativeMixingCanvas.style.backgroundColor = DEFAULT_CANVAS_COLOR; // Reset on error
        creativeMixingCanvas.dataset.currentColorHex = DEFAULT_CANVAS_COLOR;
        creativeMixingCanvas.textContent = 'Error! Reset.';
        return;
    }
    const newRgb = hexToRgb(newColorHex);
    if (!newRgb) {
        console.error(`Error converting NEW hex to RGB for creative mix. New Hex: '${newColorHex}' from colorId: ${droppedColorId}`);
        // Don't change current canvas color if new color is bad
        return;
    }

    let mixedR, mixedG, mixedB;
    if (currentColorHex === DEFAULT_CANVAS_COLOR) { mixedR = newRgb.r; mixedG = newRgb.g; mixedB = newRgb.b; }
    else { mixedR = Math.round((currentRgb.r + newRgb.r) / 2); mixedG = Math.round((currentRgb.g + newRgb.g) / 2); mixedB = Math.round((currentRgb.b + newRgb.b) / 2); }
    const finalMixedHex = rgbToHex(mixedR, mixedG, mixedB);
    // console.log("Creative Canvas - Mixed RGB:", {mixedR, mixedG, mixedB}, "Final Hex:", finalMixedHex); // Optional: for debugging
    creativeMixingCanvas.style.backgroundColor = finalMixedHex;
    creativeMixingCanvas.dataset.currentColorHex = finalMixedHex;
    creativeMixingCanvas.textContent = '';
    let closestColorName = "New Mix"; let minDiff = Infinity;
    for (const cId in allGameColors) { const knownRgb = hexToRgb(allGameColors[cId].hex); if (knownRgb) { const diff = Math.abs(knownRgb.r - mixedR) + Math.abs(knownRgb.g - mixedG) + Math.abs(knownRgb.b - mixedB); if (diff < minDiff && diff < 50) { minDiff = diff; closestColorName = allGameColors[cId].name; } } }
    if (closestColorName !== "New Mix") { displayMessage(`You made ${closestColorName}!`, 'text-purple-500'); speakMessage(closestColorName); }
    else { displayMessage('A unique colour!', 'text-teal-500'); }
    playSuccessSound(); createConfetti(finalMixedHex);
}

function handleMixColors() {
    // console.log("handleMixColors called. Slot1:", slot1Color, "Slot2:", slot2Color); // Optional: for debugging
    if (slot1Color === 'empty' || slot2Color === 'empty' || !resultPotDiv) return;
    const mixedRecipe = [slot1Color, slot2Color].sort();
    // console.log("Mixed Recipe:", mixedRecipe); // Optional: for debugging
    let resultColorFound = null;
    for (const colorId in allGameColors) { const color = allGameColors[colorId]; if (color.recipe && arraysEqual(color.recipe, mixedRecipe)) { resultColorFound = color; break; } }
    let muckyColorHex = '#78716c'; if (slot1Color === slot2Color) { resultColorFound = allGameColors[slot1Color]; }
    // console.log("Result Color Found:", resultColorFound ? resultColorFound.name : "None (or mucky)"); // Optional: for debugging
    resultPotDiv.classList.add('active-mix');
    if (resultColorFound) {
        resultPotDiv.style.backgroundColor = resultColorFound.hex; if(resultPotText) resultPotText.textContent = resultColorFound.name;
        const rgb = hexToRgb(resultColorFound.hex);
        if (rgb) {
            const brightness = (rgb.r*299 + rgb.g*587 + rgb.b*114)/1000; resultPotDiv.style.color = brightness > 125 ? '#1f2937' : '#FFFFFF';
        } else {
            resultPotDiv.style.color = '#FFFFFF'; // Default
        }

        if (!unlockedColorIds.includes(resultColorFound.id)) {
            unlockedColorIds.push(resultColorFound.id); allGameColors[resultColorFound.id].justUnlocked = true;
            highlightParentSwatches(slot1Color, slot2Color); renderPalette();
            displayMessage(`Yay! ${resultColorFound.name}!`, 'text-emerald-500'); speakMessage(resultColorFound.name); playSuccessSound();
            resultPotDiv.classList.add('animate-pulseGlow'); createConfetti(resultColorFound.hex);
            setTimeout(() => {if(resultPotDiv) resultPotDiv.classList.remove('animate-pulseGlow')}, 1200);
        } else { displayMessage(`${resultColorFound.name} again!`, 'text-sky-500'); speakMessage(resultColorFound.name); playAlreadyMadeSound(); }
        if (currentMode === 'puzzle' && puzzleState.targetColorId === resultColorFound.id) {
            const timeTaken = Date.now() - puzzleState.startTime; let awardedPoints = POINTS_CORRECT; let message = `Correct! You mixed ${resultColorFound.name}!`;
            let pointsMessage = `${POINTS_CORRECT} points!`;
            if (timeTaken <= BONUS_TIME_LIMIT_MS) {
                awardedPoints += POINTS_BONUS;
                puzzleState.bonusCompletionsInRow++;
                message += ` Bonus points!`;
                pointsMessage = `${awardedPoints} points! Bonus!`;
            }
            else { puzzleState.bonusCompletionsInRow = 0; }
            puzzleState.score += awardedPoints; if(scoreValueDisplay) scoreValueDisplay.textContent = puzzleState.score;
            displayMessage(message, 'text-purple-600', 4000);
            speakMessage(pointsMessage);
            if(puzzleState.timerIntervalId) clearInterval(puzzleState.timerIntervalId);
            setTimeout(startNewPuzzleRound, 2000);
        }
    } else { resultPotDiv.style.backgroundColor = muckyColorHex; if(resultPotText) resultPotText.textContent = 'Hmm?'; resultPotDiv.style.color = '#FFFFFF'; displayMessage('A new mix!', 'text-amber-600'); playMuckyMixSound(); }
    setTimeout(() => { slot1Color = 'empty'; slot2Color = 'empty'; if(slot1Div) slot1Div.dataset.color = 'empty'; if(slot2Div) slot2Div.dataset.color = 'empty'; clearSlotVisual(slot1Div); clearSlotVisual(slot2Div); if(resultPotDiv) resultPotDiv.classList.remove('active-mix'); }, 800);
}

function switchToMode(mode) {
    if (!gameFullyStarted) { console.warn("switchToMode called before gameFullyStarted"); return; }
    currentMode = mode;
    console.log("Switching to mode:", currentMode);

    [exploreModeBtn, puzzleModeBtn, creativeModeBtn].forEach(btn => btn && btn.classList.remove('active'));
    if(scoreArea) scoreArea.classList.add('hidden');
    if(puzzleTimerDisplay) puzzleTimerDisplay.textContent = '';
    if(puzzleState.timerIntervalId) clearInterval(puzzleState.timerIntervalId);
    if(explorePuzzleMixingArea) explorePuzzleMixingArea.classList.add('hidden');
    if(creativeModeMixingArea) creativeModeMixingArea.classList.add('hidden');

    if (mode === 'creative') {
        if(creativeModeBtn) creativeModeBtn.classList.add('active');
        if(creativeModeMixingArea) creativeModeMixingArea.classList.remove('hidden');
        if(puzzleUi) puzzleUi.classList.add('hidden');
        if(messageArea) messageArea.textContent = '';
        if(creativeMixingCanvas) {
             creativeMixingCanvas.style.backgroundColor = DEFAULT_CANVAS_COLOR;
             creativeMixingCanvas.dataset.currentColorHex = DEFAULT_CANVAS_COLOR;
             creativeMixingCanvas.textContent = 'Drag colours here!';
        }
    } else if (mode === 'explore') {
        if(exploreModeBtn) exploreModeBtn.classList.add('active');
        if(explorePuzzleMixingArea) {
            explorePuzzleMixingArea.classList.remove('hidden');
            explorePuzzleMixingArea.style.display = 'flex';
        }
        if(puzzleUi) puzzleUi.classList.add('hidden');
        if(messageArea) messageArea.textContent = '';
    } else if (mode === 'puzzle') {
        if(puzzleModeBtn) puzzleModeBtn.classList.add('active');
        if(explorePuzzleMixingArea) {
             explorePuzzleMixingArea.classList.remove('hidden');
             explorePuzzleMixingArea.style.display = 'flex';
        }
        if(puzzleUi) puzzleUi.classList.remove('hidden');
        if(scoreArea) scoreArea.classList.remove('hidden');
        if(scoreValueDisplay) scoreValueDisplay.textContent = puzzleState.score;
        startNewPuzzleRound();
    }
    renderPalette();
    slot1Color = 'empty'; slot2Color = 'empty';
    if(slot1Div) slot1Div.dataset.color = 'empty'; if(slot2Div) slot2Div.dataset.color = 'empty';
    clearSlotVisual(slot1Div); clearSlotVisual(slot2Div);
    if(resultPotDiv) resultPotDiv.style.backgroundColor = '#94a3b8';
    if(resultPotText) resultPotText.textContent = 'Result'; if(resultPotDiv) resultPotDiv.style.color = 'white';
}

function startNewPuzzleRound() {
    if (!gameFullyStarted || !targetColourName || !targetColourDisplay || !puzzleTimerDisplay || !puzzleUi) {
        console.error("Puzzle UI elements not ready for new round.");
         return;
    }
    console.log("Starting new puzzle round.");
    puzzleUi.classList.remove('hidden');

    let targetPool;
    if (puzzleState.bonusCompletionsInRow >= 3) {
        targetPool = Object.values(allGameColors).filter(c => c.type === 'tertiary' && c.recipe);
        puzzleState.bonusCompletionsInRow = 0;
        displayMessage("Bonus! Mix a harder colour!", "text-cyan-500", 2500);
    } else {
        targetPool = Object.values(allGameColors).filter(c => c.type === 'secondary' && c.recipe);
    }
    if (targetPool.length === 0) {
        targetPool = Object.values(allGameColors).filter(c => c.recipe && c.type !== 'primary');
         if (targetPool.length === 0) {
            displayMessage('Wow, you found all puzzle colours!', 'text-green-600');
            puzzleUi.classList.add('hidden'); return;
        }
    }

    const randomTarget = targetPool[Math.floor(Math.random() * targetPool.length)];
    // console.log("New Puzzle Target:", randomTarget.name); // Optional: for debugging
    puzzleState.targetColorId = randomTarget.id;
    puzzleState.targetColorName = randomTarget.name;
    puzzleState.startTime = Date.now();

    targetColourName.textContent = randomTarget.name;
    targetColourDisplay.style.backgroundColor = randomTarget.hex;
    displayMessage(`Mix ${randomTarget.name}!`, 'text-indigo-600');
    speakMessage(`Mix ${randomTarget.name}`);

    if(puzzleState.timerIntervalId) clearInterval(puzzleState.timerIntervalId);
    let timeLeft = BONUS_TIME_LIMIT_MS / 1000;
    puzzleTimerDisplay.textContent = `Time: ${timeLeft}s`;
    puzzleState.timerIntervalId = setInterval(() => {
        timeLeft--;
        puzzleTimerDisplay.textContent = `Time: ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(puzzleState.timerIntervalId);
            puzzleTimerDisplay.textContent = "Time's Up!";
        }
    }, 1000);
}

// --- Game Initialization and Start ---
function assignElementVariables() {
    playButtonEl = document.getElementById('play-button');
    playOverlayEl = document.getElementById('play-overlay');
    gameContentEl = document.getElementById('game-content-wrapper');
    playOverlayTitleEl = document.getElementById('play-overlay-title'); // Still needed for hiding overlay

    paletteGrid = document.getElementById('palette-grid'); slot1Div = document.getElementById('slot1'); slot2Div = document.getElementById('slot2');
    resultPotDiv = document.getElementById('result-pot'); resultPotText = document.getElementById('result-pot-text'); messageArea = document.getElementById('message-area');
    exploreModeBtn = document.getElementById('explore-mode-btn');
    puzzleModeBtn = document.getElementById('puzzle-mode-btn');
    creativeModeBtn = document.getElementById('creative-mode-btn');
    puzzleUi = document.getElementById('puzzle-ui'); targetColourDisplay = document.getElementById('target-colour-display'); targetColourName = document.getElementById('target-colour-name');
    puzzleTimerDisplay = document.getElementById('puzzle-timer');
    scoreArea = document.getElementById('score-area'); scoreValueDisplay = document.getElementById('score-value');
    confettiCanvas = document.getElementById('confetti-canvas'); if (confettiCanvas) confettiCtx = confettiCanvas.getContext('2d');
    explorePuzzleMixingArea = document.getElementById('explore-puzzle-mixing-area');
    creativeModeMixingArea = document.getElementById('creative-mode-mixing-area');
    creativeMixingCanvas = document.getElementById('creative-mixing-canvas');
    mainTitleElement = document.getElementById('main-title');
    console.log("DOM elements assigned.");
}

function setupGameInteractions() {
    console.log("Setting up game interactions...");
    if(creativeModeBtn) creativeModeBtn.addEventListener('click', () => switchToMode('creative')); else console.warn("creativeModeBtn not found for listener");
    if(exploreModeBtn) exploreModeBtn.addEventListener('click', () => switchToMode('explore')); else console.warn("exploreModeBtn not found for listener");
    if(puzzleModeBtn) puzzleModeBtn.addEventListener('click', () => switchToMode('puzzle')); else console.warn("puzzleModeBtn not found for listener");

    [slot1Div, slot2Div].forEach(slot => { if(slot) { slot.addEventListener('dragover', handleDragOver); slot.addEventListener('dragleave', handleDragLeave); slot.addEventListener('drop', handleDrop); } });
    if(creativeMixingCanvas) { creativeMixingCanvas.addEventListener('dragover', handleDragOver); creativeMixingCanvas.addEventListener('dragleave', handleDragLeave); creativeMixingCanvas.addEventListener('drop', handleDrop); }
    console.log("Game interactions set up.");
}

async function handlePlayButtonClick() {
    // console.log("Play button clicked!"); // Optional: for debugging
    if(playOverlayEl) playOverlayEl.style.display = 'none';
    if(gameContentEl) gameContentEl.classList.remove('hidden-by-overlay');
    document.body.classList.add('game-active');

    await startAudioSystems(); // This now handles Tone.start() internally

    if (tonejsLoadFailed) {
        console.warn("Proceeding without Tone.js sounds due to load/start failure.");
    } else if (toneJsStarted) { // Check if Tone.js actually started
        startBackgroundMusic();
    }

    // Defer DOM-dependent setup until after browser has a chance to render the revealed content
    requestAnimationFrame(() => {
        gameFullyStarted = true;
        // assignElementVariables(); // Already called in mainInit
        // renderPalette(); // Called by switchToMode
        // setupGameInteractions(); // Already called in mainInit

        if (!mainTitleElement) console.error("Main title element NOT found after assigning variables!");
        
        switchToMode('creative'); // Initial mode
        setupConfettiCanvas();
        window.addEventListener('resize', setupConfettiCanvas);
        clearSlotVisual(slot1Div); clearSlotVisual(slot2Div);
        displayMessage("Let's get mixing!", "text-sky-600", 2000); // Welcome message

        try { // Reinstate fullscreen attempt
            requestAppFullScreen();
        } catch (e) {
            console.warn("Could not enter fullscreen mode on play button click:", e);
        }
    });
}


async function mainInit() {
    console.log("DOM content loaded or window loaded. Starting main initialization.");
    assignElementVariables(); // Call at the very start
    loadVoices(); // Start loading voices early

    if (playButtonEl) {
        playButtonEl.disabled = true; // Disable play button initially
        console.log("Play button found and disabled.");
    } else {
        console.error("Play button NOT found on init!");
        // playOverlayTitleEl is static in HTML, no need to set error text here
        return; // Critical error
    }
    if(playButtonEl) playButtonEl.textContent = "Loading Sounds..."; // Update button text


    try {
        await loadScript("https://unpkg.com/tone@14.7.77/build/Tone.js");
        console.log("Tone.js script loaded via dynamic loader.");
        if (typeof Tone !== 'undefined' && Tone.start) {
            console.log("Tone object is defined. Tone.js ready.");
            // startAudioSystems will call Tone.start() when play is clicked
            if(playButtonEl) playButtonEl.textContent = "PLAY!"; // Restore button text
            if(playButtonEl) playButtonEl.disabled = false;
        } else {
            throw new Error("Tone object not found after script load.");
        }
    } catch (error) {
        console.error("CRITICAL: Tone.js script failed to load or initialize!", error);
        tonejsLoadFailed = true;
        // playOverlayTitleEl is static, update button text for error
        if(playButtonEl) {
            playButtonEl.textContent = "PLAY (No Sound)"; // Indicate no sound
            playButtonEl.disabled = false;
        }
    }

    if (playButtonEl && !playButtonEl.getAttribute('listener')) { // Avoid multiple listeners
        playButtonEl.addEventListener('click', handlePlayButtonClick);
        playButtonEl.setAttribute('listener', 'true');
        console.log("Play button event listener attached.");
    }
    
    // Setup non-audio dependent interactions early if possible
    setupGameInteractions(); // Setup mode buttons etc.
}

// Use DOMContentLoaded for faster perceived load, 'load' if waiting for all assets like images is critical
window.addEventListener('DOMContentLoaded', mainInit);