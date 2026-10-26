/**
 * SSE CBT Examination Platform - Kiosk & Anti-Cheat Hardware Security Guard
 * Strictly enforces Fullscreen Kiosk Lockdown, blocks unauthorized shortcuts,
 * and guards application termination behind the dynamic Invigilator Date PIN.
 */
(function() {
    'use strict';

    // Helper to check if modal is open
    function isModalOpen() {
        var modal = document.getElementById('kiosk-exit-overlay');
        return modal && modal.classList.contains('active');
    }

    // 1. HARDENED KEYBOARD SHORTCUT SUPPRESSION
    window.addEventListener('keydown', function(e) {
        var key = (e.key || '').toLowerCase();
        var code = e.keyCode || e.which;

        // CRITICAL: If typing inside the Invigilator PIN input box, allow all input!
        if (e.target && e.target.id === 'kiosk-pin-input') {
            if (key === 'enter') {
                e.preventDefault();
                performKioskExitAuth();
                return false;
            }
            if (key === 'escape') {
                closeKioskModal();
                return false;
            }
            // Allow all typing (numbers, characters, backspace, delete, arrows, etc.)
            return true;
        }

        // F1 through F12 (Refresh, DevTools, Fullscreen, Help)
        if (code >= 112 && code <= 123) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        // Windows Keys (91, 92) and Menu Key (93)
        if (code === 91 || code === 92 || code === 93) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        // Escape Key
        if (key === 'escape' || code === 27) {
            e.preventDefault();
            e.stopPropagation();
            if (isModalOpen()) {
                closeKioskModal();
            }
            return false;
        }

        // Alt Key Combinations (Alt+Tab, Alt+F4, Alt+Left/Right, Alt+Home, Alt+Space)
        if (e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            if (code === 115 || key === 'f4') { // Alt+F4
                window.showKioskExitModal && window.showKioskExitModal();
            }
            return false;
        }

        // Ctrl / Meta (Command) Key Combinations
        if (e.ctrlKey || e.metaKey) {
            // Supervisor Hotkey: Ctrl+Shift+X opens Invigilator Exit Modal
            if (e.shiftKey && (key === 'x' || code === 88)) {
                e.preventDefault();
                e.stopPropagation();
                window.showKioskExitModal && window.showKioskExitModal();
                return false;
            }

            // Ctrl+Shift Shortcuts (DevTools: I, J, C; Hard Reload: R, etc.)
            if (e.shiftKey) {
                var shiftBlocked = ['i', 'j', 'c', 'r', 'k', 'delete', 'n', 't', 'p'];
                if (shiftBlocked.indexOf(key) !== -1 || [73, 74, 67, 82, 75, 78, 84, 80].indexOf(code) !== -1) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }

            // Standard editing shortcuts allowed only within editable inputs
            var target = e.target;
            var isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
            var editAllowed = ['c', 'v', 'a', 'x', 'z', 'y'];

            if (isInput && editAllowed.indexOf(key) !== -1 && !e.shiftKey && !e.altKey) {
                return true; // Allow standard copy/paste inside input fields
            }

            // Block all other Ctrl combinations (W, Q, R, T, N, P, S, U, H, J, D, O, K, L, E, F, G, B)
            var blockedCtrl = ['w', 'q', 'r', 't', 'n', 'p', 's', 'u', 'h', 'j', 'd', 'o', 'k', 'l', 'e', 'f', 'g', 'b'];
            if (blockedCtrl.indexOf(key) !== -1 || [87, 81, 82, 84, 78, 80, 83, 85, 72, 74, 68, 79, 75, 76, 69, 70, 71, 66].indexOf(code) !== -1) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }
    }, true);

    // 2. DISABLE CONTEXT MENU (RIGHT-CLICK) & DRAG-AND-DROP
    window.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    }, true);

    window.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    }, true);

    function closeKioskModal() {
        var overlay = document.getElementById('kiosk-exit-overlay');
        var pinInput = document.getElementById('kiosk-pin-input');
        var errorMsg = document.getElementById('kiosk-error-msg');
        if (overlay) {
            overlay.classList.remove('active');
            if (pinInput) pinInput.value = '';
            if (errorMsg) errorMsg.style.display = 'none';
        }
        if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.set_modal_open === 'function') {
            window.pywebview.api.set_modal_open(false);
        }
    }

    // 3. INJECT INVIGILATOR KIOSK EXIT MODAL & FLOATING TRIGGER
    function injectKioskExitUI() {
        if (document.getElementById('kiosk-exit-overlay')) return;

        // CSS Styles
        var style = document.createElement('style');
        style.id = 'kiosk-guard-styles';
        style.textContent = `
            #kiosk-exit-overlay {
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(11, 17, 32, 0.92);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 99999999;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            #kiosk-exit-overlay.active {
                display: flex !important;
                animation: kioskFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }
            @keyframes kioskFadeIn {
                from { opacity: 0; transform: scale(0.96); }
                to { opacity: 1; transform: scale(1); }
            }
            .kiosk-card {
                background: #1e293b;
                border: 1px solid #334155;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
                border-radius: 20px;
                width: 90%;
                max-width: 460px;
                padding: 2.25rem;
                color: #f8fafc;
                text-align: center;
                box-sizing: border-box;
            }
            .kiosk-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(239, 68, 68, 0.18);
                border: 1px solid rgba(239, 68, 68, 0.35);
                color: #f87171;
                font-size: 0.75rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                padding: 4px 12px;
                border-radius: 9999px;
                margin-bottom: 1rem;
            }
            .kiosk-title {
                font-size: 1.35rem;
                font-weight: 800;
                color: #ffffff;
                margin-bottom: 0.4rem;
            }
            .kiosk-desc {
                font-size: 0.85rem;
                color: #94a3b8;
                margin-bottom: 1.5rem;
                line-height: 1.4;
            }
            .kiosk-input-wrap {
                margin-bottom: 1rem;
                text-align: left;
            }
            .kiosk-label-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.4rem;
            }
            .kiosk-label {
                font-size: 0.8rem;
                font-weight: 600;
                color: #cbd5e1;
            }
            .kiosk-hint {
                font-size: 0.75rem;
                color: #60a5fa;
                font-weight: 500;
            }
            .kiosk-input-box {
                position: relative;
                display: flex;
                align-items: center;
            }
            .kiosk-input {
                width: 100%;
                background: #0f172a;
                border: 2px solid #334155;
                color: #ffffff;
                padding: 0.85rem 3.5rem 0.85rem 1rem;
                font-size: 1.25rem;
                font-weight: 700;
                border-radius: 10px;
                outline: none;
                transition: border-color 0.15s, box-shadow 0.15s;
                letter-spacing: 0.25em;
                text-align: center;
                box-sizing: border-box;
            }
            .kiosk-input:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35);
            }
            .kiosk-eye-btn {
                position: absolute;
                right: 10px;
                background: transparent;
                border: none;
                color: #94a3b8;
                font-size: 1.1rem;
                cursor: pointer;
                padding: 6px;
                border-radius: 6px;
                transition: color 0.15s;
            }
            .kiosk-eye-btn:hover {
                color: #ffffff;
            }
            .kiosk-error {
                display: none;
                margin-top: 0.6rem;
                padding: 8px 12px;
                border-radius: 8px;
                background: rgba(239, 68, 68, 0.15);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #ef4444;
                font-size: 0.82rem;
                font-weight: 600;
                text-align: center;
            }
            /* On-Screen Numeric Keypad */
            .kiosk-keypad {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin: 1.25rem 0;
            }
            .kiosk-key {
                background: #0f172a;
                border: 1px solid #334155;
                color: #f1f5f9;
                padding: 10px 0;
                font-size: 1.1rem;
                font-weight: 700;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.15s;
                user-select: none;
            }
            .kiosk-key:hover {
                background: #334155;
                color: #ffffff;
                border-color: #64748b;
            }
            .kiosk-key:active {
                transform: scale(0.96);
            }
            .kiosk-key-clear {
                background: rgba(239, 68, 68, 0.15);
                border-color: rgba(239, 68, 68, 0.3);
                color: #f87171;
            }
            .kiosk-key-clear:hover {
                background: #ef4444;
                color: #ffffff;
            }
            .kiosk-actions {
                display: flex;
                gap: 0.75rem;
                margin-top: 1rem;
            }
            .kiosk-btn {
                flex: 1;
                padding: 0.85rem 1rem;
                font-size: 0.95rem;
                font-weight: 700;
                border-radius: 10px;
                cursor: pointer;
                border: none;
                transition: all 0.15s ease;
            }
            .kiosk-btn-cancel {
                background: #334155;
                color: #e2e8f0;
            }
            .kiosk-btn-cancel:hover {
                background: #475569;
            }
            .kiosk-btn-exit {
                background: #dc2626;
                color: #ffffff;
            }
            .kiosk-btn-exit:hover {
                background: #b91c1c;
            }
            .kiosk-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            /* Prominent Invigilator Exit Button */
            #kiosk-exit-pill {
                position: fixed;
                bottom: 12px;
                right: 12px;
                background: rgba(30, 41, 59, 0.85);
                backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.12);
                color: #cbd5e1;
                font-size: 12px;
                font-weight: 700;
                padding: 8px 16px;
                border-radius: 9999px;
                cursor: pointer;
                z-index: 9999999;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
                transition: all 0.2s ease;
                user-select: none;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            #kiosk-exit-pill:hover {
                background: #dc2626;
                color: #ffffff;
                border-color: #ef4444;
                box-shadow: 0 6px 20px rgba(220, 38, 38, 0.5);
                transform: translateY(-2px);
            }
        `;
        document.head.appendChild(style);

        // Modal Markup
        var overlay = document.createElement('div');
        overlay.id = 'kiosk-exit-overlay';
        overlay.innerHTML = `
            <div class="kiosk-card">
                <div class="kiosk-badge">🔒 CBT Kiosk Lockdown</div>
                <h2 class="kiosk-title">Invigilator Authorization</h2>
                <p class="kiosk-desc">
                    Secure Kiosk Lockdown is active. Enter the Date PIN to safely terminate this session.
                </p>
                <div class="kiosk-input-wrap">
                    <div class="kiosk-label-row">
                        <label class="kiosk-label" for="kiosk-pin-input">Master Date PIN</label>
                        <span class="kiosk-hint">Format: YYYYMMDD</span>
                    </div>
                    <div class="kiosk-input-box">
                        <input type="password" id="kiosk-pin-input" class="kiosk-input" maxlength="24" placeholder="YYYYMMDD" autocomplete="off" />
                        <button type="button" id="kiosk-toggle-eye" class="kiosk-eye-btn" title="Show/Hide PIN">👁️</button>
                    </div>
                    <div id="kiosk-error-msg" class="kiosk-error"></div>
                </div>

                <!-- On-Screen Numeric Keypad for Touch / Mouse -->
                <div class="kiosk-keypad">
                    <button type="button" class="kiosk-key" data-digit="1">1</button>
                    <button type="button" class="kiosk-key" data-digit="2">2</button>
                    <button type="button" class="kiosk-key" data-digit="3">3</button>
                    <button type="button" class="kiosk-key" data-digit="4">4</button>
                    <button type="button" class="kiosk-key" data-digit="5">5</button>
                    <button type="button" class="kiosk-key" data-digit="6">6</button>
                    <button type="button" class="kiosk-key" data-digit="7">7</button>
                    <button type="button" class="kiosk-key" data-digit="8">8</button>
                    <button type="button" class="kiosk-key" data-digit="9">9</button>
                    <button type="button" class="kiosk-key kiosk-key-clear" id="kiosk-key-backspace">⌫ Del</button>
                    <button type="button" class="kiosk-key" data-digit="0">0</button>
                    <button type="button" class="kiosk-key kiosk-key-clear" id="kiosk-key-clear">Clear</button>
                </div>

                <div class="kiosk-actions">
                    <button type="button" id="kiosk-btn-cancel" class="kiosk-btn kiosk-btn-cancel">Cancel</button>
                    <button type="button" id="kiosk-btn-submit" class="kiosk-btn kiosk-btn-exit">Authorize &amp; Exit</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Prominent Exit Pill Button
        var pill = document.createElement('div');
        pill.id = 'kiosk-exit-pill';
        pill.title = 'Invigilator Exit Platform (Ctrl+Shift+X or Alt+F4)';
        pill.innerHTML = '<span>🔒</span><span>Exit Platform</span>';
        document.body.appendChild(pill);

        // Event Listeners
        var pinInput = document.getElementById('kiosk-pin-input');
        var errorMsg = document.getElementById('kiosk-error-msg');
        var btnCancel = document.getElementById('kiosk-btn-cancel');
        var btnSubmit = document.getElementById('kiosk-btn-submit');
        var toggleEye = document.getElementById('kiosk-toggle-eye');

        pill.onclick = function() {
            window.showKioskExitModal();
        };

        btnCancel.onclick = closeKioskModal;
        btnSubmit.onclick = performKioskExitAuth;

        // Eye Toggle
        toggleEye.onclick = function() {
            if (pinInput.type === 'password') {
                pinInput.type = 'text';
                toggleEye.textContent = '🙈';
            } else {
                pinInput.type = 'password';
                toggleEye.textContent = '👁️';
            }
        };

        // Keypad buttons
        var keys = overlay.querySelectorAll('.kiosk-key[data-digit]');
        keys.forEach(function(k) {
            k.onclick = function() {
                var digit = this.getAttribute('data-digit');
                pinInput.value += digit;
                errorMsg.style.display = 'none';
                pinInput.focus();
            };
        });

        document.getElementById('kiosk-key-backspace').onclick = function() {
            pinInput.value = pinInput.value.slice(0, -1);
            errorMsg.style.display = 'none';
            pinInput.focus();
        };

        document.getElementById('kiosk-key-clear').onclick = function() {
            pinInput.value = '';
            errorMsg.style.display = 'none';
            pinInput.focus();
        };
    }

    async function performKioskExitAuth() {
        var pinInput = document.getElementById('kiosk-pin-input');
        var errorMsg = document.getElementById('kiosk-error-msg');
        var btnSubmit = document.getElementById('kiosk-btn-submit');

        if (!pinInput) return;
        var pin = pinInput.value.trim().replace(/\s+/g, '');

        if (!pin) {
            errorMsg.textContent = 'Please enter the Master Date PIN (e.g. 20261026).';
            errorMsg.style.display = 'block';
            pinInput.focus();
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Verifying...';
        errorMsg.style.display = 'none';

        try {
            // 1. Check Python Native Desktop Bridge
            if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.verify_and_exit === 'function') {
                var bridgeRes = await window.pywebview.api.verify_and_exit(pin);
                if (bridgeRes && bridgeRes.authorized) {
                    btnSubmit.textContent = 'Authorized! Terminating...';
                    btnSubmit.style.background = '#16a34a';
                    return;
                } else {
                    throw new Error((bridgeRes && bridgeRes.message) || 'Invalid Invigilator Date PIN.');
                }
            }

            // 2. Fallback to authoritative backend system verification endpoint
            var response = await fetch('/api/v1/system/verify-exit-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pin })
            });

            var data = await response.json().catch(function() { return {}; });

            if (data && data.authorized) {
                btnSubmit.textContent = 'Authorized! Terminating...';
                btnSubmit.style.background = '#16a34a';
                if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.exit_app === 'function') {
                    window.pywebview.api.exit_app();
                } else {
                    window.close();
                }
            } else {
                throw new Error((data && data.message) || 'Invalid Invigilator Date PIN.');
            }
        } catch (err) {
            errorMsg.textContent = err.message || 'Authorization Failed. Access Denied.';
            errorMsg.style.display = 'block';
            pinInput.value = '';
            pinInput.focus();
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Authorize & Exit';
        }
    }

    // Global helper to display modal
    window.showKioskExitModal = function() {
        var overlay = document.getElementById('kiosk-exit-overlay');
        var pinInput = document.getElementById('kiosk-pin-input');
        var errorMsg = document.getElementById('kiosk-error-msg');
        if (overlay) {
            overlay.classList.add('active');
            if (errorMsg) errorMsg.style.display = 'none';
            if (pinInput) {
                pinInput.value = '';
                setTimeout(function() {
                    pinInput.focus();
                }, 50);
            }
        }
        if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.set_modal_open === 'function') {
            window.pywebview.api.set_modal_open(true);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectKioskExitUI);
    } else {
        injectKioskExitUI();
    }
})();
