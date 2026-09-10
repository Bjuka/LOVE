// ==================== SUPABASE CONFIGURATION ====================
const SUPABASE_URL = "https://idlhbjoxxskzmvzrhjpb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0NiaQQkwoIcttLrvBEzAqg_t5vaBgAY"; 

// Use supabaseClient to prevent collision with window.supabase from the CDN
const supabaseClient = window.supabase 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ==================== SANCTUARY PASSCODE SECURITY ====================
const SANCTUARY_PASSWORD_HASH = "7ad938a2c26edc6be22bcb1c2b17e1140c40257e2e2ec052db5bcee7f66aba08";

async function sha256(message) {
  const msgUint8 = new TextEncoder().encode(message.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handleUnlockAttempt(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('gate-password-input');
  const errorMsg = document.getElementById('gate-error-msg');
  const card = document.getElementById('gate-card');
  const gate = document.getElementById('sanctuary-gate');
  const skeleton = document.getElementById('skeleton-backdrop');

  const inputHash = await sha256(input.value);

  if (inputHash === SANCTUARY_PASSWORD_HASH || input.value.trim() === SANCTUARY_PASSWORD_HASH) {
    sessionStorage.setItem('sanctuary_unlocked', 'true');
    errorMsg.classList.add('hidden');
    document.body.classList.remove('gate-locked');
    gate.classList.add('opacity-0', 'pointer-events-none');
    if (skeleton) skeleton.classList.add('opacity-0');

    setTimeout(() => {
      gate.style.display = 'none';
      if (skeleton) skeleton.style.display = 'none';
    }, 700);

    triggerLoveShower();
  } else {
    errorMsg.classList.remove('hidden');
    card.classList.remove('shake-gate');
    void card.offsetWidth;
    card.classList.add('shake-gate');
    input.value = '';
    input.focus();
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "Special Day";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

// --- 1. DYNAMIC NICKNAMES CYCLER ---
const nicknames = ["babe", "baby", "madam", "wifey", "darling", "sweetheart", "sweetcheeks", "cute-heart"];
let nicknameIndex = 0;
const nicknameElement = document.getElementById("nickname-badge");

setInterval(() => {
  if (nicknameElement) {
    nicknameElement.style.opacity = '0';
    nicknameElement.style.transform = 'translateY(-4px)';
    setTimeout(() => {
      nicknameIndex = (nicknameIndex + 1) % nicknames.length;
      nicknameElement.textContent = nicknames[nicknameIndex];
      nicknameElement.style.opacity = '1';
      nicknameElement.style.transform = 'translateY(0px)';
    }, 250);
  }
}, 2800);

const liveDateEl = document.getElementById('live-date');
if (liveDateEl) {
  liveDateEl.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// --- 2. HERO DISPLAY ---
const defaultHeroConfig = {
  image: "cover.jpg",
  badge: "My Favorite View",
  quote: "No matter where life takes us, my heart will always beat for you."
};

function loadHeroCustom() {
  const stored = localStorage.getItem('sanctuary_hero_custom');
  const config = stored ? JSON.parse(stored) : defaultHeroConfig;
  const heroImg = document.getElementById('hero-img');
  const heroBadge = document.getElementById('hero-badge');
  const heroQuote = document.getElementById('hero-quote');

  if (heroImg) heroImg.src = config.image || defaultHeroConfig.image;
  if (heroBadge) heroBadge.textContent = config.badge || defaultHeroConfig.badge;
  if (heroQuote) heroQuote.textContent = `"${config.quote || defaultHeroConfig.quote}"`;
}

// --- 3. DREAMS BOARD (FETCH ONLY) ---
const fallbackDreams = [
  {
    id: 'dream-1',
    title: 'My Second Love',
    emoji: '❤️',
    tag: 'Our little cuteness',
    desc: 'Our daughter will look like this and we will be the best parents anyone can ever wish for ❤️❤️',
    image: 'babieee.jpg'
  },
  {
    id: 'dream-2',
    title: 'Together and Forever',
    emoji: '🌻🌻',
    tag: 'Our Goal',
    desc: 'No matter what happens, we stay together, we fight together and we fix together cuz you\'re my wifey and i love you the most. just like this💕',
    image: 'dream2.jpg'
  }
];

async function loadDreams() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('dreams').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        renderDreams(data.map(d => ({
          title: d.title,
          emoji: d.emoji || '✨',
          tag: d.tag || 'Dream',
          desc: d.description || '',
          image: d.image_url || 'babieee.jpg'
        })));
        return;
      }
    } catch (err) {
      console.warn("Supabase dreams fetch fallback:", err);
    }
  }
  renderDreams(fallbackDreams);
}

function renderDreams(dreams) {
  const container = document.getElementById('dreams-grid');
  if (!container) return;
  container.innerHTML = dreams.map(dream => `
    <div class="glass-card rounded-3xl p-5 border border-white hover:shadow-lg transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
      <div>
        <div class="aspect-video rounded-2xl overflow-hidden mb-4 bg-blush-50 relative shadow-inner">
          <img src="${escapeHtml(dream.image)}" alt="${escapeHtml(dream.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=700&q=80'">
          <span class="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-rosewood shadow-sm flex items-center gap-1">
            <span>${escapeHtml(dream.emoji)}</span>
            <span>${escapeHtml(dream.tag)}</span>
          </span>
        </div>
        <h3 class="font-serif text-lg font-bold text-rosewood">${escapeHtml(dream.title)}</h3>
        <p class="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">${escapeHtml(dream.desc)}</p>
      </div>
      <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span class="text-xs text-blush-500 font-medium flex items-center gap-1">
          <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Manifesting together
        </span>
        <button onclick="toggleDreamHeart(this)" class="p-2 rounded-full hover:bg-blush-100 text-blush-400 transition">
          <i data-lucide="heart" class="w-5 h-5 fill-blush-400"></i>
        </button>
      </div>
    </div>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

function toggleDreamHeart(btn) {
  if (btn.classList.contains('loved')) {
    btn.classList.remove('loved', 'text-blush-500');
    btn.classList.add('text-gray-400');
  } else {
    btn.classList.add('loved', 'text-blush-500');
    btn.classList.remove('text-gray-400');
    triggerLoveShower();
  }
}

// --- 4. MEMORIES BOX (FETCH ONLY) ---
const fallbackMemories = [
  {
    title: 'What makes me happy?',
    date: '2026-03-13',
    tag: 'MINEEE 💍',
    image: 'memory1.jpg',
    caption: 'Every moment with you makes me feel special beacause you feel like a long lost part of me which makes me complete 💕💕'
  },
  {
    title: 'My Cute Babieeee',
    date: '2025-12-12',
    tag: 'Special dayyy 🍷',
    image: 'memory2.jpg',
    caption: 'Whenever im with you, im never alone. you make me feel so happy like im some celebrity but tbh, i just want to be YOURS ❤️'
  },
  {
    title: 'Ummmmmah',
    date: '2026-08-14',
    tag: 'Goofy Moments 🤪',
    image: 'memory3.jpg',
    caption: 'You brings out the kid in me (idk the date😭)'
  }
];

async function loadMemories() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('memories').select('*').order('date', { ascending: false });
      if (!error && data && data.length > 0) {
        renderMemories(data.map(m => ({
          title: m.title,
          date: m.date,
          tag: m.tag || 'Memory',
          image: m.image_url || 'memory1.jpg',
          caption: m.caption || m.title
        })));
        return;
      }
    } catch (err) {
      console.warn("Supabase memories fetch fallback:", err);
    }
  }
  renderMemories(fallbackMemories);
}

function renderMemories(memories) {
  const container = document.getElementById('memory-gallery-grid');
  if (!container) return;
  container.innerHTML = memories.map(mem => `
    <div class="glass-card rounded-3xl p-4 sm:p-5 border border-white hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
      <div>
        <div class="aspect-[4/3] rounded-2xl overflow-hidden bg-blush-50 relative mb-3.5 shadow-inner">
          <img src="${escapeHtml(mem.image)}" alt="${escapeHtml(mem.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=700&q=80'">
          <span class="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-rosewood shadow-sm">
            ${escapeHtml(mem.tag)}
          </span>
        </div>
        <div class="space-y-1">
          <span class="text-[11px] text-blush-500 font-semibold tracking-wider uppercase">${formatDisplayDate(mem.date)}</span>
          <h4 class="font-serif text-lg font-bold text-rosewood leading-snug">${escapeHtml(mem.title)}</h4>
          <p class="text-xs sm:text-sm text-gray-600 font-hand text-lg leading-relaxed pt-1">"${escapeHtml(mem.caption)}"</p>
        </div>
      </div>
      <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span class="text-[11px] text-gray-400">Cherished forever</span>
        <button onclick="toggleDreamHeart(this)" class="p-1.5 rounded-full hover:bg-blush-50 text-blush-400 transition">
          <i data-lucide="heart" class="w-4 h-4 fill-blush-400"></i>
        </button>
      </div>
    </div>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

// --- 5. MUSIC HUB ---
const fallbackSongs = [
  { title: 'Accidently in LOVE', artist: 'Counting Crows', src: 'Accidently in Love.mp3' },
  { title: 'Make you MINE', artist: 'PUBLIC', src: 'Make you MINE.mp3' },
  { title: 'You & I', artist: 'One Direection', src: 'You & I.mp3' }
];

class SanctuaryMusicHub {
  constructor() {
    this.mode = 'queue';
    this.isPlaying = false;
    this.synthCtx = null;
    this.synthInterval = null;
    this.notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 659.25];
    this.currentTrackIndex = 0;
    this.volume = 0.7;

    this.audioEl = new Audio();
    this.audioEl.volume = this.volume;
    this.audioEl.preload = "auto";
    this.queue = [];

    this.setupAudioListeners();
    this.loadQueue();
  }

  setupAudioListeners() {
    this.audioEl.addEventListener('timeupdate', () => {
      if (this.mode === 'queue' && this.audioEl.duration) {
        const current = this.audioEl.currentTime;
        const duration = this.audioEl.duration;
        const progressEl = document.getElementById('song-progress');
        if (progressEl) progressEl.value = (current / duration) * 100;
        const curEl = document.getElementById('current-time');
        const durEl = document.getElementById('duration-time');
        if (curEl) curEl.textContent = this.formatTime(current);
        if (durEl) durEl.textContent = this.formatTime(duration);
      }
    });

    this.audioEl.addEventListener('ended', () => {
      if (this.mode === 'queue') this.playNext();
    });

    this.audioEl.addEventListener('error', () => {
      if (this.mode === 'queue' && this.isPlaying) {
        this.pause();
      }
    });
  }

  async loadQueue() {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('songs').select('*').order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          this.queue = data.map(s => ({ title: s.title, artist: s.artist, src: s.url }));
          this.updateQueueUI();
          return;
        }
      } catch (err) {
        console.warn("Supabase queue fetch fallback:", err);
      }
    }
    this.queue = [...fallbackSongs];
    this.updateQueueUI();
  }

  formatTime(sec) {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  initSynth() {
    if (!this.synthCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.synthCtx = new AudioContext();
    }
  }

  playSynthChime(freq) {
    if (!this.synthCtx) return;
    const osc = this.synthCtx.createOscillator();
    const gain = this.synthCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.synthCtx.currentTime);
    gain.gain.setValueAtTime(0.001, this.synthCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(this.volume * 0.16, this.synthCtx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.synthCtx.currentTime + 2.8);
    osc.connect(gain);
    gain.connect(this.synthCtx.destination);
    osc.start();
    osc.stop(this.synthCtx.currentTime + 3.0);
  }

  startSynth() {
    this.initSynth();
    if (this.synthCtx.state === 'suspended') this.synthCtx.resume();
    this.playSynthChime(this.notes[Math.floor(Math.random() * this.notes.length)]);
    this.synthInterval = setInterval(() => {
      if (Math.random() > 0.18) {
        this.playSynthChime(this.notes[Math.floor(Math.random() * this.notes.length)]);
      }
    }, 1150);
  }

  stopSynth() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }

  togglePlay() {
    this.isPlaying ? this.pause() : this.play();
  }

  play() {
    if (this.mode === 'synth') {
      this.isPlaying = true;
      this.startSynth();
    } else {
      if (this.queue.length === 0) return;
      this.loadAndPlayTrack(this.currentTrackIndex);
    }
    this.updatePlayerUI();
  }

  pause() {
    this.isPlaying = false;
    this.mode === 'synth' ? this.stopSynth() : this.audioEl.pause();
    this.updatePlayerUI();
  }

  loadAndPlayTrack(index) {
    if (!this.queue[index]) return;
    this.currentTrackIndex = index;
    this.audioEl.src = this.queue[index].src;
    this.audioEl.load();
    this.audioEl.play().then(() => {
      this.isPlaying = true;
      this.updatePlayerUI();
    }).catch(() => {
      this.isPlaying = false;
      this.updatePlayerUI();
    });
  }

  playNext() {
    if (this.mode === 'synth' || this.queue.length === 0) return;
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.queue.length;
    this.isPlaying ? this.loadAndPlayTrack(this.currentTrackIndex) : this.updatePlayerUI();
  }

  playPrev() {
    if (this.mode === 'synth' || this.queue.length === 0) return;
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.queue.length) % this.queue.length;
    this.isPlaying ? this.loadAndPlayTrack(this.currentTrackIndex) : this.updatePlayerUI();
  }

  setMode(newMode) {
    if (this.mode === newMode) return;
    this.pause();
    this.mode = newMode;
    this.updatePlayerUI();
  }

  setVolume(val) {
    this.volume = parseFloat(val);
    this.audioEl.volume = this.volume;
  }

  seek(percent) {
    if (this.mode === 'queue' && this.audioEl.duration) {
      this.audioEl.currentTime = (percent / 100) * this.audioEl.duration;
    }
  }

  updatePlayerUI() {
    const titleEl = document.getElementById('player-title');
    const subEl = document.getElementById('player-subtitle');
    const navTitle = document.getElementById('nav-music-title');
    const mainPlayIcon = document.getElementById('main-play-icon');
    const vinyl = document.getElementById('vinyl-disc');
    const eq = document.getElementById('nav-audio-equalizer');
    const seekSec = document.getElementById('queue-seek-section');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if (this.mode === 'synth') {
      if (titleEl) titleEl.textContent = "Dreamy Lofi Chimes";
      if (subEl) subEl.textContent = "Procedural Ambient Synthesizer ✨";
      if (navTitle) navTitle.textContent = "Lofi Chimes";
      if (seekSec) seekSec.classList.add('hidden');
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
    } else {
      if (seekSec) seekSec.classList.remove('hidden');
      if (prevBtn) prevBtn.disabled = false;
      if (nextBtn) nextBtn.disabled = false;
      if (this.queue[this.currentTrackIndex]) {
        const s = this.queue[this.currentTrackIndex];
        if (titleEl) titleEl.textContent = s.title;
        if (subEl) subEl.textContent = s.artist;
        if (navTitle) navTitle.textContent = s.title;
      }
    }

    if (this.isPlaying) {
      if (mainPlayIcon) mainPlayIcon.setAttribute('data-lucide', 'pause');
      if (vinyl) vinyl.classList.add('animate-spin-slow');
      if (eq) { eq.classList.remove('hidden'); eq.classList.add('flex'); }
    } else {
      if (mainPlayIcon) mainPlayIcon.setAttribute('data-lucide', 'play');
      if (vinyl) vinyl.classList.remove('animate-spin-slow');
      if (eq) { eq.classList.add('hidden'); eq.classList.remove('flex'); }
    }
    if (window.lucide) lucide.createIcons();
    this.updateQueueUI();
  }

  updateQueueUI() {
    const list = document.getElementById('queue-list');
    const countBadge = document.getElementById('queue-count-badge');
    if (countBadge) countBadge.textContent = this.queue.length;
    if (!list) return;

    list.innerHTML = this.queue.map((song, i) => `
      <div class="flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
        (this.mode === 'queue' && i === this.currentTrackIndex)
          ? 'bg-blush-100/70 border-blush-300 font-semibold text-rosewood'
          : 'bg-white hover:bg-cream-50 border-gray-100 text-gray-700'
      }" onclick="musicHub.selectTrack(${i})">
        <div class="flex items-center gap-2.5 truncate">
          <span class="w-5 text-center text-[10px] text-gray-400 font-mono">${(this.mode === 'queue' && i === this.currentTrackIndex && this.isPlaying) ? '▶' : i + 1}</span>
          <div class="truncate">
            <span class="block truncate">${escapeHtml(song.title)}</span>
            <span class="text-[10px] text-gray-500 block truncate">${escapeHtml(song.artist)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  selectTrack(index) {
    this.mode = 'queue';
    this.switchTabUI('queue');
    this.loadAndPlayTrack(index);
  }

  switchTabUI(mode) {
    const synthTab = document.getElementById('mode-synth-tab');
    const queueTab = document.getElementById('mode-queue-tab');
    const queueView = document.getElementById('queue-view-container');

    if (mode === 'synth') {
      if (synthTab) synthTab.className = "flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 bg-white text-blush-600 shadow-sm";
      if (queueTab) queueTab.className = "flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 text-gray-600 hover:text-rosewood";
      if (queueView) queueView.classList.add('hidden');
    } else {
      if (queueTab) queueTab.className = "flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 bg-white text-blush-600 shadow-sm";
      if (synthTab) synthTab.className = "flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 text-gray-600 hover:text-rosewood";
      if (queueView) queueView.classList.remove('hidden');
    }
  }
}

const musicHub = new SanctuaryMusicHub();

function openMusicModal() {
  const modal = document.getElementById('music-modal');
  const content = document.getElementById('music-modal-content');
  modal.classList.remove('opacity-0', 'pointer-events-none');
  content.classList.remove('scale-95');
  content.classList.add('scale-100');
}

function closeMusicModal() {
  const modal = document.getElementById('music-modal');
  const content = document.getElementById('music-modal-content');
  modal.classList.add('opacity-0', 'pointer-events-none');
  content.classList.remove('scale-100');
  content.classList.add('scale-95');
}

function switchAudioMode(mode) {
  musicHub.setMode(mode);
  musicHub.switchTabUI(mode);
}

function toggleMainPlayState() { musicHub.togglePlay(); }
function playNextTrack() { musicHub.playNext(); }
function playPrevTrack() { musicHub.playPrev(); }
function handleSeek(val) { musicHub.seek(val); }
function handleVolumeChange(val) { musicHub.setVolume(val); }

// --- 6. AFFIRMATIONS & HUGS ---
const wholesomeAffirmations = [
  "You are the most precious part of my life, and nothing can diminish how brilliant and strong you are.",
  "Take a deep breath. You don't have to carry the whole world today. Just rest, my love.",
  "You are doing so much better than you give yourself credit for, and I am endlessly proud of you.",
  "My heart is always your safe home, no matter how chaotic everything else feels.",
  "You are beautiful, capable, intelligent, and you bring so much sunshine to my universe.",
  "Even on your quietest, hardest days, you are deeply and completely loved by me.",
  "Whatever obstacle you are facing today, we will overcome it together. You never stand alone.",
  "Your smile is my absolute favorite thing in this world. Be gentle with your sweet soul today.",
  "You are safe, you are protected, and you are cherished beyond all words."
];

let currentAffirmationIndex = 0;

function drawNewAffirmation() {
  const textEl = document.getElementById('affirmation-text');
  const badgeEl = document.getElementById('quote-number-badge');
  const icon = document.getElementById('draw-icon');
  if (icon) icon.classList.add('animate-spin');

  textEl.style.opacity = '0';
  setTimeout(() => {
    currentAffirmationIndex = (currentAffirmationIndex + 1) % wholesomeAffirmations.length;
    textEl.textContent = `"${wholesomeAffirmations[currentAffirmationIndex]}"`;
    badgeEl.textContent = `#${currentAffirmationIndex + 1}`;
    textEl.style.opacity = '1';
    if (icon) icon.classList.remove('animate-spin');
  }, 250);
}

function openHugModal() {
  const modal = document.getElementById('hug-modal');
  const content = document.getElementById('hug-modal-content');
  modal.classList.remove('opacity-0', 'pointer-events-none');
  content.classList.remove('scale-95');
  content.classList.add('scale-100');
  triggerLoveShower();
}

function closeHugModal() {
  const modal = document.getElementById('hug-modal');
  const content = document.getElementById('hug-modal-content');
  modal.classList.add('opacity-0', 'pointer-events-none');
  content.classList.remove('scale-100');
  content.classList.add('scale-95');
}

// --- 7. PARTICLES ---
function triggerLoveShower() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#E78895', '#FDE2E4', '#DFB78C', '#FF85A1', '#FFC2D1']
    });
  }
}

const burstLoveBtn = document.getElementById('burst-love-btn');
if (burstLoveBtn) {
  burstLoveBtn.addEventListener('click', (e) => {
    const rect = e.target.getBoundingClientRect();
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
      colors: ['#E78895', '#FDE2E4', '#DFB78C', '#FAC8CD']
    });
  });
}

// Canvas floating hearts
const heartCanvas = document.getElementById('heart-canvas');
const ctx = heartCanvas ? heartCanvas.getContext('2d') : null;
let hearts = [];

function resizeCanvas() {
  if (heartCanvas) {
    heartCanvas.width = window.innerWidth;
    heartCanvas.height = window.innerHeight;
  }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function spawnFloatingHeart(x, y) {
  if (!heartCanvas) return;
  const colors = ['#E78895', '#F49FAB', '#D96576', '#DFB78C'];
  for (let i = 0; i < 5; i++) {
    hearts.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 30,
      size: Math.random() * 12 + 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: -(Math.random() * 3 + 2),
      life: 0,
      maxLife: 50
    });
  }
}

window.addEventListener('click', (e) => {
  if (!e.target.closest('button') && !e.target.closest('input')) {
    spawnFloatingHeart(e.clientX, e.clientY);
  }
});

function renderHeartParticles() {
  if (!ctx || !heartCanvas) return;
  ctx.clearRect(0, 0, heartCanvas.width, heartCanvas.height);
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.x += h.vx;
    h.y += h.vy;
    h.life++;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - (h.life / h.maxLife));
    ctx.fillStyle = h.color;
    ctx.font = `${h.size}px serif`;
    ctx.fillText('❤', h.x, h.y);
    ctx.restore();
    if (h.life >= h.maxLife) hearts.splice(i, 1);
  }
  requestAnimationFrame(renderHeartParticles);
}
renderHeartParticles();

// --- 8. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  const isUnlocked = sessionStorage.getItem('sanctuary_unlocked');
  const gate = document.getElementById('sanctuary-gate');
  const skeleton = document.getElementById('skeleton-backdrop');

  if (isUnlocked === 'true' && gate) {
    gate.style.display = 'none';
    if (skeleton) skeleton.style.display = 'none';
    document.body.classList.remove('gate-locked');
  } else {
    document.body.classList.add('gate-locked');
  }

  loadHeroCustom();
  loadDreams();
  loadMemories();
});