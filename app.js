/* ═══════════════════════════════════════════
   JUAN & PILY'S JAPAN — APP ENGINE
   Interactions, map, scroll animations, juice
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  const DATA = window.JAPAN_DATA;
  if (!DATA) {
    console.error('No JAPAN_DATA found. Make sure data.js is loaded.');
    return;
  }

  // Build theme → places mapping (places store their theme memberships)
  DATA.themes.forEach(theme => {
    theme.places = DATA.places
      .filter(p => p.themes && p.themes.includes(theme.id))
      .map(p => p.id);
  });

  // ── Helpers ──
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const createElement = (tag, attrs = {}, children = []) => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'className') el.className = v;
      else if (k === 'dataset') Object.entries(v).forEach(([dk, dv]) => el.dataset[dk] = dv);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'innerHTML') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v);
    });
    children.forEach(c => {
      if (typeof c === 'string') el.appendChild(document.createTextNode(c));
      else if (c) el.appendChild(c);
    });
    return el;
  };

  // ── Build Google Maps URL ──
  function gmapsUrl(place) {
    const q = place.gmapsQuery || `${place.name}, Japan`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }

  // ── Star rating HTML ──
  function starsHtml(rating) {
    if (!rating) return '';
    const full = Math.floor(rating);
    const half = rating - full >= 0.3;
    let html = '';
    for (let i = 0; i < full; i++) html += '★';
    if (half) html += '½';
    return html;
  }

  // ── Format review count ──
  function formatReviews(n) {
    if (!n) return '';
    if (n >= 10000) return `${(n / 1000).toFixed(0)}K`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  }

  // ── Area name lookup ──
  const areaMap = {};
  DATA.areas.forEach(a => { areaMap[a.id] = a.name + (a.city && a.city !== a.id ? '' : ''); });
  function areaName(id) { return areaMap[id] || id; }

  // ── City name lookup ──
  const cityNames = {
    tokyo: 'Tokyo', kyoto: 'Kyoto', osaka: 'Osaka', kanazawa: 'Kanazawa',
    nikko: 'Nikkō', nagano: 'Nagano', fukuoka: 'Fukuoka', nara: 'Nara',
    yokohama: 'Yokohama', hakone: 'Hakone', takayama: 'Takayama', gifu: 'Gifu',
    hiroshima: 'Hiroshima', fujiyoshida: 'Fujiyoshida', aichi: 'Aichi',
    fukui: 'Fukui', toyama: 'Toyama'
  };

  // ═══════════════════════════════════════════
  // LOADER
  // ═══════════════════════════════════════════
  function hideLoader() {
    const loader = $('#loader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 600);
    }
  }

  // ═══════════════════════════════════════════
  // HERO STATS COUNTER
  // ═══════════════════════════════════════════
  function animateCounters() {
    const placeCount = DATA.places.filter(p => p.status !== 'closed').length;
    const statNumbers = $$('.stat-number');
    // Set the place count data attribute
    if (statNumbers[0]) statNumbers[0].dataset.count = placeCount;

    statNumbers.forEach(el => {
      const target = parseInt(el.dataset.count, 10);
      const duration = 1500;
      const start = performance.now();

      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  // ═══════════════════════════════════════════
  // NAV
  // ═══════════════════════════════════════════
  function initNav() {
    const nav = $('#nav');
    const navTabs = $('#navTabs');

    // Build tabs from themes
    DATA.themes.forEach(theme => {
      const tab = createElement('button', {
        className: 'nav-tab',
        dataset: { theme: theme.id },
        innerHTML: `${theme.emoji} ${theme.name}`
      });
      tab.addEventListener('click', () => {
        const section = $(`#theme-${theme.id}`);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      navTabs.appendChild(tab);
    });

    // Show/hide nav on scroll
    let lastScroll = 0;
    const heroHeight = window.innerHeight;

    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      if (scrollY > heroHeight * 0.7) {
        nav.classList.add('visible');
      } else {
        nav.classList.remove('visible');
      }
      lastScroll = scrollY;
    }, { passive: true });

    // Map button
    $('#navMapBtn').addEventListener('click', () => {
      $('#map-section').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // ═══════════════════════════════════════════
  // ACTIVE NAV TAB TRACKING
  // ═══════════════════════════════════════════
  function initNavTracking() {
    const sections = $$('.theme-section');
    const tabs = $$('.nav-tab');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id.replace('theme-', '');
          tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.theme === id);
          });
          // Scroll active tab into view in nav
          const activeTab = $(`.nav-tab[data-theme="${id}"]`);
          if (activeTab) {
            activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' });

    sections.forEach(s => observer.observe(s));
  }

  // ═══════════════════════════════════════════
  // BUILD THEME SECTIONS
  // ═══════════════════════════════════════════
  function buildThemeSections() {
    const main = $('#themes');

    DATA.themes.forEach(theme => {
      const themePlaces = theme.places
        .map(id => DATA.places.find(p => p.id === id))
        .filter(Boolean);

      if (themePlaces.length === 0) return;

      const section = createElement('section', {
        className: 'theme-section',
        id: `theme-${theme.id}`
      });

      // Header
      const header = createElement('div', { className: 'section-header reveal-item' });
      header.innerHTML = `
        <span class="section-emoji">${theme.emoji}</span>
        <h2 class="section-title">${theme.name}</h2>
        <p class="section-tagline">${theme.tagline}</p>
        <span class="section-count">${themePlaces.length} places</span>
      `;
      section.appendChild(header);

      // Cards grid
      const grid = createElement('div', { className: 'places-grid stagger-reveal' });

      themePlaces.forEach((place, i) => {
        const card = buildPlaceCard(place, theme.color, i);
        grid.appendChild(card);
      });

      section.appendChild(grid);
      main.appendChild(section);
    });
  }

  // ═══════════════════════════════════════════
  // BUILD PLACE CARD
  // ═══════════════════════════════════════════
  function buildPlaceCard(place, accentColor, index) {
    const card = createElement('div', {
      className: `place-card${place.status === 'closed' ? ' closed' : ''}`,
      style: { '--card-accent': accentColor || 'var(--red)' },
      dataset: { id: place.id }
    });

    // Top row: name + rating
    let topHtml = `<div class="card-top">
      <div class="card-name">${place.name}`;
    if (place.nameJp) topHtml += `<span class="card-name-jp">${place.nameJp}</span>`;
    topHtml += `</div>`;

    if (place.rating) {
      topHtml += `<div class="card-rating">
        <span class="card-stars">${starsHtml(place.rating)}</span>
        <span class="card-reviews">${place.rating}${place.reviews ? ` (${formatReviews(place.reviews)})` : ''}</span>
      </div>`;
    }
    topHtml += `</div>`;

    // Meta row
    let metaHtml = `<div class="card-meta">`;
    if (place.category) metaHtml += `<span class="card-category">${place.category}</span>`;
    if (place.neighborhood) metaHtml += `<span class="card-area">${areaName(place.neighborhood)}</span>`;
    if (place.priceRange) metaHtml += `<span class="card-price">${place.priceRange}</span>`;
    metaHtml += `</div>`;

    // Niko's note
    let noteHtml = '';
    if (place.nikoNote) {
      noteHtml = `<div class="card-note">${place.nikoNote}</div>`;
    }

    // Status badge for temp-closed
    let statusHtml = '';
    if (place.status === 'temp-closed') {
      statusHtml = `<div style="font-size: 0.7rem; color: var(--gold); margin-top: var(--space-sm);">⚠️ Temporarily closed — check before visiting</div>`;
    }

    // Actions
    const actionsHtml = `<div class="card-actions">
      <a class="card-btn" href="${gmapsUrl(place)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        Open in Maps
      </a>
    </div>`;

    card.innerHTML = topHtml + metaHtml + noteHtml + statusHtml + actionsHtml;
    return card;
  }

  // ═══════════════════════════════════════════
  // SCROLL REVEAL (Intersection Observer)
  // ═══════════════════════════════════════════
  function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // For stagger-reveal containers, reveal children with delay
          if (entry.target.classList.contains('stagger-parent')) {
            const children = $$('.reveal-item', entry.target);
            children.forEach((child, i) => {
              setTimeout(() => child.classList.add('visible'), i * 80);
            });
          }
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -60px 0px'
    });

    // Observe all reveal items
    $$('.reveal-item').forEach(el => observer.observe(el));

    // Observe cards with staggered reveal
    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Add staggered delay based on position in grid
          const card = entry.target;
          const grid = card.parentElement;
          const siblings = [...grid.children];
          const index = siblings.indexOf(card);
          const row = Math.floor(index / getColumnsCount(grid));
          const col = index % getColumnsCount(grid);
          const delay = (row * 40) + (col * 80);

          setTimeout(() => card.classList.add('visible'), delay);
          cardObserver.unobserve(card);
        }
      });
    }, {
      threshold: 0.05,
      rootMargin: '0px 0px -30px 0px'
    });

    $$('.place-card').forEach(el => cardObserver.observe(el));
  }

  function getColumnsCount(grid) {
    if (!grid || !grid.children[0]) return 1;
    const gridWidth = grid.offsetWidth;
    const childWidth = grid.children[0].offsetWidth;
    return Math.max(1, Math.round(gridWidth / childWidth));
  }

  // ═══════════════════════════════════════════
  // BACK TO TOP
  // ═══════════════════════════════════════════
  function initBackToTop() {
    const btn = $('#backToTop');
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > window.innerHeight);
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ═══════════════════════════════════════════
  // MAP
  // ═══════════════════════════════════════════
  function initMap() {
    // Center on Japan
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView([36.2, 138.0], 6);

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Muted tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    }).addTo(map);

    // Build area markers with place counts
    const areaCounts = {};
    DATA.places.forEach(p => {
      if (p.neighborhood && p.status !== 'closed') {
        areaCounts[p.neighborhood] = (areaCounts[p.neighborhood] || 0) + 1;
      }
    });

    const markers = L.layerGroup();
    const themeMarkers = {};

    DATA.areas.forEach(area => {
      const count = areaCounts[area.id] || 0;
      if (count === 0) return;

      const icon = L.divIcon({
        className: 'area-marker',
        html: `${area.name} <span class="marker-count">${count}</span>`,
        iconSize: null
      });

      const placesInArea = DATA.places.filter(p => p.neighborhood === area.id && p.status !== 'closed');
      const popupContent = buildAreaPopup(area, placesInArea);

      const marker = L.marker([area.lat, area.lng], { icon })
        .bindPopup(popupContent, { maxWidth: 300, maxHeight: 300 });

      marker.areaId = area.id;
      marker.placeIds = placesInArea.map(p => p.id);
      markers.addLayer(marker);

      // Track by theme
      placesInArea.forEach(p => {
        (p.themes || []).forEach(t => {
          if (!themeMarkers[t]) themeMarkers[t] = [];
          if (!themeMarkers[t].includes(marker)) themeMarkers[t].push(marker);
        });
      });
    });

    markers.addTo(map);

    // Build filter buttons
    const filterContainer = $('#mapFilters');
    DATA.themes.forEach(theme => {
      const count = DATA.places.filter(p => p.themes.includes(theme.id) && p.status !== 'closed').length;
      if (count === 0) return;
      const btn = createElement('button', {
        className: 'filter-btn',
        dataset: { filter: theme.id },
        innerHTML: `${theme.emoji} ${theme.name}`
      });
      filterContainer.appendChild(btn);
    });

    // Filter click handlers
    $$('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        markers.clearLayers();

        if (filter === 'all') {
          DATA.areas.forEach(area => {
            const count = areaCounts[area.id] || 0;
            if (count === 0) return;
            const placesInArea = DATA.places.filter(p => p.neighborhood === area.id && p.status !== 'closed');
            const icon = L.divIcon({
              className: 'area-marker',
              html: `${area.name} <span class="marker-count">${count}</span>`,
              iconSize: null
            });
            const popup = buildAreaPopup(area, placesInArea);
            L.marker([area.lat, area.lng], { icon }).bindPopup(popup, { maxWidth: 300, maxHeight: 300 }).addTo(markers);
          });
        } else {
          // Filter by theme
          const filteredPlaces = DATA.places.filter(p => p.themes.includes(filter) && p.status !== 'closed');
          const filteredAreaCounts = {};
          filteredPlaces.forEach(p => {
            if (p.neighborhood) filteredAreaCounts[p.neighborhood] = (filteredAreaCounts[p.neighborhood] || 0) + 1;
          });

          DATA.areas.forEach(area => {
            const count = filteredAreaCounts[area.id] || 0;
            if (count === 0) return;
            const placesInArea = filteredPlaces.filter(p => p.neighborhood === area.id);
            const icon = L.divIcon({
              className: 'area-marker',
              html: `${area.name} <span class="marker-count">${count}</span>`,
              iconSize: null
            });
            const popup = buildAreaPopup(area, placesInArea);
            L.marker([area.lat, area.lng], { icon }).bindPopup(popup, { maxWidth: 300, maxHeight: 300 }).addTo(markers);
          });
        }

        markers.addTo(map);
      });
    });
  }

  function buildAreaPopup(area, places) {
    const cityLabel = cityNames[area.city] || area.city || '';
    let html = `<div class="map-popup-title">${area.name}</div>`;
    if (cityLabel && cityLabel !== area.name) html += `<div class="map-popup-category">${cityLabel}</div>`;
    html += `<div style="margin-top: 8px; max-height: 200px; overflow-y: auto;">`;

    places.slice(0, 20).forEach(p => {
      html += `<div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
        <a href="${gmapsUrl(p)}" target="_blank" rel="noopener" style="color: var(--cream); font-weight: 600; font-size: 0.85rem;">${p.name}</a>
        <span style="color: var(--text-muted); font-size: 0.75rem; margin-left: 6px;">${p.category || ''}</span>
        ${p.rating ? `<span style="color: var(--gold); font-size: 0.75rem; margin-left: 4px;">★ ${p.rating}</span>` : ''}
        ${p.nikoNote ? `<div class="map-popup-note">"${p.nikoNote}"</div>` : ''}
      </div>`;
    });

    if (places.length > 20) {
      html += `<div style="padding: 8px 0; color: var(--text-muted); font-size: 0.8rem;">+ ${places.length - 20} more</div>`;
    }

    html += `</div>`;
    return html;
  }

  // ═══════════════════════════════════════════
  // CARD INTERACTION JUICE
  // ═══════════════════════════════════════════
  function initCardJuice() {
    // 3D tilt effect on hover (desktop only)
    if (window.matchMedia('(hover: hover)').matches) {
      document.addEventListener('mousemove', (e) => {
        const card = e.target.closest('.place-card');
        if (!card || !card.classList.contains('visible')) return;

        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        card.style.transform = `
          translateY(-6px) scale(1.01)
          perspective(600px)
          rotateX(${-y * 4}deg)
          rotateY(${x * 4}deg)
        `;
      });

      document.addEventListener('mouseleave', (e) => {
        const card = e.target.closest('.place-card');
        if (card) {
          card.style.transform = '';
        }
      }, true);
    }
  }

  // ═══════════════════════════════════════════
  // PARALLAX HERO
  // ═══════════════════════════════════════════
  function initParallax() {
    const hero = $('#hero');
    const content = $('.hero-content');
    const circles = $$('.circle');

    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      if (scrollY > window.innerHeight) return;

      const progress = scrollY / window.innerHeight;
      content.style.transform = `translateY(${scrollY * 0.3}px)`;
      content.style.opacity = 1 - progress * 1.5;

      circles.forEach((c, i) => {
        const speed = 0.1 + (i * 0.05);
        c.style.transform = `translate(${Math.sin(Date.now() / 3000 + i) * 20}px, ${scrollY * speed}px)`;
      });
    }, { passive: true });
  }

  // ═══════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════
  function init() {
    buildThemeSections();
    initNav();

    // Short delay for DOM to settle
    requestAnimationFrame(() => {
      initScrollReveal();
      initNavTracking();
      initBackToTop();
      initParallax();
      initCardJuice();

      // Init map after a brief delay (not critical path)
      setTimeout(initMap, 300);

      // Animate counters
      setTimeout(animateCounters, 500);

      // Hide loader
      setTimeout(hideLoader, 800);
    });
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
