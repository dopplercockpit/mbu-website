/* Robust carousel that supports local or CDN JSON (filenames or absolute URLs) */
function stripBOM(text) {
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text.replace(/^\uFEFF/, '');
}

function humanize(name) {
  const base = String(name).split('/').pop() || String(name);
  const withoutExt = base.replace(/\.[^.]+$/, '');
  return withoutExt
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function isAbs(url) {
  return /^https?:\/\//i.test(url) || url.startsWith('//');
}

async function loadCarousel({ jsonPath, mount, autoplayMs = 3500, showCaptions = true }) {
  const root = document.querySelector(mount);
  if (!root) {
    console.warn(`✖ mount not found: ${mount}`);
    return;
  }

  // Fetch JSON (supports cross-origin; CORS must be enabled on the CDN)
  let list = [];
  try {
    const res = await fetch(jsonPath, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const txt = stripBOM(await res.text());
    list = JSON.parse(txt);
  } catch (e) {
    root.innerHTML = `<div class="carousel-error">Couldn’t load gallery. (${e.message})</div>`;
    return;
  }

  if (!Array.isArray(list) || list.length === 0) {
    root.innerHTML = `<div class="carousel-error">No images available.</div>`;
    return;
  }

  // Compute a directory/base for filename entries
  const baseURL = new URL(jsonPath, window.location.href);
  const dir = baseURL.href.replace(/images\.json$/i, '');
  const srcFor = (f) => (isAbs(f) ? f : dir + encodeURI(f));

  root.innerHTML = `
    <div class="carousel-wrapper">
      <img class="carousel-image active" alt="">
      <div class="caption" ${showCaptions ? '' : 'hidden'}></div>
      <button class="nav prev" aria-label="Previous">‹</button>
      <button class="nav next" aria-label="Next">›</button>
    </div>
    <div class="thumbs" role="tablist"></div>
  `;

  const main = root.querySelector('.carousel-image');
  const cap = root.querySelector('.caption');
  const prev = root.querySelector('.prev');
  const next = root.querySelector('.next');
  const thumbs = root.querySelector('.thumbs');

  thumbs.innerHTML = list
    .map(
      (f, i) => `
    <button class="thumb" data-i="${i}" aria-label="Slide ${i + 1}" role="tab">
      <img src="${srcFor(f)}" alt="">
    </button>`
    )
    .join('');

  let idx = 0,
    t = null;

  function show(i) {
    idx = (i + list.length) % list.length;
    const url = srcFor(list[idx]);
    main.classList.remove('active');
    requestAnimationFrame(() => {
      main.src = url;
      main.alt = humanize(url);
      if (showCaptions) cap.textContent = humanize(url);
      [...thumbs.children].forEach((b, j) => b.classList.toggle('active', j === idx));
      requestAnimationFrame(() => main.classList.add('active'));
    });
  }

  function start() {
    stop();
    t = setInterval(() => show(idx + 1), autoplayMs);
  }

  function stop() {
    if (t) {
      clearInterval(t);
      t = null;
    }
  }

  main.addEventListener('error', () => {
    if (cap) cap.textContent = 'Image failed to load.';
  });
  prev.addEventListener('click', () => {
    show(idx - 1);
    start();
  });
  next.addEventListener('click', () => {
    show(idx + 1);
    start();
  });
  thumbs.addEventListener('click', (e) => {
    const b = e.target.closest('.thumb');
    if (!b) return;
    show(+b.dataset.i);
    start();
  });
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);
  root.tabIndex = 0;
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      show(idx - 1);
      start();
    }
    if (e.key === 'ArrowRight') {
      show(idx + 1);
      start();
    }
  });

  show(0);
  start();
}
