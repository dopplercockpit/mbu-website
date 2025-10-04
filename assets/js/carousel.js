// Minimal, tough-as-nails carousel with:
// - BOM stripping
// - URL-encoded filenames
// - thumbnails, keyboard, autoplay, hover-pause
// - lazy-load + prefetch next/prev
// - optional captions derived from filenames

function stripBOM(text) {
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text.replace(/^\uFEFF/, '');
}

function humanizeFilename(name) {
  const base = name.replace(/\.[^.]+$/, '');       // drop extension
  return base.replace(/[_\-]+/g, ' ')
             .replace(/\s+/g, ' ')
             .trim()
             .replace(/\b([a-z])/g, m => m.toUpperCase());
}

async function loadCarousel({ jsonPath, mount, autoplayMs = 5000, showCaptions = true }) {
  const el = document.querySelector(mount);
  if (!el) return console.warn('Carousel mount not found:', mount);

  // fetch JSON safely and handle BOMs
  const res = await fetch(jsonPath);
  const text = stripBOM(await res.text());
  let files = [];
  try { files = JSON.parse(text); }
  catch (e) { console.error('Bad images.json at', jsonPath, e); return; }

  if (!Array.isArray(files) || !files.length) {
    el.innerHTML = '<p class="muted">No images found.</p>';
    return;
  }

  // directory path
  const dir = jsonPath.replace(/images\.json$/i, '');

  // URL-safe src builder
  const srcFor = (fname) => dir + encodeURI(fname);

  // build DOM
  el.innerHTML = `
    <div class="carousel">
      <div class="stage">
        <img id="c-main" alt="" loading="eager">
        <div class="caption" id="c-cap" aria-live="polite" ${showCaptions ? '' : 'hidden'}></div>
        <button class="nav prev" aria-label="Previous">‹</button>
        <button class="nav next" aria-label="Next">›</button>
      </div>
      <div class="thumbs" id="c-thumbs">
        ${files.map((f,i)=>`<button class="thumb" data-i="${i}" aria-label="Slide ${i+1}">
            <img src="${srcFor(f)}" alt="">
          </button>`).join('')}
      </div>
    </div>
  `;

  const main = el.querySelector('#c-main');
  const cap  = el.querySelector('#c-cap');
  const thumbs = [...el.querySelectorAll('.thumb')];
  const prev = el.querySelector('.prev');
  const next = el.querySelector('.next');

  let i = 0, timer = null;

  function setActive(n) {
    i = (n + files.length) % files.length;
    const filename = files[i];
    main.src = srcFor(filename);
    main.decoding = 'async';
    main.loading = 'eager';
    thumbs.forEach((t,idx)=> t.classList.toggle('active', idx===i));
    if (showCaptions) cap.textContent = humanizeFilename(filename);

    // prefetch neighbors
    const ahead = new Image(); ahead.src = srcFor(files[(i+1)%files.length]);
    const back  = new Image(); back.src  = srcFor(files[(i-1+files.length)%files.length]);
  }

  function start() {
    stop();
    timer = setInterval(()=> setActive(i+1), autoplayMs);
  }
  function stop(){ if (timer) { clearInterval(timer); timer = null; } }

  prev.addEventListener('click', ()=> { setActive(i-1); start(); });
  next.addEventListener('click', ()=> { setActive(i+1); start(); });

  thumbs.forEach(t => t.addEventListener('click', e => { setActive(+t.dataset.i); start(); }));

  // keyboard
  el.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowLeft')  { setActive(i-1); start(); }
    if (e.key === 'ArrowRight') { setActive(i+1); start(); }
  });
  el.tabIndex = 0; // focusable

  // pause on hover
  el.addEventListener('mouseenter', stop);
  el.addEventListener('mouseleave', start);

  // swipe (basic)
  let x0 = null;
  el.addEventListener('pointerdown', e => { x0 = e.clientX; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointerup',   e => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) setActive(i + (dx < 0 ? 1 : -1));
    start();
  });

  setActive(0);
  start();
}
