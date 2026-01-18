document.addEventListener('DOMContentLoaded', () => {
  // ========================================
  // HEADER SCROLL EFFECT
  // ========================================
  const header = document.getElementById('site-header');
  let lastScroll = 0;
  
  const handleHeaderScroll = () => {
    const currentScroll = window.scrollY;
    
    if (currentScroll > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
  };
  
  window.addEventListener('scroll', handleHeaderScroll, { passive: true });
  handleHeaderScroll(); // Check initial state

  // ========================================
  // REVEAL ANIMATIONS
  // ========================================
  const revealItems = document.querySelectorAll('[data-animate]');
  
  if (revealItems.length > 0) {
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Add visible class to the container
            entry.target.classList.add('is-visible');
            
            // Find and animate all reveal children with stagger
            const children = entry.target.querySelectorAll('.reveal');
            children.forEach((child, index) => {
              // Set stagger delay
              child.style.transitionDelay = `${index * 0.1}s`;
              
              // Trigger animation after a brief delay to ensure CSS is applied
              requestAnimationFrame(() => {
                child.classList.add('is-visible');
              });
            });
            
            // If the container itself has reveal class
            if (entry.target.classList.contains('reveal')) {
              entry.target.classList.add('is-visible');
            }
            
            // Stop observing after reveal
            obs.unobserve(entry.target);
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  // ========================================
  // HERO VIDEO HANDLING
  // ========================================
  const heroVideo = document.querySelector('.hero-video');
  
  if (heroVideo) {
    // Ensure video plays
    heroVideo.play().catch(() => {
      // Autoplay failed, likely due to browser policy
      // Video will still be visible as a static frame
    });

    // Pause video when not in viewport for performance
    const videoObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            heroVideo.play().catch(() => {});
          } else {
            heroVideo.pause();
          }
        });
      },
      { threshold: 0.25 }
    );

    videoObserver.observe(heroVideo);
  }

  // ========================================
  // SMOOTH SCROLL FOR ANCHOR LINKS
  // ========================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const headerOffset = 100;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // ========================================
  // PRODUCT CARD HOVER EFFECT
  // ========================================
  const productCards = document.querySelectorAll('.product-card');
  
  productCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.zIndex = '10';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.zIndex = '';
    });
  });

  // ========================================
  // SPECS INTERACTION
  // ========================================
  const specCards = Array.from(document.querySelectorAll('[data-spec-card]'));

  if (specCards.length > 0) {
    const updateSpecState = (card, isActive) => {
      card.classList.toggle('is-active', isActive);
      if (card.hasAttribute('aria-pressed')) {
        card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      }
    };

    const clearSpecActive = () => {
      specCards.forEach((card) => updateSpecState(card, false));
    };

    specCards.forEach((card) => {
      if (!card.classList.contains('has-detail')) return;
      card.addEventListener('click', (event) => {
        event.preventDefault();
        const isActive = card.classList.contains('is-active');
        clearSpecActive();
        if (!isActive) {
          updateSpecState(card, true);
        }
      });

      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          card.click();
        }
      });
    });

    const firstSpec = specCards.find((card) => card.classList.contains('has-detail'));
    if (firstSpec) {
      updateSpecState(firstSpec, true);
    }

    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-spec-card]')) {
        clearSpecActive();
      }
    });
  }

  // ========================================
  // TIMELINE INTERACTION
  // ========================================
  const timelineSteps = Array.from(document.querySelectorAll('[data-timeline-step]'));

  if (timelineSteps.length > 0) {
    const updateTimelineState = (step, isActive) => {
      step.classList.toggle('is-active', isActive);
      if (step.hasAttribute('aria-expanded')) {
        step.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      }
    };

    const clearTimelineActive = () => {
      timelineSteps.forEach((step) => updateTimelineState(step, false));
    };

    timelineSteps.forEach((step) => {
      if (!step.classList.contains('has-detail')) return;
      step.addEventListener('click', () => {
        const isActive = step.classList.contains('is-active');
        clearTimelineActive();
        if (!isActive) {
          updateTimelineState(step, true);
        }
      });

      step.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          step.click();
        }
      });
    });

    const firstStep = timelineSteps.find((step) => step.classList.contains('has-detail'));
    if (firstStep) {
      updateTimelineState(firstStep, true);
    }
  }

  // ========================================
  // PRODUCT IMAGE ZOOM
  // ========================================
  const zoomMedia = document.querySelectorAll('[data-zoom-media]');
  
  zoomMedia.forEach((media) => {
    const getActiveImage = () =>
      media.querySelector('[data-gallery-image].is-active') ||
      media.querySelector('img');

    if (!getActiveImage()) return;

    const canHover = window.matchMedia('(hover: hover)').matches;
    
    if (canHover) {
      media.addEventListener('mousemove', (event) => {
        const image = getActiveImage();
        if (!image) return;
        const rect = media.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        image.style.transformOrigin = `${x}% ${y}%`;
        media.classList.add('is-zoomed');
      });

      media.addEventListener('mouseleave', () => {
        media.classList.remove('is-zoomed');
        const image = getActiveImage();
        if (image) {
          image.style.transformOrigin = 'center';
        }
      });
    } else {
      media.addEventListener('click', () => {
        const isActive = media.classList.toggle('is-zoomed');
        if (!isActive) {
          const image = getActiveImage();
          if (image) {
            image.style.transformOrigin = 'center';
          }
        }
      });
    }
  });

  // ========================================
  // PRODUCT GALLERY
  // ========================================
  document.querySelectorAll('[data-product-gallery]').forEach((gallery) => {
    const images = Array.from(gallery.querySelectorAll('[data-gallery-image]'));
    const prevButton = gallery.querySelector('[data-gallery-prev]');
    const nextButton = gallery.querySelector('[data-gallery-next]');
    if (images.length === 0) return;

    let activeIndex = 0;

    const setActiveImage = (index) => {
      images.forEach((image, imageIndex) => {
        image.classList.toggle('is-active', imageIndex === index);
        image.setAttribute('aria-hidden', imageIndex === index ? 'false' : 'true');
        if (imageIndex !== index) {
          image.style.transformOrigin = 'center';
        }
      });
      activeIndex = index;
    };

    const showNext = () => {
      const nextIndex = (activeIndex + 1) % images.length;
      setActiveImage(nextIndex);
    };

    const showPrev = () => {
      const prevIndex = (activeIndex - 1 + images.length) % images.length;
      setActiveImage(prevIndex);
    };

    if (prevButton) {
      prevButton.addEventListener('click', showPrev);
    }
    if (nextButton) {
      nextButton.addEventListener('click', showNext);
    }

    gallery.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        showNext();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showPrev();
      }
    });

    setActiveImage(0);
  });

  // ========================================
  // CART LIVE TOTALS
  // ========================================
  const cartForm = document.querySelector('[data-cart]');

  if (cartForm) {
    const formatter = new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK'
    });
    const subtotalEl = cartForm.querySelector('[data-cart-subtotal]');
    const cartItems = Array.from(cartForm.querySelectorAll('[data-cart-item]'));

    const updateTotals = () => {
      let subtotal = 0;
      cartItems.forEach((item) => {
        const priceCents = Number.parseInt(item.dataset.priceCents || '0', 10);
        const qtyInput = item.querySelector('[data-qty-input]');
        const qty = Math.max(Number.parseInt(qtyInput.value || '0', 10), 0);
        const lineTotal = priceCents * qty;
        subtotal += lineTotal;
        const lineTotalEl = item.querySelector('[data-line-total]');
        if (lineTotalEl) {
          lineTotalEl.textContent = formatter.format(lineTotal / 100);
        }
      });
      if (subtotalEl) {
        subtotalEl.textContent = formatter.format(subtotal / 100);
      }
    };

    cartForm.addEventListener('input', (event) => {
      if (event.target.matches('[data-qty-input]')) {
        updateTotals();
      }
    });

    updateTotals();
  }

  // ========================================
  // SCROLL INDICATOR
  // ========================================
  const scrollIndicator = document.getElementById('scroll-indicator');
  
  if (scrollIndicator) {
    const sections = Array.from(document.querySelectorAll('[data-scroll-section]'));
    const dotsContainer = scrollIndicator.querySelector('.scroll-indicator-dots');
    const track = scrollIndicator.querySelector('.scroll-indicator-track');
    const progressEl = scrollIndicator.querySelector('.scroll-indicator-progress');
    const thumb = scrollIndicator.querySelector('.scroll-indicator-thumb');

    if (!sections.length || !dotsContainer || !track || !progressEl || !thumb) {
      scrollIndicator.style.display = 'none';
    } else {
      const dots = sections.map(() => {
        const dot = document.createElement('span');
        dot.className = 'scroll-dot';
        dotsContainer.appendChild(dot);
        return dot;
      });

      const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

      const positionDots = () => {
        const trackHeight = track.getBoundingClientRect().height;
        const count = dots.length;
        dots.forEach((dot, index) => {
          const ratio = count === 1 ? 0 : index / (count - 1);
          dot.style.top = `${ratio * trackHeight}px`;
        });
      };

      const updateIndicator = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? scrollTop / docHeight : 0;
        const trackHeight = track.getBoundingClientRect().height;
        const progressHeight = clamp(progress, 0, 1) * trackHeight;

        progressEl.style.height = `${progressHeight}px`;
        thumb.style.transform = `translate(-50%, ${progressHeight}px)`;

        const focusLine = scrollTop + window.innerHeight * 0.35;
        let activeIndex = 0;
        sections.forEach((section, index) => {
          if (focusLine >= section.offsetTop) {
            activeIndex = index;
          }
        });

        dots.forEach((dot, index) => {
          dot.classList.toggle('is-active', index === activeIndex);
        });
      };

      positionDots();
      updateIndicator();

      window.addEventListener('scroll', updateIndicator, { passive: true });
      window.addEventListener('resize', () => {
        positionDots();
        updateIndicator();
      });
    }
  }

  // ========================================
  // PRELOAD CRITICAL IMAGES
  // ========================================
  const criticalImages = document.querySelectorAll('.product-media img[loading="lazy"]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          // Trigger load by accessing src
          if (img.dataset.src) {
            img.src = img.dataset.src;
          }
          obs.unobserve(img);
        }
      });
    }, {
      rootMargin: '200px'
    });

    criticalImages.forEach(img => imageObserver.observe(img));
  }
});

// ========================================
// PAGE LOAD ANIMATION
// ========================================
window.addEventListener('load', () => {
  document.body.classList.add('loaded');
  
  // Animate hero content on load
  const heroContent = document.querySelector('.hero-content');
  if (heroContent) {
    heroContent.classList.add('is-visible');
  }
});
