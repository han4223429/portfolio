document.addEventListener("DOMContentLoaded", () => {

    // ── 1. 사이드바 네비 활성화 (스크롤 위치 추적) ──
    const sections = document.querySelectorAll('section[id]');
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                sidebarLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                });
            }
        });
    }, { threshold: 0.35 });

    sections.forEach(sec => sectionObserver.observe(sec));

    // ── 2. 부드러운 스크롤 ──
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
                // 모바일에서 사이드바 닫기
                const sidebar = document.getElementById('sidebar');
                const hamburger = document.getElementById('hamburger');
                if (sidebar && sidebar.classList.contains('mobile-open')) {
                    sidebar.classList.remove('mobile-open');
                    hamburger.classList.remove('open');
                }
            }
        });
    });

    // ── 3. 스크롤 등장 애니메이션 (stagger) ──
    const reveals = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('active');

            // 카운터 애니메이션
            entry.target.querySelectorAll('.counter').forEach(counter => {
                const target = +counter.getAttribute('data-target');
                const duration = 1800;
                const increment = target / (duration / 16);
                let current = 0;
                const tick = () => {
                    current += increment;
                    if (current < target) {
                        counter.textContent = Math.ceil(current) + '+';
                        requestAnimationFrame(tick);
                    } else {
                        counter.textContent = target + '+';
                    }
                };
                tick();
                counter.classList.remove('counter');
            });

            observer.unobserve(entry.target);
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(el => revealObserver.observe(el));

    // 히어로 즉시 등장
    setTimeout(() => {
        document.querySelectorAll('#home .reveal').forEach(el => el.classList.add('active'));
    }, 80);

    // ── 4. 연도 필터 ──
    const filterBtns = document.querySelectorAll('.filter-btn');
    const yearGroups = document.querySelectorAll('.year-group');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');
            yearGroups.forEach(group => {
                const match = filter === 'all' || group.getAttribute('data-year') === filter;
                group.style.display = match ? '' : 'none';
            });
        });
    });

    // ── 5. 모바일 햄버거 ──
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');

    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            sidebar.classList.toggle('mobile-open');
        });
    }

    // ── 6. 한/영 언어 전환 ──
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

        // 릴스 버튼 별도 처리
        const reelsBtn = document.getElementById('reels-toggle-btn');
        const reelsExtra = document.querySelector('.reels-extra');
        if (reelsBtn && reelsExtra) {
            const isOpen = reelsExtra.style.display !== 'none';
            if (!isOpen) {
                reelsBtn.textContent = lang === 'ko' ? '더보기 (+10개)' : 'Show More (+10)';
            } else {
                reelsBtn.textContent = lang === 'ko' ? '접기' : 'Show Less';
            }
        }
    }

    langBtns.forEach(btn => {
        btn.addEventListener('click', () => switchLanguage(btn.getAttribute('data-lang')));
    });

    switchLanguage(currentLang);
});

// ── 릴스 더보기/접기 ──
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
