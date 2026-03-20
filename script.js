document.addEventListener("DOMContentLoaded", () => {

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
                // close mobile menu
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

            entry.target.querySelectorAll('.counter').forEach(counter => {
                const target = +counter.getAttribute('data-target');
                const dur = 1600;
                const inc = target / (dur / 16);
                let cur = 0;
                const tick = () => {
                    cur += inc;
                    if (cur < target) {
                        counter.textContent = Math.ceil(cur) + '+';
                        requestAnimationFrame(tick);
                    } else {
                        counter.textContent = target + '+';
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
        document.querySelectorAll('#home .reveal').forEach(el => el.classList.add('active'));
    }, 60);

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
    let currentLang = localStorage.getItem('portfolio-lang') || 'ko';

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

        // Reels button
        const reelsBtn = document.getElementById('reels-toggle-btn');
        const reelsExtra = document.querySelector('.reels-extra');
        if (reelsBtn && reelsExtra) {
            const isOpen = reelsExtra.style.display !== 'none';
            reelsBtn.textContent = isOpen
                ? (lang === 'ko' ? '접기' : 'Show Less')
                : (lang === 'ko' ? '더보기 (+10개)' : 'Show More (+10)');
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
