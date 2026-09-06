/* Early head script: readiness cover only, never a prerequisite for using the page. */
(() => {
    'use strict';
    const root = document.documentElement;
    let state = 'pending';
    let fadeTimer;
    const removeListeners = [];

    function finish() {
        state = 'open';
        // Clear the visual gate first, even if optional cleanup later fails.
        root.classList.remove('page-loading', 'page-loader-leaving');
        clearTimeout(failOpenTimer);
        clearTimeout(fadeTimer);
        while (removeListeners.length) {
            try { removeListeners.pop()(); } catch (_) { /* The page is already available. */ }
        }
        const loader = document.getElementById('pageLoader');
        if (loader) loader.setAttribute('aria-hidden', 'true');
    }

    // Install this before navigation checks, DOM queries, media queries or promises.
    // It also truncates a late fade so the entire cover lasts at most 1.8 seconds.
    const failOpenTimer = setTimeout(finish, 1800);

    function listen(target, type, callback, options) {
        target.addEventListener(type, callback, options);
        removeListeners.push(() => target.removeEventListener(type, callback, options));
    }
    function dismiss(immediate = false) {
        if (state === 'open' || state === 'pending') return;
        if (immediate) { finish(); return; }
        if (state === 'leaving') return;
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduce) { finish(); return; }
        state = 'leaving';
        root.classList.add('page-loader-leaving');
        root.classList.remove('page-loading');
        fadeTimer = setTimeout(finish, 220);
    }
    function imageReady(image) {
        if (!image) return Promise.resolve();
        const decode = () => {
            if (!image.naturalWidth || typeof image.decode !== 'function') return Promise.resolve();
            try { return Promise.resolve(image.decode()).catch(() => {}); }
            catch (_) { return Promise.resolve(); }
        };
        if (image.complete) return decode();
        return new Promise(resolve => {
            const loaded = () => { decode().then(resolve, resolve); };
            listen(image, 'load', loaded, { once: true });
            listen(image, 'error', resolve, { once: true });
            // An image may finish between the complete check and listener setup.
            if (image.complete) loaded();
        });
    }
    function ready() {
        if (state !== 'loading') return;
        try {
            const fonts = document.fonts?.ready || Promise.resolve();
            const image = document.querySelector('#rescuePoster img')
                || document.querySelector('img[src="images/rescue-jet.jpg"]');
            Promise.allSettled([fonts, imageReady(image)]).then(() => dismiss()).catch(finish);
        } catch (_) { finish(); }
    }

    try {
        const navigation = window.performance?.getEntriesByType?.('navigation')[0];
        if (navigation?.type === 'back_forward') { finish(); return; }
        state = 'loading';
        root.classList.add('page-loading');

        const dismissImmediately = () => dismiss(true);
        listen(document, 'keydown', event => {
            if (event.key === 'Tab' || event.key === 'Escape') dismissImmediately();
        }, true);
        listen(document, 'focusin', event => {
            // A pointer can focus the skip button before its click; leave it operable.
            if (!event.target.closest?.('#pageLoader')) dismissImmediately();
        }, true);
        listen(document, 'click', event => {
            if (!event.target.closest?.('[data-page-loader-dismiss]')) return;
            dismissImmediately();
            document.querySelector('main')?.focus({ preventScroll: true });
        }, true);
        listen(window, 'wheel', dismissImmediately, { capture: true, passive: true });
        listen(window, 'touchmove', dismissImmediately, { capture: true, passive: true });
        listen(window, 'scroll', dismissImmediately, { passive: true });
        listen(window, 'pagehide', finish);
        listen(window, 'pageshow', event => { if (event.persisted) finish(); });

        if (document.readyState === 'loading') listen(document, 'DOMContentLoaded', ready, { once: true });
        else ready();
    } catch (_) { finish(); }
})();
