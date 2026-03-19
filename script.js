// Scroll Reveal Animation (Intersection Observer 적용)
document.addEventListener("DOMContentLoaded", () => {
    // 1. 네비게이션 효과 (스크롤 시 뒷배경 흐림 강화)
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. 부드러운 스크롤
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // 3. 요소 스크롤 시 등장 애니메이션
    const reveals = document.querySelectorAll('.reveal');
    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('active');
            
            const counters = entry.target.querySelectorAll('.counter');
            if (counters.length > 0) {
                counters.forEach(counter => {
                    const target = +counter.getAttribute('data-target');
                    const duration = 2000;
                    const increment = target / (duration / 16);
                    let current = 0;
                    const updateCounter = () => {
                        current += increment;
                        if (current < target) {
                            counter.innerText = Math.ceil(current) + "+";
                            requestAnimationFrame(updateCounter);
                        } else {
                            counter.innerText = target + "+";
                        }
                    };
                    updateCounter();
                    counter.classList.remove('counter');
                });
            }
            observer.unobserve(entry.target);
        });
    }, revealOptions);

    reveals.forEach(reveal => revealOnScroll.observe(reveal));
    
    // 4. 초기 로드 시 히어로 요소 바로 등장
    setTimeout(() => {
        document.querySelectorAll('#home .reveal').forEach(el => el.classList.add('active'));
    }, 100);

    // 5. 대외활동 연도별 필터링
    const filterBtns = document.querySelectorAll('.filter-btn');
    const yearGroups = document.querySelectorAll('.year-group');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            yearGroups.forEach(group => {
                if (filterValue === 'all') {
                    group.classList.remove('hidden');
                } else {
                    if (group.getAttribute('data-year') === filterValue) {
                        group.classList.remove('hidden');
                    } else {
                        group.classList.add('hidden');
                    }
                }
            });
        });
    });

    // 6. 모바일 햄버거 메뉴 토글
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // 네비게이션 링크 클릭 시 모바일 메뉴 닫기
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuBtn.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // 7. 한/영 언어 전환
    const langBtns = document.querySelectorAll('.lang-btn');
    let currentLang = localStorage.getItem('portfolio-lang') || 'ko';

    function switchLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('portfolio-lang', lang);

        // 버튼 활성화 상태 업데이트
        langBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });

        // html lang 속성 업데이트
        document.documentElement.lang = lang;

        // data-ko / data-en 속성이 있는 모든 요소 텍스트 전환
        document.querySelectorAll('[data-ko][data-en]').forEach(el => {
            const text = el.getAttribute(`data-${lang}`);
            if (text) {
                el.innerHTML = text;
            }
        });

        // 릴스 더보기 버튼 특별 처리 (상태에 따라 다름)
        const reelsBtn = document.getElementById('reels-toggle-btn');
        const reelsExtra = document.querySelector('.reels-extra');
        if (reelsBtn && reelsExtra) {
            const isExpanded = reelsExtra.style.display !== 'none';
            if (isExpanded) {
                reelsBtn.textContent = lang === 'ko' ? '접기' : 'Show Less';
            }
            // 접혀있을 때는 data-ko/data-en이 처리됨
        }
    }

    // 언어 버튼 클릭 이벤트
    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchLanguage(btn.getAttribute('data-lang'));
        });
    });

    // 페이지 로드 시 저장된 언어 적용
    switchLanguage(currentLang);
});

// 릴스 더보기/접기 토글
function toggleReels() {
    const extra = document.querySelector('.reels-extra');
    const btn = document.getElementById('reels-toggle-btn');
    const currentLang = localStorage.getItem('portfolio-lang') || 'ko';
    
    if (extra.style.display === 'none') {
        extra.style.display = 'grid';
        btn.textContent = currentLang === 'ko' ? '접기' : 'Show Less';
    } else {
        extra.style.display = 'none';
        btn.textContent = currentLang === 'ko' ? '더보기 (+10개)' : 'Show More (+10)';
        document.getElementById('reels').scrollIntoView({ behavior: 'smooth' });
    }
}
