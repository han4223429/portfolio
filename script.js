document.addEventListener("DOMContentLoaded", () => {
    let currentLang = localStorage.getItem('portfolio-lang') || 'ko';
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Navbar Scroll Effect + Progress Bar + Back-to-Top ──
    const topNav = document.getElementById('topNav');
    const scrollProgress = document.getElementById('scrollProgress');
    const backToTop = document.getElementById('backToTop');
    const themeMeta = document.querySelector('meta[name="theme-color"]');

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
    const themeToggleBtns = document.querySelectorAll('[data-theme-toggle]');
    let currentTheme = localStorage.getItem('portfolio-theme') || 'light';
    
    function applyTheme(theme) {
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('portfolio-theme', theme);
        if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#08080E' : '#F5F5F8');
        themeToggleBtns.forEach(btn => {
            const isDark = theme === 'dark';
            btn.textContent = isDark ? '☀️' : '🌙';
            btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
            btn.setAttribute('aria-label', isDark
                ? (currentLang === 'ko' ? '라이트 모드로 전환' : 'Switch to light mode')
                : (currentLang === 'ko' ? '다크 모드로 전환' : 'Switch to dark mode'));
        });
    }
    
    themeToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
        });
    });
    applyTheme(currentTheme);

    // ── Typewriter effect ──
    const typewriterEl = document.getElementById('typewriter');
    let typeTimeout;
    let startTimeout;
    
    function typeText(text) {
        if (!typewriterEl) return;
        clearTimeout(typeTimeout);
        clearTimeout(startTimeout);
        if (prefersReducedMotion) {
            typewriterEl.textContent = text;
            return;
        }
        typewriterEl.textContent = '';
        let i = 0;
        
        function typeChar() {
            if (i < text.length) {
                typewriterEl.textContent += text.charAt(i);
                i++;
                typeTimeout = setTimeout(typeChar, 50);
            }
        }
        startTimeout = setTimeout(typeChar, 300);
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
    const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a[href^="#"]');
    const navTargets = Array.from(navLinks)
        .map(link => link.getAttribute('href'))
        .filter((href, index, list) => href && href.startsWith('#') && href.length > 1 && list.indexOf(href) === index)
        .map(href => document.getElementById(href.slice(1)))
        .filter(Boolean);

    function setActiveNav() {
        const marker = window.scrollY + Math.min(window.innerHeight * 0.45, 420);
        let activeId = '';

        navTargets.forEach(section => {
            if (section.offsetTop <= marker) activeId = section.id;
        });

        navLinks.forEach(link => {
            const isActive = link.getAttribute('href') === `#${activeId}`;
            link.classList.toggle('active', isActive);
            if (isActive) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
        });
    }

    let navFrame = null;
    function scheduleActiveNav() {
        if (navFrame) return;
        navFrame = requestAnimationFrame(() => {
            navFrame = null;
            setActiveNav();
        });
    }

    window.addEventListener('scroll', scheduleActiveNav, { passive: true });
    window.addEventListener('resize', scheduleActiveNav);
    setActiveNav();

    // ── 2. Smooth scroll ──
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
                closeMobileMenu();
            }
        });
    });

    // ── 3. Reveal animations (IntersectionObserver + robust scroll/timer fallback) ──
    // Some renderers throttle IO/rAF callbacks when the page isn't actively focused,
    // which would leave content stuck at opacity:0. The scroll/timer fallback guarantees
    // reveals fire from real scroll position regardless.
    const reveals = document.querySelectorAll('.reveal');

    function runCounters(el) {
        el.querySelectorAll('.counter').forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const inc = target / (1800 / 16);
            let cur = 0;
            const tick = () => {
                cur += inc;
                if (cur < target) { counter.textContent = Math.ceil(cur); setTimeout(tick, 16); }
                else { counter.textContent = target; }
            };
            tick();
            counter.classList.remove('counter');
        });
    }
    function activate(el) {
        if (el.classList.contains('active')) return;
        el.classList.add('active');
        runCounters(el);
    }

    const revealObs = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            activate(entry.target);
            obs.unobserve(entry.target);
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    reveals.forEach(el => revealObs.observe(el));

    // Fallback: reveal anything in view on scroll/resize and via initial timed passes.
    function revealInView() {
        const vh = window.innerHeight;
        reveals.forEach(el => {
            if (el.classList.contains('active')) return;
            const r = el.getBoundingClientRect();
            if (r.top < vh - 20 && r.bottom > 0) activate(el);
        });
    }
    window.addEventListener('scroll', revealInView, { passive: true });
    window.addEventListener('resize', revealInView, { passive: true });
    revealInView();
    setTimeout(revealInView, 400);
    setTimeout(revealInView, 1200);

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
                    typeText(currentLang === 'ko' ? '김한용' : 'KIM HAN YONG');
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
            filterBtns.forEach(b => {
                const on = b === btn;
                b.classList.toggle('active', on);
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
            const f = btn.getAttribute('data-filter');
            yearGroups.forEach(g => {
                g.style.display = (f === 'all' || g.getAttribute('data-year') === f) ? '' : 'none';
            });
        });
    });

    // ── 5. Mobile hamburger ──
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    function setMobileMenu(open) {
        if (!hamburger || !mobileMenu) return;
        hamburger.classList.toggle('open', open);
        hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
        hamburger.setAttribute('aria-label', open
            ? (currentLang === 'ko' ? '메뉴 닫기' : 'Close menu')
            : (currentLang === 'ko' ? '메뉴 열기' : 'Open menu'));
        mobileMenu.classList.toggle('open', open);
        mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
        document.body.classList.toggle('menu-open', open);
    }
    function closeMobileMenu() {
        setMobileMenu(false);
    }
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            setMobileMenu(!mobileMenu.classList.contains('open'));
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMobileMenu();
        });
        document.addEventListener('click', (e) => {
            if (!mobileMenu.classList.contains('open')) return;
            if (mobileMenu.contains(e.target) || hamburger.contains(e.target)) return;
            closeMobileMenu();
        });
    }

    // ── 5.2 Copy email + toast ──
    const copyEmailBtn = document.getElementById('copyEmail');
    const toast = document.getElementById('toast');
    let toastTimer;

    function showToast(ko, en) {
        if (!toast) return;
        clearTimeout(toastTimer);
        toast.textContent = currentLang === 'ko' ? ko : en;
        toast.classList.add('show');
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
    }

    async function copyText(text) {
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return;
            } catch (e) {
                /* fall through to the execCommand path below */
            }
        }
        const temp = document.createElement('textarea');
        temp.value = text;
        temp.setAttribute('readonly', '');
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
    }

    if (copyEmailBtn) {
        copyEmailBtn.addEventListener('click', async () => {
            const email = copyEmailBtn.dataset.email;
            try {
                await copyText(email);
                showToast('이메일을 복사했어요.', 'Email copied.');
            } catch (err) {
                showToast('복사에 실패했어요. 이메일을 직접 선택해 주세요.', 'Copy failed. Select the email manually.');
            }
        });
    }

    // ── 5.5 Content gallery: type filter + date sort + lazy Instagram embeds ──
    const contentFeed = document.getElementById('contentFeed');
    if (contentFeed) {
        const items = Array.from(contentFeed.querySelectorAll('.content-item'));
        const tabs = document.querySelectorAll('#contentTabs .ctab');
        const sortBtn = document.getElementById('contentSort');
        const emptyEl = document.getElementById('contentEmpty');

        // Lazy-load Instagram embeds as they near the viewport.
        // Position-based (not IntersectionObserver) so it works reliably everywhere,
        // including headless/preview renderers where IO's initial callback can be flaky.
        const embeds = items.map(it => it.querySelector('.ci-embed'));

        function showEmbedFallback(skeleton) {
            if (!skeleton) return;
            skeleton.removeAttribute('aria-hidden');
            skeleton.style.opacity = '1';
            skeleton.style.pointerEvents = 'auto';
            skeleton.classList.add('fallback');
        }

        function loadEmbed(holder) {
            if (!holder || holder.dataset.loaded) return;
            holder.dataset.loaded = '1';
            const card = holder.closest('.content-item');
            const typeEl = card && card.querySelector('.ci-type');
            const dateEl = card && card.querySelector('.ci-date');
            const skeleton = holder.querySelector('.ci-skeleton');
            let loaded = false;

            if (skeleton && holder.dataset.href && !skeleton.querySelector('.embed-fallback')) {
                const fallback = document.createElement('a');
                fallback.className = 'embed-fallback';
                fallback.href = holder.dataset.href;
                fallback.target = '_blank';
                fallback.rel = 'noopener noreferrer';
                fallback.setAttribute('data-ko', 'Instagram에서 보기');
                fallback.setAttribute('data-en', 'Open on Instagram');
                fallback.textContent = currentLang === 'ko' ? 'Instagram에서 보기' : 'Open on Instagram';
                skeleton.appendChild(fallback);
            }

            const iframe = document.createElement('iframe');
            iframe.src = holder.dataset.src;
            iframe.loading = 'lazy';
            iframe.referrerPolicy = 'no-referrer';
            // Descriptive, unique title per embed (e.g. "Instagram 릴스 · 2025.12.31")
            iframe.title = 'Instagram'
                + (typeEl ? ' ' + typeEl.textContent.trim() : '')
                + (dateEl ? ' · ' + dateEl.textContent.trim() : '');
            iframe.setAttribute('scrolling', 'no');
            iframe.setAttribute('allowtransparency', 'true');
            iframe.addEventListener('load', () => {
                loaded = true;
                const sk = holder.querySelector('.ci-skeleton');
                if (sk) {
                    sk.style.transition = 'opacity .4s';
                    sk.style.opacity = '0';
                    sk.style.pointerEvents = 'none';
                    setTimeout(() => { sk.hidden = true; }, 450);
                }
            });
            iframe.addEventListener('error', () => showEmbedFallback(skeleton));
            holder.appendChild(iframe);
            setTimeout(() => {
                if (!loaded) showEmbedFallback(skeleton);
            }, 5000);
        }

        let queued = false;
        function loadVisibleEmbeds() {
            queued = false;
            const vh = window.innerHeight, margin = 800;
            embeds.forEach(em => {
                if (!em || em.dataset.loaded) return;
                if (em.offsetParent === null) return;        // filtered-out (display:none)
                const r = em.getBoundingClientRect();
                if (r.top < vh + margin && r.bottom > -margin) loadEmbed(em);
            });
        }
        function scheduleEmbedLoad() {
            if (queued) return;
            queued = true;
            setTimeout(loadVisibleEmbeds, 120); // setTimeout (not rAF) so it fires even when throttled
        }
        window.addEventListener('scroll', scheduleEmbedLoad, { passive: true });
        window.addEventListener('resize', scheduleEmbedLoad, { passive: true });
        // Initial passes (cover async layout / late reveal of the section).
        loadVisibleEmbeds();
        setTimeout(loadVisibleEmbeds, 300);
        setTimeout(loadVisibleEmbeds, 1200);

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
                scheduleEmbedLoad(); // load any newly-revealed items
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
                scheduleEmbedLoad(); // reordered → refresh what's in view
            });
        }
    }

    // ── 6. Language toggle ──
    const langBtns = document.querySelectorAll('.lang-btn');

    function setLocalizedContent(el, value) {
        el.replaceChildren();
        value.split(/<br\s*\/?>/i).forEach((part, index) => {
            if (index > 0) el.appendChild(document.createElement('br'));
            el.appendChild(document.createTextNode(part));
        });
    }

    function switchLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('portfolio-lang', lang);
        document.documentElement.lang = lang;

        langBtns.forEach(btn => {
            const isActive = btn.getAttribute('data-lang') === lang;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        document.querySelectorAll('[data-ko][data-en]').forEach(el => {
            const text = el.getAttribute(`data-${lang}`);
            if (text) setLocalizedContent(el, text);
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
            typeText(lang === 'ko' ? '김한용' : 'KIM HAN YONG');
        }

        applyTheme(currentTheme);
        if (hamburger && mobileMenu) {
            setMobileMenu(mobileMenu.classList.contains('open'));
        }
    }

    langBtns.forEach(btn => {
        btn.addEventListener('click', () => switchLanguage(btn.getAttribute('data-lang')));
    });

    switchLanguage(currentLang);
});
