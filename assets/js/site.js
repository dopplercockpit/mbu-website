// =========================================================
// MBU Enhanced Site Utilities
// Modern, smooth, and professional interactions
// =========================================================

(function() {
  'use strict';
  
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // =========================================================
  // Mobile Menu Toggle
  // =========================================================
  function initMobileMenu() {
    const header = $('.site-header');
    if (!header) return;

    // Create mobile toggle button
    const toggle = document.createElement('button');
    toggle.className = 'mobile-menu-toggle';
    toggle.setAttribute('aria-label', 'Toggle menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span></span><span></span><span></span>';
    
    const logoArea = $('.logo-area', header);
    if (logoArea) {
      logoArea.style.position = 'relative';
      logoArea.appendChild(toggle);
    }

    const nav = $('.site-nav', header);
    if (!nav) return;

    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('mobile-open');
      toggle.classList.toggle('active', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      
      // Prevent body scroll when menu is open
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!header.contains(e.target) && nav.classList.contains('mobile-open')) {
        nav.classList.remove('mobile-open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });

    // Close menu on window resize to desktop
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth > 740 && nav.classList.contains('mobile-open')) {
          nav.classList.remove('mobile-open');
          toggle.classList.remove('active');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      }, 250);
    });
  }

  // =========================================================
  // Dropdown Navigation
  // =========================================================
  function initDropdowns() {
    const dropdowns = $$('.nav-links .has-sub');

    dropdowns.forEach(dropdown => {
      const link = $('a', dropdown);
      const submenu = $('.submenu', dropdown);

      if (!link || !submenu) return;

      link.setAttribute('aria-haspopup', 'true');
      link.setAttribute('aria-expanded', 'false');

      // Store timeout reference for delayed closing
      let closeTimeout;

      // Desktop: hover behavior with delay
      dropdown.addEventListener('mouseenter', () => {
        if (window.innerWidth > 740) {
          // Clear any pending close timeout
          if (closeTimeout) {
            clearTimeout(closeTimeout);
            closeTimeout = null;
          }
          dropdown.classList.add('open');
          link.setAttribute('aria-expanded', 'true');
        }
      });

      dropdown.addEventListener('mouseleave', () => {
        if (window.innerWidth > 740) {
          // Add 300ms delay before closing to allow user to move to submenu
          closeTimeout = setTimeout(() => {
            dropdown.classList.remove('open');
            link.setAttribute('aria-expanded', 'false');
          }, 300);
        }
      });

      // Mobile: click behavior
      link.addEventListener('click', (e) => {
        if (window.innerWidth <= 740) {
          e.preventDefault();
          const isOpen = dropdown.classList.toggle('open');
          link.setAttribute('aria-expanded', String(isOpen));

          // Close other dropdowns
          dropdowns.forEach(other => {
            if (other !== dropdown && other.classList.contains('open')) {
              other.classList.remove('open');
              const otherLink = $('a', other);
              if (otherLink) otherLink.setAttribute('aria-expanded', 'false');
            }
          });
        }
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.has-sub')) {
        dropdowns.forEach(dropdown => {
          dropdown.classList.remove('open');
          const link = $('a', dropdown);
          if (link) link.setAttribute('aria-expanded', 'false');
        });
      }
    });
  }

  // =========================================================
  // Scroll Effects
  // =========================================================
  function initScrollEffects() {
    const header = $('.site-header');
    if (!header) return;

    let lastScroll = 0;
    const scrollThreshold = 100;

    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset;

      if (currentScroll > scrollThreshold) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }

      lastScroll = currentScroll;
    }, { passive: true });
  }

  // =========================================================
  // Back to Top Button
  // =========================================================
  function initBackToTop() {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '↑';
    document.body.appendChild(btn);

    const threshold = 400;

    const toggleButton = () => {
      if (window.pageYOffset > threshold) {
        btn.classList.add('show');
      } else {
        btn.classList.remove('show');
      }
    };

    window.addEventListener('scroll', toggleButton, { passive: true });
    
    btn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

    // Initial check
    toggleButton();
  }

  // =========================================================
  // Image Lightbox
  // =========================================================
  function initLightbox() {
    // Create lightbox structure
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
      <div class="lightbox-content">
        <button class="lightbox-close" aria-label="Close lightbox">×</button>
        <img src="" alt="">
        <button class="lightbox-nav prev" aria-label="Previous image">‹</button>
        <button class="lightbox-nav next" aria-label="Next image">›</button>
      </div>
    `;
    document.body.appendChild(lightbox);

    const lightboxImg = $('img', lightbox);
    const closeBtn = $('.lightbox-close', lightbox);
    const prevBtn = $('.lightbox-nav.prev', lightbox);
    const nextBtn = $('.lightbox-nav.next', lightbox);

    let currentImages = [];
    let currentIndex = 0;

    // Find all clickable images in carousels and galleries
    const setupLightboxImages = () => {
      const carouselImages = $$('.carousel-image');
      // Exclude .showcase-item img and .mini-strip img from lightbox (home page thumbnails should navigate)
      const galleryImages = $$('.panel img');

      [...carouselImages, ...galleryImages].forEach((img, index) => {
        img.style.cursor = 'pointer';
        img.setAttribute('data-lightbox-index', index);
        
        img.addEventListener('click', (e) => {
          e.preventDefault();
          currentImages = [...carouselImages, ...galleryImages];
          currentIndex = parseInt(img.getAttribute('data-lightbox-index'));
          showLightbox();
        });
      });
    };

    const showLightbox = () => {
      if (currentImages.length === 0) return;
      
      lightboxImg.src = currentImages[currentIndex].src;
      lightboxImg.alt = currentImages[currentIndex].alt || '';
      lightbox.classList.add('show');
      document.body.style.overflow = 'hidden';
      
      // Update nav button states
      prevBtn.style.display = currentIndex > 0 ? 'flex' : 'none';
      nextBtn.style.display = currentIndex < currentImages.length - 1 ? 'flex' : 'none';
    };

    const hideLightbox = () => {
      lightbox.classList.remove('show');
      document.body.style.overflow = '';
    };

    const showNext = () => {
      if (currentIndex < currentImages.length - 1) {
        currentIndex++;
        showLightbox();
      }
    };

    const showPrev = () => {
      if (currentIndex > 0) {
        currentIndex--;
        showLightbox();
      }
    };

    // Event listeners
    closeBtn.addEventListener('click', hideLightbox);
    prevBtn.addEventListener('click', showPrev);
    nextBtn.addEventListener('click', showNext);
    
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) hideLightbox();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('show')) return;
      
      if (e.key === 'Escape') hideLightbox();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    });

    // Initialize on page load and after carousel loads
    setupLightboxImages();
    
    // Re-setup after a delay to catch dynamically loaded images
    setTimeout(setupLightboxImages, 1000);
  }

  // =========================================================
  // Enhanced Form Validation
  // =========================================================
  function initEmailCapture() {
    const forms = $$('form.mbu-capture');
    
    forms.forEach(form => {
      const emailInput = $('input[name="email"]', form);
      const nameInput = $('input[name="name"]', form);
      
      // Add real-time validation
      if (emailInput) {
        emailInput.addEventListener('blur', () => {
          const email = emailInput.value.trim();
          const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
          
          if (email && !isValid) {
            emailInput.style.borderColor = '#e74c3c';
            emailInput.setAttribute('aria-invalid', 'true');
          } else {
            emailInput.style.borderColor = '';
            emailInput.removeAttribute('aria-invalid');
          }
        });
      }

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = {
          section: form.dataset.section || document.title || 'MBU',
          name: formData.get('name')?.trim() || '',
          email: formData.get('email')?.trim() || ''
        };

        // Validate email
        if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          emailInput.focus();
          emailInput.style.borderColor = '#e74c3c';
          
          // Show error message
          let errorMsg = $('.error-message', form);
          if (!errorMsg) {
            errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.style.cssText = 'color: #e74c3c; margin-top: 0.5rem; font-size: 0.9rem;';
            form.appendChild(errorMsg);
          }
          errorMsg.textContent = 'Please enter a valid email address.';
          
          setTimeout(() => {
            if (errorMsg) errorMsg.remove();
          }, 3000);
          
          return;
        }

        // Show loading state
        const submitBtn = $('button[type="submit"]', form);
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span>';

        try {
          const endpoint = form.dataset.endpoint || '';
          
          if (endpoint) {
            // Send to external endpoint
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
          } else {
            // Store locally
            const key = 'mbu_captures';
            const stored = JSON.parse(localStorage.getItem(key) || '[]');
            stored.push({
              timestamp: new Date().toISOString(),
              ...data
            });
            localStorage.setItem(key, JSON.stringify(stored));
          }

          // Success feedback
          form.reset();
          form.classList.add('sent');
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
          
          setTimeout(() => {
            form.classList.remove('sent');
          }, 3000);

        } catch (error) {
          console.error('Form submission error:', error);
          
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
          
          // Show error message
          let errorMsg = $('.error-message', form);
          if (!errorMsg) {
            errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.style.cssText = 'color: #e74c3c; margin-top: 0.5rem; font-size: 0.9rem;';
            form.appendChild(errorMsg);
          }
          errorMsg.textContent = 'Something went wrong. Please try again.';
          
          setTimeout(() => {
            if (errorMsg) errorMsg.remove();
          }, 4000);
        }
      });
    });
  }

  // =========================================================
  // External Link Handler
  // =========================================================
  function initExternalLinks() {
    const isExternal = (href) => {
      try {
        const url = new URL(href, window.location.href);
        return url.origin !== window.location.origin;
      } catch {
        return false;
      }
    };

    // Create modal if it doesn't exist
    let modal = $('.modal-wrap');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal-wrap';
      modal.innerHTML = `
        <div class="modal" role="dialog" aria-labelledby="modal-title">
          <h3 id="modal-title">Leaving this website</h3>
          <p>You're about to visit an external site. Continue?</p>
          <div class="actions">
            <button class="btn cancel">Stay</button>
            <a class="btn go" href="#" rel="noopener noreferrer" target="_blank">Continue</a>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const goBtn = $('.go', modal);
    const cancelBtn = $('.cancel', modal);
    
    const closeModal = () => {
      modal.classList.remove('show');
    };

    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Intercept external links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      if (isExternal(href)) {
        e.preventDefault();
        goBtn.href = href;
        modal.classList.add('show');
      }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('show')) {
        closeModal();
      }
    });
  }

  // =========================================================
  // Smooth Scroll for Anchor Links
  // =========================================================
  function initSmoothScroll() {
    $$('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href');
        if (targetId === '#') return;

        const target = $(targetId);
        if (target) {
          e.preventDefault();
          const headerOffset = 100;
          const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });

          // Update URL without jumping
          history.pushState(null, null, targetId);
        }
      });
    });
  }

  // =========================================================
  // Lazy Loading Images
  // =========================================================
  function initLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            observer.unobserve(img);
          }
        });
      });

      $$('img[data-src]').forEach(img => imageObserver.observe(img));
    }
  }

  // =========================================================
  // Animation on Scroll
  // =========================================================
  function initScrollAnimations() {
    if ('IntersectionObserver' in window) {
      const animateObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }
        });
      }, { threshold: 0.1 });

      $$('.showcase-item, .panel, .strip').forEach(el => {
        animateObserver.observe(el);
      });
    }
  }

  // =========================================================
  // Initialize Everything on DOM Ready
  // =========================================================
  function init() {
    initMobileMenu();
    initDropdowns();
    initScrollEffects();
    initBackToTop();
    initLightbox();
    initEmailCapture();
    initExternalLinks();
    initSmoothScroll();
    initLazyLoading();
    initScrollAnimations();

    // Log initialization
    console.log('✨ MBU site utilities initialized');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
