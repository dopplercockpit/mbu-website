// assets/js/site.js
// Global utilities: dropdown nav, external-link interstitial, analytics hooks, back-to-top, email capture
(function(){
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  // --- Dropdowns (hover desktop, tap mobile) ---
  function initDropdowns(){
    $$(".nav-links .has-sub").forEach(li=>{
      const a = li.querySelector("a");
      a.setAttribute("aria-haspopup", "true");
      a.setAttribute("aria-expanded", "false");
      a.addEventListener("click", (e)=>{
        if (window.matchMedia("(max-width: 900px)").matches){
          e.preventDefault();
          const open = li.classList.toggle("open");
          a.setAttribute("aria-expanded", String(open));
        }
      });
      li.addEventListener("mouseenter", ()=> li.classList.add("open"));
      li.addEventListener("mouseleave", ()=> {
        li.classList.remove("open");
        a.setAttribute("aria-expanded", "false");
      });
    });
  }

  // --- Back to top ---
  function initBackToTop(){
    let btn = document.createElement("button");
    btn.className = "back-to-top";
    btn.setAttribute("aria-label", "Back to top");
    btn.textContent = "↑";
    document.body.appendChild(btn);
    const onScroll = ()=> {
      if (window.scrollY > 320) btn.classList.add("show");
      else btn.classList.remove("show");
    };
    window.addEventListener("scroll", onScroll, {passive:true});
    btn.addEventListener("click", ()=> window.scrollTo({top:0, behavior:"smooth"}));
    onScroll();
  }

  // --- External link interstitial ---
  function isExternal(href){
    try{
      const u = new URL(href, window.location.href);
      return u.origin !== window.location.origin;
    }catch{ return false; }
  }
  function buildModal(){
    const wrap = document.createElement("div");
    wrap.className = "modal-wrap";
    wrap.innerHTML = `
      <div class="modal">
        <h3>Leaving this website</h3>
        <p>You’re about to visit an external site. Continue?</p>
        <div class="actions">
          <button class="btn cancel">Stay</button>
          <a class="btn go" href="#" rel="noopener" target="_blank">Continue</a>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    return wrap;
  }
  function initExternalIntercept(){
    const modal = buildModal();
    const go = modal.querySelector(".go");
    const cancel = modal.querySelector(".cancel");
    const close = ()=> modal.classList.remove("show");
    cancel.addEventListener("click", close);
    modal.addEventListener("click", (e)=> { if(e.target === modal) close(); });

    document.addEventListener("click", (e)=>{
      const a = e.target.closest("a[href]");
      if(!a) return;
      const href = a.getAttribute("href");
      if(!href) return;
      if(isExternal(href)){
        e.preventDefault();
        trackClick("external", href, a.textContent.trim());
        go.href = href;
        modal.classList.add("show");
        go.onclick = ()=> { close(); };
      }else{
        trackClick("internal", href, a.textContent.trim());
      }
    });
  }

  // --- Analytics hooks (GTAG if present; else console) ---
  function trackClick(type, href, label){
    if (window.gtag){
      window.gtag('event', 'click', { event_category:type, event_label:label||'', value:href });
    } else {
      console.debug(`[track] ${type}: ${label||''} -> ${href}`);
    }
  }

  // --- Email capture forms (to Google Apps Script later) ---
  function initEmailCapture(){
    Array.from(document.querySelectorAll("form.mbu-capture")).forEach(form=>{
      form.addEventListener("submit", async (e)=>{
        e.preventDefault();
        const fd = new FormData(form);
        const payload = {
          section: form.dataset.section || document.title || 'MBU',
          name: fd.get("name") || "",
          email: fd.get("email") || ""
        };
        if(!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)){
          alert("Please enter a valid email.");
          return;
        }
        try{
          const ENDPOINT = form.dataset.endpoint || "";
          if(ENDPOINT){
            const res = await fetch(ENDPOINT, { method:"POST", headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
            if(!res.ok) throw new Error(`HTTP ${res.status}`);
          }else{
            const key = "mbu_captures";
            const all = JSON.parse(localStorage.getItem(key) || "[]");
            all.push({ ts:new Date().toISOString(), ...payload });
            localStorage.setItem(key, JSON.stringify(all));
          }
          form.reset();
          form.classList.add("sent");
          setTimeout(()=> form.classList.remove("sent"), 2000);
        }catch(err){
          console.error("Capture failed:", err);
          alert("Sorry, something went wrong. Please try again later.");
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    initDropdowns();
    initBackToTop();
    initExternalIntercept();
    initEmailCapture();
  });
})();
