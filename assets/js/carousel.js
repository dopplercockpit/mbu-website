/* =========================================================
   MBU Enhanced Carousel Module
   Robust, smooth, and feature-rich image carousel
   ========================================================= */

(function() {
  'use strict';

  // Utility functions
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

  function isAbsolute(url) {
    return /^https?:\/\//i.test(url) || url.startsWith('//');
  }

  // =========================================================
  // Main Carousel Function
  // =========================================================
  window.loadCarousel = async function loadCarousel(options) {
    const {
      jsonPath,
      mount,
      autoplayMs = 4000,
      showCaptions = true,
      showThumbnails = true,
      enableKeyboard = true,
      enableSwipe = true
    } = options;

    const root = document.querySelector(mount);
    if (!root) {
      console.warn(`❌ Carousel mount not found: ${mount}`);
      return;
    }

    // Show loading state
    root.innerHTML = '<div style="text-align:center;padding:3rem;"><div class="loading"></div><p style="margin-top:1rem;color:#5a5f66;">Loading gallery...</p></div>';

    // Fetch image list
    let imageList = [];
    try {
      const response = await fetch(jsonPath, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const text = stripBOM(await response.text());
      imageList = JSON.parse(text);
      
      if (!Array.isArray(imageList) || imageList.length === 0) {
        throw new Error('No images in gallery');
      }
    } catch (error) {
      console.error('Carousel load error:', error);
      root.innerHTML = `
        <div class="carousel-error">
          <p><strong>Unable to load gallery</strong></p>
          <p style="font-size:0.9rem;margin-top:0.5rem;">Error: ${error.message}</p>
        </div>
      `;
      return;
    }

    // Compute base URL for relative paths
    const baseURL = new URL(jsonPath, window.location.href);
    const directory = baseURL.href.replace(/images\.json$/i, '');
    const getImageSrc = (filename) => isAbsolute(filename) ? filename : directory + encodeURI(filename);

    // Build carousel HTML
    root.innerHTML = `
      <div class="carousel-wrapper" role="region" aria-label="Image carousel">
        <img class="carousel-image" src="${getImageSrc(imageList[0])}" alt="${humanize(imageList[0])}" loading="lazy">
        ${showCaptions ? `<div class="caption">${humanize(imageList[0])}</div>` : ''}
        <button class="carousel-btn prev" aria-label="Previous image">‹</button>
        <button class="carousel-btn next" aria-label="Next image">›</button>
      </div>
      ${showThumbnails ? '<div class="thumbs" role="tablist"></div>' : ''}
    `;

    // Get DOM elements
    const wrapper = root.querySelector('.carousel-wrapper');
    const mainImage = root.querySelector('.carousel-image');
    const caption = root.querySelector('.caption');
    const prevBtn = root.querySelector('.prev');
    const nextBtn = root.querySelector('.next');
    const thumbsContainer = root.querySelector('.thumbs');

    let currentIndex = 0;
    let autoplayTimer = null;
    let isTransitioning = false;

    // Create thumbnails
    if (showThumbnails && thumbsContainer) {
      imageList.forEach((filename, index) => {
        const thumb = document.createElement('button');
        thumb.className = 'thumb';
        thumb.setAttribute('role', 'tab');
        thumb.setAttribute('aria-label', `View image ${index + 1}`);
        thumb.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
        thumb.dataset.index = index;
        
        const img = document.createElement('img');
        img.src = getImageSrc(filename);
        img.alt = humanize(filename);
        img.loading = 'lazy';
        
        thumb.appendChild(img);
        thumbsContainer.appendChild(thumb);
      });
    }

    // =========================================================
    // Show Image Function
    // =========================================================
    function showImage(index, animate = true) {
      if (isTransitioning) return;
      
      // Normalize index
      index = ((index % imageList.length) + imageList.length) % imageList.length;
      
      if (index === currentIndex) return;
      
      isTransitioning = true;
      currentIndex = index;

      const imageSrc = getImageSrc(imageList[index]);
      const imageAlt = humanize(imageList[index]);

      // Fade out current image
      if (animate) {
        mainImage.style.opacity = '0';
      }

      // Preload new image
      const tempImg = new Image();
      tempImg.onload = () => {
        mainImage.src = imageSrc;
        mainImage.alt = imageAlt;
        
        if (caption) {
          caption.textContent = imageAlt;
        }

        // Fade in new image
        setTimeout(() => {
          mainImage.style.opacity = '1';
          isTransitioning = false;
        }, animate ? 50 : 0);

        // Update thumbnails
        if (thumbsContainer) {
          const thumbs = thumbsContainer.querySelectorAll('.thumb');
          thumbs.forEach((thumb, i) => {
            const isActive = i === index;
            thumb.classList.toggle('active', isActive);
            thumb.setAttribute('aria-selected', String(isActive));
          });
        }

        // Update button states
        updateButtonStates();
      };

      tempImg.onerror = () => {
        console.error(`Failed to load image: ${imageSrc}`);
        isTransitioning = false;
      };

      tempImg.src = imageSrc;
    }

    // =========================================================
    // Update Navigation Buttons
    // =========================================================
    function updateButtonStates() {
      if (imageList.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
      } else {
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
        
        // Optionally disable buttons at ends (for non-looping)
        // prevBtn.disabled = currentIndex === 0;
        // nextBtn.disabled = currentIndex === imageList.length - 1;
      }
    }

    // =========================================================
    // Autoplay Controls
    // =========================================================
    function startAutoplay() {
      stopAutoplay();
      if (autoplayMs > 0 && imageList.length > 1) {
        autoplayTimer = setInterval(() => {
          showImage(currentIndex + 1);
        }, autoplayMs);
      }
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    // =========================================================
    // Event Listeners
    // =========================================================

    // Previous button
    prevBtn.addEventListener('click', () => {
      showImage(currentIndex - 1);
      startAutoplay(); // Restart autoplay after manual navigation
    });

    // Next button
    nextBtn.addEventListener('click', () => {
      showImage(currentIndex + 1);
      startAutoplay();
    });

    // Thumbnail clicks
    if (thumbsContainer) {
      thumbsContainer.addEventListener('click', (e) => {
        const thumb = e.target.closest('.thumb');
        if (thumb) {
          const index = parseInt(thumb.dataset.index);
          showImage(index);
          startAutoplay();
        }
      });
    }

    // Pause autoplay on hover
    wrapper.addEventListener('mouseenter', stopAutoplay);
    wrapper.addEventListener('mouseleave', startAutoplay);

    // Pause autoplay when page is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    });

    // Keyboard navigation
    if (enableKeyboard) {
      root.setAttribute('tabindex', '0');
      
      root.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          showImage(currentIndex - 1);
          startAutoplay();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          showImage(currentIndex + 1);
          startAutoplay();
        }
      });
    }

    // Touch/Swipe support
    if (enableSwipe) {
      let touchStartX = 0;
      let touchEndX = 0;
      const swipeThreshold = 50;

      wrapper.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      wrapper.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
      }, { passive: true });

      function handleSwipe() {
        const swipeDistance = touchEndX - touchStartX;
        
        if (Math.abs(swipeDistance) > swipeThreshold) {
          if (swipeDistance > 0) {
            // Swipe right - show previous
            showImage(currentIndex - 1);
          } else {
            // Swipe left - show next
            showImage(currentIndex + 1);
          }
          startAutoplay();
        }
      }
    }

    // Image error handling
    mainImage.addEventListener('error', () => {
      if (caption) {
        caption.textContent = 'Image failed to load';
        caption.style.color = '#e74c3c';
      }
      console.error(`Failed to load carousel image: ${mainImage.src}`);
    });

    // =========================================================
    // Initialize
    // =========================================================
    showImage(0, false);
    startAutoplay();
    updateButtonStates();

    // Log successful initialization
    console.log(`✅ Carousel initialized with ${imageList.length} images at ${mount}`);

    // Return public API for external control
    return {
      goto: (index) => {
        showImage(index);
        startAutoplay();
      },
      next: () => {
        showImage(currentIndex + 1);
        startAutoplay();
      },
      prev: () => {
        showImage(currentIndex - 1);
        startAutoplay();
      },
      play: startAutoplay,
      pause: stopAutoplay,
      getCurrentIndex: () => currentIndex,
      getImageCount: () => imageList.length
    };
  };

})();
