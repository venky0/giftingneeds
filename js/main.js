/**
 * GIFTING NEEDS — CORE JAVASCRIPT CONTROLLER
 * Merges premium aesthetic interactions, slideshows, builders and filters.
 */

document.addEventListener('DOMContentLoaded', async () => {
  let design = null;
  // Asynchronously fetch catalog and visual styles from database before page loads
  try {
    const [productsRes, designRes] = await Promise.all([
      GiftingAPI.getProducts(),
      GiftingAPI.getDesignSettings()
    ]);
    
    if (productsRes.success) {
      PRODUCTS_DATA = productsRes.products;
    }
    
    if (designRes.success && designRes.design) {
      design = designRes.design;
      
      // Update local configurator items from DB if present
      if (design.solutions) {
        if (design.solutions.boxTypes && design.solutions.boxTypes.length > 0) {
          KIT_BOXES = {};
          design.solutions.boxTypes.forEach(box => {
            KIT_BOXES[box.id] = box;
          });
        }
        if (design.solutions.builderItems && design.solutions.builderItems.length > 0) {
          BUILDER_ITEMS = design.solutions.builderItems;
        }
      }
      
      // Inject Dynamic Site Content (fonts, menu, texts, FAQs, etc.)
      injectGlobalDesign(design);
      injectPageSpecificDesign(design);
      
      // Dynamic slideshow handler
      applyDynamicSlides(design);
    }
  } catch (err) {
    console.warn("Dynamic API loads failed, falling back to static constants:", err);
  }

  initNavbar();
  initThemeToggle();
  initFaqs();
  initSlideshow();
  initClientTicker();
  initProductCatalog();
  initKitBuilder();
  initInquiryModal();
  initInquiryForm();
  initDealerCalculator();

  // Hide premium loader once site is fully initialized
  const loader = document.getElementById('site-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.visibility = 'hidden';
    setTimeout(() => {
      loader.remove();
    }, 400);
  }
});

function applyDynamicSlides(design) {
  if (!design || !design.slides) return;
  const sliderContainer = document.getElementById('slider-container');
  if (!sliderContainer) return;

  // Clear only existing slide elements to avoid wiping out navigation controls
  const existingSlides = sliderContainer.querySelectorAll('.slide');
  existingSlides.forEach(el => el.remove());

  const activeSlides = design.slides.filter(s => s.active);
  
  const gradients = [
    "linear-gradient(135deg, #051a14 0%, #154536 100%)", // Emerald
    "linear-gradient(135deg, #0f1c24 0%, #20415a 100%)", // Dark Slate Blue
    "linear-gradient(135deg, #24140a 0%, #5a341b 100%)", // Coffee Brown
    "linear-gradient(135deg, #1b2611 0%, #445c2a 100%)", // Olive/Forest
    "linear-gradient(135deg, #0e1f13 0%, #205c31 100%)", // Rich Emerald Light
    "linear-gradient(135deg, #2f0709 0%, #76141a 100%)", // Crimson Gold
    "linear-gradient(135deg, #1d0f28 0%, #4b2c60 100%)", // Plum Royal Purple
    "linear-gradient(135deg, #1a2238 0%, #2b3a67 100%)", // Deep Indigo Blue
    "linear-gradient(135deg, #08201a 0%, #1c4b40 100%)", // Teal Glow
    "linear-gradient(135deg, #302008 0%, #684818 100%)"  // Sandalwood Gold
  ];

  // Insert slides before the navigation controls or dots container
  const insertBeforeEl = sliderContainer.querySelector('.slider-arrow') || sliderContainer.querySelector('.slider-dots') || sliderContainer.firstChild;

  activeSlides.forEach((slide, idx) => {
    const isFirst = idx === 0;
    const gradient = gradients[idx % gradients.length];
    
    const rightImageHTML = slide.image 
      ? `<div class="slide-product-wrapper">
           <img src="${GiftingAPI.resolveImage(slide.image)}" alt="${slide.title}" class="slide-product-img">
           <div class="slide-product-pedestal"></div>
         </div>`
      : '';
      
    const headingTag = idx === 0 ? 'h1' : 'h2';
    const slideDiv = document.createElement('div');
    slideDiv.className = `slide ${isFirst ? 'active' : ''}`;
    slideDiv.innerHTML = `
      <div class="slide-bg-overlay" style="background-image: ${gradient};">
        <div class="slide-bg-watermark" style="background-image: url('${GiftingAPI.resolveImage(slide.image)}');"></div>
        <div class="placeholder-pattern" style="opacity: 0.04;"></div>
      </div>
      <div class="container slide-grid-container">
        <div class="slide-content">
          <span class="slide-tag">${slide.tag}</span>
          <${headingTag} class="slide-title">${slide.title}</${headingTag}>
          <p class="slide-desc">${slide.desc}</p>
          <div class="slide-cta">
            <a href="${design.header ? design.header.ctaHref : 'solutions.html'}" class="btn btn-gold">${design.header ? design.header.ctaText : 'Build A Kit'}</a>
            <a href="products.html" class="btn btn-outline-gold">Browse Catalog</a>
          </div>
        </div>
        <div class="slide-graphic-panel">
          ${rightImageHTML}
        </div>
      </div>
    `;
    if (insertBeforeEl) {
      sliderContainer.insertBefore(slideDiv, insertBeforeEl);
    } else {
      sliderContainer.appendChild(slideDiv);
    }
  });
}

function injectGlobalDesign(design) {
  // 1. Header Branding logo text & image support
  if (design.header) {
    const navLogos = document.querySelectorAll('.nav-logo');
    const isHome = document.querySelector('.hero-slider-section') !== null;
    navLogos.forEach(el => {
      if (design.header.logoImage) {
        const isFooter = el.closest('footer') !== null;
        let initialLogoSrc = design.header.logoImage;
        let initialHeight = '56px';
        
        if (isFooter) {
          // Footer is always dark background, so always use light logo
          initialLogoSrc = 'uploads/gifting_needs_logo_light.png';
          initialHeight = '56px';
        } else if (isHome) {
          const isScrolled = document.querySelector('.navbar') && document.querySelector('.navbar').classList.contains('scrolled');
          if (!isScrolled) {
            initialLogoSrc = 'uploads/gifting_needs_logo_light.png';
            initialHeight = '72px';
          } else {
            initialLogoSrc = 'uploads/gifting_needs_logo_dark.png';
            initialHeight = '56px';
          }
        } else {
          // Non-home subpage header uses dark logo
          initialLogoSrc = 'uploads/gifting_needs_logo_dark.png';
          initialHeight = '56px';
        }
        
        el.innerHTML = `<img src="${GiftingAPI.resolveImage(initialLogoSrc)}" alt="Gifting Needs" class="logo-img-tag" style="height: ${initialHeight}; max-height: ${initialHeight}; width: auto; object-fit: contain; display: block; transition: all 0.3s ease;">`;
        el.style.gap = '0';
      } else {
        // Fallback to text + icon structure
        const logoIcon = el.querySelector('.nav-logo-icon');
        const logoText = el.querySelector('.nav-logo-text');
        if (logoIcon && logoText) {
          logoIcon.innerHTML = `
            <svg viewBox="0 0 24 24">
              <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4V8h16v11zM15 9.5c0 .83-.67 1.5-1.5 1.5h-3c-.83 0-1.5-.67-1.5-1.5V9H7v3c0 2.76 2.24 5 5 5s5-2.24 5-5V9h-2v.5z"/>
            </svg>
          `;
          const firstSpan = logoText.querySelector('span:nth-child(1)');
          const secondSpan = logoText.querySelector('span:nth-child(2)');
          if (firstSpan) {
            firstSpan.textContent = design.header.logoText || 'GIFTING NEEDS';
            if (design.header.logoTextColor) firstSpan.style.setProperty('color', design.header.logoTextColor, 'important');
            if (design.header.logoTextSize) firstSpan.style.fontSize = design.header.logoTextSize;
          }
          if (secondSpan) {
            secondSpan.textContent = design.header.logoSub || 'Corporate Solutions';
            if (design.header.logoSubColor) secondSpan.style.setProperty('color', design.header.logoSubColor, 'important');
            if (design.header.logoSubSize) secondSpan.style.fontSize = design.header.logoSubSize;
          }
        }
      }
    });
    // Header CTA Button
    const navCtaBtn = document.getElementById('nav-cta-btn');
    if (navCtaBtn) {
      navCtaBtn.textContent = design.header.ctaText || 'Build A Kit';
      navCtaBtn.href = design.header.ctaHref || 'solutions.html';
    }
  }

  // 2. Navigation menu items
  if (design.navigation && design.navigation.length > 0) {
    const navContainers = document.querySelectorAll('#main-navigation');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    navContainers.forEach(nav => {
      nav.innerHTML = design.navigation.map(link => {
        const isActive = link.href === currentPath || (currentPath === 'index.html' && link.href === '');
        return `<a href="${link.href}" class="nav-link ${isActive ? 'active' : ''}">${link.label}</a>`;
      }).join('');
    });
  }

  // 3. Footer branding and description
  if (design.footer) {
    const f = design.footer;
    const footerDesc = document.querySelector('.footer-logo-desc');
    if (footerDesc && f.logoDesc) {
      footerDesc.textContent = f.logoDesc;
    }

    // Footer contact items
    const footerContactItems = document.querySelectorAll('#main-footer .footer-contact-item');
    if (footerContactItems.length >= 3 && f.contactInfo) {
      const addrSpan = footerContactItems[0].querySelector('span:nth-child(2)');
      if (addrSpan) addrSpan.textContent = f.contactInfo.address;

      const emailSpan = footerContactItems[1].querySelector('span:nth-child(2)');
      if (emailSpan) emailSpan.textContent = f.contactInfo.email;

      const phoneSpan = footerContactItems[2].querySelector('span:nth-child(2)');
      if (phoneSpan) {
        phoneSpan.textContent = `${f.contactInfo.phone} / ${f.contactInfo.phoneDesk}`;
      }
    }

    // Footer social links
    const socialBtns = document.querySelectorAll('#main-footer .footer-socials a');
    if (socialBtns.length >= 3 && f.socials) {
      socialBtns[0].href = f.socials.facebook || '#';
      socialBtns[1].href = f.socials.linkedin || '#';
      socialBtns[2].href = f.socials.instagram || '#';
    }

    // Footer copyright
    const copyrightPara = document.querySelector('#main-footer .footer-bottom p');
    if (copyrightPara && f.copyright) {
      copyrightPara.textContent = f.copyright;
    }

    // Floating WhatsApp button phone update
    const waBtn = document.getElementById('whatsapp-float-btn');
    if (waBtn && f.contactInfo && f.contactInfo.phone) {
      const cleanPhone = f.contactInfo.phone.replace(/[^0-9]/g, '');
      waBtn.href = `https://wa.me/${cleanPhone}?text=Hi%20Gifting%20Needs,%20we%20want%20to%20inquire%20about%20corporate%20welcome%20kits.`;
    }
  }
}

function injectPageSpecificDesign(design) {
  if (!design) return;

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  // HOMEPAGE (index.html)
  if (currentPath === 'index.html' || currentPath === '') {
    // 1. Benefits Pills
    const benefitsRow = document.querySelector('.benefit-pills-row');
    if (benefitsRow && design.home && design.home.benefits) {
      benefitsRow.innerHTML = design.home.benefits.map(b => `
        <div class="benefit-pill">
          <div class="benefit-icon">${b.icon}</div>
          <span class="benefit-text">${b.text}</span>
        </div>
      `).join('');
    }

    // 2. Categories Showcase Section Title/Desc
    const catSection = document.getElementById('categories-section');
    if (catSection && design.home) {
      const titleEl = catSection.querySelector('.section-title');
      const descEl = catSection.querySelector('.section-desc');
      if (titleEl && design.home.categoryTitle) titleEl.textContent = design.home.categoryTitle;
      if (descEl && design.home.categoryDesc) descEl.textContent = design.home.categoryDesc;
    }

    // 3. Category Grid
    const categoryGrid = document.getElementById('category-cards-grid');
    if (categoryGrid && design.home && design.home.categories) {
      const cardGradients = [
        "radial-gradient(circle, #1c3e34 0%, #0c201a 100%)",
        "radial-gradient(circle, #1a2f3a 0%, #0d171d 100%)",
        "radial-gradient(circle, #3e2617 0%, #1e110a 100%)",
        "radial-gradient(circle, #213c23 0%, #0d1e10 100%)",
        "radial-gradient(circle, #2d182e 0%, #150916 100%)",
        "radial-gradient(circle, #3b1416 0%, #1c0607 100%)"
      ];
      categoryGrid.innerHTML = design.home.categories.map((c, idx) => {
        const grad = cardGradients[idx % cardGradients.length];
        const hrefTarget = c.category === 'welcome' || c.id === 'c1' ? 'solutions.html' : `products.html?category=${c.category}`;
        return `
          <a href="${hrefTarget}" class="category-card animate-slide-up" style="animation-delay: ${idx * 0.05}s;">
            <div class="category-card-image" style="background: ${grad};"></div>
            <div class="category-card-content">
              <div class="category-card-icon">${c.icon}</div>
              <h3 class="category-card-title">${c.title}</h3>
              <p class="category-card-desc">${c.desc}</p>
            </div>
          </a>
        `;
      }).join('');
    }
  }

  // ABOUT PAGE (about.html)
  if (currentPath === 'about.html') {
    const aboutMain = document.getElementById('about-main-content');
    if (aboutMain && design.about) {
      const heroTitle = aboutMain.querySelector('h1.serif-font');
      const heroDesc = aboutMain.querySelector('p');
      if (heroTitle && design.about.heroTitle) heroTitle.textContent = design.about.heroTitle;
      if (heroDesc && design.about.heroDesc) heroDesc.textContent = design.about.heroDesc;
    }

    const coreValues = document.getElementById('core-values');
    if (coreValues && design.about && design.about.values) {
      const titleEl = coreValues.querySelector('.section-title');
      const descEl = coreValues.querySelector('.section-desc');
      if (titleEl && design.about.valuesTitle) titleEl.textContent = design.about.valuesTitle;
      if (descEl && design.about.valuesDesc) descEl.textContent = design.about.valuesDesc;

      const cardsContainer = coreValues.querySelector('div[style*="grid-template-columns"]');
      if (cardsContainer) {
        cardsContainer.innerHTML = design.about.values.map(v => `
          <div class="product-card animate-slide-up" style="padding: 2.25rem; text-align: center; border-color: var(--border);">
            <div class="benefit-icon" style="margin: 0 auto 1.5rem auto; width: 50px; height: 50px; font-size: 1.5rem;">${v.icon}</div>
            <h3 class="serif-font" style="font-size: 1.25rem; color: var(--primary); margin-bottom: 1rem;">${v.title}</h3>
            <p style="font-size: 0.88rem; color: var(--text-muted);">${v.desc}</p>
          </div>
        `).join('');
      }
    }

    const companyTimeline = document.getElementById('company-timeline');
    if (companyTimeline && design.about && design.about.timeline) {
      const timelineContainer = companyTimeline.querySelector('div[style*="max-width: 800px"]');
      if (timelineContainer) {
        timelineContainer.innerHTML = design.about.timeline.map((m, idx) => `
          <div style="display: flex; gap: 2rem; border-left: 2px solid var(--gold); padding-left: 2rem; position: relative;" class="animate-fade-in">
            <div style="position: absolute; left: -7px; top: 0; width: 12px; height: 12px; border-radius: 50%; background: var(--gold-bright); box-shadow: var(--shadow-gold);"></div>
            <div>
              <h3 class="serif-font" style="color: var(--primary); font-size: 1.25rem;">${m.year} — ${m.title}</h3>
              <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.25rem;">${m.desc}</p>
            </div>
          </div>
        `).join('');
      }
    }
  }

  // CONTACT PAGE (contact.html)
  if (currentPath === 'contact.html') {
    const faqList = document.querySelector('.faq-list');
    if (faqList && design.contact && design.contact.faqs) {
      faqList.innerHTML = design.contact.faqs.map(faq => `
        <div class="faq-item">
          <div class="faq-header">
            <h3 class="faq-question">${faq.question}</h3>
            <span class="faq-icon">+</span>
          </div>
          <div class="faq-body">
            <div class="faq-content">
              <p>${faq.answer}</p>
            </div>
          </div>
        </div>
      `).join('');
    }

    const contactGrid = document.getElementById('contact-grid-section');
    if (contactGrid && design.footer && design.footer.contactInfo) {
      const info = design.footer.contactInfo;
      const items = contactGrid.querySelectorAll('div[style*="flex-direction: column"] > div');
      if (items.length >= 3) {
        const addressP = items[0].querySelector('p');
        if (addressP) addressP.textContent = info.address;
        
        const phones = items[1].querySelectorAll('p');
        if (phones.length >= 2) {
          phones[0].textContent = `${info.phone} (Sales Lead)`;
          phones[1].textContent = `${info.phoneDesk} (Office Desk)`;
        }
        
        const emails = items[2].querySelectorAll('p');
        if (emails.length >= 1) {
          emails[0].textContent = `${info.email} (Inquiries)`;
        }
      }

      if (design.contact.mapLink) {
        const mapLinkEl = contactGrid.querySelector('a[href*="maps.google.com"]');
        if (mapLinkEl) mapLinkEl.href = design.contact.mapLink;
      }
    }
  }

  // SOLUTIONS PAGE (solutions.html)
  if (currentPath === 'solutions.html') {
    const solutionsMain = document.getElementById('solutions-main-content');
    if (solutionsMain && design.solutions) {
      const titleEl = solutionsMain.querySelector('.section-title');
      const descEl = solutionsMain.querySelector('.section-desc');
      if (titleEl && design.solutions.title) titleEl.textContent = design.solutions.title;
      if (descEl && design.solutions.desc) descEl.textContent = design.solutions.desc;
    }
  }
}

/* ============================================================
   1. NAVBAR EFFECTS & RESPONSIVE TOGGLE
   ============================================================ */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const menuBtn = document.querySelector('.menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (navbar) {
    const isHome = document.querySelector('.hero-slider-section') !== null;
    
    if (isHome) {
      const updateLogoOnScroll = () => {
        const logoImg = document.querySelector('.navbar .logo-img-tag');
        if (!logoImg) return;
        if (window.scrollY > 40) {
          navbar.classList.add('scrolled');
          logoImg.src = GiftingAPI.resolveImage('uploads/gifting_needs_logo_dark.png');
          logoImg.style.height = '56px';
          logoImg.style.maxHeight = '56px';
        } else {
          navbar.classList.remove('scrolled');
          logoImg.src = GiftingAPI.resolveImage('uploads/gifting_needs_logo_light.png');
          logoImg.style.height = '72px';
          logoImg.style.maxHeight = '72px';
        }
      };

      // Add background & logo change on scroll
      window.addEventListener('scroll', updateLogoOnScroll);
      // Handle initial state if page is loaded scrolled
      updateLogoOnScroll();
    } else {
      // Non-home subpages are ALWAYS scrolled (solid background with dark text)
      navbar.classList.add('scrolled');
      const logoImg = document.querySelector('.navbar .logo-img-tag');
      if (logoImg) {
        logoImg.src = GiftingAPI.resolveImage('uploads/gifting_needs_logo_dark.png');
        logoImg.style.height = '56px';
        logoImg.style.maxHeight = '56px';
      }
    }
  }

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      menuBtn.classList.toggle('open');
      navLinks.classList.toggle('open');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        menuBtn.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });
  }
}

/* ============================================================
   2. LIGHT/DARK THEME TOGGLE
   ============================================================ */
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;

  const currentTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon(toggleBtn, currentTheme);

  toggleBtn.addEventListener('click', () => {
    const activeTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = activeTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(toggleBtn, newTheme);
  });
}

function updateThemeIcon(btn, theme) {
  if (theme === 'dark') {
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  } else {
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  }
}

/* ============================================================
   3. 10-SLIDE HERO SLIDESHOW (AUTOPLAY + DOTS + SWIPE)
   ============================================================ */
function initSlideshow() {
  const slides = document.querySelectorAll('.slide');
  const dotsContainer = document.querySelector('.slider-dots');
  const prevBtn = document.querySelector('.slider-arrow-prev');
  const nextBtn = document.querySelector('.slider-arrow-next');
  
  if (slides.length === 0) return;

  let currentSlideIndex = 0;
  let slideInterval;
  const autoplayDelay = 6000;

  // Create dot indicators dynamically
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
  }
  slides.forEach((_, index) => {
    const dot = document.createElement('div');
    dot.classList.add('slider-dot');
    if (index === 0) dot.classList.add('active');
    dot.addEventListener('click', () => {
      goToSlide(index);
      resetAutoplay();
    });
    if (dotsContainer) {
      dotsContainer.appendChild(dot);
    }
  });

  const dots = document.querySelectorAll('.slider-dot');

  function goToSlide(n) {
    slides[currentSlideIndex].classList.remove('active');
    dots[currentSlideIndex].classList.remove('active');
    
    currentSlideIndex = (n + slides.length) % slides.length;
    
    slides[currentSlideIndex].classList.add('active');
    dots[currentSlideIndex].classList.add('active');
  }

  function nextSlide() {
    goToSlide(currentSlideIndex + 1);
  }

  function prevSlide() {
    goToSlide(currentSlideIndex - 1);
  }

  function startAutoplay() {
    slideInterval = setInterval(nextSlide, autoplayDelay);
  }

  function resetAutoplay() {
    clearInterval(slideInterval);
    startAutoplay();
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevSlide();
      resetAutoplay();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextSlide();
      resetAutoplay();
    });
  }

  // Swipe support for mobile
  let touchStartX = 0;
  let touchEndX = 0;
  const slideshowSection = document.querySelector('.hero-slider-section');
  
  if (slideshowSection) {
    slideshowSection.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    slideshowSection.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });
  }

  function handleSwipe() {
    const swipeThreshold = 50;
    if (touchStartX - touchEndX > swipeThreshold) {
      nextSlide(); // Swipe left
      resetAutoplay();
    } else if (touchEndX - touchStartX > swipeThreshold) {
      prevSlide(); // Swipe right
      resetAutoplay();
    }
  }

  startAutoplay();
}

/* ============================================================
   4. CLIENT LOGO INFINITE TICKER
   ============================================================ */
function initClientTicker() {
  const tracks = document.querySelectorAll('.ticker-track');
  if (!tracks.length) return;

  tracks.forEach(track => {
    // Duplicate items for seamless scrolling
    const items = Array.from(track.children);
    items.forEach(item => {
      const clone = item.cloneNode(true);
      track.appendChild(clone);
    });

    // Pause scrolling on hover
    track.addEventListener('mouseenter', () => {
      track.style.animationPlayState = 'paused';
    });
    track.addEventListener('mouseleave', () => {
      track.style.animationPlayState = 'running';
    });
  });
}

/* ============================================================
   5. PRODUCT CATALOG DISPLAY & CLIENT-SIDE FILTERING
   ============================================================ */
let PRODUCTS_DATA = [
  // Technology
  {
    id: 'p1',
    category: 'tech',
    categoryLabel: 'Electronics & Tech',
    badge: 'popular',
    badgeText: 'Bestseller',
    title: 'Custom Brand 10,000mAh Power Bank',
    price: 649,
    minQty: 50,
    icon: '🔋',
    image: 'images/products/power_bank.jpg',
    desc: 'Sleek, durable, and high-capacity metallic power bank for the modern professional. Laser-etched branding on brushed aluminum ensures your logo leaves a lasting impression.',
    specs: { 'Material': 'Aluminum Alloy', 'Capacity': '10,000 mAh', 'Output': 'Dual 2.1A Quick Charge', 'Colors': 'Black, Gold, Rose Gold, Matte Silver' }
  },
  {
    id: 'p2',
    category: 'tech',
    categoryLabel: 'Electronics & Tech',
    badge: 'new',
    badgeText: 'New',
    title: 'Executive Bamboo Wireless Charging Pad',
    price: 499,
    minQty: 100,
    icon: '🔌',
    image: 'images/products/wireless_charger.jpg',
    desc: 'Eco-friendly 15W fast-charging wireless charger for a clutter-free, productive workspace. Natural bamboo surface with custom logo engraving — where tech meets sustainability.',
    specs: { 'Material': 'Natural Sustainable Bamboo', 'Output': '15W Fast Charge', 'Safety': 'Over-temperature & surge protection', 'Port': 'Type-C' }
  },
  {
    id: 'p3',
    category: 'tech',
    categoryLabel: 'Electronics & Tech',
    badge: '',
    badgeText: '',
    title: 'Metal Ring Bluetooth Speaker & Mic',
    price: 899,
    minQty: 50,
    icon: '🔊',
    image: 'images/products/bluetooth_speaker.jpg',
    desc: 'Compact, water-resistant premium metal speaker for seamless music and hands-free conference calls. Pairs in seconds via Bluetooth 5.2 — a statement gift for top performers.',
    specs: { 'Power': '5W Audio output', 'Play Time': 'Up to 6 hours', 'Bluetooth': 'v5.2 BLE', 'Size': '70mm x 70mm x 45mm' }
  },
  // Drinkware
  {
    id: 'p4',
    category: 'drinkware',
    categoryLabel: 'Premium Drinkware',
    badge: 'popular',
    badgeText: 'High Demand',
    title: 'Insulated Hydro Vacuum Flask (500ml)',
    price: 450,
    minQty: 100,
    icon: '🥤',
    image: 'images/products/flask.jpg',
    desc: 'Insulated, premium double-wall flask that keeps drinks hot 12 hours, cold 24 hours. Gold-embossed corporate branding on a matte-black finish — elegance at every sip.',
    specs: { 'Material': '304 Stainless Steel', 'Volume': '500 ml', 'Finish': 'Matte Powder Coating', 'Branding': 'Screen Print / Laser Engraving' }
  },
  {
    id: 'p5',
    category: 'drinkware',
    categoryLabel: 'Premium Drinkware',
    badge: 'new',
    badgeText: 'Eco-Choice',
    title: 'Coffee Husk Reusable Coffee Cup',
    price: 199,
    minQty: 200,
    icon: '☕',
    image: 'images/products/eco_cup.jpg',
    desc: 'Biodegradable coffee cup crafted from authentic agricultural waste coffee husks. Durable, leak-proof, BPA-free, and micro-wave safe.',
    specs: { 'Material': 'Coffee Husk Bio-composite', 'Capacity': '350 ml', 'Heat Limit': 'Up to 110°C', 'Branding': 'Bio-ink Printing' }
  },
  {
    id: 'p6',
    category: 'drinkware',
    categoryLabel: 'Premium Drinkware',
    badge: '',
    badgeText: '',
    title: 'Rustic Copper Drinkware Set',
    price: 1250,
    minQty: 25,
    icon: '🍶',
    image: 'images/products/copper_set.jpg',
    desc: 'Exquisite handcrafted 99.9% pure copper drinkware set in a velvet-lined sandalwood box. A luxurious Ayurvedic wellness gift that speaks to heritage, health, and thoughtfulness.',
    specs: { 'Material': '99.9% Pure Copper', 'Bottle Capacity': '950 ml', 'Tumbler Capacity': '250 ml', 'Health Benefits': 'Natural anti-bacterial' }
  },
  // Desk & Stationery
  {
    id: 'p7',
    category: 'stationery',
    categoryLabel: 'Desk Utilities & Planners',
    badge: '',
    badgeText: '',
    title: 'Elite Cork Cover Planner & Organizer',
    price: 349,
    minQty: 100,
    icon: '📓',
    image: 'images/products/planner.jpg',
    desc: 'A5 executive diary with a soft-touch organic cork cover. Includes a matching bamboo stylus ball pen and business card slots.',
    specs: { 'Paper Quality': '80 GSM Acid-free Natural Shade', 'Format': 'Undated day-wise planner', 'Binding': 'Smyth Sewn flat-lay', 'Pages': '192 pages' }
  },
  {
    id: 'p8',
    category: 'stationery',
    categoryLabel: 'Desk Utilities & Planners',
    badge: 'popular',
    badgeText: 'Classic',
    title: 'Solid Oak Desk Organizer & Pen Stand',
    price: 399,
    minQty: 50,
    icon: '🪵',
    image: 'images/products/desk_organizer.jpg',
    desc: 'Handcrafted solid wood desktop organizer. Features phone docking slot, watch cradle, paperclip tray, and dual pen holder.',
    specs: { 'Wood Type': 'Sustainable Oak Wood', 'Finish': 'Natural Linseed Oil', 'Weight': '320g', 'Dimensions': '18cm x 8cm x 4cm' }
  },
  // Apparel & Bags
  {
    id: 'p9',
    category: 'apparel',
    categoryLabel: 'Apparel & Bags',
    badge: 'popular',
    badgeText: 'Bestseller',
    title: 'Premium Organic Cotton Polo T-Shirt',
    price: 399,
    minQty: 100,
    icon: '👕',
    image: 'images/products/polo_shirt.jpg',
    desc: '220 GSM pre-shrunk combed organic cotton polo. Perfect stitching, elegant side slits, and highly durable custom embroidery of your logo.',
    specs: { 'Material': '100% Organic Combed Cotton', 'Weight': '220 GSM Pique Knit', 'Sizes': 'S to XXXL (Unisex)', 'Embroidery': 'High-density Japanese machinery' }
  },
  {
    id: 'p10',
    category: 'apparel',
    categoryLabel: 'Apparel & Bags',
    badge: 'new',
    badgeText: 'Luxury',
    title: 'Anti-Theft Executive Laptop Backpack',
    price: 1450,
    minQty: 30,
    icon: '🎒',
    desc: 'Sleek tech bag with concealed zippers, USB charging port, and water-resistant fabric. Padded compartment fits up to 16" laptops.',
    specs: { 'Material': '300D Water-Repellent Polyester', 'Capacity': '20 Liters', 'USB Port': 'External bypass link', 'Pockets': '12 multi-functional dividers' }
  },
  // Festive & Hampers
  {
    id: 'p11',
    category: 'hampers',
    categoryLabel: 'Festive & Gourmet Hampers',
    badge: 'festive',
    badgeText: 'Diwali Special',
    title: 'Royal Mysore Gold Sweets & Nut Hamper',
    price: 1850,
    minQty: 25,
    icon: '🎁',
    image: 'images/diwali_hamper_category.jpg',
    desc: 'A gourmet Diwali celebration in a gold-foiled box — premium cashews, almonds, pistachios, organic forest honey, handmade chocolates, and a traditional brass diya. Pure festive delight.',
    specs: { 'Packaging': 'Premium Gold-Foiled Rigged Gift Box', 'Box Size': '32cm x 24cm x 8cm', 'Inclusions': '5 gourmet jars + Brass Diya', 'Shelf Life': '90 Days' }
  },
  {
    id: 'p12',
    category: 'hampers',
    categoryLabel: 'Festive & Gourmet Hampers',
    badge: 'festive',
    badgeText: 'Green Hamper',
    title: 'Eco-Friendly Zero Waste Gifting Box',
    price: 999,
    minQty: 50,
    icon: '🌱',
    desc: 'Showcase your company\'s commitment to planet earth. Contains a bamboo planter pot, seed paper calendar, cork diary, and plantable clay seed balls.',
    specs: { 'Box Material': '100% Recycled Kraft paperboard', 'Seed Types': 'Basil, Marigold, Tomato', 'Biodegradable': '98% overall', 'Customization': 'Soy-ink printed company card' }
  },
  // Trophies & Awards
  {
    id: 'p13',
    category: 'trophies',
    categoryLabel: 'Trophies & Mementos',
    badge: '',
    badgeText: '',
    title: 'Gilded Diamond Cut Crystal Award',
    price: 1800,
    minQty: 10,
    icon: '🏆',
    desc: 'High-clarity optical grade crystal award. Features polished geometric facets that catch light, mounted on a solid mahogany wood base.',
    specs: { 'Material': 'K9 Optical Crystal + Mahogany Wood', 'Height': '9 Inches', 'Engraving': 'Internal 3D Laser Etching', 'Case': 'Satin lined blue presentation box' }
  }
];

function initProductCatalog() {
  const grid = document.getElementById('catalog-products-grid');
  const resultCount = document.getElementById('results-count');
  const searchInput = document.getElementById('catalog-search-input');
  const sortSelect = document.getElementById('catalog-sort-select');
  const categoryFilters = document.querySelectorAll('.category-filter-checkbox');
  const budgetFilters = document.querySelectorAll('.budget-filter-checkbox');

  if (!grid) return;

  let activeFilters = {
    categories: [],
    budgets: [],
    search: '',
    sort: 'popular'
  };

  // Render initial list
  renderProducts();

  // Search input listener
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      activeFilters.search = e.target.value.toLowerCase().trim();
      renderProducts();
    });
  }

  // Sort select listener
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      activeFilters.sort = e.target.value;
      renderProducts();
    });
  }

  // Category filter listeners
  categoryFilters.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      activeFilters.categories = Array.from(categoryFilters)
        .filter(c => c.checked)
        .map(c => c.value);
      renderProducts();
    });
  });

  // Budget filter listeners
  budgetFilters.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      activeFilters.budgets = Array.from(budgetFilters)
        .filter(b => b.checked)
        .map(b => b.value);
      renderProducts();
    });
  });

  // Main rendering function
  function renderProducts() {
    grid.innerHTML = '';
    
    let filtered = PRODUCTS_DATA.filter(product => {
      // Search match
      const matchesSearch = product.title.toLowerCase().includes(activeFilters.search) || 
                            product.desc.toLowerCase().includes(activeFilters.search) ||
                            product.categoryLabel.toLowerCase().includes(activeFilters.search);
      
      // Category match
      const matchesCategory = activeFilters.categories.length === 0 || 
                               activeFilters.categories.includes(product.category);

      // Budget match
      let matchesBudget = true;
      if (activeFilters.budgets.length > 0) {
        matchesBudget = activeFilters.budgets.some(budgetRange => {
          if (budgetRange === 'under-300') return product.price < 300;
          if (budgetRange === '300-600') return product.price >= 300 && product.price <= 600;
          if (budgetRange === '600-1200') return product.price > 600 && product.price <= 1200;
          if (budgetRange === 'above-1200') return product.price > 1200;
          return true;
        });
      }

      return matchesSearch && matchesCategory && matchesBudget;
    });

    // Sorting logic
    if (activeFilters.sort === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (activeFilters.sort === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (activeFilters.sort === 'popular') {
      filtered.sort((a, b) => (b.badge === 'popular' ? 1 : 0) - (a.badge === 'popular' ? 1 : 0));
    }

    // Render count
    if (resultCount) {
      resultCount.textContent = `Showing ${filtered.length} products`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; color: var(--text-subtle);">
          <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">🔍</span>
          <h3>No matching gifting items found</h3>
          <p style="margin-top: 0.5rem;">Try adjusting your filters or search query.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card animate-slide-up';
      
      // Badge HTML
      let badgeHTML = '';
      if (product.badge) {
        let badgeClass = 'badge-new';
        if (product.badge === 'popular') badgeClass = 'badge-popular';
        if (product.badge === 'festive') badgeClass = 'badge-festive';
        if (product.badge === 'monsoon') badgeClass = 'badge-monsoon';
        if (product.badge === 'cooling') badgeClass = 'badge-cooling';
        if (product.badge === 'dealer') badgeClass = 'badge-dealer';
        badgeHTML = `<span class="product-card-badge ${badgeClass}">${product.badgeText}</span>`;
      }

      const imageHTML = product.image
        ? `<img src="${GiftingAPI.resolveImage(product.image)}" alt="${product.title}" class="product-card-img" style="width: 100%; height: 100%; object-fit: cover; display: block;">`
        : `<div class="product-placeholder-graphic">
            <div class="placeholder-pattern"></div>
            <div class="placeholder-icon">${product.icon}</div>
            <div class="placeholder-label">${product.categoryLabel}</div>
          </div>`;

      card.innerHTML = `
        <div class="product-card-image-wrap">
          ${badgeHTML}
          ${imageHTML}
        </div>
        <div class="product-card-content">
          <span class="product-card-category">${product.categoryLabel}</span>
          <h4 class="product-card-title">${product.title}</h4>
          <div class="product-card-bottom">
            <div class="product-card-price-info">
              <span class="price-label">Minimum Order Qty</span>
              <span class="price-val" style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">${product.minQty} units</span>
            </div>
            <button class="btn-card-inquire" title="View details & Inquire" data-id="${product.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      `;

      // Set listener for details popup
      const inquireBtn = card.querySelector('.btn-card-inquire');
      inquireBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openInquiryModal(product.id);
      });

      card.addEventListener('click', () => {
        openInquiryModal(product.id);
      });

      grid.appendChild(card);
    });
  }
}

/* ============================================================
   6. INTERACTIVE BUILD-A-KIT WIDGET
   ============================================================ */
let KIT_BOXES = {
  kraft: { id: 'kraft', name: 'Kraft Sustainable Box', price: 90, icon: '📦', desc: '100% recycled eco-kraft paperboard box with earth-friendly soy ink stamp.' },
  matte: { id: 'matte', name: 'Premium Matte Black Box', price: 180, icon: '💼', desc: 'Magnetic closure luxury matte black card box, lined with velvet foam inserts.' },
  gilded: { id: 'gilded', name: 'Gilded Festive Box', price: 220, icon: '✨', desc: 'Royal green box adorned with metallic gold foil traditional motifs.' }
};

let BUILDER_ITEMS = [
  { id: 'bi1', name: 'Metal Stylus Pen', price: 99, icon: '🖊️' },
  { id: 'bi2', name: 'Organic Cork Diary', price: 249, icon: '📓' },
  { id: 'bi3', name: 'Smart Vacuum Mug (350ml)', price: 349, icon: '☕' },
  { id: 'bi4', name: '10,000mAh Power Bank', price: 649, icon: '🔋' },
  { id: 'bi5', name: 'Bluetooth Metal Speaker', price: 899, icon: '🔊' },
  { id: 'bi6', name: 'Cashew & Almond Jars Set', price: 550, icon: '🏺' },
  { id: 'bi7', name: 'Sustainable Bamboo Planter', price: 199, icon: '🌱' },
  { id: 'bi8', name: 'Genuine Leather Cardholder', price: 299, icon: '💳' }
];

function initKitBuilder() {
  const boxGrid = document.getElementById('builder-box-grid');
  const productGrid = document.getElementById('builder-products-grid');
  const summaryList = document.getElementById('summary-items-list');
  const emptyState = document.getElementById('summary-empty-state');
  const boxTotalEl = document.getElementById('summary-box-total');
  const itemsTotalEl = document.getElementById('summary-items-total');
  const taxEl = document.getElementById('summary-tax-total');
  const grandTotalEl = document.getElementById('summary-grand-total');
  const kitQtyInput = document.getElementById('builder-kit-quantity');
  const finalSummaryInput = document.getElementById('inquiry-kit-summary');
  
  if (!boxGrid) return;

  let chosenBox = KIT_BOXES.kraft;
  let chosenItems = [];
  let kitQuantity = 100;

  // 1. Render Box Selection
  boxGrid.innerHTML = '';
  Object.values(KIT_BOXES).forEach(box => {
    const isSelected = box.id === chosenBox.id;
    const card = document.createElement('div');
    card.className = `box-option-card ${isSelected ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="box-preview-icon">${box.icon}</div>
      <div class="box-name">${box.name}</div>
      <div class="builder-card-price">₹${box.price}</div>
      <div class="box-desc">${box.desc}</div>
    `;

    card.addEventListener('click', () => {
      // Toggle selection
      boxGrid.querySelectorAll('.box-option-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      chosenBox = box;
      updateSummary();
    });

    boxGrid.appendChild(card);
  });

  // 2. Render Product Selections
  productGrid.innerHTML = '';
  BUILDER_ITEMS.forEach(item => {
    const card = document.createElement('div');
    card.className = 'builder-product-card';
    card.innerHTML = `
      <div class="builder-card-icon">${item.icon}</div>
      <div class="builder-card-name">${item.name}</div>
      <div class="builder-card-price">₹${item.price}</div>
    `;

    card.addEventListener('click', () => {
      const idx = chosenItems.findIndex(i => i.id === item.id);
      if (idx > -1) {
        // Remove item
        chosenItems.splice(idx, 1);
        card.classList.remove('selected');
      } else {
        // Add item
        chosenItems.push(item);
        card.classList.add('selected');
      }
      updateSummary();
    });

    productGrid.appendChild(card);
  });

  // 3. Handle Quantity Change
  if (kitQtyInput) {
    kitQtyInput.addEventListener('input', (e) => {
      let val = parseInt(e.target.value);
      if (isNaN(val) || val < 1) val = 1;
      kitQuantity = val;
      updateSummary();
    });
  }

  // 4. Update calculations & list
  function updateSummary() {
    summaryList.innerHTML = '';
    
    // Add Box first
    const boxRow = document.createElement('div');
    boxRow.className = 'summary-item-row';
    boxRow.innerHTML = `
      <span class="summary-item-name">
        <span>${chosenBox.icon}</span> ${chosenBox.name}
      </span>
      <span class="summary-item-price">₹${chosenBox.price}</span>
    `;
    summaryList.appendChild(boxRow);

    if (chosenItems.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      
      chosenItems.forEach(item => {
        const itemRow = document.createElement('div');
        itemRow.className = 'summary-item-row';
        itemRow.innerHTML = `
          <span class="summary-item-name">
            <button class="summary-item-remove" data-id="${item.id}">×</button>
            <span>${item.icon}</span> ${item.name}
          </span>
          <span class="summary-item-price">₹${item.price}</span>
        `;

        itemRow.querySelector('.summary-item-remove').addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = chosenItems.findIndex(i => i.id === item.id);
          if (idx > -1) {
            chosenItems.splice(idx, 1);
            // Deselect card in grid
            const cards = productGrid.querySelectorAll('.builder-product-card');
            const clickedCard = Array.from(cards).find(c => c.textContent.includes(item.name));
            if (clickedCard) clickedCard.classList.remove('selected');
            updateSummary();
          }
        });

        summaryList.appendChild(itemRow);
      });
    }

    // Calculations
    const singleBoxCost = chosenBox.price;
    const singleItemsCost = chosenItems.reduce((sum, item) => sum + item.price, 0);
    const singleKitCost = singleBoxCost + singleItemsCost;
    
    const subtotalAllKits = singleKitCost * kitQuantity;
    const gstValue = Math.round(subtotalAllKits * 0.18); // 18% GST standard on corporate gift hampers
    const brandingCharges = kitQuantity < 50 ? 2500 : 0; // Flat customization setup fee for small orders
    const finalGrandTotal = subtotalAllKits + gstValue + brandingCharges;

    // Render totals
    if (boxTotalEl) boxTotalEl.textContent = `₹${singleBoxCost}`;
    if (itemsTotalEl) itemsTotalEl.textContent = `₹${singleItemsCost}`;
    if (taxEl) taxEl.textContent = `₹${gstValue} (18% GST)`;
    if (grandTotalEl) grandTotalEl.textContent = `₹${finalGrandTotal.toLocaleString('en-IN')}`;

    // Update hidden inquiry summary input in form
    if (finalSummaryInput) {
      const summaryText = `Box: ${chosenBox.name} (₹${chosenBox.price}) | Items: ${chosenItems.map(i => i.name).join(', ') || 'None'} | Quantity: ${kitQuantity} | Est. Cost: ₹${finalGrandTotal}`;
      finalSummaryInput.value = summaryText;
    }
  }

  // Run initial call
  updateSummary();
}

/* ============================================================
   7. PRODUCT DETAIL MODAL DIALOGS
   ============================================================ */
function initInquiryModal() {
  const overlay = document.getElementById('inquiry-modal');
  const closeBtn = document.getElementById('modal-close-btn');

  if (!overlay) return;

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      overlay.classList.remove('active');
    });
  }

  // Close when clicking background overlay
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
    }
  });

  // Close on Escape key press
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      overlay.classList.remove('active');
    }
  });
}

function openInquiryModal(productId) {
  const overlay = document.getElementById('inquiry-modal');
  const detailsContainer = document.getElementById('modal-details-container');
  const hiddenInquiryProductInput = document.getElementById('inquiry-product-details');

  if (!overlay || !detailsContainer) return;

  const product = PRODUCTS_DATA.find(p => p.id === productId);
  if (!product) return;

  // Build specs rows
  let specsHTML = '';
  for (const [key, val] of Object.entries(product.specs)) {
    specsHTML += `
      <div class="spec-row">
        <span class="spec-name">${key}</span>
        <span class="spec-val">${val}</span>
      </div>
    `;
  }

  let tagHTML = '';
  if (product.badgeText) {
    tagHTML = `<span class="modal-tag">${product.badgeText}</span>`;
  }

  // Set modal details HTML
  detailsContainer.innerHTML = `
    <div class="modal-image-wrap">
      ${product.image
        ? `<img src="${GiftingAPI.resolveImage(product.image)}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: cover; display: block;">`
        : `<div class="product-placeholder-graphic">
            <div class="placeholder-pattern"></div>
            <div class="placeholder-icon" style="font-size: 5rem;">${product.icon}</div>
            <div class="placeholder-label" style="font-size: 0.85rem; padding: 0.4rem 1rem;">${product.categoryLabel}</div>
          </div>`
      }
    </div>
    <div class="modal-details">
      ${tagHTML}
      <h3 class="modal-title">${product.title}</h3>
      <p class="modal-desc">${product.desc}</p>
      
      <div class="modal-specs">
        <h4 style="margin-bottom: 0.75rem; font-size: 0.95rem; color: var(--primary);">Product Specifications</h4>
        ${specsHTML}
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: auto;">
        <span style="font-size: 0.75rem; color: var(--gold-bright); font-weight: 700; text-transform: uppercase;">MOQ (Minimum Order Qty): ${product.minQty} units</span>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Custom corporate logo branding setup included on orders exceeding MOQ.</p>
        <button class="btn btn-primary" onclick="scrollToInquiryForm('${product.title}')" style="width: 100%;">
          Inquire Gifting Quote
        </button>
      </div>
    </div>
  `;

  // Update hidden input field in contact form
  if (hiddenInquiryProductInput) {
    hiddenInquiryProductInput.value = `${product.title} (MOQ: ${product.minQty})`;
  }

  // Open the modal
  overlay.classList.add('active');
}

// Quick link to close modal and scroll to inquiry form on subpages
window.scrollToInquiryForm = function(productTitle) {
  const modal = document.getElementById('inquiry-modal');
  if (modal) modal.classList.remove('active');

  const inquiryFormSection = document.getElementById('quote-inquiry-section');
  if (inquiryFormSection) {
    inquiryFormSection.scrollIntoView({ behavior: 'smooth' });
    
    // Auto-fill form message/product selection
    const messageInput = document.getElementById('inquiry-message');
    if (messageInput) {
      messageInput.value = `Hi, we are interested in getting a customized corporate quote and branding details for "${productTitle}". Please send us details.`;
      messageInput.focus();
    }
  } else {
    // If not on the page that has the form, redirect to contact.html
    window.location.href = `contact.html?product=${encodeURIComponent(productTitle)}`;
  }
};

/* ============================================================
   8. DYNAMIC INQUIRY URL POPULATER
   ============================================================ */
function initInquiryForm() {
  const form = document.getElementById('corporate-inquiry-form');
  if (!form) return;

  // Check URL parameters (e.g. contact.html?product=Power%20Bank)
  const urlParams = new URLSearchParams(window.location.search);
  const selectedProduct = urlParams.get('product');

  if (selectedProduct) {
    const messageInput = document.getElementById('inquiry-message');
    const productInput = document.getElementById('inquiry-product-details');

    if (messageInput) {
      messageInput.value = `Hi, we are interested in getting a customized corporate quote and branding details for "${decodeURIComponent(selectedProduct)}". Please send us details.`;
    }
    if (productInput) {
      productInput.value = decodeURIComponent(selectedProduct);
    }
    
    // Scroll to form after a short delay
    setTimeout(() => {
      const formSection = document.getElementById('quote-inquiry-section');
      if (formSection) formSection.scrollIntoView({ behavior: 'smooth' });
    }, 450);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Collect values for validation
    const name = document.getElementById('inquiry-name').value.trim();
    const email = document.getElementById('inquiry-email').value.trim();
    const phone = document.getElementById('inquiry-phone').value.trim();
    const company = document.getElementById('inquiry-company').value.trim();
    const qty = document.getElementById('inquiry-qty').value;

    if (!name || !email || !phone || !qty) {
      alert('Please fill out all required fields marked with *');
      return;
    }

    const timeline = document.getElementById('inquiry-timeline') ? document.getElementById('inquiry-timeline').value : 'flexible';
    const message = document.getElementById('inquiry-message') ? document.getElementById('inquiry-message').value.trim() : '';
    const summaryInput = document.getElementById('inquiry-kit-summary');
    const productInput = document.getElementById('inquiry-product-details');
    const summary = summaryInput ? summaryInput.value : '';
    const productDetails = productInput ? productInput.value : 'General Inquiry';

    const inquiryPayload = {
      name,
      email,
      phone,
      company,
      qty: parseInt(qty),
      timeline,
      productDetails,
      summary,
      message
    };

    try {
      const res = await GiftingAPI.createInquiry(inquiryPayload);
      if (res.success) {
        // Success response
        const formContainer = form.parentElement;
        formContainer.innerHTML = `
          <div style="text-align: center; padding: 3rem 1.5rem; color: var(--primary);">
            <span style="font-size: 4rem; display: block; margin-bottom: 1.5rem;">🎉</span>
            <h3 class="serif-font" style="font-size: 2rem; margin-bottom: 1rem;">Inquiry Submitted Successfully!</h3>
            <p style="color: var(--text-muted); max-width: 500px; margin: 0 auto 2rem auto; font-size: 1.05rem;">
              Thank you, <strong>${name}</strong>. Our corporate gifting design coordinator will contact you at <strong>${email}</strong> or <strong>${phone}</strong> within the next 4 working hours with a bespoke proposal.
            </p>
            <button class="btn btn-gold" onclick="window.location.reload()">Send Another Inquiry</button>
          </div>
        `;
      } else {
        alert("Failed to submit inquiry: " + res.message);
      }
    } catch (err) {
      alert("Inquiry submission error: " + err.message);
    }
  });
}

/* ============================================================
   9. FAQ ACCORDION INTERACTIVITY
   ============================================================ */
function initFaqs() {
  const faqHeaders = document.querySelectorAll('.faq-header');

  faqHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const body = item.querySelector('.faq-body');
      const isActive = item.classList.contains('active');

      // Close all FAQs in this container
      const faqList = item.parentElement;
      faqList.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('active');
        i.querySelector('.faq-body').style.maxHeight = null;
      });

      // Toggle clicked FAQ
      if (!isActive) {
        item.classList.add('active');
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
  });
}

/* ============================================================
   10. INTERACTIVE B2B DEALER DISCOUNT CALCULATOR
   ============================================================ */
function initDealerCalculator() {
  const rangeInput = document.getElementById('dealer-range');
  const numInput = document.getElementById('dealer-num-input');
  const pctDisplay = document.getElementById('discount-pct-display');
  const tierDisplay = document.getElementById('tier-name-display');
  const perkDisplay = document.getElementById('custom-tier-perk');

  if (!rangeInput || !numInput) return;

  function updateCalculator(value) {
    const parsedVal = parseInt(value) || 0;
    
    // Bounds check
    let discount = 0;
    let tier = "Standard Partner";
    let customPerk = "Standard B2B Support";
    
    if (parsedVal >= 5000000) {
      discount = 15;
      tier = "Apex Diamond Tier Partnership";
      customPerk = "Annual Loyalty Bonus + VIP Logistics";
    } else if (parsedVal >= 2500000) {
      discount = 12.5;
      tier = "Platinum Tier Partnership";
      customPerk = "Additional Incentives & Priority Dispatch";
    } else if (parsedVal >= 1000000) {
      discount = 10;
      tier = "Gold Tier Partnership";
      customPerk = "Dedicated B2B Account Manager";
    } else if (parsedVal >= 500000) {
      discount = 7.5;
      tier = "Silver Tier Partnership";
      customPerk = "Marketing Materials & Catalogues";
    } else if (parsedVal >= 200000) {
      discount = 5;
      tier = "Bronze Tier Partnership";
      customPerk = "Priority Ticketing Support";
    } else {
      discount = 0;
      tier = "Standard Registered Partner";
      customPerk = "Pan-India Shipping Assistance";
    }
    
    // Update displays
    pctDisplay.textContent = discount + "%";
    tierDisplay.textContent = tier;
    perkDisplay.textContent = customPerk;
  }

  // Bind slider input
  rangeInput.addEventListener('input', (e) => {
    numInput.value = e.target.value;
    updateCalculator(e.target.value);
  });

  // Bind manual number field
  numInput.addEventListener('input', (e) => {
    let val = parseInt(e.target.value) || 0;
    if (val > 6000000) val = 6000000;
    rangeInput.value = val;
    updateCalculator(val);
  });

  // Run initial state
  updateCalculator(rangeInput.value);
}
