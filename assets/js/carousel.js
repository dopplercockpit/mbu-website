async function loadCarousel(jsonPath, containerSelector) {
  const container = document.querySelector(containerSelector);
  const res = await fetch(jsonPath);
  const images = await res.json();

  let index = 0;
  container.innerHTML = `
    <div class="carousel">
      <img id="carousel-img" src="${jsonPath.replace('images.json','')}${images[0]}" alt="">
      <div class="controls">
        <button id="prev">‹</button>
        <button id="next">›</button>
      </div>
    </div>
    <div class="thumbs">
      ${images.map((img,i)=>`<img class="thumb" src="${jsonPath.replace('images.json','')}${img}" data-i="${i}">`).join('')}
    </div>
  `;

  const mainImg = container.querySelector('#carousel-img');
  const thumbs = container.querySelectorAll('.thumb');

  function show(i) {
    index = i;
    mainImg.src = `${jsonPath.replace('images.json','')}${images[index]}`;
    thumbs.forEach(t=>t.classList.remove('active'));
    thumbs[index].classList.add('active');
  }

  container.querySelector('#prev').onclick = () => show((index-1+images.length)%images.length);
  container.querySelector('#next').onclick = () => show((index+1)%images.length);
  thumbs.forEach(t=>t.onclick = e => show(parseInt(e.target.dataset.i)));

  show(0);
}
