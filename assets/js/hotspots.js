/* assets/js/hotspots.js
   Data-driven hotspots over an image. Works with a JSON file:
   {
     "puzzle": "puzzle.jpg",
     "solution": "solution.jpg",
     "hotspots": [
       {"id":"bruno","x":0.62,"y":0.41,"w":0.08,"h":0.12,"label":"Bruno"}
     ]
   }
*/
(function(){
  const isAbs = (s)=> /^https?:\/\//i.test(s) || s.startsWith('//');
  const toSrc = (base, name)=> isAbs(name) ? name : base.replace(/\/$/, '') + '/' + encodeURI(name);

  async function fetchJSON(p){
    const r = await fetch(p, {cache:'no-store'});
    if(!r.ok) throw new Error(`HTTP ${r.status} for ${p}`);
    return r.json();
  }

  window.initHotspotPuzzle = async function initHotspotPuzzle(opts){
    const { jsonPath, mount, assetBase = '', debug=false } = opts;
    const root = document.querySelector(mount);
    if(!root) throw new Error(`mount not found: ${mount}`);

    const data = await fetchJSON(jsonPath);
    const puzzleSrc = toSrc(assetBase, data.puzzle);
    const solutionSrc = toSrc(assetBase, data.solution);
    const spots = Array.isArray(data.hotspots) ? data.hotspots : [];

    root.innerHTML = `
      <div class="hotspot-wrap" style="position:relative;max-width:1100px;margin:0 auto;">
        <canvas class="hotspot-canvas" aria-label="Find Bruno puzzle" role="img"></canvas>
      </div>
    `;

    const canvas = root.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    function fit(){
      const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.5;
      const maxW = Math.min(1100, root.clientWidth || 1100);
      const w = maxW, h = Math.round(maxW / ratio);
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,w,h);
      if(img.complete) ctx.drawImage(img, 0, 0, w, h);

      if(debug){
        ctx.save();
        ctx.strokeStyle = 'rgba(255,0,0,.7)';
        ctx.lineWidth = 2;
        spots.forEach(s=>{
          ctx.strokeRect(s.x*w, s.y*h, s.w*w, s.h*h);
        });
        ctx.restore();
      }
    }

    function hit(px,py){
      const rect = canvas.getBoundingClientRect();
      const x = px - rect.left, y = py - rect.top;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const nx = x / w, ny = y / h; // normalize
      return spots.find(s => nx>=s.x && nx<=s.x+s.w && ny>=s.y && ny<=s.y+s.h);
    }

    canvas.addEventListener('click', (e)=>{
      if (hit(e.clientX, e.clientY)) {
        img.src = solutionSrc;
      }
    });

    window.addEventListener('resize', fit);
    img.onload = fit;
    img.src = puzzleSrc;
  };
})();
