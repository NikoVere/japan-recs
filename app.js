/* ═══════════════════════════════════════════
   JUAN & PILY'S JAPAN V2 — APP ENGINE
   Mobile-first. Gyro. Touch. Alive.
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  const DATA = window.JAPAN_DATA;
  if (!DATA) { console.error('No JAPAN_DATA found.'); return; }

  // Build theme → places mapping
  DATA.themes.forEach(theme => {
    theme.places = DATA.places.filter(p => p.themes && p.themes.includes(theme.id)).map(p => p.id);
  });

  // ── Helpers ──
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function gmapsUrl(place) {
    const q = place.gmapsQuery || `${place.name}, Japan`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }

  function starsHtml(rating) {
    if (!rating) return '';
    const full = Math.floor(rating);
    const half = rating - full >= 0.3;
    let html = '';
    for (let i = 0; i < full; i++) html += '★';
    if (half) html += '½';
    return html;
  }

  function formatReviews(n) {
    if (!n) return '';
    if (n >= 10000) return `${(n / 1000).toFixed(0)}K`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  const areaMap = {};
  DATA.areas.forEach(a => { areaMap[a.id] = a; });
  function areaName(id) { return areaMap[id]?.name || id; }

  const cityLabels = { tokyo: 'Tokyo', kyoto: 'Kyoto', osaka: 'Osaka', nara: 'Nara', hiroshima: 'Hiroshima', kobe: 'Kobe' };
  function cityLabel(id) { return cityLabels[id] || id; }

  // Unique cities in data
  const allCities = [...new Set(DATA.places.map(p => p.city).filter(Boolean))];

  // Kanji per theme for decorative background
  const themeKanji = {
    'denim-trail': '藍', 'vinyl-wax': '音', 'tea-path': '茶', 'pottery-road': '陶',
    'vintage-hunt': '古', 'eat-local': '食', 'temple-run': '寺', 'city-explore': '街',
    'tokyo-explore': '街', 'stationery-craft': '紙',
  };

  // City bounds for map zooming
  const cityBounds = {
    tokyo: { lat: 35.68, lng: 139.76, zoom: 12 },
    kyoto: { lat: 35.01, lng: 135.77, zoom: 13 },
    osaka: { lat: 34.67, lng: 135.50, zoom: 13 },
    nara: { lat: 34.68, lng: 135.80, zoom: 13 },
    hiroshima: { lat: 34.39, lng: 132.45, zoom: 13 },
    kobe: { lat: 34.69, lng: 135.19, zoom: 13 },
  };

  // ═══════════════ LOADER ═══════════════
  function hideLoader() {
    const loader = $('#loader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 600);
    }
  }

  // ═══════════════ HERO STATS ═══════════════
  function animateCounters() {
    const placeCount = DATA.places.filter(p => p.status !== 'closed').length;
    const statNumbers = $$('.stat-number');
    if (statNumbers[0]) statNumbers[0].dataset.count = placeCount;
    statNumbers.forEach(el => {
      const target = parseInt(el.dataset.count, 10);
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / 1200, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  // ═══════════════ NAV ═══════════════
  function initNav() {
    const nav = $('#nav');
    const navTabs = $('#navTabs');
    DATA.themes.forEach(theme => {
      const tab = document.createElement('button');
      tab.className = 'nav-tab';
      tab.dataset.theme = theme.id;
      tab.textContent = theme.emoji;
      tab.title = theme.name;
      tab.addEventListener('click', () => {
        const section = $(`#theme-${theme.id}`);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      navTabs.appendChild(tab);
    });
    const heroH = window.innerHeight;
    window.addEventListener('scroll', () => {
      nav.classList.toggle('visible', window.scrollY > heroH * 0.6);
    }, { passive: true });
  }

  function initNavTracking() {
    const sections = $$('.theme-section');
    const tabs = $$('.nav-tab');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id.replace('theme-', '');
          tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.theme === id));
        }
      });
    }, { rootMargin: '-30% 0px -50% 0px' });
    sections.forEach(s => observer.observe(s));
  }

  // ═══════════════ SCROLL PROGRESS ═══════════════
  function initScrollProgress() {
    const bar = $('#scrollProgress');
    window.addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = `${(window.scrollY / max) * 100}%`;
    }, { passive: true });
  }

  // ═══════════════ BUILD THEME SECTIONS ═══════════════
  function buildThemeSections() {
    const main = $('#themes');

    DATA.themes.forEach(theme => {
      const themePlaces = theme.places.map(id => DATA.places.find(p => p.id === id)).filter(Boolean);
      if (themePlaces.length === 0) return;

      // Cities in this theme
      const themeCities = [...new Set(themePlaces.map(p => p.city).filter(Boolean))];

      const section = document.createElement('section');
      section.className = 'theme-section';
      section.id = `theme-${theme.id}`;
      section.dataset.kanji = themeKanji[theme.id] || '日';

      // Header
      section.innerHTML = `
        <div class="section-header reveal-item">
          <span class="section-emoji">${theme.emoji}</span>
          <h2 class="section-title stagger-chars">${theme.name}</h2>
          <p class="section-tagline">${theme.tagline}</p>
        </div>
        <div class="city-filters" data-theme="${theme.id}">
          <button class="city-pill active" data-city="all" data-theme="${theme.id}">All <span style="opacity:0.6;font-size:0.75em">(${themePlaces.length})</span></button>
          ${themeCities.map(c => {
            const count = themePlaces.filter(p => p.city === c).length;
            return `<button class="city-pill" data-city="${c}" data-theme="${theme.id}">${cityLabel(c)} <span style="opacity:0.6;font-size:0.75em">(${count})</span></button>`;
          }).join('')}
        </div>
        <div class="theme-map-container" id="map-${theme.id}"></div>
        <div class="shimmer-text" id="funfact-${theme.id}"></div>
        <p class="theme-blurb reveal-item">${theme.description}</p>
        <div class="places-list" id="cards-${theme.id}"></div>
        <div style="padding: 0 var(--space-md); max-width: 800px; margin: 0 auto;">
          <button class="show-more-btn" id="more-${theme.id}" style="display:none">Show all places</button>
        </div>
      `;

      // Add ink divider
      const divider = document.createElement('div');
      divider.className = 'ink-divider';
      section.appendChild(divider);

      main.appendChild(section);

      // Render initial cards (all cities)
      renderThemeCards(theme.id, 'all');
      initThemeMap(theme.id);
      updateFunFact(theme.id, 'all');
    });

    // Bind city filter events
    document.addEventListener('click', (e) => {
      const pill = e.target.closest('.city-pill');
      if (!pill) return;

      const themeId = pill.dataset.theme;
      const city = pill.dataset.city;

      // Update active state
      $$(`.city-pill[data-theme="${themeId}"]`).forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      // Sakura burst from pill position
      const rect = pill.getBoundingClientRect();
      if (window.SakuraParticles) {
        window.SakuraParticles.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 25);
      }

      // Haptic
      if (navigator.vibrate) navigator.vibrate(10);

      // Re-render cards with animation
      renderThemeCards(themeId, city);
      updateThemeMap(themeId, city);
      updateFunFact(themeId, city);
    });
  }

  // ═══════════════ RENDER CARDS ═══════════════
  const INITIAL_SHOW = 6;

  function renderThemeCards(themeId, city) {
    const container = $(`#cards-${themeId}`);
    const moreBtn = $(`#more-${themeId}`);
    const theme = DATA.themes.find(t => t.id === themeId);
    if (!container || !theme) return;

    const allPlaces = theme.places
      .map(id => DATA.places.find(p => p.id === id))
      .filter(p => p && (city === 'all' || p.city === city));

    container.innerHTML = '';

    const toShow = allPlaces.slice(0, INITIAL_SHOW);
    const remaining = allPlaces.length - INITIAL_SHOW;

    toShow.forEach((place, i) => {
      const card = buildPlaceCard(place, theme.color);
      // Stagger entrance
      setTimeout(() => {
        container.appendChild(card);
        requestAnimationFrame(() => card.classList.add('visible'));
      }, i * 70);
    });

    if (remaining > 0) {
      moreBtn.style.display = '';
      moreBtn.textContent = `Show ${remaining} more places`;
      moreBtn.onclick = () => {
        allPlaces.slice(INITIAL_SHOW).forEach((place, i) => {
          const card = buildPlaceCard(place, theme.color);
          setTimeout(() => {
            container.appendChild(card);
            requestAnimationFrame(() => card.classList.add('visible'));
          }, i * 50);
        });
        moreBtn.style.display = 'none';
      };
    } else {
      moreBtn.style.display = 'none';
    }
  }

  // ═══════════════ PLACE CARD ═══════════════
  function buildPlaceCard(place, accentColor) {
    const card = document.createElement('div');
    card.className = `place-card${place.status === 'closed' ? ' closed' : ''}`;
    card.style.setProperty('--card-accent', accentColor || 'var(--sakura)');

    const imageUrl = place.imageUrl || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=400&fit=crop';
    const cityName = cityLabel(place.city);
    const area = areaName(place.neighborhood);

    let ratingHtml = '';
    if (place.rating) {
      ratingHtml = `<div class="card-rating">
        <span class="card-stars">${starsHtml(place.rating)}</span>
        <span class="card-reviews">${place.rating}${place.reviews ? ` (${formatReviews(place.reviews)})` : ''}</span>
      </div>`;
    }

    let expandedContent = '';
    if (place.description) {
      expandedContent += `<p class="card-description">${place.description}</p>`;
    }
    if (place.nikoNote) {
      expandedContent += `<div class="card-note">${place.nikoNote}</div>`;
    }
    if (place.status === 'temp-closed') {
      expandedContent += `<div class="card-status-warning">⚠️ Temporarily closed — check before visiting</div>`;
    }

    let actionsHtml = `<a class="card-btn" href="${gmapsUrl(place)}" target="_blank" rel="noopener">📍 Maps</a>`;
    if (place.tabelogUrl) {
      actionsHtml += `<a class="card-btn card-btn-tabelog" href="${place.tabelogUrl}" target="_blank" rel="noopener">🍽️ Tabelog</a>`;
    }

    card.innerHTML = `
      <div class="card-image">
        <img src="${imageUrl}" alt="${place.imageAlt || place.name}" loading="lazy" />
        <span class="card-city-badge">${cityName}</span>
        <div class="card-image-info">
          <div class="card-name">${place.name}${place.nameJp ? `<span class="card-name-jp">${place.nameJp}</span>` : ''}</div>
        </div>
      </div>
      <div class="card-body">
        <div class="card-top">
          <div class="card-meta">
            ${place.category ? `<span class="card-category">${place.category}</span>` : ''}
            <span class="card-area">${area}</span>
            ${place.priceRange ? `<span class="card-price">${place.priceRange}</span>` : ''}
          </div>
          ${ratingHtml}
        </div>
        <div class="card-expand-indicator">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
      </div>
      <div class="card-expanded">
        ${expandedContent}
        <div class="card-actions">${actionsHtml}</div>
      </div>
    `;

    // Tap to expand/collapse
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return; // Don't toggle on link clicks
      card.classList.toggle('expanded');
      if (navigator.vibrate) navigator.vibrate(15);
    });

    return card;
  }

  // ═══════════════ THEME MINI-MAPS ═══════════════
  const themeMaps = {};

  function initThemeMap(themeId) {
    const container = $(`#map-${themeId}`);
    if (!container) return;

    const map = L.map(container, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: false,
    }).setView([35.5, 136.5], 6);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18
    }).addTo(map);

    themeMaps[themeId] = { map, markers: L.layerGroup().addTo(map) };
    updateThemeMap(themeId, 'all');
  }

  function updateThemeMap(themeId, city) {
    const tm = themeMaps[themeId];
    if (!tm) return;

    tm.markers.clearLayers();

    const theme = DATA.themes.find(t => t.id === themeId);
    if (!theme) return;

    const places = theme.places
      .map(id => DATA.places.find(p => p.id === id))
      .filter(p => p && p.status !== 'closed' && (city === 'all' || p.city === city));

    // Group by area
    const areaGroups = {};
    places.forEach(p => {
      if (p.neighborhood && areaMap[p.neighborhood]) {
        if (!areaGroups[p.neighborhood]) areaGroups[p.neighborhood] = [];
        areaGroups[p.neighborhood].push(p);
      }
    });

    Object.entries(areaGroups).forEach(([areaId, areaPlaces]) => {
      const area = areaMap[areaId];
      if (!area) return;

      const icon = L.divIcon({
        className: 'area-marker',
        html: `${area.name} <span class="marker-count">${areaPlaces.length}</span>`,
        iconSize: null
      });

      const popupHtml = areaPlaces.slice(0, 10).map(p =>
        `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
          <a href="${gmapsUrl(p)}" target="_blank" rel="noopener" style="color:var(--cream);font-weight:600;font-size:0.82rem">${p.name}</a>
          ${p.rating ? `<span style="color:var(--gold);font-size:0.7rem;margin-left:4px">★${p.rating}</span>` : ''}
        </div>`
      ).join('');

      L.marker([area.lat, area.lng], { icon })
        .bindPopup(`<div class="map-popup-title">${area.name}</div>${popupHtml}`, { maxWidth: 260 })
        .addTo(tm.markers);
    });

    // Zoom to city or fit all
    if (city !== 'all' && cityBounds[city]) {
      const cb = cityBounds[city];
      tm.map.flyTo([cb.lat, cb.lng], cb.zoom, { duration: 0.8 });
    } else {
      tm.map.flyTo([35.5, 136.5], 6, { duration: 0.8 });
    }
  }

  // ═══════════════ FUN FACTS ═══════════════
  function updateFunFact(themeId, city) {
    const el = $(`#funfact-${themeId}`);
    if (!el) return;

    // Find a fun fact for the selected city
    let fact = '';
    if (city !== 'all') {
      const area = DATA.areas.find(a => a.city === city || a.id === city);
      if (area && area.funFact) fact = area.funFact;
    }
    if (!fact) {
      // Pick a random city fun fact
      const factsAreas = DATA.areas.filter(a => a.funFact);
      if (factsAreas.length) fact = factsAreas[Math.floor(Math.random() * factsAreas.length)].funFact;
    }

    el.textContent = fact ? `✨ ${fact}` : '';
  }

  // ═══════════════ GLOBAL MAP ═══════════════
  function initGlobalMap() {
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView([35.5, 136.5], 7);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM &copy; CARTO', maxZoom: 19
    }).addTo(map);

    const markers = L.layerGroup().addTo(map);

    function renderMarkers(filter) {
      markers.clearLayers();
      const places = DATA.places.filter(p => p.status !== 'closed' && (filter === 'all' || p.themes.includes(filter)));
      const areaGroups = {};
      places.forEach(p => {
        if (p.neighborhood && areaMap[p.neighborhood]) {
          if (!areaGroups[p.neighborhood]) areaGroups[p.neighborhood] = [];
          areaGroups[p.neighborhood].push(p);
        }
      });
      Object.entries(areaGroups).forEach(([areaId, areaPlaces]) => {
        const area = areaMap[areaId];
        if (!area) return;
        const icon = L.divIcon({
          className: 'area-marker',
          html: `${area.name} <span class="marker-count">${areaPlaces.length}</span>`,
          iconSize: null
        });
        const popupHtml = areaPlaces.slice(0, 15).map(p =>
          `<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
            <a href="${gmapsUrl(p)}" target="_blank" rel="noopener" style="color:var(--cream);font-weight:600;font-size:0.8rem">${p.name}</a>
            ${p.nikoNote ? `<div class="map-popup-note">"${p.nikoNote}"</div>` : ''}
          </div>`
        ).join('');
        L.marker([area.lat, area.lng], { icon })
          .bindPopup(`<div class="map-popup-title">${area.name}</div>${popupHtml}`, { maxWidth: 280, maxHeight: 250 })
          .addTo(markers);
      });
    }

    renderMarkers('all');

    // Build filter buttons
    const filterContainer = $('#mapFilters');
    DATA.themes.forEach(theme => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.filter = theme.id;
      btn.textContent = `${theme.emoji} ${theme.name}`;
      filterContainer.appendChild(btn);
    });

    $$('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderMarkers(btn.dataset.filter);
        if (navigator.vibrate) navigator.vibrate(8);
      });
    });
  }

  // ═══════════════ SCROLL REVEAL ═══════════════
  function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Stagger chars
          if (entry.target.classList.contains('stagger-chars')) {
            const text = entry.target.textContent;
            entry.target.innerHTML = text.split('').map((c, i) =>
              `<span style="transition-delay:${i * 35}ms">${c === ' ' ? '&nbsp;' : c}</span>`
            ).join('');
            requestAnimationFrame(() => entry.target.classList.add('visible'));
          }
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    $$('.reveal-item, .stagger-chars').forEach(el => observer.observe(el));
  }

  // ═══════════════ BACK TO TOP ═══════════════
  function initBackToTop() {
    const btn = $('#backToTop');
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > window.innerHeight);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ═══════════════ GYRO PARALLAX ═══════════════
  function initGyroParallax() {
    // Check if mobile
    const isMobile = 'ontouchstart' in window;
    if (!isMobile) return;

    // Check if iOS needs permission
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      // Show prompt
      const prompt = $('#gyroPrompt');
      prompt.classList.add('visible');

      $('#gyroYes').addEventListener('click', async () => {
        prompt.classList.remove('visible');
        const granted = await window.SakuraParticles.requestGyroPermission();
        if (granted) startGyroLoop();
        // Also request motion for shake
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
          await DeviceMotionEvent.requestPermission();
        }
      });

      $('#gyroNo').addEventListener('click', () => {
        prompt.classList.remove('visible');
      });
    } else {
      // Android or older — just enable
      window.SakuraParticles.initGyro();
      startGyroLoop();
    }
  }

  function startGyroLoop() {
    function updateGyro() {
      const { gamma, beta } = window.SakuraParticles.getGyro();
      // Apply to gyro layers
      $$('.gyro-layer').forEach(el => {
        const strength = parseFloat(getComputedStyle(el).getPropertyValue('--gyro-strength')) || 10;
        const x = (gamma / 45) * strength;
        const y = (Math.min(Math.max(beta - 45, -30), 30) / 30) * strength;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      requestAnimationFrame(updateGyro);
    }
    requestAnimationFrame(updateGyro);
  }

  // ═══════════════ TOUCH RIPPLE ═══════════════
  function initTouchRipple() {
    document.addEventListener('touchstart', (e) => {
      if (!e.touches[0]) return;
      const { clientX: x, clientY: y } = e.touches[0];
      const ripple = document.createElement('div');
      ripple.className = 'touch-ripple';
      ripple.style.cssText = `left:${x - 40}px;top:${y - 40}px;width:80px;height:80px;`;
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 500);
    }, { passive: true });
  }

  // ═══════════════ SHAKE TO DISCOVER ═══════════════
  function initShakeToDiscover() {
    const overlay = $('#shakeOverlay');
    const cardContainer = $('#shakeCard');
    const dismissBtn = $('#shakeDismiss');

    window.SakuraParticles.initShakeDetection(() => {
      // Pick random open place
      const openPlaces = DATA.places.filter(p => p.status === 'open' || p.status === 'temp-closed');
      const random = openPlaces[Math.floor(Math.random() * openPlaces.length)];
      if (!random) return;

      // Flash effect
      document.body.style.boxShadow = 'inset 0 0 100px rgba(255,183,197,0.3)';
      setTimeout(() => document.body.style.boxShadow = '', 300);

      // Confetti
      window.SakuraParticles.confettiBurst(window.innerWidth / 2, window.innerHeight / 2);

      // Haptic
      if (navigator.vibrate) navigator.vibrate([10, 50, 10]);

      // Build card in overlay
      const theme = DATA.themes.find(t => random.themes.includes(t.id));
      cardContainer.innerHTML = '';
      const card = buildPlaceCard(random, theme?.color);
      card.classList.add('visible', 'expanded');
      cardContainer.appendChild(card);

      overlay.classList.add('visible');
    });

    dismissBtn.addEventListener('click', () => overlay.classList.remove('visible'));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('visible');
    });
  }

  // ═══════════════ SCROLL-BASED PARALLAX (desktop fallback) ═══════════════
  function initScrollParallax() {
    const hero = $('#hero');
    const content = $('.hero-content');
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      if (scrollY > window.innerHeight) return;
      const progress = scrollY / window.innerHeight;
      if (content) {
        content.style.opacity = String(1 - progress * 1.5);
      }
    }, { passive: true });
  }

  // ═══════════════ INIT ═══════════════
  function init() {
    buildThemeSections();
    initNav();

    requestAnimationFrame(() => {
      initScrollReveal();
      initNavTracking();
      initBackToTop();
      initScrollProgress();
      initScrollParallax();
      initTouchRipple();

      // Particles
      if (window.SakuraParticles) {
        window.SakuraParticles.init();
        initGyroParallax();
        initShakeToDiscover();
      }

      // Maps (deferred)
      setTimeout(initGlobalMap, 500);

      // Counters
      setTimeout(animateCounters, 400);

      // Hide loader
      setTimeout(hideLoader, 700);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
