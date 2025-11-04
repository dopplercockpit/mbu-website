/* assets/js/lucy.js
   Rotates sign images in sync with lake images.
   Needs: assets/img/lucy/signs.json (array), assets/img/lucy/lakes.json (array of arrays)
*/
(function(){
  const isAbs = (s)=> /^(https?:)?\/\//i.test(String(s));
  const toSrc = (base, name)=> isAbs(name) ? name : base.replace(/\/$/,'') + '/' + encodeURI(name);

  async function fetchJSON(p){
    const r = await fetch(p, {cache:'no-store'});
    if(!r.ok) throw new Error(`HTTP ${r.status} for ${p}`);
    return r.json();
  }

  window.initLucy = async function initLucy(opts){
    const {
      base = 'assets/img/lucy',
      signsPath = base + '/signs.json',
      lakesPath = base + '/lakes.json',
      signMount = '#signs',
      lakeMount = '#lakes',
      stepMs = 3000
    } = opts;

    const signs = await fetchJSON(signsPath);
    const lakes = await fetchJSON(lakesPath);

    if(!Array.isArray(signs) || !Array.isArray(lakes) || signs.length === 0){
      const s = document.querySelector(signMount);
      const l = document.querySelector(lakeMount);
      if(s) s.textContent = 'No signs yet.';
      if(l) l.textContent = 'No lakes yet.';
      return;
    }
    for(let i=0;i<signs.length;i++){
      if(!Array.isArray(lakes[i])) lakes[i] = [];
    }

    const signBox = document.querySelector(signMount);
    const lakeBox = document.querySelector(lakeMount);
    signBox.innerHTML = '<div class="carousel-wrapper"><img class="carousel-image" alt=""></div>';
    lakeBox.innerHTML = '<div class="carousel-wrapper"><img class="carousel-image" alt=""></div>';
    const signImg = signBox.querySelector('img');
    const lakeImg = lakeBox.querySelector('img');

    let i = 0, j = 0;
    function show(){
      signImg.src = toSrc(base + '/signs', signs[i]);
      const group = lakes[i];
      if(group.length === 0){
        lakeImg.removeAttribute('src');
      } else {
        // Expect filenames in lakes.json to be relative to their lake folder (e.g., 'photo1.jpg')
        const lakeNames = ['superior','michigan','huron','erie','ontario'];
        const folder = lakeNames[i] || 'unknown';
        lakeImg.src = toSrc(base + '/lakes/' + folder, group[j]);
      }
    }
    function tick(){
      const group = lakes[i];
      if(group.length <= 1){
        i = (i + 1) % signs.length;
        j = 0;
      } else {
        j++;
        if(j >= group.length){ i = (i + 1) % signs.length; j = 0; }
      }
      show();
      setTimeout(tick, stepMs);
    }

    show();
    setTimeout(tick, stepMs);
  }
})();
