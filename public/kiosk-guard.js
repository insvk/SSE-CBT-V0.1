/**
 * SSE CBT Examination Platform - Kiosk & Anti-Cheat Hardware Security Guard
 * Strictly enforces Fullscreen Kiosk Lockdown, blocks unauthorized shortcuts,
 * and guards application termination behind the dynamic Invigilator Date PIN.
 */
(function() {
    'use strict';

    // 1. HARDENED KEYBOARD SHORTCUT SUPPRESSION
    window.addEventListener('keydown', function(e) {
        var key = (e.key || '').toLowerCase();
        var code = e.keyCode || e.which;

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

            // Block all other Ctrl combinations (W, Q, R, T, N, P, S, U, H, J, D, O, K, L, E, F, G)
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
                background: rgba(11, 17, 32, 0.88);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 9999999;
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
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
                border-radius: 16px;
                width: 90%;
                max-width: 440px;
                padding: 2rem;
                color: #f8fafc;
                text-align: center;
            }
            .kiosk-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(239, 68, 68, 0.15);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #f87171;
                font-size: 0.75rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                padding: 4px 10px;
                border-radius: 9999px;
                margin-bottom: 1rem;
            }
            .kiosk-title {
                font-size: 1.25rem;
                font-weight: 700;
                color: #ffffff;
                margin-bottom: 0.5rem;
            }
            .kiosk-desc {
                font-size: 0.875rem;
                color: #94a3b8;
                margin-bottom: 1.5rem;
                line-height: 1.4;
            }
            .kiosk-input-wrap {
                margin-bottom: 1.25rem;
                text-align: left;
            }
            .kiosk-label {
                display: block;
                font-size: 0.8rem;
                font-weight: 600;
                color: #cbd5e1;
                margin-bottom: 0.4rem;
            }
            .kiosk-input {
                width: 100%;
                background: #0f172a;
                border: 1.5px solid #334155;
                color: #ffffff;
                padding: 0.75rem 1rem;
                font-size: 1.1rem;
                border-radius: 8px;
                outline: none;
                transition: border-color 0.15s, box-shadow 0.15s;
                letter-spacing: 0.2em;
                text-align: center;
                box-sizing: border-box;
            }
            .kiosk-input:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
            }
            .kiosk-error {
                display: none;
                margin-top: 0.5rem;
                color: #ef4444;
                font-size: 0.8rem;
                font-weight: 600;
                text-align: center;
            }
            .kiosk-actions {
                display: flex;
                gap: 0.75rem;
                margin-top: 1.5rem;
            }
            .kiosk-btn {
                flex: 1;
                padding: 0.75rem 1rem;
                font-size: 0.9rem;
                font-weight: 600;
                border-radius: 8px;
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
            /* Discreet Invigilator Padlock Trigger */
            #kiosk-discreet-trigger {
                position: fixed;
                bottom: 8px;
                right: 8px;
                width: 28px;
                height: 28px;
                border-radius: 6px;
                background: rgba(15, 23, 42, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.08);
                color: #64748b;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 13px;
                cursor: pointer;
                opacity: 0.25;
                z-index: 999999;
                transition: opacity 0.2s, background 0.2s, color 0.2s;
                user-select: none;
            }
            #kiosk-discreet-trigger:hover {
                opacity: 0.95;
                background: #1e293b;
                color: #f1f5f9;
                border-color: #3b82f6;
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
                    Secure Kiosk Mode is currently enforced. Authorized invigilator credentials are required to exit or alter this terminal.
                </p>
                <div class="kiosk-input-wrap">
                    <label class="kiosk-label" for="kiosk-pin-input">Master Invigilator PIN</label>
                    <input type="password" id="kiosk-pin-input" class="kiosk-input" maxlength="24" placeholder="••••••••" autocomplete="off" />
                    <div id="kiosk-error-msg" class="kiosk-error"></div>
                </div>
                <div class="kiosk-actions">
                    <button type="button" id="kiosk-btn-cancel" class="kiosk-btn kiosk-btn-cancel">Cancel</button>
                    <button type="button" id="kiosk-btn-submit" class="kiosk-btn kiosk-btn-exit">Authorize &amp; Exit</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Discreet Bottom Trigger
        var trigger = document.createElement('div');
        trigger.id = 'kiosk-discreet-trigger';
        trigger.title = 'Invigilator Security Menu (Ctrl+Shift+X)';
        trigger.innerHTML = '🔒';
        document.body.appendChild(trigger);

        // Event Listeners
        var pinInput = document.getElementById('kiosk-pin-input');
        var errorMsg = document.getElementById('kiosk-error-msg');
        var btnCancel = document.getElementById('kiosk-btn-cancel');
        var btnSubmit = document.getElementById('kiosk-btn-submit');

        trigger.onclick = function() {
            window.showKioskExitModal();
        };

        btnCancel.onclick = function() {
            overlay.classList.remove('active');
            pinInput.value = '';
            errorMsg.style.display = 'none';
        };

        btnSubmit.onclick = performKioskExitAuth;

        pinInput.onkeydown = function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performKioskExitAuth();
            }
        };

        async function performKioskExitAuth() {
            var pin = pinInput.value.trim();
            if (!pin) {
                errorMsg.textContent = 'Please enter the Master PIN.';
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
                        btnSubmit.textContent = 'Authorized. Terminating...';
                        return;
                    } else {
                        throw new Error((bridgeRes && bridgeRes.message) || 'Invalid Invigilator PIN.');
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
                    btnSubmit.textContent = 'Authorized. Exiting...';
                    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.exit_app === 'function') {
                        window.pywebview.api.exit_app();
                    } else {
                        window.close();
                    }
                } else {
                    throw new Error((data && data.message) || 'Invalid Invigilator PIN.');
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
                setTimeout(function() { pinInput.focus(); }, 100);
            }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectKioskExitUI);
    } else {
        injectKioskExitUI();
    }
})();
