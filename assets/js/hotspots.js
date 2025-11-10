/* =========================================================
   MBU Enhanced Hotspots Module
   Interactive click-to-reveal puzzle system
   ========================================================= */

(function() {
  'use strict';

  const isAbsolute = (s) => /^https?:\/\//i.test(s) || s.startsWith('//');
  const toSrc = (base, name) => isAbsolute(name) ? name : base.replace(/\/$/, '') + '/' + encodeURI(name);

  async function fetchJSON(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${path}`);
    return response.json();
  }

  // =========================================================
  // Initialize Hotspot Puzzle
  // =========================================================
  window.initHotspotPuzzle = async function initHotspotPuzzle(options) {
    const {
      jsonPath,
      mount,
      assetBase = '',
      debug = false,
      hintAfterSeconds = 30,
      enableHints = true
    } = options;

    const root = document.querySelector(mount);
    if (!root) {
      console.error(`Hotspot mount not found: ${mount}`);
      return;
    }

    // Show loading
    root.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="loading"></div><p style="margin-top:1rem;color:#5a5f66;">Loading puzzle...</p></div>';

    try {
      // Fetch puzzle data
      const data = await fetchJSON(jsonPath);
      
      if (!data.puzzle || !data.solution) {
        throw new Error('Invalid puzzle data: missing puzzle or solution images');
      }

      const puzzleSrc = toSrc(assetBase, data.puzzle);
      const solutionSrc = toSrc(assetBase, data.solution);
      const hotspots = Array.isArray(data.hotspots) ? data.hotspots : [];

      console.log('✅ Hotspot puzzle loaded:', { hotspots: hotspots.length, debug });

      // Build HTML
      root.innerHTML = `
        <div class="hotspot-container" style="position:relative;max-width:100%;margin:0 auto;">
          <canvas class="hotspot-canvas" 
                  role="img" 
                  aria-label="Find Bruno puzzle"
                  style="width:100%;height:auto;border-radius:12px;cursor:crosshair;box-shadow:0 4px 12px rgba(0,0,0,0.1);display:block;"></canvas>
          ${enableHints ? `
            <button class="hint-button" 
                    style="position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.95);border:2px solid var(--lake);color:var(--lake);padding:8px 16px;border-radius:20px;cursor:pointer;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:all 0.3s ease;display:none;z-index:10;"
                    aria-label="Show hint">
              💡 Need a hint?
            </button>
          ` : ''}
          <div class="puzzle-feedback" 
               style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);background:rgba(74,140,160,0.95);color:white;padding:12px 24px;border-radius:20px;font-weight:600;display:none;animation:slideUp 0.3s ease;box-shadow:0 4px 16px rgba(0,0,0,0.2);"></div>
        </div>
      `;

      const canvas = root.querySelector('.hotspot-canvas');
      const ctx = canvas.getContext('2d');
      const hintButton = root.querySelector('.hint-button');
      const feedback = root.querySelector('.puzzle-feedback');

      let puzzleImage = new Image();
      let solutionImage = new Image();
      let isPuzzleSolved = false;
      let hintTimer = null;
      let hintShown = false;

      // =========================================================
      // Canvas Drawing Functions
      // =========================================================
      function fitCanvas() {
        if (!puzzleImage.complete || !puzzleImage.naturalWidth) return;

        const ratio = puzzleImage.naturalWidth / puzzleImage.naturalHeight;
        const container = canvas.parentElement;
        const maxWidth = Math.min(1100, container.clientWidth || 1100);
        
        const width = maxWidth;
        const height = Math.round(width / ratio);
        
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        drawCurrentImage();
      }

      function drawCurrentImage() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        ctx.clearRect(0, 0, width, height);
        
        const img = isPuzzleSolved ? solutionImage : puzzleImage;
        if (img.complete) {
          ctx.drawImage(img, 0, 0, width, height);
        }

        // Draw debug hotspot rectangles
        if (debug && !isPuzzleSolved) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255,0,0,0.7)';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          
          hotspots.forEach(spot => {
            const x = spot.x * width;
            const y = spot.y * height;
            const w = spot.w * width;
            const h = spot.h * height;
            
            ctx.strokeRect(x, y, w, h);
            
            // Draw label
            ctx.fillStyle = 'rgba(255,0,0,0.8)';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(spot.label || 'Target', x + 5, y + 20);
          });
          
          ctx.restore();
        }

        // Draw hint highlight
        if (hintShown && !isPuzzleSolved && hotspots.length > 0) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255,215,0,0.8)';
          ctx.lineWidth = 4;
          ctx.setLineDash([10, 5]);
          
          const spot = hotspots[0]; // Highlight first hotspot
          const x = spot.x * width;
          const y = spot.y * height;
          const w = spot.w * width;
          const h = spot.h * height;
          
          // Pulsing effect
          const pulse = Math.sin(Date.now() / 300) * 0.5 + 0.5;
          ctx.globalAlpha = 0.5 + pulse * 0.5;
          ctx.strokeRect(x - 10, y - 10, w + 20, h + 20);
          
          ctx.restore();
        }
      }

      // =========================================================
      // Hit Detection
      // =========================================================
      function checkHit(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        const normalizedX = x / width;
        const normalizedY = y / height;

        return hotspots.find(spot => {
          return normalizedX >= spot.x && 
                 normalizedX <= spot.x + spot.w &&
                 normalizedY >= spot.y && 
                 normalizedY <= spot.y + spot.h;
        });
      }

      // =========================================================
      // Show Feedback
      // =========================================================
      function showFeedback(message, type = 'success') {
        feedback.textContent = message;
        feedback.style.display = 'block';
        feedback.style.background = type === 'success' 
          ? 'rgba(43,124,63,0.95)' 
          : 'rgba(74,140,160,0.95)';
        
        setTimeout(() => {
          feedback.style.display = 'none';
        }, 3000);
      }

      // =========================================================
      // Solve Puzzle
      // =========================================================
      function solvePuzzle(foundSpot) {
        if (isPuzzleSolved) return;
        
        isPuzzleSolved = true;
        canvas.style.cursor = 'default';
        
        // Stop hint timer
        if (hintTimer) {
          clearTimeout(hintTimer);
          hintTimer = null;
        }
        
        if (hintButton) {
          hintButton.style.display = 'none';
        }

        // Show success feedback
        const message = foundSpot 
          ? `🎉 You found ${foundSpot.label || 'it'}!` 
          : '🎉 Puzzle solved!';
        
        showFeedback(message, 'success');

        // Switch to solution image with fade effect
        canvas.style.opacity = '0';
        canvas.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
          drawCurrentImage();
          canvas.style.opacity = '1';
        }, 500);

        console.log('✅ Puzzle solved!', foundSpot);
      }

      // =========================================================
      // Hint System
      // =========================================================
      function showHint() {
        if (isPuzzleSolved || hintShown) return;
        
        hintShown = true;
        showFeedback('💡 Look for the highlighted area!', 'info');
        
        // Redraw with hint
        const animateHint = () => {
          if (!hintShown || isPuzzleSolved) return;
          drawCurrentImage();
          requestAnimationFrame(animateHint);
        };
        animateHint();

        if (hintButton) {
          hintButton.textContent = '✓ Hint shown';
          hintButton.disabled = true;
          hintButton.style.opacity = '0.6';
          hintButton.style.cursor = 'default';
        }
      }

      // =========================================================
      // Event Listeners
      // =========================================================
      
      // Click detection
      canvas.addEventListener('click', (e) => {
        if (isPuzzleSolved) return;
        
        const hit = checkHit(e.clientX, e.clientY);
        
        if (hit) {
          solvePuzzle(hit);
        } else {
          // Wrong click feedback
          showFeedback('🔍 Keep looking...', 'info');
          
          // Add ripple effect at click point
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          const ripple = document.createElement('div');
          ripple.style.cssText = `
            position:absolute;
            left:${x}px;
            top:${y}px;
            width:20px;
            height:20px;
            border:2px solid rgba(74,140,160,0.6);
            border-radius:50%;
            transform:translate(-50%,-50%);
            animation:ripple 0.6s ease-out;
            pointer-events:none;
          `;
          canvas.parentElement.appendChild(ripple);
          
          setTimeout(() => ripple.remove(), 600);
        }
      });

      // Hover effect
      canvas.addEventListener('mousemove', (e) => {
        if (isPuzzleSolved) return;
        
        const hit = checkHit(e.clientX, e.clientY);
        canvas.style.cursor = hit ? 'pointer' : 'crosshair';
      });

      // Hint button
      if (hintButton) {
        hintButton.addEventListener('click', showHint);
      }

      // Window resize
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(fitCanvas, 250);
      });

      // =========================================================
      // Image Loading
      // =========================================================
      puzzleImage.onload = () => {
        fitCanvas();
        
        // Start hint timer
        if (enableHints && hintAfterSeconds > 0 && hintButton) {
          hintTimer = setTimeout(() => {
            if (!isPuzzleSolved && hintButton) {
              hintButton.style.display = 'block';
              hintButton.style.animation = 'pulse 1s ease infinite';
            }
          }, hintAfterSeconds * 1000);
        }
      };

      puzzleImage.onerror = () => {
        root.innerHTML = `
          <div style="background:#fff4f2;color:#9e2e1a;padding:1.5rem;border-radius:12px;border:1px solid #ffd2ca;">
            <strong>Puzzle image failed to load</strong>
            <p style="font-size:0.9rem;margin-top:0.5rem;">Could not load: ${puzzleSrc}</p>
          </div>
        `;
      };

      solutionImage.onerror = () => {
        console.error('Solution image failed to load:', solutionSrc);
      };

      // Preload solution image
      solutionImage.src = solutionSrc;
      
      // Start with puzzle image
      puzzleImage.src = puzzleSrc;

      // Add required CSS animations
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes ripple {
          to { width: 60px; height: 60px; opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `;
      document.head.appendChild(style);

      console.log('✅ Hotspot puzzle initialized');

      // Return public API
      return {
        solve: () => solvePuzzle(hotspots[0]),
        showHint: showHint,
        reset: () => {
          isPuzzleSolved = false;
          hintShown = false;
          canvas.style.cursor = 'crosshair';
          drawCurrentImage();
        }
      };

    } catch (error) {
      console.error('Hotspot puzzle error:', error);
      root.innerHTML = `
        <div style="background:#fff4f2;color:#9e2e1a;padding:1.5rem;border-radius:12px;border:1px solid #ffd2ca;">
          <strong>Unable to load puzzle</strong>
          <p style="font-size:0.9rem;margin-top:0.5rem;">Error: ${error.message}</p>
        </div>
      `;
    }
  };

})();
