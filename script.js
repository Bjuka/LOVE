// --- HELPER: AUTOMATIC IMAGE COMPRESSOR ---
function compressImageFile(file, maxWidth = 800, maxHeight = 800, quality = 0.72) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// HTML Sanitizer
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

// Live Date
const liveDateEl = document.getElementById('live-date');
if (liveDateEl) {
  const today = new Date();
  liveDateEl.textContent = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}


// --- 2. CUSTOMIZABLE HERO ---
const defaultHeroConfig = {
  image: "cover.jpg",
  badge: "My Favorite View",
  quote: "No matter where life takes us, my heart will always beat for you."
};

let uploadedHeroBase64 = "";

function loadHeroCustom(customObj) {
  const config = customObj || (localStorage.getItem('sanctuary_hero_custom') ? JSON.parse(localStorage.getItem('sanctuary_hero_custom')) : defaultHeroConfig);

  document.getElementById('hero-img').src = config.image || defaultHeroConfig.image;
  document.getElementById('hero-badge').textContent = config.badge || defaultHeroConfig.badge;
  document.getElementById('hero-quote').textContent = `"${config.quote || defaultHeroConfig.quote}"`;
}

function openCustomizeHeroModal() {
  const stored = localStorage.getItem('sanctuary_hero_custom');
  const config = stored ? JSON.parse(stored) : defaultHeroConfig;

  document.getElementById('hero-badge-input').value = config.badge;
  document.getElementById('hero-quote-input').value = config.quote;
  document.getElementById('hero-url-input').value = config.image.startsWith('data:') ? '' : config.image;

  uploadedHeroBase64 = config.image.startsWith('data:') ? config.image : "";
  const previewImg = document.getElementById('hero-preview-img');
  const previewContainer = document.getElementById('hero-preview-container');

  if (config.image) {
    previewImg.src = config.image;
    previewContainer.classList.remove('hidden');
  } else {
    previewContainer.classList.add('hidden');
  }

  const modal = document.getElementById('custom-hero-modal');
  const content = document.getElementById('custom-hero-content');
  modal.classList.remove('opacity-0', 'pointer-events-none');
  content.classList.remove('scale-95');
  content.classList.add('scale-100');
}

function closeCustomizeHeroModal() {
  const modal = document.getElementById('custom-hero-modal');
  const content = document.getElementById('custom-hero-content');
  modal.classList.add('opacity-0', 'pointer-events-none');
  content.classList.remove('scale-100');
  content.classList.add('scale-95');
}

async function handleHeroFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    uploadedHeroBase64 = await compressImageFile(file, 900, 900, 0.75);
    const previewImg = document.getElementById('hero-preview-img');
    const previewContainer = document.getElementById('hero-preview-container');
    previewImg.src = uploadedHeroBase64;
    previewContainer.classList.remove('hidden');
  }
}

function handleSaveHeroCustom(e) {
  e.preventDefault();
  const badge = document.getElementById('hero-badge-input').value.trim() || defaultHeroConfig.badge;
  const quote = document.getElementById('hero-quote-input').value.trim() || defaultHeroConfig.quote;
  const urlInput = document.getElementById('hero-url-input').value.trim();
  const image = uploadedHeroBase64 || urlInput || defaultHeroConfig.image;

  const newConfig = { badge, quote, image };
  localStorage.setItem('sanctuary_hero_custom', JSON.stringify(newConfig));

  loadHeroCustom();
  closeCustomizeHeroModal();
  triggerLoveShower();
}

function resetHeroToDefault() {
  if (confirm("Reset hero card back to default photo and quote?")) {
    localStorage.removeItem('sanctuary_hero_custom');
    loadHeroCustom();
    closeCustomizeHeroModal();
  }
}


// --- 3. CANVAS CONFETTI & PARTICLES ---
function triggerLoveShower() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#E78895', '#FDE2E4', '#DFB78C', '#FF85A1', '#FFC2D1']
    });
  }
  spawnFloatingHeart(window.innerWidth / 2, window.innerHeight / 2);
}

document.getElementById('burst-love-btn').addEventListener('click', (e) => {
  const rect = e.target.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;

  confetti({
    particleCount: 60,
    spread: 60,
    origin: { x, y },
    colors: ['#E78895', '#FDE2E4', '#DFB78C', '#FAC8CD']
  });
});

const heartCanvas = document.getElementById('heart-canvas');
const ctx = heartCanvas.getContext('2d');
let hearts = [];

function resizeCanvas() {
  heartCanvas.width = window.innerWidth;
  heartCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function spawnFloatingHeart(x, y) {
  const colors = ['#E78895', '#F49FAB', '#D96576', '#DFB78C'];
  for (let i = 0; i < 6; i++) {
    hearts.push({
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 40,
      size: Math.random() * 12 + 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: -(Math.random() * 3 + 2),
      opacity: 1,
      life: 0,
      maxLife: 60
    });
  }
}

window.addEventListener('click', (e) => {
  if (!e.target.closest('button') && !e.target.closest('input') && !e.target.closest('textarea')) {
    spawnFloatingHeart(e.clientX, e.clientY);
  }
});

function renderHeartParticles() {
  ctx.clearRect(0, 0, heartCanvas.width, heartCanvas.height);
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.x += h.vx;
    h.y += h.vy;
    h.life++;
    h.opacity = 1 - (h.life / h.maxLife);

    ctx.save();
    ctx.globalAlpha = Math.max(0, h.opacity);
    ctx.fillStyle = h.color;
    ctx.font = `${h.size}px serif`;
    ctx.fillText('❤', h.x, h.y);
    ctx.restore();

    if (h.life >= h.maxLife) {
      hearts.splice(i, 1);
    }
  }
  requestAnimationFrame(renderHeartParticles);
}
renderHeartParticles();


// --- 4. WHOLESOME AFFIRMATIONS ---
const wholesomeAffirmations = [
  "You are the most precious part of my life, and nothing can diminish how brilliant and strong you are.",
  "Take a deep breath. You don't have to carry the whole world today. Just rest, my love.",
  "You are doing so much better than you give yourself credit for, and I am endlessly proud of you.",
  "My heart is always your safe home, no matter how chaotic everything else feels.",
  "You are beautiful, capable, intelligent, and you bring so much sunshine to my universe.",
  "Even on your quietest, hardest days, you are deeply and completely loved by me.",
  "Whatever obstacle you are facing today, we will overcome it together. You never stand alone.",
  "Your smile is my absolute favorite thing in this world. Be gentle with your sweet soul today.",
  "You are my answered prayer, my best friend, and my greatest blessing.",
  "It is okay to rest. It is okay to take a pause. You are worthy simply by being you.",
  "I love you not just for who you are, but for who I am when I am with you.",
  "You have survived 100% of your hardest days so far, and you have a loving future ahead.",
  "You inspire me every single day with your kindness, your resilience, and your warm heart.",
  "Remember that you are my favorite person in the entire universe. Always and forever.",
  "Don't forget how magical your laughter is. Tomorrow is a brand new day full of soft moments.",
  "I believe in your dreams even when you feel tired. We will get our cozy home, baby, pets, and horse!",
  "I would choose you over and over again, in every lifetime and every version of reality.",
  "You are safe, you are protected, and you are cherished beyond all words."
];

let currentAffirmationIndex = 0;

function drawNewAffirmation() {
  const textEl = document.getElementById('affirmation-text');
  const badgeEl = document.getElementById('quote-number-badge');
  const icon = document.getElementById('draw-icon');

  if (icon) icon.classList.add('animate-spin');

  textEl.style.opacity = '0';
  textEl.style.transform = 'translateY(8px)';

  setTimeout(() => {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * wholesomeAffirmations.length);
    } while (newIndex === currentAffirmationIndex && wholesomeAffirmations.length > 1);

    currentAffirmationIndex = newIndex;
    textEl.textContent = `"${wholesomeAffirmations[currentAffirmationIndex]}"`;
    badgeEl.textContent = `#${currentAffirmationIndex + 1}`;

    textEl.style.opacity = '1';
    textEl.style.transform = 'translateY(0px)';

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


// --- 5. DREAM BOARD ---
const initialDefaultDreams = [
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

let uploadedDreamBase64 = "";

function setDreamTagPreset(emoji, name) {
  document.getElementById('dream-emoji-input').value = emoji;
  document.getElementById('dream-tagname-input').value = name;
}

function loadDreams(customArray) {
  const dreams = customArray || (localStorage.getItem('sanctuary_dreams') ? JSON.parse(localStorage.getItem('sanctuary_dreams')) : initialDefaultDreams);
  renderDreams(dreams);
}

function saveDreams(dreams) {
  try {
    localStorage.setItem('sanctuary_dreams', JSON.stringify(dreams));
  } catch (err) {
    console.warn("Storage quota warning:", err);
  }
  renderDreams(dreams);
}

function renderDreams(dreams) {
  const container = document.getElementById('dreams-grid');
  container.innerHTML = "";

  if (!dreams || dreams.length === 0) {
    container.innerHTML = `
      <div class="col-span-full border-2 border-dashed border-champagne-300 rounded-3xl p-10 text-center space-y-3 bg-white/40">
        <div class="w-14 h-14 mx-auto rounded-full bg-champagne-100 flex items-center justify-center text-champagne-400">
          <i data-lucide="sparkles" class="w-7 h-7"></i>
        </div>
        <h4 class="font-serif text-xl font-bold text-rosewood">Our Dream Board is Ready! ✨</h4>
        <p class="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
          Tap <span class="font-semibold text-blush-500">"Add Custom Dream"</span> above to add your goals and dreams.
        </p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  dreams.forEach((dream) => {
    const card = document.createElement('div');
    card.className = "glass-card rounded-3xl p-5 border border-white hover:shadow-lg transition-all duration-300 flex flex-col justify-between group relative overflow-hidden";
    
    card.innerHTML = `
      <div>
        <div class="aspect-video rounded-2xl overflow-hidden mb-4 bg-blush-50 relative shadow-inner">
          <img src="${escapeHtml(dream.image)}" alt="${escapeHtml(dream.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=700&q=80'">

          <span class="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-rosewood shadow-sm flex items-center gap-1">
            <span>${escapeHtml(dream.emoji || '✨')}</span>
            <span>${escapeHtml(dream.tag || 'Dream')}</span>
          </span>

          <button onclick="deleteDream('${dream.id}')" title="Delete dream" class="admin-only absolute top-2.5 left-2.5 bg-white/80 hover:bg-red-50 text-gray-400 hover:text-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition shadow">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
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
    `;
    container.appendChild(card);
  });

  lucide.createIcons();
}

function toggleDreamHeart(btn) {
  if (btn.classList.contains('loved')) {
    btn.classList.remove('loved');
    btn.classList.remove('text-blush-500');
    btn.classList.add('text-gray-400');
  } else {
    btn.classList.add('loved');
    btn.classList.add('text-blush-500');
    btn.classList.remove('text-gray-400');
    triggerLoveShower();
  }
}

function deleteDream(id) {
  if (confirm("Remove this dream from your board?")) {
    const stored = localStorage.getItem('sanctuary_dreams');
    let dreams = stored ? JSON.parse(stored) : initialDefaultDreams;
    dreams = dreams.filter(d => d.id !== id);
    saveDreams(dreams);
  }
}

function openAddDreamModal() {
  const modal = document.getElementById('add-dream-modal');
  const content = document.getElementById('add-dream-content');
  modal.classList.remove('opacity-0', 'pointer-events-none');
  content.classList.remove('scale-95');
  content.classList.add('scale-100');
  uploadedDreamBase64 = "";
  document.getElementById('dream-preview-container').classList.add('hidden');
}

function closeAddDreamModal() {
  const modal = document.getElementById('add-dream-modal');
  const content = document.getElementById('add-dream-content');
  modal.classList.add('opacity-0', 'pointer-events-none');
  content.classList.remove('scale-100');
  content.classList.add('scale-95');
}

async function handleDreamFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    uploadedDreamBase64 = await compressImageFile(file, 800, 600, 0.72);
    const previewImg = document.getElementById('dream-preview-img');
    const previewContainer = document.getElementById('dream-preview-container');
    previewImg.src = uploadedDreamBase64;
    previewContainer.classList.remove('hidden');
  }
}

function handleCreateDream(e) {
  e.preventDefault();
  const title = document.getElementById('dream-title-input').value.trim();
  const emoji = document.getElementById('dream-emoji-input').value.trim() || '✨';
  const tag = document.getElementById('dream-tagname-input').value.trim() || 'Vision';
  const desc = document.getElementById('dream-desc-input').value.trim();
  const urlInput = document.getElementById('dream-image-input').value.trim();
  const image = uploadedDreamBase64 || urlInput || 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=700&q=80';

  const stored = localStorage.getItem('sanctuary_dreams');
  let dreams = stored ? JSON.parse(stored) : [...initialDefaultDreams];

  const newDream = {
    id: 'dream-' + Date.now(),
    title,
    emoji,
    tag,
    desc,
    image
  };

  dreams.unshift(newDream);
  saveDreams(dreams);
  closeAddDreamModal();
  document.getElementById('dream-form').reset();
  triggerLoveShower();
}


// --- 6. MEMORY BOX ---
const initialDefaultMemories = [
  {
    id: 'mem-1',
    title: 'What makes me happy?',
    date: '2026-03-13',
    tag: 'MINEEE 💍',
    image: 'memory1.jpg',
    caption: '"Every moment with you makes me feel special beacause you feel like a long lost part of me which makes me complete 💕💕"'
  },
  {
    id: 'mem-2',
    title: 'My Cute Babieeee',
    date: '2025-12-12',
    tag: 'Special dayyy 🍷',
    image: 'memory2.jpg',
    caption: '"Whenever im with you, im never alone. you make me feel so happy like im some celebrity but tbh, i just want to be YOURS ❤️"'
  },
  {
    id: 'mem-3',
    title: 'Ummmmmah',
    date: '2026-08-14',
    tag: 'Goofy Moments 🤪',
    image: 'memory3.jpg',
    caption: '"You brings out the kid in me (idk the date😭)"'
  }
];

let uploadedMemoryBase64 = "";

function loadMemories(customArray) {
  const memories = customArray || (localStorage.getItem('sanctuary_memories') ? JSON.parse(localStorage.getItem('sanctuary_memories')) : initialDefaultMemories);
  renderMemories(memories);
}

function saveMemories(memories) {
  try {
    localStorage.setItem('sanctuary_memories', JSON.stringify(memories));
  } catch (err) {
    console.warn("Storage quota warning:", err);
  }
  renderMemories(memories);
}

function renderMemories(memories) {
  const container = document.getElementById('memory-gallery-grid');
  container.innerHTML = "";

  if (!memories || memories.length === 0) {
    container.innerHTML = `
      <div class="col-span-full border-2 border-dashed border-blush-200 rounded-3xl p-10 text-center space-y-3 bg-white/40">
        <div class="w-14 h-14 mx-auto rounded-full bg-blush-100 flex items-center justify-center text-blush-500">
          <i data-lucide="camera" class="w-7 h-7"></i>
        </div>
        <h4 class="font-serif text-xl font-bold text-rosewood">Our Memory Box is Waiting For You! ✨</h4>
        <p class="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
          Click <span class="font-semibold text-blush-500">"Add A New Memory"</span> above to add your photos and sweet moments.
        </p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  memories.forEach((mem) => {
    const card = document.createElement('div');
    card.className = "glass-card rounded-3xl p-4 sm:p-5 border border-white hover:shadow-xl transition-all duration-300 flex flex-col justify-between group";
    card.innerHTML = `
      <div>
        <div class="aspect-[4/3] rounded-2xl overflow-hidden bg-blush-50 relative mb-3.5 shadow-inner">
          <img src="${escapeHtml(mem.image)}" alt="${escapeHtml(mem.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=700&q=80'">
          <span class="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-rosewood shadow-sm">
            ${escapeHtml(mem.tag || 'Memory')}
          </span>
          <button onclick="deleteMemory('${mem.id}')" title="Delete memory" class="admin-only absolute top-2.5 right-2.5 bg-white/80 hover:bg-red-50 text-gray-400 hover:text-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition shadow">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
        <div class="space-y-1">
          <span class="text-[11px] text-blush-500 font-semibold tracking-wider uppercase">${formatDisplayDate(mem.date)}</span>
          <h4 class="font-serif text-lg font-bold text-rosewood leading-snug">${escapeHtml(mem.title)}</h4>
          <p class="text-xs sm:text-sm text-gray-600 font-hand text-lg leading-relaxed pt-1">"${escapeHtml(mem.caption || mem.title)}"</p>
        </div>
      </div>
      <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span class="text-[11px] text-gray-400">Cherished forever</span>
        <button onclick="toggleDreamHeart(this)" class="p-1.5 rounded-full hover:bg-blush-50 text-blush-400 transition">
          <i data-lucide="heart" class="w-4 h-4 fill-blush-400"></i>
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  lucide.createIcons();
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

function deleteMemory(id) {
  if (confirm("Remove this memory from your box?")) {
    const stored = localStorage.getItem('sanctuary_memories');
    let memories = stored ? JSON.parse(stored) : initialDefaultMemories;
    memories = memories.filter(m => m.id !== id);
    saveMemories(memories);
  }
}

function openAddMemoryModal() {
  const modal = document.getElementById('add-memory-modal');
  const content = document.getElementById('add-memory-content');
  modal.classList.remove('opacity-0', 'pointer-events-none');
  content.classList.remove('scale-95');
  content.classList.add('scale-100');
  uploadedMemoryBase64 = "";
  document.getElementById('mem-preview-container').classList.add('hidden');
}

function closeAddMemoryModal() {
  const modal = document.getElementById('add-memory-modal');
  const content = document.getElementById('add-memory-content');
  modal.classList.add('opacity-0', 'pointer-events-none');
  content.classList.remove('scale-100');
  content.classList.add('scale-95');
}

async function handleMemoryFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    uploadedMemoryBase64 = await compressImageFile(file, 800, 600, 0.72);
    const previewImg = document.getElementById('mem-preview-img');
    const previewContainer = document.getElementById('mem-preview-container');
    previewImg.src = uploadedMemoryBase64;
    previewContainer.classList.remove('hidden');
  }
}

function handleCreateMemory(e) {
  e.preventDefault();
  const title = document.getElementById('mem-title-input').value.trim();
  const date = document.getElementById('mem-date-input').value;
  const tag = document.getElementById('mem-tag-input').value;
  const caption = document.getElementById('mem-caption-input').value.trim() || title;
  const urlInput = document.getElementById('mem-url-input').value.trim();
  const image = uploadedMemoryBase64 || urlInput || 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=700&q=80';

  const stored = localStorage.getItem('sanctuary_memories');
  let memories = stored ? JSON.parse(stored) : [...initialDefaultMemories];

  const newMem = {
    id: 'mem-' + Date.now(),
    title,
    date,
    tag,
    image,
    caption
  };

  memories.unshift(newMem);
  saveMemories(memories);
  closeAddMemoryModal();
  document.getElementById('memory-form').reset();
  triggerLoveShower();
}



// --- 7. MUSIC HUB (SYNTH + DEFAULT QUEUE) ---
const initialDefaultSongs = [
  {
    id: 'song-1',
    title: 'Accidently in LOVE',
    artist: 'Counting Crows',
    src: 'Accidently in LOVE.mp3'
  },
  {
    id: 'song-2',
    title: 'Make you MINE',
    artist: 'PUBLIC',
    src: 'Make you MINE.mp3'
  },
  {
    id: 'song-3',
    title: 'You & I',
    artist: 'One Direection',
    src: 'You & I.mp3'
  }
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
    this.loadQueueFromStorage();
  }

  setupAudioListeners() {
    this.audioEl.addEventListener('timeupdate', () => {
      if (this.mode === 'queue' && this.audioEl.duration) {
        const current = this.audioEl.currentTime;
        const duration = this.audioEl.duration;
        const percent = (current / duration) * 100;
        const progressEl = document.getElementById('song-progress');
        if (progressEl) progressEl.value = percent;
        document.getElementById('current-time').textContent = this.formatTime(current);
        document.getElementById('duration-time').textContent = this.formatTime(duration);
      }
    });

    this.audioEl.addEventListener('ended', () => {
      if (this.mode === 'queue') {
        this.playNext();
      }
    });

    this.audioEl.addEventListener('error', (e) => {
      if (this.mode === 'queue' && this.isPlaying) {
        console.error("Audio playback error:", e);
        const song = this.queue[this.currentTrackIndex];
        const songTitle = song ? song.title : 'this track';
        alert(`Could not load "${songTitle}".\n\nEnsure "${song ? song.src : ''}" is placed in your project folder or uploaded to GitHub.`);
        this.pause();
      }
    });
  }

  loadQueueFromStorage() {
    const stored = localStorage.getItem('sanctuary_song_queue');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.queue = (parsed && parsed.length > 0) ? parsed : [...initialDefaultSongs];
      } catch(e) {
        this.queue = [...initialDefaultSongs];
      }
    } else {
      this.queue = [...initialDefaultSongs];
    }
    this.updateQueueUI();
  }

  saveQueueToStorage() {
    const storableQueue = this.queue.map(song => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      src: song.src.startsWith('blob:') ? '' : song.src
    }));
    try {
      localStorage.setItem('sanctuary_song_queue', JSON.stringify(storableQueue));
    } catch(e) {
      console.warn("Storage quota warning:", e);
    }
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

    const targetVol = this.volume * 0.16;
    gain.gain.setValueAtTime(0.001, this.synthCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(targetVol, this.synthCtx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.synthCtx.currentTime + 2.8);

    osc.connect(gain);
    gain.connect(this.synthCtx.destination);

    osc.start();
    osc.stop(this.synthCtx.currentTime + 3.0);
  }

  startSynth() {
    this.initSynth();
    if (this.synthCtx.state === 'suspended') {
      this.synthCtx.resume();
    }
    this.playSynthChime(this.notes[Math.floor(Math.random() * this.notes.length)]);
    this.synthInterval = setInterval(() => {
      if (Math.random() > 0.18) {
        const freq = this.notes[Math.floor(Math.random() * this.notes.length)];
        this.playSynthChime(freq);
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
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (this.mode === 'synth') {
      this.isPlaying = true;
      this.startSynth();
      this.updatePlayerUI();
    } else {
      if (this.queue.length === 0) {
        alert("Your playlist is empty! Add a song below or switch to Lofi Chimes.");
        this.isPlaying = false;
        this.updatePlayerUI();
        return;
      }
      this.loadAndPlayTrack(this.currentTrackIndex);
    }
  }

  pause() {
    this.isPlaying = false;
    if (this.mode === 'synth') {
      this.stopSynth();
    } else {
      this.audioEl.pause();
    }
    this.updatePlayerUI();
  }

  loadAndPlayTrack(index) {
    if (!this.queue[index]) return;
    this.currentTrackIndex = index;
    const song = this.queue[this.currentTrackIndex];

    if (!song.src) {
      alert(`Audio source for "${song.title}" is missing.\n\nPlease provide a valid audio filename (e.g. song1.mp3) or direct URL.`);
      this.pause();
      return;
    }

    this.audioEl.src = song.src;
    this.audioEl.load();

    const playPromise = this.audioEl.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.updatePlayerUI();
        })
        .catch(err => {
          console.warn("Autoplay prevented:", err);
          this.isPlaying = false;
          this.updatePlayerUI();
        });
    }
  }

  playNext() {
    if (this.mode === 'synth' || this.queue.length === 0) return;
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.queue.length;
    if (this.isPlaying) {
      this.loadAndPlayTrack(this.currentTrackIndex);
    } else {
      this.updatePlayerUI();
    }
  }

  playPrev() {
    if (this.mode === 'synth' || this.queue.length === 0) return;
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.queue.length) % this.queue.length;
    if (this.isPlaying) {
      this.loadAndPlayTrack(this.currentTrackIndex);
    } else {
      this.updatePlayerUI();
    }
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

  addSong(title, artist, src) {
    const newSong = {
      id: 'song-' + Date.now(),
      title: title || 'Sweet Melody',
      artist: artist || 'For My Love',
      src: src
    };
    this.queue.push(newSong);
    this.saveQueueToStorage();
    if (this.queue.length === 1) {
      this.currentTrackIndex = 0;
    }
    this.updatePlayerUI();
  }

  removeSong(id) {
    const idx = this.queue.findIndex(s => s.id === id);
    if (idx !== -1) {
      if (idx === this.currentTrackIndex && this.isPlaying) {
        this.pause();
      }
      this.queue.splice(idx, 1);
      if (this.currentTrackIndex >= this.queue.length) {
        this.currentTrackIndex = Math.max(0, this.queue.length - 1);
      }
      this.saveQueueToStorage();
      this.updatePlayerUI();
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
      if (this.queue.length > 0 && this.queue[this.currentTrackIndex]) {
        const s = this.queue[this.currentTrackIndex];
        if (titleEl) titleEl.textContent = s.title;
        if (subEl) subEl.textContent = s.artist;
        if (navTitle) navTitle.textContent = s.title;
      } else {
        if (titleEl) titleEl.textContent = "Queue is Empty";
        if (subEl) subEl.textContent = "Add your favorite songs below 🎶";
        if (navTitle) navTitle.textContent = "Custom Queue";
      }
    }

    if (this.isPlaying) {
      if (mainPlayIcon) mainPlayIcon.setAttribute('data-lucide', 'pause');
      if (vinyl) vinyl.classList.add('animate-spin-slow');
      if (eq) {
        eq.classList.remove('hidden');
        eq.classList.add('flex');
      }
    } else {
      if (mainPlayIcon) mainPlayIcon.setAttribute('data-lucide', 'play');
      if (vinyl) vinyl.classList.remove('animate-spin-slow');
      if (eq) {
        eq.classList.add('hidden');
        eq.classList.remove('flex');
      }
    }

    lucide.createIcons();
    this.updateQueueUI();
  }

  updateQueueUI() {
    const list = document.getElementById('queue-list');
    const countBadge = document.getElementById('queue-count-badge');
    if (countBadge) countBadge.textContent = this.queue.length;
    if (!list) return;

    list.innerHTML = "";
    if (this.queue.length === 0) {
      list.innerHTML = `<div class="text-center py-4 text-xs text-gray-400">No songs added yet. Click "+ Add New Song" above!</div>`;
      return;
    }

    this.queue.forEach((song, i) => {
      const isCurrent = (this.mode === 'queue' && i === this.currentTrackIndex);
      const item = document.createElement('div');
      item.className = `flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
        isCurrent ? 'bg-blush-100/70 border-blush-300 font-semibold text-rosewood' : 'bg-white hover:bg-cream-50 border-gray-100 text-gray-700'
      }`;
      item.innerHTML = `
        <div class="flex items-center gap-2.5 truncate cursor-pointer" onclick="musicHub.selectTrack(${i})">
          <span class="w-5 text-center text-[10px] text-gray-400 font-mono">${isCurrent && this.isPlaying ? '▶' : i + 1}</span>
          <div class="truncate">
            <span class="block truncate">${escapeHtml(song.title)}</span>
            <span class="text-[10px] text-gray-500 block truncate">${escapeHtml(song.artist)}</span>
          </div>
        </div>
        <button onclick="musicHub.removeSong('${song.id}')" title="Remove song" class="admin-only text-gray-400 hover:text-red-500 p-1 transition">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      `;
      list.appendChild(item);
    });

    lucide.createIcons();
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

function toggleMainPlayState() {
  musicHub.togglePlay();
}

function playNextTrack() {
  musicHub.playNext();
}

function playPrevTrack() {
  musicHub.playPrev();
}

function handleSeek(val) {
  musicHub.seek(val);
}

function handleVolumeChange(val) {
  musicHub.setVolume(val);
}

function toggleAddSongForm() {
  const form = document.getElementById('add-song-form');
  form.classList.toggle('hidden');
}

function handleAddSongToQueue() {
  const title = document.getElementById('song-title-input').value.trim() || "Sweet Song";
  const artist = document.getElementById('song-artist-input').value.trim() || "My Love";
  const fileInput = document.getElementById('song-file-input');
  const urlInput = document.getElementById('song-url-input').value.trim();

  if (fileInput.files && fileInput.files[0]) {
    const fileName = fileInput.files[0].name;
    musicHub.addSong(title, artist, fileName);
    resetSongForm();
  } else if (urlInput) {
    musicHub.addSong(title, artist, urlInput);
    resetSongForm();
  } else {
    alert("Please enter the song filename (e.g. song1.mp3) or direct audio URL.");
  }
}

function resetSongForm() {
  document.getElementById('song-title-input').value = "";
  document.getElementById('song-artist-input').value = "";
  document.getElementById('song-file-input').value = "";
  document.getElementById('song-url-input').value = "";
  toggleAddSongForm();
  triggerLoveShower();
}


// --- 8. READ-ONLY SNAPSHOT & SHARE LINK GENERATOR ---
function openShareLinkModal() {
  const modal = document.getElementById('share-link-modal');
  const content = document.getElementById('share-link-content');
  const input = document.getElementById('share-link-input');

  const hero = localStorage.getItem('sanctuary_hero_custom') ? JSON.parse(localStorage.getItem('sanctuary_hero_custom')) : defaultHeroConfig;
  const dreams = localStorage.getItem('sanctuary_dreams') ? JSON.parse(localStorage.getItem('sanctuary_dreams')) : initialDefaultDreams;
  const memories = localStorage.getItem('sanctuary_memories') ? JSON.parse(localStorage.getItem('sanctuary_memories')) : initialDefaultMemories;
  const queue = (musicHub.queue && musicHub.queue.length > 0) ? musicHub.queue : initialDefaultSongs;

  const lightweightQueue = queue.map(s => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    src: s.src
  }));

  const payload = {
    h: hero,
    d: dreams,
    m: memories,
    q: lightweightQueue
  };

  try {
    const serialized = btoa(encodeURIComponent(JSON.stringify(payload)).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
    const shareUrl = `${window.location.origin}${window.location.pathname}#view=readonly&data=${serialized}`;
    input.value = shareUrl;
  } catch (err) {
    input.value = `${window.location.origin}${window.location.pathname}?view=readonly`;
  }

  modal.classList.remove('opacity-0', 'pointer-events-none');
  content.classList.remove('scale-95');
  content.classList.add('scale-100');
}

function closeShareLinkModal() {
  const modal = document.getElementById('share-link-modal');
  const content = document.getElementById('share-link-content');
  modal.classList.add('opacity-0', 'pointer-events-none');
  content.classList.remove('scale-100');
  content.classList.add('scale-95');
}

function copyGeneratedShareLink() {
  const input = document.getElementById('share-link-input');
  const btn = document.getElementById('copy-link-btn');

  navigator.clipboard.writeText(input.value).then(() => {
    btn.textContent = "Copied! ✨";
    btn.classList.replace('bg-blush-500', 'bg-green-600');
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.replace('bg-green-600', 'bg-blush-500');
    }, 2000);
  }).catch(() => {
    input.select();
    document.execCommand('copy');
  });
  triggerLoveShower();
}

function checkAndApplyViewMode() {
  const hash = window.location.hash;
  const search = window.location.search;

  const isReadOnly = hash.includes('view=readonly') || search.includes('view=readonly') || search.includes('preview=true');

  if (isReadOnly) {
    document.body.classList.add('readonly-mode');
  }

  if (hash.includes('data=')) {
    try {
      const rawData = hash.split('data=')[1].split('&')[0];
      const decoded = decodeURIComponent(Array.prototype.map.call(atob(rawData), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const payload = JSON.parse(decoded);

      if (payload.h) loadHeroCustom(payload.h);
      if (payload.d) loadDreams(payload.d);
      if (payload.m) loadMemories(payload.m);
      if (payload.q && Array.isArray(payload.q) && payload.q.length > 0) {
        musicHub.queue = payload.q;
      } else {
        musicHub.queue = [...initialDefaultSongs];
      }
      musicHub.updateQueueUI();
      musicHub.updatePlayerUI();
      return true;
    } catch (e) {
      console.warn("Data snapshot fallback to defaults:", e);
    }
  }

  musicHub.loadQueueFromStorage();
  return false;
}


// --- 9. EXPORT UPDATED SOURCE CODE TO FILE ---
function exportUpdatedHtml() {
  const currentHero = localStorage.getItem('sanctuary_hero_custom') || JSON.stringify(defaultHeroConfig);
  const currentDreams = localStorage.getItem('sanctuary_dreams') || JSON.stringify(initialDefaultDreams);
  const currentMemories = localStorage.getItem('sanctuary_memories') || JSON.stringify(initialDefaultMemories);

  let docHtml = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;

  docHtml = docHtml.replace(
    /const defaultHeroConfig = \{[\s\S]*?\};/,
    `const defaultHeroConfig = ${currentHero};`
  );
  docHtml = docHtml.replace(
    /const initialDefaultDreams = \[[\s\S]*?\];/,
    `const initialDefaultDreams = ${currentDreams};`
  );
  docHtml = docHtml.replace(
    /const initialDefaultMemories = \[[\s\S]*?\];/,
    `const initialDefaultMemories = ${currentMemories};`
  );

  const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'index.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  triggerLoveShower();
}


// --- INITIALIZE ON LOAD ---
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  const loadedFromHash = checkAndApplyViewMode();
  if (!loadedFromHash) {
    loadHeroCustom();
    loadDreams();
    loadMemories();
  }
});

// ==================== SANCTUARY LOCK SYSTEM ====================
// Set your desired secret password (case-sensitive or lowercase)
const SANCTUARY_SECRET_PASSWORD = "you_have_very_preety_eyes_and_cute_butt"; // Change this to your anniversary date or secret word

function handleUnlockAttempt(e) {
  if (e) e.preventDefault();
  
  const input = document.getElementById('gate-password-input');
  const errorMsg = document.getElementById('gate-error-msg');
  const card = document.getElementById('gate-card');
  const gate = document.getElementById('sanctuary-gate');

  if (input.value.trim() === SANCTUARY_SECRET_PASSWORD) {
    // Correct Password
    sessionStorage.setItem('sanctuary_unlocked', 'true');
    errorMsg.classList.add('hidden');
    
    // Unlock Animation
    gate.classList.add('opacity-0', 'pointer-events-none', 'scale-105');
    if (typeof triggerLoveShower === 'function') triggerLoveShower();
  } else {
    // Wrong Password
    errorMsg.classList.remove('hidden');
    card.classList.remove('shake-gate');
    void card.offsetWidth; // Force CSS reflow
    card.classList.add('shake-gate');
    input.value = '';
    input.focus();
  }
}

// Auto-check on page load
document.addEventListener('DOMContentLoaded', () => {
  const isUnlocked = sessionStorage.getItem('sanctuary_unlocked');
  const gate = document.getElementById('sanctuary-gate');
  
  if (isUnlocked === 'true' && gate) {
    gate.classList.add('opacity-0', 'pointer-events-none');
  }
});