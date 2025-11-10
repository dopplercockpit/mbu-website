/* =========================================================
   MBU Lucy 5 Lakes - Enhanced Synchronized Display
   Rotates lake signs with corresponding photos
   ========================================================= */

(function() {
  'use strict';

  const isAbsolute = (s) => /^(https?:)?\/\//i.test(String(s));
  const toSrc = (base, name) => isAbsolute(name) ? name : base.replace(/\/$/, '') + '/' + encodeURI(name);

  async function fetchJSON(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${path}`);
    return response.json();
  }

  // =========================================================
  // Main Lucy Initialization Function
  // =========================================================
  window.initLucy = async function initLucy(options = {}) {
    const {
      base = 'https://mbu-assets.vercel.app/img/lucy',
      signsPath = base + '/signs.json',
      lakesPath = base + '/lakes.json',
      signMount = '#signs',
      lakeMount = '#lakes',
      stepMs = 3500, // Time between rotations
      enableAnimations = true
    } = options;

    const signBox = document.querySelector(signMount);
    const lakeBox = document.querySelector(lakeMount);

    if (!signBox || !lakeBox) {
      console.error('Lucy: Sign or lake mount element not found');
      return;
    }

    // Show loading state
    signBox.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="loading"></div><p style="margin-top:1rem;color:#5a5f66;">Loading signs...</p></div>';
    lakeBox.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="loading"></div><p style="margin-top:1rem;color:#5a5f66;">Loading photos...</p></div>';

    try {
      // Fetch data
      const [signs, lakes] = await Promise.all([
        fetchJSON(signsPath),
        fetchJSON(lakesPath)
      ]);

      // Validate data
      if (!Array.isArray(signs) || signs.length === 0) {
        throw new Error('No sign images found');
      }

      if (!Array.isArray(lakes)) {
        throw new Error('Invalid lakes data');
      }

      // Ensure lakes array matches signs length
      const normalizedLakes = signs.map((_, i) => {
        const lakePhotos = lakes[i];
        return Array.isArray(lakePhotos) ? lakePhotos : [];
      });

      console.log('✅ Lucy data loaded:', {
        signs: signs.length,
        lakes: normalizedLakes.map(arr => arr.length)
      });

      // Build HTML structure
      signBox.innerHTML = `
        <div class="carousel-wrapper" style="position:relative;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.08);">
          <img class="carousel-image" alt="Lake sign" style="width:100%;height:auto;display:block;opacity:0;transition:opacity 0.5s ease;">
          <div class="caption" style="padding:0.75rem 1rem;color:#5a5f66;font-weight:600;text-align:center;"></div>
        </div>
      `;

      lakeBox.innerHTML = `
        <div class="carousel-wrapper" style="position:relative;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.08);">
          <img class="carousel-image" alt="Lucy at lake" style="width:100%;height:auto;display:block;opacity:0;transition:opacity 0.5s ease;">
          <div class="caption" style="padding:0.75rem 1rem;color:#5a5f66;font-weight:600;text-align:center;"></div>
        </div>
      `;

      const signImg = signBox.querySelector('img');
      const signCaption = signBox.querySelector('.caption');
      const lakeImg = lakeBox.querySelector('img');
      const lakeCaption = lakeBox.querySelector('.caption');

      // Lake names
      const lakeNames = ['Superior', 'Michigan', 'Huron', 'Erie', 'Ontario'];
      const lakeFolders = ['superior', 'michigan', 'huron', 'erie', 'ontario'];

      let currentLakeIndex = 0;
      let currentPhotoIndex = 0;
      let autoplayTimer = null;

      // =========================================================
      // Display Current Images
      // =========================================================
      function showCurrent() {
        const lakeName = lakeNames[currentLakeIndex] || `Lake ${currentLakeIndex + 1}`;
        const lakePhotos = normalizedLakes[currentLakeIndex];
        const signFilename = signs[currentLakeIndex];

        // Update sign
        const signSrc = toSrc(base + '/signs', signFilename);
        
        if (enableAnimations) {
          signImg.style.opacity = '0';
          setTimeout(() => {
            signImg.src = signSrc;
            signImg.alt = `${lakeName} sign`;
            signCaption.textContent = `Lake ${lakeName}`;
            signImg.style.opacity = '1';
          }, 300);
        } else {
          signImg.src = signSrc;
          signImg.alt = `${lakeName} sign`;
          signCaption.textContent = `Lake ${lakeName}`;
          signImg.style.opacity = '1';
        }

        // Update lake photo
        if (lakePhotos.length > 0) {
          const photoFilename = lakePhotos[currentPhotoIndex];
          const lakeFolder = lakeFolders[currentLakeIndex] || 'unknown';
          const lakeSrc = toSrc(base + '/lakes/' + lakeFolder, photoFilename);
          
          if (enableAnimations) {
            lakeImg.style.opacity = '0';
            setTimeout(() => {
              lakeImg.src = lakeSrc;
              lakeImg.alt = `Lucy at Lake ${lakeName}`;
              lakeCaption.textContent = `Lucy at Lake ${lakeName} (${currentPhotoIndex + 1}/${lakePhotos.length})`;
              lakeImg.style.display = 'block';
              lakeImg.style.opacity = '1';
            }, 300);
          } else {
            lakeImg.src = lakeSrc;
            lakeImg.alt = `Lucy at Lake ${lakeName}`;
            lakeCaption.textContent = `Lucy at Lake ${lakeName} (${currentPhotoIndex + 1}/${lakePhotos.length})`;
            lakeImg.style.display = 'block';
            lakeImg.style.opacity = '1';
          }
        } else {
          // No photos for this lake
          lakeImg.style.opacity = '0';
          lakeImg.style.display = 'none';
          lakeCaption.textContent = `No photos available for Lake ${lakeName}`;
        }

        console.log(`Showing: Lake ${lakeName}, Photo ${currentPhotoIndex + 1}/${lakePhotos.length}`);
      }

      // =========================================================
      // Advance to Next Image
      // =========================================================
      function advance() {
        const currentLakePhotos = normalizedLakes[currentLakeIndex];

        if (currentLakePhotos.length <= 1) {
          // Move to next lake
          currentLakeIndex = (currentLakeIndex + 1) % signs.length;
          currentPhotoIndex = 0;
        } else {
          // Move to next photo in current lake
          currentPhotoIndex++;
          
          if (currentPhotoIndex >= currentLakePhotos.length) {
            // Finished all photos for this lake, move to next lake
            currentLakeIndex = (currentLakeIndex + 1) % signs.length;
            currentPhotoIndex = 0;
          }
        }

        showCurrent();
      }

      // =========================================================
      // Autoplay Controls
      // =========================================================
      function startAutoplay() {
        stopAutoplay();
        autoplayTimer = setInterval(advance, stepMs);
      }

      function stopAutoplay() {
        if (autoplayTimer) {
          clearInterval(autoplayTimer);
          autoplayTimer = null;
        }
      }

      // Pause on hover
      const containers = [signBox, lakeBox];
      containers.forEach(container => {
        container.addEventListener('mouseenter', stopAutoplay);
        container.addEventListener('mouseleave', startAutoplay);
      });

      // Pause when page is hidden
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          stopAutoplay();
        } else {
          startAutoplay();
        }
      });

      // Error handling
      signImg.addEventListener('error', () => {
        signCaption.textContent = 'Sign image failed to load';
        signCaption.style.color = '#e74c3c';
        console.error('Failed to load sign image:', signImg.src);
      });

      lakeImg.addEventListener('error', () => {
        lakeCaption.textContent = 'Lake photo failed to load';
        lakeCaption.style.color = '#e74c3c';
        console.error('Failed to load lake image:', lakeImg.src);
      });

      // =========================================================
      // Initialize
      // =========================================================
      showCurrent();
      startAutoplay();

      console.log('✅ Lucy 5 Lakes initialized successfully');

      // Return public API
      return {
        goto: (lakeIndex, photoIndex = 0) => {
          currentLakeIndex = Math.max(0, Math.min(lakeIndex, signs.length - 1));
          currentPhotoIndex = photoIndex;
          showCurrent();
          startAutoplay();
        },
        next: advance,
        play: startAutoplay,
        pause: stopAutoplay,
        getCurrentLake: () => lakeNames[currentLakeIndex],
        getCurrentIndices: () => ({ lake: currentLakeIndex, photo: currentPhotoIndex })
      };

    } catch (error) {
      console.error('Lucy initialization error:', error);
      
      signBox.innerHTML = `
        <div style="background:#fff4f2;color:#9e2e1a;padding:1.5rem;border-radius:12px;border:1px solid #ffd2ca;">
          <strong>Unable to load Lucy's adventure</strong>
          <p style="font-size:0.9rem;margin-top:0.5rem;">Error: ${error.message}</p>
        </div>
      `;
      
      lakeBox.innerHTML = signBox.innerHTML;
    }
  };

})();
