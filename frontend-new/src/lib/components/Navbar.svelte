<script lang="ts">
    interface Props {
        onSignOut: () => void;
        onCreateDoc?: () => void;
    }

    let { onSignOut, onCreateDoc }: Props = $props();

    let menuOpen = $state(false);

    function toggleMenu() {
        menuOpen = !menuOpen;
    }

    function handleCreate() {
        menuOpen = false;
        onCreateDoc?.();
    }

    function handleSignOut() {
        menuOpen = false;
        onSignOut();
    }
</script>

<nav class="navbar">
    <div class="navbar-left"></div>
    <span class="navbar-brand">Cascade</span>
    <div class="navbar-right">
        <div class="navbar-actions desktop-only">
            <a class="btn-docs" href="https://cascade-docs-seven.vercel.app/" target="_blank" rel="noopener noreferrer">
                Docs
            </a>
            <button class="btn-create" id="create-doc-btn" onclick={onCreateDoc}>
                <span class="btn-icon">+</span> Create
            </button>
            <button class="btn-signout" id="signout-btn" onclick={onSignOut}>
                Sign out
            </button>
        </div>
        <button class="menu-toggle mobile-only" id="menu-toggle-btn" onclick={toggleMenu} aria-label="Toggle menu">
            <span class="hamburger-line" class:open={menuOpen}></span>
            <span class="hamburger-line" class:open={menuOpen}></span>
            <span class="hamburger-line" class:open={menuOpen}></span>
        </button>
    </div>
</nav>

{#if menuOpen}
    <div class="mobile-menu mobile-only" role="menu" tabindex="-1">
        <a class="mobile-item" href="https://cascade-docs-seven.vercel.app/" target="_blank" rel="noopener noreferrer" onclick={() => menuOpen = false}>
            Docs
        </a>
        <button class="mobile-item" onclick={handleCreate}>
            + Create
        </button>
        <button class="mobile-item signout-item" onclick={handleSignOut}>
            Sign out
        </button>
    </div>
{/if}

<style>
    .navbar {
        position: sticky;
        top: 0;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 1.5rem;
        height: 64px;
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border-bottom: 1px solid rgba(236, 72, 153, 0.2);
        box-shadow: 0 2px 24px rgba(236, 72, 153, 0.08);
    }

    .navbar-left,
    .navbar-right {
        flex: 1;
        display: flex;
        align-items: center;
    }

    .navbar-right {
        justify-content: flex-end;
    }

    .navbar-brand {
        font-size: 1.35rem;
        font-weight: 700;
        letter-spacing: -0.5px;
        background: linear-gradient(135deg, #f9a8d4, #e879f9);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        flex-shrink: 0;
    }

    .navbar-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .desktop-only {
        display: flex;
    }

    .mobile-only {
        display: none;
    }

    .btn-create {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.45rem 1.1rem;
        border-radius: 999px;
        border: none;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.875rem;
        font-weight: 600;
        background: linear-gradient(135deg, #ec4899, #a855f7);
        color: #fff;
        box-shadow: 0 0 18px rgba(236, 72, 153, 0.35);
        transition:
            transform 0.18s ease,
            box-shadow 0.18s ease;
    }

    .btn-create:hover {
        transform: translateY(-1px) scale(1.03);
        box-shadow: 0 0 28px rgba(236, 72, 153, 0.55);
    }

    .btn-create:active {
        transform: translateY(0) scale(0.98);
    }

    .btn-icon {
        font-size: 1rem;
        line-height: 1;
    }

    .btn-docs,
    .btn-signout {
        padding: 0.45rem 1.1rem;
        border-radius: 999px;
        border: 1px solid rgba(236, 72, 153, 0.35);
        cursor: pointer;
        font-family: inherit;
        font-size: 0.875rem;
        font-weight: 500;
        background: rgba(236, 72, 153, 0.06);
        color: #be185d;
        backdrop-filter: blur(8px);
        transition:
            background 0.18s ease,
            border-color 0.18s ease,
            transform 0.18s ease;
        text-decoration: none;
    }

    .btn-docs:hover,
    .btn-signout:hover {
        background: rgba(236, 72, 153, 0.12);
        border-color: rgba(236, 72, 153, 0.6);
        transform: translateY(-1px);
    }

    .btn-docs:active,
    .btn-signout:active {
        transform: translateY(0);
    }

    .menu-toggle {
        background: none;
        border: none;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 5px;
        padding: 0.4rem;
        border-radius: 8px;
        transition: background 0.18s ease;
    }

    .menu-toggle:hover {
        background: rgba(236, 72, 153, 0.08);
    }

    .hamburger-line {
        display: block;
        width: 22px;
        height: 2px;
        background: linear-gradient(135deg, #ec4899, #a855f7);
        border-radius: 2px;
        transition: transform 0.25s ease, opacity 0.25s ease;
    }

    .hamburger-line:nth-child(1).open {
        transform: translateY(7px) rotate(45deg);
    }

    .hamburger-line:nth-child(2).open {
        opacity: 0;
        transform: scaleX(0);
    }

    .hamburger-line:nth-child(3).open {
        transform: translateY(-7px) rotate(-45deg);
    }

    .mobile-menu {
        position: sticky;
        top: 64px;
        z-index: 99;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border-bottom: 1px solid rgba(236, 72, 153, 0.2);
        box-shadow: 0 8px 24px rgba(236, 72, 153, 0.1);
        display: flex;
        flex-direction: column;
        padding: 0.75rem 1.5rem 1rem;
        gap: 0.5rem;
        animation: slideDown 0.2s ease;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .mobile-item {
        display: block;
        width: 100%;
        padding: 0.7rem 1rem;
        border-radius: 12px;
        border: 1px solid rgba(236, 72, 153, 0.2);
        background: rgba(236, 72, 153, 0.04);
        color: #be185d;
        font-family: inherit;
        font-size: 0.9rem;
        font-weight: 500;
        text-align: left;
        text-decoration: none;
        cursor: pointer;
        transition:
            background 0.18s ease,
            border-color 0.18s ease;
    }

    .mobile-item:hover {
        background: rgba(236, 72, 153, 0.1);
        border-color: rgba(236, 72, 153, 0.45);
    }

    .signout-item {
        color: #9d174d;
        border-color: rgba(236, 72, 153, 0.15);
    }

    @media (max-width: 640px) {
        .desktop-only {
            display: none;
        }

        .mobile-only {
            display: flex;
        }
    }
</style>
