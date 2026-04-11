<script lang="ts">
</script>

<svelte:head>
    <title>Workflows — Cascade</title>
</svelte:head>

<div class="workflows-page">
    <div class="page-header">
        <h1 class="page-title">Workflows</h1>
        <p class="page-subtitle">Schedule and automate your publishing pipeline.</p>
    </div>

    <div class="coming-soon">
        <div class="cs-icon">⚡</div>
        <h2>Coming soon</h2>
        <p>Workflows let you publish to Medium, LinkedIn, and Dev.to on a schedule — each step can reference URLs from previous steps.</p>
    </div>
</div>

<style>
    :global(body) {
        font-family: 'Inter', sans-serif;
    }

    .workflows-page {
        min-height: 100vh;
        padding: 48px 40px;
        max-width: 860px;
        margin: 0 auto;
    }

    .page-header {
        margin-bottom: 48px;
    }

    .page-title {
        font-size: 28px;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 8px;
        letter-spacing: -0.5px;
    }

    .page-subtitle {
        font-size: 14px;
        color: rgba(26, 26, 26, 0.5);
    }

    .coming-soon {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 80px 40px;
        background: rgba(255, 255, 255, 0.6);
        border: 1px dashed rgba(244, 114, 180, 0.3);
        border-radius: 20px;
        text-align: center;
    }

    .cs-icon {
        font-size: 40px;
        filter: grayscale(0.3);
    }

    .coming-soon h2 {
        font-size: 20px;
        font-weight: 650;
        color: #1a1a1a;
    }

    .coming-soon p {
        font-size: 14px;
        color: rgba(26, 26, 26, 0.5);
        max-width: 440px;
        line-height: 1.6;
    }
</style>
