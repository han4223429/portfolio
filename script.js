document.addEventListener("DOMContentLoaded", () => {
    let currentLang = localStorage.getItem('portfolio-lang') || 'ko';

    // ── Navbar Scroll Effect + Progress Bar + Back-to-Top ──
    const topNav = document.getElementById('topNav');
    const scrollProgress = document.getElementById('scrollProgress');
    const backToTop = document.getElementById('backToTop');

    const onScroll = () => {
        const y = window.scrollY;

        if (topNav) topNav.classList.toggle('scrolled', y > 40);

        if (scrollProgress) {
            const docH = document.documentElement.scrollHeight - window.innerHeight;
            const pct = docH > 0 ? (y / docH) * 100 : 0;
            scrollProgress.style.width = pct + '%';
        }

        if (backToTop) backToTop.classList.toggle('show', y > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ── Theme toggle ──
    const themeToggleBtn = document.getElementById('themeToggle');
    let currentTheme = localStorage.getItem('portfolio-theme') || 'light';
    
    function applyTheme(theme) {
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('portfolio-theme', theme);
        if(themeToggleBtn) {
            themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }
    
    if(themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
        });
    }
    applyTheme(currentTheme);

    // ── Typewriter effect ──
    const typewriterEl = document.getElementById('typewriter');
    let typeTimeout;
    let startTimeout;
    
    function typeText(text) {
        if (!typewriterEl) return;
        clearTimeout(typeTimeout);
        clearTimeout(startTimeout);
        typewriterEl.textContent = '';
        let i = 0;
        
        function typeChar() {
            if (i < text.length) {
                typewriterEl.textContent += text.charAt(i);
                i++;
                typeTimeout = setTimeout(typeChar, 50);
            }
        }
        startTimeout = setTimeout(typeChar, 2000);
    }

    // ── 0. Cursor Spotlight ──
    const spotlight = document.getElementById('cursorSpotlight');
    if (spotlight) {
        let ticking = false;
        document.addEventListener('mousemove', (e) => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    spotlight.style.left = e.clientX + 'px';
                    spotlight.style.top = e.clientY + 'px';
                    if (!spotlight.classList.contains('active')) {
                        spotlight.classList.add('active');
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });
        document.addEventListener('mouseleave', () => {
            spotlight.classList.remove('active');
        });

        // Card hover glow tracking
        document.querySelectorAll('.exp-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width * 100) + '%';
                const y = ((e.clientY - rect.top) / rect.height * 100) + '%';
                card.style.setProperty('--mouse-x', x);
                card.style.setProperty('--mouse-y', y);
            });
        });
    }

    // ── 1. Nav active tracking ──
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a[href^="#"]');

    const sectionObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                });
            }
        });
    }, { threshold: 0.3 });

    sections.forEach(sec => sectionObs.observe(sec));

    // ── 2. Smooth scroll ──
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
                document.getElementById('mobileMenu')?.classList.remove('open');
                document.getElementById('hamburger')?.classList.remove('open');
            }
        });
    });

    // ── 3. Reveal animations ──
    const reveals = document.querySelectorAll('.reveal');
    const revealObs = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('active');

            // Counter animation
            entry.target.querySelectorAll('.counter').forEach(counter => {
                const target = +counter.getAttribute('data-target');
                const dur = 1800;
                const inc = target / (dur / 16);
                let cur = 0;
                const tick = () => {
                    cur += inc;
                    if (cur < target) {
                        counter.textContent = Math.ceil(cur);
                        requestAnimationFrame(tick);
                    } else {
                        counter.textContent = target;
                    }
                };
                tick();
                counter.classList.remove('counter');
            });

            obs.unobserve(entry.target);
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    reveals.forEach(el => revealObs.observe(el));

    // Hero instant reveal
    setTimeout(() => {
        document.querySelectorAll('#home .reveal, .hero-section .reveal').forEach(el => el.classList.add('active'));
    }, 100);

    // ── 3.5 Typewriter Re-trigger on scroll ──
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const typeObs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Re-trigger typing effect when hero is visible
                    typeText(currentLang === 'ko' ? '김한용.' : 'KIM HAN YONG.');
                }
            });
        }, { threshold: 0.1 });
        typeObs.observe(heroTitle);
    }

    // ── 4. Year filter ──
    const filterBtns = document.querySelectorAll('.filter-btn');
    const yearGroups = document.querySelectorAll('.year-group');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const f = btn.getAttribute('data-filter');
            yearGroups.forEach(g => {
                g.style.display = (f === 'all' || g.getAttribute('data-year') === f) ? '' : 'none';
            });
        });
    });

    // ── 5. Mobile hamburger ──
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            mobileMenu.classList.toggle('open');
        });
    }

    // ── 5.5 Content gallery: type filter + date sort + lazy Instagram embeds ──
    const contentFeed = document.getElementById('contentFeed');
    if (contentFeed) {
        const items = Array.from(contentFeed.querySelectorAll('.content-item'));
        const tabs = document.querySelectorAll('#contentTabs .ctab');
        const sortBtn = document.getElementById('contentSort');
        const emptyEl = document.getElementById('contentEmpty');

        // Lazy-load each Instagram embed only as it nears the viewport (29 iframes otherwise).
        const embedObs = new IntersectionObserver((entries, obs) => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                const holder = e.target;
                if (!holder.dataset.loaded) {
                    holder.dataset.loaded = '1';
                    const card = holder.closest('.content-item');
                    const typeEl = card && card.querySelector('.ci-type');
                    const dateEl = card && card.querySelector('.ci-date');
                    const iframe = document.createElement('iframe');
                    iframe.src = holder.dataset.src;
                    iframe.loading = 'lazy';
                    // Descriptive, unique title per embed (e.g. "Instagram 릴스 · 2025.12.31")
                    iframe.title = 'Instagram'
                        + (typeEl ? ' ' + typeEl.textContent.trim() : '')
                        + (dateEl ? ' · ' + dateEl.textContent.trim() : '');
                    iframe.setAttribute('scrolling', 'no');
                    iframe.setAttribute('allowtransparency', 'true');
                    iframe.addEventListener('load', () => {
                        const sk = holder.querySelector('.ci-skeleton');
                        if (sk) { sk.style.transition = 'opacity .4s'; sk.style.opacity = '0'; }
                    });
                    holder.appendChild(iframe);
                }
                obs.unobserve(holder);
            });
        }, { rootMargin: '600px 0px' });
        items.forEach(it => embedObs.observe(it.querySelector('.ci-embed')));

        // Filter by type
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => {
                    const on = t === tab;
                    t.classList.toggle('active', on);
                    t.setAttribute('aria-pressed', on ? 'true' : 'false');
                });
                const f = tab.getAttribute('data-ctab');
                let shown = 0;
                items.forEach(it => {
                    const match = (f === 'all' || it.dataset.type === f);
                    it.classList.toggle('hide', !match);
                    if (match) shown++;
                });
                if (emptyEl) emptyEl.hidden = shown !== 0;
            });
        });

        // Sort by date (newest ⇄ oldest)
        if (sortBtn) {
            sortBtn.addEventListener('click', () => {
                const asc = sortBtn.dataset.order !== 'asc';
                sortBtn.dataset.order = asc ? 'asc' : 'desc';
                items.slice()
                    .sort((a, b) => asc
                        ? (+a.dataset.ts) - (+b.dataset.ts)
                        : (+b.dataset.ts) - (+a.dataset.ts))
                    .forEach(it => contentFeed.appendChild(it));
                const label = sortBtn.querySelector('.sort-label');
                if (label) {
                    label.setAttribute('data-ko', asc ? '오래된순 정렬' : '최신순 정렬');
                    label.setAttribute('data-en', asc ? 'Sort: Oldest first' : 'Sort: Newest first');
                    label.textContent = asc
                        ? (currentLang === 'ko' ? '오래된순 정렬' : 'Sort: Oldest first')
                        : (currentLang === 'ko' ? '최신순 정렬' : 'Sort: Newest first');
                }
            });
        }
    }

    // ── 6. Language toggle ──
    const langBtns = document.querySelectorAll('.lang-btn');

    function switchLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('portfolio-lang', lang);
        document.documentElement.lang = lang;

        langBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });

        document.querySelectorAll('[data-ko][data-en]').forEach(el => {
            const text = el.getAttribute(`data-${lang}`);
            if (text) el.innerHTML = text;
        });

        // Placeholders
        document.querySelectorAll('[data-placeholder-ko][data-placeholder-en]').forEach(el => {
            const ph = el.getAttribute(`data-placeholder-${lang}`);
            if (ph) el.placeholder = ph;
        });

        // Localized aria-labels (e.g. the per-item "open on Instagram" links)
        document.querySelectorAll('[data-arialabel-ko][data-arialabel-en]').forEach(el => {
            const al = el.getAttribute(`data-arialabel-${lang}`);
            if (al) el.setAttribute('aria-label', al);
        });

        if (typewriterEl) {
            typeText(lang === 'ko' ? '김한용.' : 'KIM HAN YONG.');
        }
    }

    langBtns.forEach(btn => {
        btn.addEventListener('click', () => switchLanguage(btn.getAttribute('data-lang')));
    });

    switchLanguage(currentLang);
});
