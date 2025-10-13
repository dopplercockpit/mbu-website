// assets/js/carousel.js
// Robust carousel that matches: loadCarousel({ jsonPath, mount, autoplayMs, showCaptions })
function stripBOM(text){ return text.charCodeAt(0)===0xFEFF ? text.slice(1) : text.replace(/^\uFEFF/,''); }
function humanize(name){
  const base = name.replace(/\.[^.]+$/, '');
  return base.replace(/[_\-]+/g,' ').replace(/\s+/g,' ').trim().replace(/\b([a-z])/g, m=>m.toUpperCase());
}

async function loadCarousel({ jsonPath, mount, autoplayMs=3500, showCaptions=true }){
  const root = document.querySelector(mount);
  if(!root){ console.warn(`✖ mount not found: ${mount}`); return; }

  // fetch JSON safely
  let list=[];
  try{
    const res = await fetch(jsonPath);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const txt = stripBOM(await res.text());
    list = JSON.parse(txt);
  }catch(e){
    console.warn(`⚠ skipping carousel (${jsonPath}): ${e.message}`);
    return;
  }
  if(!Array.isArray(list) || list.length===0){
    console.warn(`⚠ no images in ${jsonPath}`);
    return;
  }

  const dir = jsonPath.replace(/images\.json$/i,'');
  const srcFor = f => dir + encodeURI(f);

  root.innerHTML = `
    <div class="carousel-wrapper">
      <img class="carousel-image active" alt="">
      <div class="caption" ${showCaptions?'':'hidden'}></div>
      <button class="nav prev" aria-label="Previous">‹</button>
      <button class="nav next" aria-label="Next">›</button>
    </div>
    <div class="thumbs"></div>
  `;
  const main = root.querySelector('.carousel-image');
  const cap  = root.querySelector('.caption');
  const prev = root.querySelector('.prev');
  const next = root.querySelector('.next');
  const thumbs = root.querySelector('.thumbs');

  thumbs.innerHTML = list.map((f,i)=>`
    <button class="thumb" data-i="${i}" aria-label="Slide ${i+1}">
      <img src="${srcFor(f)}" alt="">
    </button>`).join('');

  let idx = 0, t = null;
  function show(i){
    idx = (i + list.length) % list.length;
    main.classList.remove('active');
    // small delay to let opacity transition reset
    requestAnimationFrame(()=> {
      main.src = srcFor(list[idx]);
      main.alt = humanize(list[idx]);
      if(showCaptions) cap.textContent = humanize(list[idx]);
      [...thumbs.children].forEach((b,j)=> b.classList.toggle('active', j===idx));
      requestAnimationFrame(()=> main.classList.add('active'));
    });
  }
  function start(){ stop(); t = setInterval(()=> show(idx+1), autoplayMs); }
  function stop(){ if(t){ clearInterval(t); t=null; } }

  prev.addEventListener('click', ()=> { show(idx-1); start(); });
  next.addEventListener('click', ()=> { show(idx+1); start(); });
  thumbs.addEventListener('click', e=>{
    const b = e.target.closest('.thumb'); if(!b) return;
    show(+b.dataset.i); start();
  });
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);
  root.tabIndex = 0;
  root.addEventListener('keydown', e=>{
    if(e.key==='ArrowLeft'){ show(idx-1); start(); }
    if(e.key==='ArrowRight'){ show(idx+1); start(); }
  });

  // init
  show(0); start();
}
