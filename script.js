// Scroll Reveal Animation (Intersection Observer 적용)
document.addEventListener("DOMContentLoaded", () => {
    // 1. 네비게이션 효과 (스크롤 시 뒷배경 흐림 강화)
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(10, 15, 24, 0.85)';
            navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.5)';
        } else {
            navbar.style.background = 'rgba(10, 15, 24, 0.7)';
            navbar.style.boxShadow = 'none';
        }
    });

    // 2. 부드러운 스크롤 (Smooth Scroll for Anchors)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // 3. 요소 스크롤 시 등장 애니메이션 (Intersection Observer)
    const reveals = document.querySelectorAll('.reveal');

    const revealOptions = {
        threshold: 0.15, // 요소가 15% 보일 때 실행
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver(function(
        entries,
        observer
    ) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('active');
                
                // 숫자 카운팅 애니메이션 실행 로직
                const counters = entry.target.querySelectorAll('.counter');
                if (counters.length > 0) {
                    counters.forEach(counter => {
                        const target = +counter.getAttribute('data-target');
                        const duration = 2000; // 2초
                        const increment = target / (duration / 16); // 60fps 기준
                        
                        let current = 0;
                        const updateCounter = () => {
                            current += increment;
                            if(current < target) {
                                counter.innerText = Math.ceil(current) + (target > 5 ? "+" : "");
                                requestAnimationFrame(updateCounter);
                            } else {
                                counter.innerText = target + "+";
                            }
                        };
                        updateCounter();
                        // 실행 완료 후 클래스 제거하여 중복 실행 방지
                        counter.classList.remove('counter');
                    });
                }
                // 한 번 나타난 요소는 다시 감시하지 않음
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    reveals.forEach(reveal => {
        revealOnScroll.observe(reveal);
    });
    
    // 4. 초기 로드 시 최상단 요소들 바로 등장
    setTimeout(() => {
        const initialReveals = document.querySelectorAll('#home .reveal');
        initialReveals.forEach(el => el.classList.add('active'));
    }, 100);

    // 5. 타임라인(Experience) 지그재그 레이아웃 동적 할당
    const refreshTimelineLayout = () => {
        const visibleCards = document.querySelectorAll('.timeline-item:not(.year-label):not(.hidden)');
        visibleCards.forEach((card, index) => {
            card.classList.remove('left', 'right');
            if (index % 2 === 0) {
                card.classList.add('left');
            } else {
                card.classList.add('right');
            }
        });
    };

    // 6. 타임라인(Experience) 연도별 필터링 기능
    const filterBtns = document.querySelectorAll('.filter-btn');
    const timelineItems = document.querySelectorAll('.timeline-item');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 버튼 활성화 상태 변경
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');
            let currentYearSection = '';

            timelineItems.forEach(item => {
                // 연도 타이틀(라벨)인지 실제 항목인지 구분
                const isYearLabel = item.classList.contains('year-label');
                
                if (isYearLabel) {
                    currentYearSection = item.querySelector('h3').textContent.trim();
                }

                if (filterValue === 'all') {
                    item.classList.remove('hidden');
                } else {
                    // 필터에 해당하는 연도 라벨이거나, 해당 연도 섹션 안에 속한 항목만 보이기
                    if (currentYearSection === filterValue) {
                        item.classList.remove('hidden');
                    } else {
                        item.classList.add('hidden');
                    }
                }
            });
            
            // 필터 적용 후 지그재그 재배치
            refreshTimelineLayout();
        });
    });

    // 초기 레이아웃 설정
    refreshTimelineLayout();
});
