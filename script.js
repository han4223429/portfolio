document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const root = document.documentElement;
    const stored = (key, values, fallback) => {
        try {
            const value = localStorage.getItem(key);
            return values.includes(value) ? value : fallback;
        } catch (_) { return fallback; }
    };
    const remember = (key, value) => {
        try { localStorage.setItem(key, value); } catch (_) { /* Preferences are optional. */ }
    };
    let currentLang = stored('portfolio-lang', ['ko', 'en'], 'ko');
    let currentTheme = stored('portfolio-theme', ['light', 'dark'], 'light');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionQuery.matches;
    const scrollBehavior = () => reducedMotion ? 'instant' : 'smooth';
    const localText = (ko, en) => currentLang === 'ko' ? ko : en;

    function setLocalizedContent(element, value) {
        element.replaceChildren();
        value.split(/<br\s*\/?>/i).forEach((part, index) => {
            if (index) element.appendChild(document.createElement('br'));
            element.appendChild(document.createTextNode(part));
        });
    }

    const toast = document.getElementById('toast');
    let toastTimer;
    function showToast(ko, en) {
        if (!toast) return;
        clearTimeout(toastTimer);
        toast.dataset.ko = ko;
        toast.dataset.en = en;
        toast.textContent = localText(ko, en);
        toast.classList.add('show');
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
    }

    // Sound always starts off and is created only after an explicit user action.
    const soundButtons = [...document.querySelectorAll('[data-sound-toggle]')];
    let soundEnabled = false;
    let audioContext = null;
    let lastSoundAt = -Infinity;
    let soundRequest = 0;
    function updateSoundControls() {
        soundButtons.forEach(button => {
            button.setAttribute('aria-pressed', String(soundEnabled));
            button.setAttribute('aria-label', soundEnabled
                ? localText('상호작용 소리 끄기', 'Turn interaction sound off')
                : localText('상호작용 소리 켜기', 'Turn interaction sound on'));
            const label = button.querySelector('[data-sound-label]');
            if (label) label.textContent = soundEnabled ? 'SOUND ON' : 'SOUND OFF';
        });
    }
    function playSound(kind = 'click') {
        if (!soundEnabled || !audioContext || audioContext.state !== 'running' || document.hidden) return;
        const now = performance.now();
        if (now - lastSoundAt < (kind === 'section' ? 450 : 75)) return;
        lastSoundAt = now;
        try {
            const oscillator = audioContext.createOscillator();
            const envelope = audioContext.createGain();
            const start = audioContext.currentTime;
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(kind === 'section' ? 420 : 720, start);
            oscillator.frequency.exponentialRampToValueAtTime(kind === 'section' ? 300 : 460, start + 0.045);
            envelope.gain.setValueAtTime(0, start);
            envelope.gain.linearRampToValueAtTime(kind === 'section' ? 0.012 : 0.025, start + 0.004);
            envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.055);
            oscillator.connect(envelope);
            envelope.connect(audioContext.destination);
            oscillator.start(start);
            oscillator.stop(start + 0.06);
            oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
        } catch (_) { /* A sound failure must never interrupt navigation. */ }
    }
    soundButtons.forEach(button => button.addEventListener('click', async () => {
        const request = ++soundRequest;
        soundEnabled = !soundEnabled;
        updateSoundControls();
        if (!soundEnabled) return;
        try {
            const AudioEngine = window.AudioContext || window.webkitAudioContext;
            if (!AudioEngine) throw new Error('Audio unavailable');
            if (!audioContext) audioContext = new AudioEngine();
            if (audioContext.state !== 'running') await audioContext.resume();
            if (request !== soundRequest || !soundEnabled) return;
            if (audioContext.state !== 'running') throw new Error('Audio unavailable');
            playSound();
        } catch (_) {
            if (request !== soundRequest) return;
            soundEnabled = false;
            updateSoundControls();
            showToast('이 브라우저에서는 소리를 켤 수 없어요.', 'Sound is unavailable in this browser.');
        }
    }));
    document.addEventListener('click', event => {
        if (event.target.closest('[data-sound-toggle]')) return;
        if (event.target.closest('button, a[href], [data-dmodal-card]')) playSound();
    });

    const themeButtons = [...document.querySelectorAll('[data-theme-toggle]')];
    function applyTheme(theme) {
        currentTheme = theme === 'dark' ? 'dark' : 'light';
        root.dataset.theme = currentTheme;
        remember('portfolio-theme', currentTheme);
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content',
            currentTheme === 'dark' ? '#191a18' : '#f4f3ee');
        themeButtons.forEach(button => {
            const dark = currentTheme === 'dark';
            button.textContent = dark ? 'LIGHT' : 'DARK';
            button.setAttribute('aria-pressed', String(dark));
            button.setAttribute('aria-label', dark
                ? localText('라이트 모드로 전환', 'Switch to light mode')
                : localText('다크 모드로 전환', 'Switch to dark mode'));
        });
    }
    themeButtons.forEach(button => button.addEventListener('click', () => {
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }));

    // Inert keeps closed menus and the page behind an open overlay out of keyboard navigation.
    function isolateBackground(allowed) {
        const states = new Map();
        [...document.body.children].forEach(element => {
            if (allowed.some(item => item && (element === item || element.contains(item)))) return;
            if (element.matches('script, style')) return;
            states.set(element, element.inert);
            element.inert = true;
        });
        return states;
    }
    function restoreBackground(states) {
        states.forEach((inert, element) => { element.inert = inert; });
        states.clear();
    }
    const focusSelector = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    function focusables(container) {
        return [...container.querySelectorAll(focusSelector)].filter(element =>
            !element.disabled && !element.closest('[hidden], [inert]') && element.getClientRects().length);
    }
    function trapTab(event, items) {
        if (event.key !== 'Tab' || !items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement))) {
            event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !items.includes(document.activeElement))) {
            event.preventDefault(); first.focus();
        }
    }

    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    let menuInertState = new Map();
    function setMobileMenu(open, focusFirst = false) {
        if (!hamburger || !mobileMenu) return;
        if (!open && mobileMenu.contains(document.activeElement)) hamburger.focus({ preventScroll: true });
        hamburger.classList.toggle('open', open);
        hamburger.textContent = open ? 'CLOSE' : 'MENU';
        hamburger.setAttribute('aria-expanded', String(open));
        hamburger.setAttribute('aria-label', open
            ? localText('메뉴 닫기', 'Close menu') : localText('메뉴 열기', 'Open menu'));
        mobileMenu.classList.toggle('open', open);
        mobileMenu.setAttribute('aria-hidden', String(!open));
        mobileMenu.inert = !open;
        document.body.classList.toggle('menu-open', open);
        if (open && !menuInertState.size) menuInertState = isolateBackground([mobileMenu, hamburger, toast]);
        if (!open) restoreBackground(menuInertState);
        if (open && focusFirst) focusables(mobileMenu)[0]?.focus();
    }
    hamburger?.addEventListener('click', () => setMobileMenu(!mobileMenu.classList.contains('open'), true));
    mobileMenu?.addEventListener('keydown', event => trapTab(event, [hamburger, ...focusables(mobileMenu)].filter(Boolean)));
    hamburger?.addEventListener('keydown', event => {
        if (mobileMenu?.classList.contains('open')) trapTab(event, [hamburger, ...focusables(mobileMenu)]);
    });
    document.addEventListener('click', event => {
        if (mobileMenu?.classList.contains('open') && !mobileMenu.contains(event.target) && !hamburger?.contains(event.target)) {
            setMobileMenu(false);
        }
    });

    // The project lens connects planning, making and sharing without changing pages.
    const lensButtons = [...document.querySelectorAll('[data-lens]')];
    const lensPanels = [...document.querySelectorAll('[data-lens-panel]')];
    const lensValues = ['plan', 'build', 'share'];
    function setLens(value) {
        if (!lensValues.includes(value)) return;
        lensButtons.forEach(button => {
            const selected = button.dataset.lens === value;
            button.setAttribute('aria-pressed', String(selected));
            button.classList.toggle('active', selected);
        });
        lensPanels.forEach(panel => {
            panel.hidden = panel.dataset.lensPanel !== value;
            panel.classList.toggle('active', !panel.hidden);
        });
        document.querySelectorAll('.lens-control').forEach(control => {
            control.style.setProperty('--lens-index', String(lensValues.indexOf(value)));
        });
        const indicator = document.getElementById('lensIndicator');
        if (indicator) indicator.dataset.lens = value;
        scheduleScroll();
    }
    lensButtons.forEach(button => {
        button.addEventListener('click', () => setLens(button.dataset.lens));
        button.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const index = lensValues.indexOf(button.dataset.lens);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2
                : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
            setLens(lensValues[next]);
            lensButtons.find(item => item.dataset.lens === lensValues[next])?.focus();
            playSound();
        });
    });

    const yearButtons = [...document.querySelectorAll('.filter-btn[data-filter]')];
    const yearGroups = [...document.querySelectorAll('.year-group')];
    yearButtons.forEach(button => button.addEventListener('click', () => {
        yearButtons.forEach(item => {
            item.classList.toggle('active', item === button);
            item.setAttribute('aria-pressed', String(item === button));
        });
        yearGroups.forEach(group => {
            group.hidden = button.dataset.filter !== 'all' && group.dataset.year !== button.dataset.filter;
        });
        scheduleScroll();
    }));

    // A short preview becomes the full archive on request; filtering remains semantic.
    const contentFeed = document.getElementById('contentFeed');
    const contentItems = contentFeed ? [...contentFeed.querySelectorAll('.content-item')] : [];
    const contentTabs = [...document.querySelectorAll('#contentTabs .ctab')];
    const contentSort = document.getElementById('contentSort');
    const archiveToggle = document.getElementById('archiveToggle');
    let contentType = 'all';
    let archiveExpanded = false;
    let sortOrder = contentSort?.dataset.order === 'asc' ? 'asc' : 'desc';
    function sortedContent() {
        return contentItems.slice().sort((a, b) => {
            const difference = (Number(a.dataset.ts) || 0) - (Number(b.dataset.ts) || 0);
            return sortOrder === 'asc' ? difference : -difference;
        });
    }
    function renderArchive(reorder = false) {
        if (!contentFeed) return;
        const ordered = sortedContent();
        if (reorder) ordered.forEach((item, index) => {
            if (contentFeed.children[index] !== item) contentFeed.insertBefore(item, contentFeed.children[index] || null);
        });
        const matching = ordered.filter(item => contentType === 'all' || item.dataset.type === contentType);
        const visible = new Set(archiveExpanded ? matching : matching.slice(0, 3));
        contentItems.forEach(item => {
            item.hidden = !visible.has(item);
            item.classList.toggle('hide', item.hidden);
        });
        contentTabs.forEach(tab => {
            const selected = tab.dataset.ctab === contentType;
            tab.classList.toggle('active', selected);
            tab.setAttribute('aria-pressed', String(selected));
        });
        const empty = document.getElementById('contentEmpty');
        if (empty) empty.hidden = matching.length !== 0;
        if (archiveToggle) {
            archiveToggle.hidden = matching.length <= 3;
            archiveToggle.setAttribute('aria-expanded', String(archiveExpanded));
            archiveToggle.setAttribute('aria-controls', contentFeed.id);
            const label = archiveToggle.querySelector('[data-archive-label]') || archiveToggle;
            label.dataset.ko = archiveExpanded ? '세 개만 보기' : `전체 ${matching.length}개 보기`;
            label.dataset.en = archiveExpanded ? 'Show 3 only' : `View all ${matching.length}`;
            label.textContent = localText(label.dataset.ko, label.dataset.en);
            const count = archiveToggle.querySelector('[data-archive-count]');
            if (count) count.textContent = String(matching.length);
        }
        if (contentSort) {
            contentSort.dataset.order = sortOrder;
            const label = contentSort.querySelector('.sort-label');
            if (label) {
                label.dataset.ko = sortOrder === 'asc' ? '오래된순 정렬' : '최신순 정렬';
                label.dataset.en = sortOrder === 'asc' ? 'Sort: Oldest first' : 'Sort: Newest first';
                label.textContent = localText(label.dataset.ko, label.dataset.en);
            }
        }
        scheduleScroll();
    }
    contentTabs.forEach(tab => tab.addEventListener('click', () => {
        contentType = ['all', 'reel', 'card'].includes(tab.dataset.ctab) ? tab.dataset.ctab : 'all';
        renderArchive();
    }));
    contentSort?.addEventListener('click', () => {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        renderArchive(true);
    });
    archiveToggle?.addEventListener('click', () => {
        archiveExpanded = !archiveExpanded;
        renderArchive();
        if (!archiveExpanded) document.querySelector('.content-toolbar')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    });

    // Instagram receives no request until its own preview button is pressed.
    document.querySelectorAll('[data-embed-load]').forEach(button => button.addEventListener('click', () => {
        const holder = button.closest('.ci-embed');
        if (!holder || holder.dataset.loaded) return;
        let source;
        try {
            source = new URL(holder.dataset.src);
            if (source.origin !== 'https://www.instagram.com' || !/^\/(p|reel)\/[A-Za-z0-9_-]+\/embed\/?$/.test(source.pathname)) {
                throw new Error('Unsupported preview');
            }
        } catch (_) {
            showToast('미리보기를 열 수 없어요. Instagram 링크를 이용해 주세요.', 'Use the Instagram link to open this post.');
            return;
        }
        const card = holder.closest('.content-item');
        const status = document.createElement('p');
        status.className = 'embed-status';
        status.setAttribute('role', 'status');
        status.dataset.ko = 'Instagram 미리보기를 불러오는 중…';
        status.dataset.en = 'Loading Instagram preview…';
        status.textContent = localText(status.dataset.ko, status.dataset.en);
        holder.nextElementSibling?.matches('.embed-status') && holder.nextElementSibling.remove();
        holder.after(status);
        const iframe = document.createElement('iframe');
        iframe.src = source.href;
        iframe.title = 'Instagram · ' + (card?.querySelector('.ci-type')?.textContent.trim() || '')
            + ' · ' + (card?.querySelector('.ci-date')?.textContent.trim() || '');
        iframe.loading = 'eager';
        iframe.referrerPolicy = 'no-referrer';
        iframe.allow = 'encrypted-media; picture-in-picture';
        iframe.setAttribute('scrolling', 'no');
        holder.dataset.loaded = 'loading';
        holder.setAttribute('aria-busy', 'true');
        button.disabled = true;
        const hadFocus = document.activeElement === button;
        button.hidden = true;
        let settled = false;
        const timeout = setTimeout(failed, 15000);
        function failed() {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            delete holder.dataset.loaded;
            holder.removeAttribute('aria-busy');
            button.disabled = false;
            button.hidden = false;
            if (document.activeElement === iframe) button.focus({ preventScroll: true });
            iframe.remove();
            status.dataset.ko = '불러오지 못했어요. 다시 누르거나 Instagram에서 열어 주세요.';
            status.dataset.en = 'Preview unavailable. Try again or open this post on Instagram.';
            status.textContent = localText(status.dataset.ko, status.dataset.en);
        }
        iframe.addEventListener('error', failed, { once: true });
        iframe.addEventListener('load', () => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            holder.dataset.loaded = 'ready';
            holder.removeAttribute('aria-busy');
            status.remove();
            // Cross-origin content is opaque; the permanent external post link remains available.
        }, { once: true });
        holder.appendChild(iframe);
        if (hadFocus) iframe.focus({ preventScroll: true });
    }));

    const modal = document.getElementById('dmodal');
    const modalCard = modal?.querySelector('.dmodal-card');
    const modalContent = document.getElementById('dmodalContent');
    const modalStore = document.getElementById('dmStore');
    let openPane = null;
    let lastTrigger = null;
    let modalInertState = new Map();
    let closeTimer;
    let closingTask = null;
    let resolveClose = null;
    function finishModalClose(restoreFocus) {
        clearTimeout(closeTimer);
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        if (openPane) { openPane.hidden = true; modalStore.appendChild(openPane); openPane = null; }
        document.body.classList.remove('dmodal-open');
        restoreBackground(modalInertState);
        if (restoreFocus && lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
        lastTrigger = null;
        const resolve = resolveClose;
        closingTask = null;
        resolveClose = null;
        resolve?.();
    }
    function closeModal({ restoreFocus = true, immediate = false } = {}) {
        if (!modal || modal.hidden) return Promise.resolve();
        if (closingTask) return closingTask;
        modal.classList.remove('show');
        closingTask = new Promise(resolve => { resolveClose = resolve; });
        const task = closingTask;
        if (reducedMotion || immediate) finishModalClose(restoreFocus);
        else closeTimer = setTimeout(() => finishModalClose(restoreFocus), 180);
        return task;
    }
    function openModal(paneId, trigger) {
        if (!modal || !modalCard || !modalContent || !modalStore) return;
        const pane = document.getElementById(paneId);
        if (!pane?.classList.contains('dm-pane') || (!modalStore.contains(pane) && !modalContent.contains(pane))) return;
        if (closingTask) finishModalClose(false);
        setMobileMenu(false);
        if (openPane) { openPane.hidden = true; modalStore.appendChild(openPane); }
        openPane = pane;
        lastTrigger = trigger;
        modalContent.appendChild(pane);
        pane.hidden = false;
        const heading = pane.querySelector('.dm-title');
        if (heading) {
            if (!heading.id) heading.id = `${paneId}-title`;
            modalCard.setAttribute('aria-labelledby', heading.id);
            modalCard.removeAttribute('aria-label');
        }
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('dmodal-open');
        if (!modalInertState.size) modalInertState = isolateBackground([modal, toast]);
        modalCard.scrollTop = 0;
        modalCard.focus({ preventScroll: true });
        requestAnimationFrame(() => { if (!modal.hidden && !closingTask) modal.classList.add('show'); });
    }
    document.querySelectorAll('[data-dmodal-card]').forEach(trigger => {
        trigger.addEventListener('click', event => {
            const control = event.target.closest('a, button, input, select, textarea');
            if (control && control !== trigger) return;
            openModal(trigger.dataset.dmodalCard, trigger);
        });
        trigger.addEventListener('keydown', event => {
            if (event.target !== trigger || trigger.matches('button, a')) return;
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openModal(trigger.dataset.dmodalCard, trigger);
                playSound();
            }
        });
    });
    modal?.querySelectorAll('[data-dmodal-close]').forEach(button => {
        button.addEventListener('click', () => closeModal());
    });
    modal?.addEventListener('keydown', event => trapTab(event, focusables(modalCard)));
    document.addEventListener('focusin', event => {
        if (modal && !modal.hidden && !modal.contains(event.target)) modalCard.focus({ preventScroll: true });
    });
    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        if (modal && !modal.hidden) { event.preventDefault(); closeModal(); }
        else if (mobileMenu?.classList.contains('open')) { event.preventDefault(); setMobileMenu(false); hamburger?.focus(); }
    });

    function focusSection(target) {
        const hadTabIndex = target.hasAttribute('tabindex');
        if (!hadTabIndex) {
            target.setAttribute('tabindex', '-1');
            target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
        }
        target.focus({ preventScroll: true });
    }
    document.addEventListener('click', async event => {
        const anchor = event.target.closest('a[href^="#"]');
        if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        let id;
        try { id = decodeURIComponent(anchor.getAttribute('href').slice(1)); } catch (_) { return; }
        const target = id && document.getElementById(id);
        if (!target) return;
        event.preventDefault();
        setMobileMenu(false);
        if (modal && !modal.hidden) await closeModal({ restoreFocus: false });
        focusSection(target);
        target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
        try { history.pushState(null, '', '#' + encodeURIComponent(id)); } catch (_) { /* Anchor navigation still works. */ }
        scheduleScroll();
    });
    document.getElementById('backToTop')?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
        const home = document.getElementById('home');
        if (home) focusSection(home);
        try { history.pushState(null, '', '#home'); } catch (_) { /* Scrolling still works. */ }
    });

    async function copyText(text) {
        if (navigator.clipboard?.writeText) {
            try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* Try the legacy clipboard path. */ }
        }
        const active = document.activeElement;
        const input = document.createElement('textarea');
        input.value = text;
        input.readOnly = true;
        input.style.cssText = 'position:fixed;opacity:0;inset:0;width:1px;height:1px;';
        document.body.appendChild(input);
        input.select();
        try { return typeof document.execCommand === 'function' && document.execCommand('copy') === true; }
        catch (_) { return false; }
        finally { input.remove(); active?.focus({ preventScroll: true }); }
    }
    const copyEmail = document.getElementById('copyEmail');
    copyEmail?.addEventListener('click', async () => {
        const email = copyEmail.dataset.email;
        const copied = typeof email === 'string' && email.length > 0 && await copyText(email);
        if (copied) showToast('이메일을 복사했어요.', 'Email copied.');
        else showToast('복사하지 못했어요. 이메일을 직접 선택해 주세요.', 'Copy failed. Please select the email address manually.');
    });

    const revealNodes = [...document.querySelectorAll('.reveal')];
    const counterFrames = new Map();
    function runCounters(container) {
        const counters = [...container.querySelectorAll('.counter')];
        if (container.matches('.counter')) counters.push(container);
        counters.forEach(counter => {
            if (counter.dataset.counted) return;
            counter.dataset.counted = 'true';
            const target = Number(counter.dataset.target) || 0;
            if (reducedMotion) { counter.textContent = String(target); return; }
            const start = performance.now();
            const tick = now => {
                const progress = Math.min(1, (now - start) / 800);
                counter.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
                if (progress < 1 && !reducedMotion) counterFrames.set(counter, requestAnimationFrame(tick));
                else { counter.textContent = String(target); counterFrames.delete(counter); }
            };
            counterFrames.set(counter, requestAnimationFrame(tick));
        });
    }
    function reveal(element) {
        element.classList.add('active');
        runCounters(element);
    }
    let revealObserver;
    if ('IntersectionObserver' in window) {
        revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
            if (entry.isIntersecting) { reveal(entry.target); revealObserver.unobserve(entry.target); }
        }), { threshold: 0.08 });
        revealNodes.forEach(element => revealObserver.observe(element));
    } else revealNodes.forEach(reveal);
    document.querySelectorAll('.hero-section .reveal').forEach(reveal);

    const navLinks = [...document.querySelectorAll('.nav-links a[href^="#"], .mobile-menu a[href^="#"], [data-section-link]')];
    const navTargets = [...new Set(navLinks.map(link => document.getElementById(link.getAttribute('href')?.slice(1))).filter(Boolean))];
    const topNav = document.getElementById('topNav');
    const progressBar = document.getElementById('scrollProgress');
    const hero = document.querySelector('.hero-section');
    let previousSection = '';
    let scrollFrame = 0;
    function updateScroll() {
        scrollFrame = 0;
        const y = window.scrollY;
        topNav?.classList.toggle('scrolled', y > 24);
        const maximum = root.scrollHeight - window.innerHeight;
        if (progressBar) progressBar.style.setProperty('--progress',
            (maximum > 0 ? Math.min(100, Math.max(0, y / maximum * 100)) : 0) + '%');
        hero?.style.setProperty('--scroll-offset', (reducedMotion ? 0 : Math.min(48, Math.max(0, y * 0.065))) + 'px');
        const marker = y + Math.min(window.innerHeight * 0.35, 280);
        const positions = navTargets.filter(section => section.getClientRects().length)
            .map(section => ({ section, top: section.getBoundingClientRect().top + y }))
            .sort((a, b) => a.top - b.top);
        let activeId = positions[0]?.section.id || '';
        positions.forEach(({ section, top }) => { if (top <= marker) activeId = section.id; });
        // The final section may be shorter than the viewport and cannot reach the marker.
        if (maximum > 0 && y >= maximum - 2 && positions.length) {
            activeId = positions[positions.length - 1].section.id;
        }
        navLinks.forEach(link => {
            const selected = link.getAttribute('href') === '#' + activeId;
            link.classList.toggle('active', selected);
            if (selected) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });
        if (activeId && previousSection && activeId !== previousSection) playSound('section');
        previousSection = activeId;
        // A position fallback prevents hidden content if an observer is delayed.
        revealNodes.forEach(element => {
            if (element.classList.contains('active') || !element.getClientRects().length) return;
            const bounds = element.getBoundingClientRect();
            if (bounds.top < window.innerHeight - 16 && bounds.bottom > 0) reveal(element);
        });
    }
    function scheduleScroll() {
        if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
    }
    window.addEventListener('scroll', scheduleScroll, { passive: true });
    window.addEventListener('load', scheduleScroll, { once: true });
    document.fonts?.ready.then(scheduleScroll);
    window.addEventListener('resize', () => {
        if (mobileMenu?.classList.contains('open') && !hamburger?.getClientRects().length) setMobileMenu(false);
        scheduleScroll();
    });
    function applyMotionPreference() {
        reducedMotion = motionQuery.matches;
        root.dataset.motion = reducedMotion ? 'reduced' : 'full';
        if (reducedMotion) {
            counterFrames.forEach((frame, counter) => {
                cancelAnimationFrame(frame);
                counter.textContent = String(Number(counter.dataset.target) || 0);
            });
            counterFrames.clear();
            revealNodes.forEach(reveal);
            if (closingTask) finishModalClose(true);
        }
        scheduleScroll();
    }
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', applyMotionPreference);
    else motionQuery.addListener(applyMotionPreference);

    function switchLanguage(lang) {
        currentLang = lang === 'en' ? 'en' : 'ko';
        remember('portfolio-lang', currentLang);
        root.lang = currentLang;
        document.querySelectorAll('[data-ko][data-en]').forEach(element => {
            setLocalizedContent(element, element.getAttribute(`data-${currentLang}`));
        });
        document.querySelectorAll('[data-arialabel-ko][data-arialabel-en]').forEach(element => {
            element.setAttribute('aria-label', element.getAttribute(`data-arialabel-${currentLang}`));
        });
        document.querySelectorAll('[data-aria-ko][data-aria-en]').forEach(element => {
            element.setAttribute('aria-label', element.getAttribute(`data-aria-${currentLang}`));
        });
        document.querySelectorAll('[data-alt-ko][data-alt-en]').forEach(element => {
            element.setAttribute('alt', element.getAttribute(`data-alt-${currentLang}`));
        });
        document.querySelectorAll('[data-placeholder-ko][data-placeholder-en]').forEach(element => {
            element.setAttribute('placeholder', element.getAttribute(`data-placeholder-${currentLang}`));
        });
        document.querySelectorAll('.lang-btn').forEach(button => {
            const selected = button.dataset.lang === currentLang;
            button.classList.toggle('active', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
        applyTheme(currentTheme);
        updateSoundControls();
        setMobileMenu(mobileMenu?.classList.contains('open') || false);
        renderArchive();
        scheduleScroll();
    }
    document.querySelectorAll('.lang-btn').forEach(button => button.addEventListener('click', () => switchLanguage(button.dataset.lang)));

    setMobileMenu(false);
    switchLanguage(currentLang);
    setLens('build');
    renderArchive(true);
    applyMotionPreference();
    updateScroll();
    root.classList.add('js-ready');
});
