document.addEventListener("DOMContentLoaded", () => {
    let currentLang = localStorage.getItem('portfolio-lang') || 'ko';

    // ── Navbar Scroll Effect ──
    const topNav = document.getElementById('topNav');
    if (topNav) {
        const toggleNav = () => {
            if (window.scrollY > 40) {
                topNav.classList.add('scrolled');
            } else {
                topNav.classList.remove('scrolled');
            }
        };
        window.addEventListener('scroll', toggleNav, { passive: true });
        toggleNav();
    }

    // ── Theme toggle ──
    const themeToggleBtn = document.getElementById('themeToggle');
    let currentTheme = localStorage.getItem('portfolio-theme') || 'dark';
    
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

        // Reels button
        const reelsBtn = document.getElementById('reels-toggle-btn');
        const reelsExtra = document.querySelector('.reels-extra');
        if (reelsBtn && reelsExtra) {
            const isOpen = reelsExtra.style.display !== 'none';
            reelsBtn.textContent = isOpen
                ? (lang === 'ko' ? '접기' : 'Show Less')
                : (lang === 'ko' ? '더보기 (+10개)' : 'Show More (+10)');
        }

        if (typewriterEl) {
            typeText(lang === 'ko' ? '김한용.' : 'KIM HAN YONG.');
        }
    }

    langBtns.forEach(btn => {
        btn.addEventListener('click', () => switchLanguage(btn.getAttribute('data-lang')));
    });

    switchLanguage(currentLang);
});

// ── Reels toggle ──
function toggleReels() {
    const extra = document.querySelector('.reels-extra');
    const btn = document.getElementById('reels-toggle-btn');
    const lang = localStorage.getItem('portfolio-lang') || 'ko';

    if (extra.style.display === 'none') {
        extra.style.display = 'grid';
        btn.textContent = lang === 'ko' ? '접기' : 'Show Less';
    } else {
        extra.style.display = 'none';
        btn.textContent = lang === 'ko' ? '더보기 (+10개)' : 'Show More (+10)';
        document.getElementById('reels').scrollIntoView({ behavior: 'smooth' });
    }
}
