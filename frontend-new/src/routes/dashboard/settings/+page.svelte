<script lang="ts">
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabase';

    // ── State ──────────────────────────────────────────────────────────────
    type PlatformStatus =
        | { connected: false }
        | { connected: true; name?: string; username?: string };

    interface AccountsState {
        linkedin: PlatformStatus;
        devto: PlatformStatus;
        medium: PlatformStatus;
    }

    let accounts = $state<AccountsState>({
        linkedin: { connected: false },
        devto: { connected: false },
        medium: { connected: false },
    });

    let loading = $state(true);
    let linkedinLoading = $state(false);
    let devtoLoading = $state(false);
    let mediumLoading = $state(false);

    let devtoKey = $state('');
    let mediumToken = $state('');

    let devtoError = $state('');
    let mediumError = $state('');

    // ── Helpers ────────────────────────────────────────────────────────────
    async function getToken(): Promise<string> {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ?? '';
    }

    async function getUserId(): Promise<string> {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.user?.id ?? '';
    }

    // ── Fetch connected accounts on mount ──────────────────────────────────
    async function fetchAccounts() {
        loading = true;
        try {
            const token = await getToken();
            const res = await fetch(`${import.meta.env.VITE_API_URL}/settings/connected-accounts`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                accounts = data;
            }
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        // Check for LinkedIn callback result in URL
        const params = new URLSearchParams(window.location.search);
        if (params.get('linkedin') === 'connected') {
            window.history.replaceState({}, '', '/dashboard/settings');
        }
        fetchAccounts();
    });

    // ── LinkedIn ───────────────────────────────────────────────────────────
    async function connectLinkedIn() {
        linkedinLoading = true;
        const userId = await getUserId();
        // Browser redirect — LinkedIn OAuth flow
        window.location.href = `${import.meta.env.VITE_API_URL}/auth/linkedin?user_id=${userId}`;
    }

    async function disconnectLinkedIn() {
        linkedinLoading = true;
        try {
            const token = await getToken();
            await fetch(`${import.meta.env.VITE_API_URL}/settings/linkedin/disconnect`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            accounts = { ...accounts, linkedin: { connected: false } };
        } finally {
            linkedinLoading = false;
        }
    }

    // ── Dev.to ─────────────────────────────────────────────────────────────
    async function connectDevTo() {
        devtoError = '';
        if (!devtoKey.trim()) {
            devtoError = 'Please paste your Dev.to API key.';
            return;
        }
        devtoLoading = true;
        try {
            const token = await getToken();
            const res = await fetch(`${import.meta.env.VITE_API_URL}/settings/devto/connect`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey: devtoKey }),
            });
            const data = await res.json();
            if (!res.ok) {
                devtoError = data.error ?? 'Connection failed.';
            } else {
                accounts = { ...accounts, devto: { connected: true, username: data.username } };
                devtoKey = '';
            }
        } finally {
            devtoLoading = false;
        }
    }

    async function disconnectDevTo() {
        devtoLoading = true;
        try {
            const token = await getToken();
            await fetch(`${import.meta.env.VITE_API_URL}/settings/devto/disconnect`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            accounts = { ...accounts, devto: { connected: false } };
        } finally {
            devtoLoading = false;
        }
    }

    // ── Medium ─────────────────────────────────────────────────────────────
    async function connectMedium() {
        mediumError = '';
        if (!mediumToken.trim()) {
            mediumError = 'Please paste your Medium integration token.';
            return;
        }
        mediumLoading = true;
        try {
            const token = await getToken();
            const res = await fetch(`${import.meta.env.VITE_API_URL}/settings/medium/connect`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ integrationToken: mediumToken }),
            });
            const data = await res.json();
            if (!res.ok) {
                mediumError = data.error ?? 'Connection failed.';
            } else {
                accounts = { ...accounts, medium: { connected: true, username: data.username } };
                mediumToken = '';
            }
        } finally {
            mediumLoading = false;
        }
    }

    async function disconnectMedium() {
        mediumLoading = true;
        try {
            const token = await getToken();
            await fetch(`${import.meta.env.VITE_API_URL}/settings/medium/disconnect`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            accounts = { ...accounts, medium: { connected: false } };
        } finally {
            mediumLoading = false;
        }
    }
</script>

<svelte:head>
    <title>Settings — Cascade</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<div class="settings-page">
    <div class="page-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Connect your publishing platforms to Cascade.</p>
    </div>

    {#if loading}
        <div class="global-loading">
            <div class="spinner"></div>
            <span>Loading account status…</span>
        </div>
    {:else}
        <div class="cards-grid">

            <!-- ── LinkedIn Card ─────────────────────────────────────── -->
            <div class="platform-card">
                <div class="card-header">
                    <div class="platform-icon linkedin-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                    </div>
                    <div class="platform-info">
                        <h2 class="platform-name">LinkedIn</h2>
                        <p class="platform-desc">Connect your LinkedIn to publish posts directly from Cascade.</p>
                    </div>
                </div>

                <div class="card-status-row">
                    {#if linkedinLoading}
                        <div class="status-loading">
                            <div class="spinner small"></div>
                            <span>Connecting…</span>
                        </div>
                    {:else if accounts.linkedin.connected}
                        <div class="status connected">
                            <span class="status-dot connected"></span>
                            Connected — {'name' in accounts.linkedin ? accounts.linkedin.name : ''}
                        </div>
                        <button class="btn btn-ghost" onclick={disconnectLinkedIn}>Disconnect</button>
                    {:else}
                        <div class="status disconnected">
                            <span class="status-dot"></span>
                            Not connected
                        </div>
                        <button class="btn btn-primary" onclick={connectLinkedIn}>Connect</button>
                    {/if}
                </div>
            </div>

            <!-- ── Dev.to Card ───────────────────────────────────────── -->
            <div class="platform-card">
                <div class="card-header">
                    <div class="platform-icon devto-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                            <path d="M7.826 10.083a.784.784 0 00-.468-.175h-.701v4.198h.701a.786.786 0 00.469-.175c.155-.117.233-.292.233-.525v-2.798c.001-.233-.079-.408-.234-.525zM19.236 3H4.764C3.791 3 3.002 3.787 3 4.76v14.48c.002.973.791 1.76 1.764 1.76h14.473c.973 0 1.762-.787 1.763-1.76V4.76C21 3.788 20.21 3 19.236 3zM9.195 13.414h-.73v.78H7.39V9.807h1.806c.502 0 .916.09 1.241.27.325.18.487.434.487.762v1.535c0 .328-.162.582-.487.768a2.175 2.175 0 01-1.242.272zm5.023.782h-1.078c-.065 0-.116-.02-.152-.055-.035-.035-.052-.084-.052-.146v-.014l-.623-2.016-.016-.044c-.022-.073-.044-.11-.068-.11s-.035.065-.035.195v2.19h-1.08V9.807h1.063c.065 0 .116.02.153.055.035.035.052.084.052.146v.014l.594 2.016.016.044c.022.073.044.11.068.11s.035-.065.035-.195V9.814l.046-.007h1.034v4.39h.023zm2.724-3.42H15.85v.78h.975v.78h-.975v.78h1.092v.78h-2.17V9.807h2.171v.969z"/>
                        </svg>
                    </div>
                    <div class="platform-info">
                        <h2 class="platform-name">Dev.to</h2>
                        <p class="platform-desc">Connect your Dev.to account to publish articles directly from Cascade.</p>
                    </div>
                </div>

                <div class="card-status-row">
                    {#if devtoLoading}
                        <div class="status-loading">
                            <div class="spinner small"></div>
                            <span>Connecting…</span>
                        </div>
                    {:else if accounts.devto.connected}
                        <div class="status connected">
                            <span class="status-dot connected"></span>
                            Connected — {'username' in accounts.devto ? accounts.devto.username : ''}
                        </div>
                        <button class="btn btn-ghost" onclick={disconnectDevTo}>Disconnect</button>
                    {:else}
                        <div class="status disconnected">
                            <span class="status-dot"></span>
                            Not connected
                        </div>
                        <button class="btn btn-primary" onclick={connectDevTo}>Save</button>
                    {/if}
                </div>

                {#if !accounts.devto.connected && !devtoLoading}
                    <div class="key-input-row">
                        <input
                            id="devto-key"
                            class="key-input"
                            type="password"
                            placeholder="Paste your Dev.to API key…"
                            bind:value={devtoKey}
                        />
                    </div>
                    {#if devtoError}
                        <p class="field-error">{devtoError}</p>
                    {/if}
                    <p class="hint">
                        Generate at <a href="https://dev.to/settings/extensions" target="_blank" rel="noopener">dev.to/settings/extensions</a>
                    </p>
                {/if}
            </div>

            <!-- ── Medium Card ───────────────────────────────────────── -->
            <div class="platform-card">
                <div class="card-header">
                    <div class="platform-icon medium-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                            <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
                        </svg>
                    </div>
                    <div class="platform-info">
                        <h2 class="platform-name">Medium</h2>
                        <p class="platform-desc">Connect your Medium account to publish stories directly from Cascade.</p>
                    </div>
                </div>

                <div class="card-status-row">
                    {#if mediumLoading}
                        <div class="status-loading">
                            <div class="spinner small"></div>
                            <span>Connecting…</span>
                        </div>
                    {:else if accounts.medium.connected}
                        <div class="status connected">
                            <span class="status-dot connected"></span>
                            Connected — {'username' in accounts.medium ? accounts.medium.username : ''}
                        </div>
                        <button class="btn btn-ghost" onclick={disconnectMedium}>Disconnect</button>
                    {:else}
                        <div class="status disconnected">
                            <span class="status-dot"></span>
                            Not connected
                        </div>
                        <button class="btn btn-primary" onclick={connectMedium}>Save</button>
                    {/if}
                </div>

                {#if !accounts.medium.connected && !mediumLoading}
                    <div class="key-input-row">
                        <input
                            id="medium-token"
                            class="key-input"
                            type="password"
                            placeholder="Paste your Medium integration token…"
                            bind:value={mediumToken}
                        />
                    </div>
                    {#if mediumError}
                        <p class="field-error">{mediumError}</p>
                    {/if}
                    <p class="hint">
                        Generate at <a href="https://medium.com/settings/security" target="_blank" rel="noopener">medium.com/settings/security</a>
                    </p>
                {/if}
            </div>

        </div>
    {/if}
</div>

<style>
    :global(*, *::before, *::after) {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    :global(body) {
        font-family: 'Inter', sans-serif;
        background: #ffffff;
        color: #1a1a1a;
        min-height: 100vh;
    }

    .settings-page {
        min-height: 100vh;
        padding: 48px 40px;
        max-width: 860px;
        margin: 0 auto;
        background: radial-gradient(
                ellipse 80% 50% at 20% -10%,
                rgba(244, 114, 182, 0.09) 0%,
                transparent 60%
            ),
            radial-gradient(
                ellipse 60% 40% at 80% 110%,
                rgba(168, 85, 247, 0.06) 0%,
                transparent 60%
            ),
            #ffffff;
    }

    /* ── Header ────────────────────────────────────────────────────────── */
    .page-header {
        margin-bottom: 40px;
    }

    .page-title {
        font-size: 28px;
        font-weight: 700;
        background: linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 8px;
        letter-spacing: -0.5px;
    }

    .page-subtitle {
        font-size: 14px;
        color: rgba(26, 26, 26, 0.55);
        font-weight: 400;
    }

    /* ── Global loading ────────────────────────────────────────────────── */
    .global-loading {
        display: flex;
        align-items: center;
        gap: 14px;
        color: rgba(26, 26, 26, 0.5);
        font-size: 14px;
        padding: 48px 0;
    }

    /* ── Cards ─────────────────────────────────────────────────────────── */
    .cards-grid {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .platform-card {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 16px;
        padding: 28px;
        box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.04),
            0 0 0 1px rgba(244, 114, 180, 0.04);
        transition: box-shadow 0.2s ease, border-color 0.2s ease;
    }

    .platform-card:hover {
        border-color: rgba(244, 114, 180, 0.2);
        box-shadow:
            0 4px 20px rgba(244, 114, 180, 0.08),
            0 0 0 1px rgba(244, 114, 180, 0.1);
    }

    /* ── Card header ────────────────────────────────────────────────────── */
    .card-header {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 20px;
    }

    .platform-icon {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .linkedin-icon {
        background: rgba(0, 119, 181, 0.1);
        color: #0077b5;
    }

    .devto-icon {
        background: rgba(10, 10, 10, 0.07);
        color: #0a0a0a;
    }

    .medium-icon {
        background: rgba(26, 26, 26, 0.07);
        color: #1a1a1a;
    }

    .platform-info {
        flex: 1;
    }

    .platform-name {
        font-size: 16px;
        font-weight: 650;
        color: #1a1a1a;
        margin-bottom: 4px;
    }

    .platform-desc {
        font-size: 13px;
        color: rgba(26, 26, 26, 0.5);
        line-height: 1.5;
    }

    /* ── Status row ─────────────────────────────────────────────────────── */
    .card-status-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
    }

    .status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13.5px;
        font-weight: 500;
    }

    .status.connected {
        color: #16a34a;
    }

    .status.disconnected {
        color: #6b7280;
    }

    .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #6b7280;
        flex-shrink: 0;
    }

    .status-dot.connected {
        background: #22c55e;
        box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
    }

    .status-loading {
        display: flex;
        align-items: center;
        gap: 10px;
        color: rgba(26, 26, 26, 0.5);
        font-size: 13.5px;
    }

    /* ── Key input ──────────────────────────────────────────────────────── */
    .key-input-row {
        margin-top: 16px;
    }

    .key-input {
        width: 100%;
        padding: 10px 14px;
        border-radius: 8px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        background: rgba(255, 255, 255, 0.8);
        font-family: 'Inter', sans-serif;
        font-size: 13.5px;
        color: #1a1a1a;
        outline: none;
        transition: border-color 0.18s ease, box-shadow 0.18s ease;
    }

    .key-input:focus {
        border-color: #f472b4;
        box-shadow: 0 0 0 3px rgba(244, 114, 180, 0.12);
    }

    .key-input::placeholder {
        color: rgba(26, 26, 26, 0.35);
    }

    .field-error {
        margin-top: 8px;
        font-size: 12.5px;
        color: #ef4444;
    }

    .hint {
        margin-top: 10px;
        font-size: 12px;
        color: rgba(26, 26, 26, 0.45);
    }

    .hint a {
        color: #f472b4;
        text-decoration: none;
    }

    .hint a:hover {
        text-decoration: underline;
    }

    /* ── Buttons ────────────────────────────────────────────────────────── */
    .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 18px;
        border-radius: 8px;
        font-family: 'Inter', sans-serif;
        font-size: 13.5px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition:
            background 0.18s ease,
            opacity 0.18s ease,
            box-shadow 0.18s ease;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .btn-primary {
        background: linear-gradient(135deg, #f472b4, #a855f7);
        color: #fff;
        box-shadow: 0 2px 8px rgba(244, 114, 180, 0.3);
    }

    .btn-primary:hover {
        box-shadow: 0 4px 16px rgba(244, 114, 180, 0.45);
        opacity: 0.92;
    }

    .btn-ghost {
        background: rgba(0, 0, 0, 0.05);
        color: rgba(26, 26, 26, 0.65);
        border: 1px solid rgba(0, 0, 0, 0.08);
    }

    .btn-ghost:hover {
        background: rgba(239, 68, 68, 0.07);
        color: #ef4444;
        border-color: rgba(239, 68, 68, 0.2);
    }

    /* ── Spinner ────────────────────────────────────────────────────────── */
    .spinner {
        width: 22px;
        height: 22px;
        border: 2.5px solid rgba(244, 114, 180, 0.2);
        border-top-color: #f472b4;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        flex-shrink: 0;
    }

    .spinner.small {
        width: 16px;
        height: 16px;
        border-width: 2px;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    /* ── Responsive ─────────────────────────────────────────────────────── */
    @media (max-width: 600px) {
        .settings-page {
            padding: 32px 20px;
        }

        .card-status-row {
            flex-wrap: wrap;
        }

        .platform-card {
            padding: 20px;
        }
    }
</style>
