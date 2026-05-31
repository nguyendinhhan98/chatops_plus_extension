/**
 * ChatOps++ Standalone Guide Page Orchestrator
 * Features a professional slideshow with support for multiple screenshots per module
 */

import { language, loadLanguage } from '../src/lang.js';

let currentSlideIndex = 0;
const totalSlides = 6;

let currentSettingsSlideIndex = 0;
const totalSettingsSlides = 4;

document.addEventListener('DOMContentLoaded', () => {
  initLanguageAndRender();
  initCarousel();
  initSettingsCarousel();
  initMultiScreenshotSelectors();
  initGlobalImageErrorHandlers();
  initLightbox();
});

/**
 * Handle image load errors dynamically without violating Content Security Policy (CSP)
 */
function initGlobalImageErrorHandlers() {
  document.querySelectorAll('.screenshot-img').forEach(img => {
    if (img.naturalWidth === 0 && img.src && img.complete) {
      const src = img.getAttribute('src');
      handleImageError(img, src);
    }
    img.addEventListener('error', () => {
      const src = img.getAttribute('src');
      handleImageError(img, src);
    });
  });
}

function handleImageError(img, filename) {
  const container = img.closest('.slide-image-wrapper');
  if (!container) return;
  
  img.style.display = 'none';
  
  let placeholder = container.querySelector('.error-image-placeholder');
  if (!placeholder) {
    placeholder = document.createElement('div');
    placeholder.className = 'error-image-placeholder';
    container.appendChild(placeholder);
  }
  
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.textAlign = 'center';
  container.style.padding = '24px';
  container.style.background = '#f1f5f9';
  container.style.minHeight = '300px';
  placeholder.innerHTML = `
    <div style="color: #64748b; font-family: sans-serif; padding: 20px;">
      <span style="font-size: 32px; display: block; margin-bottom: 8px;">📸</span>
      <span style="font-size: 13.5px; font-weight: 700; color: #1e293b; display: block; margin-bottom: 4px;">Chưa tìm thấy ảnh minh họa</span>
      <p style="font-size: 11.5px; line-height: 1.4; color: #64748b; max-width: 250px; margin: 0 auto;">
        Quý quản trị viên vui lòng chụp ảnh giao diện thực tế và lưu tệp tin vào đường dẫn:<br>
        <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size:10.5px; font-weight:700; display:inline-block; margin-top:6px; color:#b91c1c; font-family: monospace;">sidepanel/${filename}</code>
      </p>
    </div>
  `;
}

/**
 * Handle Multi-Language Switch, load lang.js dynamically
 */
async function initLanguageAndRender() {
  const params = new URLSearchParams(window.location.search);
  let activeLang = params.get('lang') || 'vi';
  
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['settings'], async (res) => {
      if (res.settings && res.settings.language) {
        if (!params.get('lang')) {
          activeLang = res.settings.language;
        }
      }
      renderGuide(activeLang);
    });
  } else {
    renderGuide(activeLang);
  }

  document.querySelectorAll('.lang-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = btn.dataset.lang;
      
      const url = new URL(window.location);
      url.searchParams.set('lang', selected);
      window.history.replaceState({}, '', url);

      renderGuide(selected);
    });
  });
}

/**
 * Update UI language attributes
 */
function renderGuide(langCode) {
  // Set HTML tag lang attribute for CSS translation visibility rules
  document.documentElement.setAttribute('lang', langCode);

  // Set active language button highlight
  document.querySelectorAll('.lang-switch-btn').forEach(btn => {
    if (btn.dataset.lang === langCode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}




/**
 * Map user guide links to active carousel slide indices
 */
function mapLinkToSlideIndex(key) {
  if (!key) return null;
  
  const mapping = {
    'tasks': 0,
    'work': 0,
    'features-snooze': 0,
    'features-toggle': 0,
    'memo': 1,
    'notes': 1,
    'mentions': 2,
    'tools-search': 3,
    'search': 3,
    'reactions-images': 4,
    'images': 4,
    'reactions-picker': 5,
    'features-floating': 5
  };

  return mapping[key] !== undefined ? mapping[key] : null;
}

/**
 * Initialize Carousel next/prev indicators
 */
function initCarousel() {
  const prevBtn = document.getElementById('prevSlideBtn');
  const nextBtn = document.getElementById('nextSlideBtn');
  const bullets = document.querySelectorAll('#carouselBullets .bullet');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      let index = currentSlideIndex - 1;
      if (index < 0) index = totalSlides - 1;
      goToSlide(index);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      let index = currentSlideIndex + 1;
      if (index >= totalSlides) index = 0;
      goToSlide(index);
    });
  }

  bullets.forEach(bullet => {
    bullet.addEventListener('click', () => {
      const slideTo = parseInt(bullet.dataset.slideTo);
      if (!isNaN(slideTo)) {
        goToSlide(slideTo);
      }
    });
  });
}

/**
 * Initialize Settings Carousel (4-slide settings section)
 */
function initSettingsCarousel() {
  const prevBtn = document.getElementById('prevSettingsSlideBtn');
  const nextBtn = document.getElementById('nextSettingsSlideBtn');
  const bullets = document.querySelectorAll('#settingsCarouselBullets .bullet');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      let index = currentSettingsSlideIndex - 1;
      if (index < 0) index = totalSettingsSlides - 1;
      goToSettingsSlide(index);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      let index = currentSettingsSlideIndex + 1;
      if (index >= totalSettingsSlides) index = 0;
      goToSettingsSlide(index);
    });
  }

  bullets.forEach(bullet => {
    bullet.addEventListener('click', () => {
      const slideTo = parseInt(bullet.dataset.settingsSlideTo);
      if (!isNaN(slideTo)) {
        goToSettingsSlide(slideTo);
      }
    });
  });
}

/**
 * Transition settings carousel to targeted slide index
 */
function goToSettingsSlide(index) {
  currentSettingsSlideIndex = index;

  const slides = document.querySelectorAll('.settings-carousel-slide');
  slides.forEach(slide => {
    const slideIdx = parseInt(slide.dataset.settingsSlideIndex);
    if (slideIdx === index) {
      slide.classList.add('active');
    } else {
      slide.classList.remove('active');
    }
  });

  const bullets = document.querySelectorAll('#settingsCarouselBullets .bullet');
  bullets.forEach(bullet => {
    const slideTo = parseInt(bullet.dataset.settingsSlideTo);
    if (slideTo === index) {
      bullet.classList.add('active');
    } else {
      bullet.classList.remove('active');
    }
  });
}

/**
 * Transition slideshow view to targeted slide index
 */
function goToSlide(index) {
  currentSlideIndex = index;

  // Toggle active slides
  const slides = document.querySelectorAll('.carousel-slide');
  slides.forEach(slide => {
    const slideIdx = parseInt(slide.dataset.slideIndex);
    if (slideIdx === index) {
      slide.classList.add('active');
    } else {
      slide.classList.remove('active');
    }
  });

  // Toggle active bullet indicators
  const bullets = document.querySelectorAll('#carouselBullets .bullet');
  bullets.forEach(bullet => {
    const slideTo = parseInt(bullet.dataset.slideTo);
    if (slideTo === index) {
      bullet.classList.add('active');
    } else {
      bullet.classList.remove('active');
    }
  });
}

/**
 * Keyboard Navigation: Press ArrowLeft or ArrowRight to switch slides.
 */


/**
 * Initialize sub-screenshot select buttons inside each browser mockup frame
 */
function initMultiScreenshotSelectors() {
  document.querySelectorAll('.frame-ss-selector').forEach(selector => {
    const buttons = selector.querySelectorAll('.ss-select-btn');
    const imageWrapper = selector.closest('.slide-image-wrapper');
    if (!imageWrapper) return;

    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // 1. Remove active state from all selector sibling buttons
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 2. Locate target img element inside wrapper
        const img = imageWrapper.querySelector('.screenshot-img');
        const newSrc = btn.dataset.imgSrc || btn.getAttribute('data-img-src');
        if (!img || !newSrc) return;

        // 3. Clear container style fallback overrides
        imageWrapper.removeAttribute('style');
        
        const errorDiv = imageWrapper.querySelector('.error-image-placeholder');
        if (errorDiv) errorDiv.remove();

        img.style.display = 'block';
        img.src = newSrc;
      });
    });
  });
}

/**
 * Lightbox: click any screenshot to view full-size overlay
 */
function initLightbox() {
  const lightbox = document.getElementById('guideLightbox');
  const lightboxImg = document.getElementById('guideLightboxImg');
  const closeBtn = document.getElementById('guideLightboxClose');
  if (!lightbox || !lightboxImg) return;

  function openLightbox(src) {
    lightboxImg.src = src;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => { lightboxImg.src = ''; }, 250);
  }

  // Delegate click to all current and future .screenshot-img elements
  document.body.addEventListener('click', (e) => {
    const img = e.target.closest('.screenshot-img');
    if (img && img.src && !img.src.includes('undefined') && img.naturalWidth > 0) {
      openLightbox(img.src);
    }
  });

  // Close on backdrop click
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeLightbox();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });
}
