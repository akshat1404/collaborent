<script lang="ts">
    import { page } from '$app/stores';

    let { children } = $props();

    let pathname = $derived($page.url.pathname);

    const navItems = [
        { href: '/dashboard', label: 'Documents', icon: '📄' },
        { href: '/dashboard/workflows', label: 'Workflows', icon: '⚡' },
        { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
    ];

    function isActive(href: string): boolean {
        if (href === '/dashboard') {
            return pathname === '/dashboard';
        }
        return pathname.startsWith(href);
    }
</script>

<div class="dashboard-layout">
    <aside class="sidebar">
        <div class="sidebar-brand">
            <span class="brand-icon">✦</span>
            <span class="brand-name">Cascade</span>
        </div>

        <nav class="sidebar-nav">
            {#each navItems as item}
                <a
                    href={item.href}
                    class="nav-item"
                    class:active={isActive(item.href)}
                >
                    <span class="nav-icon">{item.icon}</span>
                    <span class="nav-label">{item.label}</span>
                </a>
            {/each}
        </nav>

        <div class="sidebar-footer">
            <span class="footer-version">v0.1.0</span>
        </div>
    </aside>

    <main class="main-content">
        {@render children()}
    </main>
</div>

<style>
    .dashboard-layout {
        display: flex;
        min-height: 100vh;
        width: 100%;
    }

    /* ── Sidebar ─────────────────────────────────────────────────────────── */
    .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        width: 220px;
        z-index: 100;
        display: flex;
        flex-direction: column;

        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-right: 1px solid rgba(255, 255, 255, 0.1);

        padding: 24px 0;
        transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
    }

    /* ── Brand ───────────────────────────────────────────────────────────── */
    .sidebar-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 20px 28px;
        border-bottom: 1px solid rgba(244, 114, 180, 0.15);
    }

    .brand-icon {
        font-size: 18px;
        color: #f472b4;
        flex-shrink: 0;
        filter: drop-shadow(0 0 6px rgba(244, 114, 180, 0.6));
    }

    .brand-name {
        font-family: 'Inter', sans-serif;
        font-size: 16px;
        font-weight: 700;
        background: linear-gradient(135deg, #f472b4, #a855f7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        white-space: nowrap;
        letter-spacing: -0.3px;
    }

    /* ── Nav ─────────────────────────────────────────────────────────────── */
    .sidebar-nav {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 20px 12px 0;
    }

    .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 10px;
        text-decoration: none;
        font-family: 'Inter', sans-serif;
        font-size: 13.5px;
        font-weight: 500;
        color: rgba(26, 26, 26, 0.6);
        border-left: 3px solid transparent;
        transition:
            background 0.18s ease,
            color 0.18s ease,
            border-color 0.18s ease;
        white-space: nowrap;
        position: relative;
    }

    .nav-item:hover {
        background: rgba(244, 114, 180, 0.08);
        color: #1a1a1a;
    }

    .nav-item.active {
        background: rgba(244, 114, 180, 0.1);
        color: #1a1a1a;
        border-left-color: #f472b4;
        font-weight: 600;
    }

    .nav-icon {
        font-size: 16px;
        flex-shrink: 0;
        width: 20px;
        text-align: center;
    }

    .nav-label {
        transition: opacity 0.2s ease;
    }

    /* ── Footer ──────────────────────────────────────────────────────────── */
    .sidebar-footer {
        padding: 16px 20px 0;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        margin-top: auto;
    }

    .footer-version {
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        color: rgba(26, 26, 26, 0.3);
        white-space: nowrap;
    }

    /* ── Main content ────────────────────────────────────────────────────── */
    .main-content {
        margin-left: 220px;
        flex: 1;
        min-height: 100vh;
        transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* ── Mobile: collapse sidebar to icons only ──────────────────────────── */
    @media (max-width: 767px) {
        .sidebar {
            width: 60px;
        }

        .brand-name,
        .nav-label,
        .footer-version {
            opacity: 0;
            pointer-events: none;
        }

        .sidebar-brand {
            justify-content: center;
            padding: 0 0 20px;
        }

        .nav-item {
            justify-content: center;
            padding: 10px 0;
            border-left: none;
            border-bottom: 3px solid transparent;
        }

        .nav-item.active {
            border-left: none;
            border-bottom-color: #f472b4;
        }

        .sidebar-nav {
            padding: 16px 8px 0;
            align-items: center;
        }

        .main-content {
            margin-left: 60px;
        }
    }
</style>
