const toggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const sections = document.querySelectorAll('section[id]');
const links = document.querySelectorAll('.nav a');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      links.forEach(link => {
        link.style.color = link.getAttribute('href') === '#' + entry.target.id
          ? 'var(--accent)'
          : '';
      });
    }
  });
}, { threshold: 0.35 });

sections.forEach(section => observer.observe(section));

const COMMON_FEATURES = [
  'Bedrock: автоопределение версии из Microsoft Store и принудительный выбор полной версии.',
  'Импорт .mcaddon, .mcpack, .mcworld и .mcproject прямо из лаунчера.',
  'Быстрые разделы Creative, Behavior / Resource Packs, Servers и Profile.',
  'Вкладка «Друзья»: код приглашения, прямой пинг и UPnP для TCP и UDP.',
  'Переключатель Release / Snapshot / All: 103 релиза и 761 снапшот.',
  'Пара «режим / версия» сохраняется между запусками, все версии в одном каталоге.'
];

const EARLY_KEYS = {
  'NEXUS-EARLY-1-34MJNYP3': {
    sha: '4d28bc403b615388ab40f34e2a163bc17c0d525f5db234f5578cf9767b9918c2',
    fast: 'f6ef8776',
    slot: 1,
    label: 'EARLY ACCESS #1',
    title: 'Вы — самый первый тестировщик',
    features: COMMON_FEATURES
  },
  'NEXUS-EARLY-2-TLFSLGAE': {
    sha: 'cd4ffdd50e21233ee57a1a4a3cc564b0f0466f72100c6cd5d72cddb553268d66',
    fast: '68d5ecb4',
    slot: 2,
    label: 'EARLY ACCESS #2',
    title: 'Ранний доступ активен',
    features: COMMON_FEATURES
  }
};

const STORAGE_KEY = 'nexusEarlyKey';
const keyLocked = document.getElementById('keyLocked');
const keyUnlocked = document.getElementById('keyUnlocked');
const earlyKey = document.getElementById('earlyKey');
const earlyUnlock = document.getElementById('earlyUnlock');
const earlyMsg = document.getElementById('earlyMsg');
const earlyBadge = document.getElementById('earlyBadge');
const earlyTitle = document.getElementById('earlyTitle');
const earlyFeatures = document.getElementById('earlyFeatures');
const earlyForget = document.getElementById('earlyForget');

function fastHash(value) {
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x01000193 >>> 0;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = (Math.imul(h2 + c, 0x85ebca6b) ^ (h2 >>> 13)) >>> 0;
  }
  h1 = (h1 ^ ((h2 + ((h1 << 1) >>> 0)) >>> 0)) >>> 0;
  h1 = Math.imul(h1 ^ (h1 >>> 16), 0x7feb352d) >>> 0;
  h1 = Math.imul(h1 ^ (h1 >>> 15), 0x846ca68b) >>> 0;
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;
  return h1.toString(16).padStart(8, '0');
}

async function keyHashes(value) {
  let sha = '';
  if (window.crypto && window.crypto.subtle && window.TextEncoder) {
    try {
      const data = new TextEncoder().encode(value);
      const buffer = await window.crypto.subtle.digest('SHA-256', data);
      sha = Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      /* file:// or older browser: the local hash still works */
    }
  }
  return { sha, fast: fastHash(value) };
}

function findEntry(key, hashes) {
  for (const [storedKey, entry] of Object.entries(EARLY_KEYS)) {
    if (key !== storedKey) continue;
    if ((hashes.sha && hashes.sha === entry.sha) || hashes.fast === entry.fast) {
      return { key: storedKey, entry };
    }
  }
  return null;
}

function unlock(entry) {
  if (!keyLocked || !keyUnlocked) return;
  keyLocked.classList.add('is-hidden');
  keyUnlocked.classList.remove('is-hidden');
  earlyBadge.textContent = entry.label;
  earlyTitle.textContent = entry.title;
  earlyFeatures.innerHTML = '';
  entry.features.forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    earlyFeatures.appendChild(li);
  });
  if (earlyMsg) earlyMsg.textContent = '';
}

function setMessage(text, ok) {
  if (!earlyMsg) return;
  earlyMsg.textContent = text;
  earlyMsg.className = 'key-msg ' + (ok ? 'is-ok' : 'is-error');
}

async function activate(rawKey) {
  const key = String(rawKey || '').trim().toUpperCase();
  if (!key) {
    setMessage('Введите ключ.', false);
    return false;
  }
  const found = findEntry(key, await keyHashes(key));
  if (!found) {
    setMessage('Ключ не найден или введён с ошибкой.', false);
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch (error) {
    /* private mode may block storage; the session still unlocks */
  }
  unlock(found.entry);
  return true;
}

if (earlyUnlock && earlyKey) {
  earlyUnlock.addEventListener('click', () => activate(earlyKey.value));
  earlyKey.addEventListener('keydown', event => {
    if (event.key === 'Enter') activate(earlyKey.value);
  });
}

if (earlyForget) {
  earlyForget.addEventListener('click', () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      /* ignore */
    }
    keyUnlocked.classList.add('is-hidden');
    keyLocked.classList.remove('is-hidden');
    if (earlyKey) earlyKey.value = '';
    setMessage('Ключ удалён из этого браузера.', true);
  });
}

(async () => {
  let candidate = '';
  try {
    candidate = localStorage.getItem(STORAGE_KEY) || '';
  } catch (error) {
    /* ignore */
  }
  const fromUrl = window.location.hash.match(/key=([^&]+)/);
  if (fromUrl) {
    try {
      candidate = decodeURIComponent(fromUrl[1]).trim().toUpperCase();
    } catch (error) {
      candidate = fromUrl[1].trim().toUpperCase();
    }
  }
  if (candidate) await activate(candidate);
})();

