<script lang="ts">
    import { onMount } from 'svelte';

    const NOTE_PLACEHOLDER = 'Add a note or caption for this post\u2026 Use {{step-N-url}} to reference a previous step\'s URL.';
    const TOKEN_EXAMPLE = '{{step-N-url}}';

    // ── Types ─────────────────────────────────────────────────────────────
    type Platform = 'medium' | 'linkedin' | 'devto';
    type StepStatus = 'pending' | 'running' | 'done' | 'failed';
    type WorkflowStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'failed';

    interface Step {
        id: string;
        platform: Platform | null;
        scheduledTime: string;       // HH:MM string
        scheduledDate: string;       // YYYY-MM-DD string
        note: string;                // extra note / cross-ref like {{step-1-url}}
        status: StepStatus;
        publishedUrl?: string;
    }

    interface Workflow {
        id: string;
        name: string;
        documentId: string | null;
        documentTitle: string;
        steps: Step[];
        status: WorkflowStatus;
        createdAt: string;
    }

    interface MockDocument {
        id: string;
        title: string;
        updatedAt: string;
    }

    // ── Mock data ─────────────────────────────────────────────────────────
    const mockDocuments: MockDocument[] = [
        { id: 'doc1', title: 'How I built a SaaS in 7 days', updatedAt: '2026-04-20' },
        { id: 'doc2', title: 'The Future of AI-Assisted Writing', updatedAt: '2026-04-18' },
        { id: 'doc3', title: 'Go vs Node.js: A Real-World Comparison', updatedAt: '2026-04-15' },
        { id: 'doc4', title: 'Svelte 5 Runes — Everything You Need to Know', updatedAt: '2026-04-10' },
    ];

    const mockWorkflows: Workflow[] = [
        {
            id: 'wf1',
            name: 'SaaS article blitz',
            documentId: 'doc1',
            documentTitle: 'How I built a SaaS in 7 days',
            status: 'completed',
            createdAt: '2026-04-20',
            steps: [
                { id: 's1', platform: 'medium', scheduledTime: '09:00', scheduledDate: '2026-04-21', note: '', status: 'done', publishedUrl: 'https://medium.com/@akshat/article' },
                { id: 's2', platform: 'linkedin', scheduledTime: '10:00', scheduledDate: '2026-04-21', note: 'Read the full story here: {{step-1-url}}', status: 'done', publishedUrl: 'https://linkedin.com/posts/123' },
                { id: 's3', platform: 'devto', scheduledTime: '11:00', scheduledDate: '2026-04-21', note: '', status: 'done', publishedUrl: 'https://dev.to/akshat/article' },
            ],
        },
        {
            id: 'wf2',
            name: 'AI writing piece',
            documentId: 'doc2',
            documentTitle: 'The Future of AI-Assisted Writing',
            status: 'scheduled',
            createdAt: '2026-04-19',
            steps: [
                { id: 's4', platform: 'medium', scheduledTime: '14:00', scheduledDate: '2026-04-22', note: '', status: 'pending' },
                { id: 's5', platform: 'devto', scheduledTime: '15:30', scheduledDate: '2026-04-22', note: '', status: 'pending' },
            ],
        },
    ];

    // ── Page-level state ──────────────────────────────────────────────────
    let workflows = $state<Workflow[]>(mockWorkflows);
    let view = $state<'list' | 'builder'>('list');
    let editingWorkflow = $state<Workflow | null>(null);
    let showDocPicker = $state(false);
    let docPickerStepId = $state<string | null>(null); // null = picking for workflow level

    // ── Builder state (derived from editingWorkflow) ───────────────────────
    function newStep(): Step {
        const today = new Date().toISOString().split('T')[0];
        return {
            id: crypto.randomUUID(),
            platform: null,
            scheduledTime: '09:00',
            scheduledDate: today,
            note: '',
            status: 'pending',
        };
    }

    function openNewWorkflow() {
        const today = new Date().toISOString().split('T')[0];
        editingWorkflow = {
            id: crypto.randomUUID(),
            name: '',
            documentId: null,
            documentTitle: '',
            steps: [newStep()],
            status: 'draft',
            createdAt: today,
        };
        view = 'builder';
    }

    function openEditWorkflow(wf: Workflow) {
        // Deep clone
        editingWorkflow = JSON.parse(JSON.stringify(wf));
        view = 'builder';
    }

    function closeBuilder() {
        view = 'list';
        editingWorkflow = null;
    }

    function saveWorkflow() {
        if (!editingWorkflow) return;
        const idx = workflows.findIndex(w => w.id === editingWorkflow!.id);
        if (idx >= 0) {
            workflows[idx] = { ...editingWorkflow };
        } else {
            workflows = [...workflows, { ...editingWorkflow }];
        }
        closeBuilder();
    }

    function deleteWorkflow(id: string) {
        workflows = workflows.filter(w => w.id !== id);
    }

    // ── Step manipulation ────────────────────────────────────────────────
    function addStep() {
        if (!editingWorkflow) return;
        editingWorkflow.steps = [...editingWorkflow.steps, newStep()];
    }

    function removeStep(stepId: string) {
        if (!editingWorkflow) return;
        editingWorkflow.steps = editingWorkflow.steps.filter(s => s.id !== stepId);
    }

    function setPlatform(stepId: string, platform: Platform) {
        if (!editingWorkflow) return;
        editingWorkflow.steps = editingWorkflow.steps.map(s =>
            s.id === stepId ? { ...s, platform } : s
        );
    }

    function setStepField<K extends keyof Step>(stepId: string, field: K, value: Step[K]) {
        if (!editingWorkflow) return;
        editingWorkflow.steps = editingWorkflow.steps.map(s =>
            s.id === stepId ? { ...s, [field]: value } : s
        );
    }

    // ── Document picker ──────────────────────────────────────────────────
    function pickDocument(doc: MockDocument) {
        if (!editingWorkflow) return;
        editingWorkflow.documentId = doc.id;
        editingWorkflow.documentTitle = doc.title;
        showDocPicker = false;
    }

    // ── Cross-ref token insert ────────────────────────────────────────────
    function insertToken(stepId: string, token: string) {
        if (!editingWorkflow) return;
        const step = editingWorkflow.steps.find(s => s.id === stepId);
        if (!step) return;
        setStepField(stepId, 'note', step.note + token);
    }

    // ── Platform helpers ─────────────────────────────────────────────────
    const PLATFORMS: { id: Platform; label: string; color: string; bg: string }[] = [
        { id: 'medium',   label: 'Medium',   color: '#1a1a1a', bg: 'rgba(26,26,26,0.07)' },
        { id: 'linkedin', label: 'LinkedIn', color: '#0077b5', bg: 'rgba(0,119,181,0.1)' },
        { id: 'devto',    label: 'Dev.to',   color: '#3b49df', bg: 'rgba(59,73,223,0.1)' },
    ];

    function platformInfo(id: Platform | null) {
        return PLATFORMS.find(p => p.id === id) ?? null;
    }

    function statusLabel(s: WorkflowStatus): string {
        return ({ draft: 'Draft', scheduled: 'Scheduled', running: 'Running', completed: 'Completed', failed: 'Failed' })[s] ?? s;
    }

    function stepStatusLabel(s: StepStatus) {
        return ({ pending: 'Pending', running: 'Running…', done: 'Done', failed: 'Failed' })[s] ?? s;
    }

    // ── Cross-ref tokens available for a step (all prior steps that have platform) ──
    function priorTokens(stepIndex: number): string[] {
        if (!editingWorkflow) return [];
        return editingWorkflow.steps
            .slice(0, stepIndex)
            .filter(s => s.platform !== null)
            .map((_, i) => `{{step-${i + 1}-url}}`);
    }
</script>

<svelte:head>
    <title>Workflows — Cascade</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link
        href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;1,14..32,400&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<!-- ══════════════════════════════════════════════════════════════════════ -->
<!--  LIST VIEW                                                            -->
<!-- ══════════════════════════════════════════════════════════════════════ -->
{#if view === 'list'}
<div class="page">
    <div class="page-header">
        <div class="header-left">
            <h1 class="page-title">Workflows</h1>
            <p class="page-subtitle">Schedule and automate your publishing pipeline across platforms.</p>
        </div>
        <button class="btn btn-primary" id="new-workflow-btn" onclick={openNewWorkflow}>
            <span class="btn-icon">+</span> New Workflow
        </button>
    </div>

    {#if workflows.length === 0}
        <!-- Empty state -->
        <div class="empty-state">
            <div class="empty-icon">⚡</div>
            <h2>No workflows yet</h2>
            <p>Create a workflow to publish your documents to Medium, LinkedIn, and Dev.to — automatically, in sequence.</p>
            <button class="btn btn-primary" onclick={openNewWorkflow}>
                <span class="btn-icon">+</span> Create your first workflow
            </button>
        </div>
    {:else}
        <div class="workflow-list">
            {#each workflows as wf (wf.id)}
                <div class="wf-card" onclick={() => openEditWorkflow(wf)}>
                    <!-- card top row -->
                    <div class="wf-card-top">
                        <div class="wf-meta">
                            <h2 class="wf-name">{wf.name || 'Untitled workflow'}</h2>
                            <span class="wf-doc">
                                <span class="doc-icon">📄</span>
                                {wf.documentTitle || 'No document linked'}
                            </span>
                        </div>
                        <div class="wf-actions">
                            <span class="status-badge status-{wf.status}">{statusLabel(wf.status)}</span>
                            <button
                                class="icon-btn danger"
                                title="Delete workflow"
                                onclick={(e) => { e.stopPropagation(); deleteWorkflow(wf.id); }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- step pipeline preview -->
                    <div class="pipeline">
                        {#each wf.steps as step, i}
                            {@const pInfo = platformInfo(step.platform)}
                            <div class="pipe-step" class:done={step.status === 'done'} class:failed={step.status === 'failed'}>
                                <div class="pipe-dot" style="background:{pInfo?.color ?? '#9ca3af'}">
                                    {#if step.status === 'done'}
                                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
                                    {:else if step.status === 'failed'}✕{:else}{i + 1}{/if}
                                </div>
                                <span class="pipe-platform">{pInfo?.label ?? '—'}</span>
                                <span class="pipe-time">{step.scheduledTime}</span>
                                {#if step.publishedUrl}
                                    <a href={step.publishedUrl} target="_blank" rel="noopener" class="pipe-url" onclick={(e) => e.stopPropagation()}>↗</a>
                                {/if}
                            </div>
                            {#if i < wf.steps.length - 1}
                                <div class="pipe-connector"></div>
                            {/if}
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<!-- ══════════════════════════════════════════════════════════════════════ -->
<!--  BUILDER VIEW                                                         -->
<!-- ══════════════════════════════════════════════════════════════════════ -->
{:else if view === 'builder' && editingWorkflow}
<div class="builder-page">

    <!-- Top bar -->
    <div class="builder-topbar">
        <button class="back-btn" onclick={closeBuilder}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
            </svg>
            Workflows
        </button>
        <div class="builder-topbar-center">
            <input
                class="wf-name-input"
                placeholder="Workflow name…"
                bind:value={editingWorkflow.name}
                id="wf-name-input"
            />
        </div>
        <button class="btn btn-primary" onclick={saveWorkflow} id="save-workflow-btn">
            Save
        </button>
    </div>

    <div class="builder-body">

        <!-- Left: config panel -->
        <div class="builder-left">

            <!-- Document selector -->
            <section class="config-section">
                <h3 class="section-label">
                    <span>📄</span> Source Document
                </h3>
                {#if editingWorkflow.documentId}
                    <div class="selected-doc">
                        <span class="selected-doc-title">{editingWorkflow.documentTitle}</span>
                        <button class="link-btn" onclick={() => { showDocPicker = true; }}>Change</button>
                    </div>
                {:else}
                    <button class="doc-pick-btn" id="pick-doc-btn" onclick={() => { showDocPicker = true; }}>
                        <span class="doc-pick-icon">📄</span>
                        <span>Pick a document…</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                {/if}
            </section>

            <!-- Steps builder -->
            <section class="config-section">
                <h3 class="section-label">
                    <span>⚡</span> Steps
                    <span class="step-count">{editingWorkflow.steps.length}</span>
                </h3>

                <div class="steps-list">
                    {#each editingWorkflow.steps as step, i (step.id)}
                        <div class="step-card">
                            <!-- Step header -->
                            <div class="step-header">
                                <div class="step-num-badge">{i + 1}</div>
                                <span class="step-header-label">Step {i + 1}</span>
                                {#if editingWorkflow.steps.length > 1}
                                    <button
                                        class="icon-btn danger small"
                                        onclick={() => removeStep(step.id)}
                                        title="Remove step"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    </button>
                                {/if}
                            </div>

                            <!-- Platform picker -->
                            <div class="field-group">
                                <label class="field-label">Publish to</label>
                                <div class="platform-pills">
                                    {#each PLATFORMS as plat}
                                        <button
                                            class="platform-pill"
                                            class:selected={step.platform === plat.id}
                                            style="--p-color:{plat.color}; --p-bg:{plat.bg}"
                                            onclick={() => setPlatform(step.id, plat.id)}
                                        >{plat.label}</button>
                                    {/each}
                                </div>
                            </div>

                            <!-- Date + Time -->
                            <div class="field-row">
                                <div class="field-group half">
                                    <label class="field-label" for="date-{step.id}">Date</label>
                                    <input
                                        id="date-{step.id}"
                                        class="field-input"
                                        type="date"
                                        value={step.scheduledDate}
                                        oninput={(e) => setStepField(step.id, 'scheduledDate', (e.target as HTMLInputElement).value)}
                                    />
                                </div>
                                <div class="field-group half">
                                    <label class="field-label" for="time-{step.id}">Time</label>
                                    <input
                                        id="time-{step.id}"
                                        class="field-input"
                                        type="time"
                                        value={step.scheduledTime}
                                        oninput={(e) => setStepField(step.id, 'scheduledTime', (e.target as HTMLInputElement).value)}
                                    />
                                </div>
                            </div>

                            <!-- Note / cross-reference -->
                            <div class="field-group">
                                <label class="field-label" for="note-{step.id}">
                                    Note / Caption
                                    <span class="field-sublabel">— supports cross-step tokens</span>
                                </label>
                                <textarea
                                    id="note-{step.id}"
                                    class="field-textarea"
                                    placeholder={NOTE_PLACEHOLDER}
                                    value={step.note}
                                    oninput={(e) => setStepField(step.id, 'note', (e.target as HTMLTextAreaElement).value)}
                                    rows="2"
                                ></textarea>

                                <!-- Token insert buttons (only prior steps with a platform) -->
                                {#if priorTokens(i).length > 0}
                                    <div class="token-row">
                                        <span class="token-label">Insert:</span>
                                        {#each priorTokens(i) as token}
                                            <button
                                                class="token-btn"
                                                onclick={() => insertToken(step.id, token)}
                                            >{token}</button>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        </div>

                        <!-- Connector arrow between steps -->
                        {#if i < editingWorkflow.steps.length - 1}
                            <div class="step-connector">
                                <div class="connector-line"></div>
                                <svg class="connector-arrow" width="10" height="10" viewBox="0 0 10 10" fill="#f472b4"><polygon points="5,10 0,0 10,0"/></svg>
                            </div>
                        {/if}
                    {/each}
                </div>

                <button class="add-step-btn" id="add-step-btn" onclick={addStep}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add Step
                </button>
            </section>
        </div>

        <!-- Right: live preview -->
        <div class="builder-right">
            <div class="preview-card">
                <div class="preview-header">
                    <span class="preview-tag">Preview</span>
                    <h3 class="preview-wf-name">{editingWorkflow.name || 'Untitled workflow'}</h3>
                    {#if editingWorkflow.documentTitle}
                        <span class="preview-doc">📄 {editingWorkflow.documentTitle}</span>
                    {/if}
                </div>

                <div class="preview-timeline">
                    {#each editingWorkflow.steps as step, i (step.id)}
                        {@const pInfo = platformInfo(step.platform)}
                        <div class="timeline-item">
                            <div class="timeline-left">
                                <div
                                    class="timeline-dot"
                                    style="background: {pInfo ? pInfo.color : '#e5e7eb'}"
                                >
                                    {i + 1}
                                </div>
                                {#if i < editingWorkflow.steps.length - 1}
                                    <div class="timeline-line"></div>
                                {/if}
                            </div>
                            <div class="timeline-content">
                                <div class="timeline-top">
                                    {#if pInfo}
                                        <span class="timeline-platform" style="color:{pInfo.color}">{pInfo.label}</span>
                                    {:else}
                                        <span class="timeline-platform muted">No platform</span>
                                    {/if}
                                    <span class="timeline-time">
                                        {step.scheduledDate ? new Date(step.scheduledDate + 'T' + step.scheduledTime).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : step.scheduledTime}
                                    </span>
                                </div>
                                {#if step.note}
                                    <div class="timeline-note">{step.note}</div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Cross-ref explainer card -->
            <div class="explainer-card">
                <div class="explainer-icon">💡</div>
                <div>
                    <p class="explainer-title">Cross-step references</p>
                    <p class="explainer-body">Use <code class="token-code">{TOKEN_EXAMPLE}</code> in a step's note to automatically insert the published URL from step N. The backend will substitute it once that step completes.</p>
                </div>
            </div>
        </div>
    </div>
</div>
{/if}

<!-- ══════════════════════════════════════════════════════════════════════ -->
<!--  DOCUMENT PICKER MODAL                                                -->
<!-- ══════════════════════════════════════════════════════════════════════ -->
{#if showDocPicker}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="modal-backdrop" onclick={() => (showDocPicker = false)}>
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div class="modal" onclick={(e) => e.stopPropagation()}>
            <div class="modal-header">
                <h3>Pick a document</h3>
                <button class="icon-btn" onclick={() => (showDocPicker = false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="modal-list">
                {#each mockDocuments as doc}
                    <button class="doc-row" onclick={() => pickDocument(doc)}>
                        <span class="doc-row-icon">📄</span>
                        <div class="doc-row-info">
                            <span class="doc-row-title">{doc.title}</span>
                            <span class="doc-row-date">Updated {doc.updatedAt}</span>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                {/each}
            </div>
        </div>
    </div>
{/if}


<style>
    /* ════════════════════════════════
       BASE
    ════════════════════════════════ */
    :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
    :global(body) {
        font-family: 'Inter', sans-serif;
        background: #f9f9fb;
        color: #1a1a1a;
        min-height: 100vh;
    }

    /* ════════════════════════════════
       LIST PAGE
    ════════════════════════════════ */
    .page {
        min-height: 100vh;
        padding: 48px 40px;
        max-width: 900px;
        margin: 0 auto;
    }

    .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 40px;
    }

    .page-title {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.5px;
        color: #1a1a1a;
        margin-bottom: 6px;
    }

    .page-subtitle {
        font-size: 13.5px;
        color: rgba(26,26,26,.5);
        line-height: 1.5;
        max-width: 400px;
    }

    /* ── Empty state ── */
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 14px;
        padding: 80px 40px;
        border: 1.5px dashed rgba(244,114,180,0.28);
        border-radius: 20px;
        background: rgba(255,255,255,0.6);
    }

    .empty-icon { font-size: 40px; }

    .empty-state h2 {
        font-size: 19px;
        font-weight: 650;
        color: #1a1a1a;
    }

    .empty-state p {
        font-size: 13.5px;
        color: rgba(26,26,26,.5);
        max-width: 380px;
        line-height: 1.6;
    }

    /* ── Workflow cards ── */
    .workflow-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .wf-card {
        background: #fff;
        border: 1px solid rgba(0,0,0,.07);
        border-radius: 16px;
        padding: 24px;
        cursor: pointer;
        transition: border-color .18s, box-shadow .18s, transform .15s;
        box-shadow: 0 1px 4px rgba(0,0,0,.04);
    }

    .wf-card:hover {
        border-color: rgba(244,114,180,.25);
        box-shadow: 0 4px 20px rgba(244,114,180,.1);
        transform: translateY(-1px);
    }

    .wf-card-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
    }

    .wf-meta { flex: 1; min-width: 0; }

    .wf-name {
        font-size: 16px;
        font-weight: 650;
        color: #1a1a1a;
        margin-bottom: 5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .wf-doc {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12.5px;
        color: rgba(26,26,26,.45);
    }

    .wf-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
    }

    /* Status badges */
    .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 600;
        letter-spacing: .3px;
    }

    .status-draft     { background: rgba(107,114,128,.1); color: #6b7280; }
    .status-scheduled { background: rgba(59,130,246,.1);  color: #2563eb; }
    .status-running   { background: rgba(249,115,22,.1);  color: #ea580c; }
    .status-completed { background: rgba(34,197,94,.12);  color: #16a34a; }
    .status-failed    { background: rgba(239,68,68,.1);   color: #dc2626; }

    /* Pipeline preview */
    .pipeline {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0;
    }

    .pipe-step {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 6px 10px;
        border-radius: 8px;
        background: rgba(0,0,0,.03);
        border: 1px solid rgba(0,0,0,.06);
        font-size: 12px;
        color: rgba(26,26,26,.6);
        transition: background .15s;
    }

    .pipe-step.done { background: rgba(34,197,94,.07); border-color: rgba(34,197,94,.2); }
    .pipe-step.failed { background: rgba(239,68,68,.06); border-color: rgba(239,68,68,.2); }

    .pipe-dot {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        font-weight: 700;
        color: #fff;
        flex-shrink: 0;
    }

    .pipe-platform { font-weight: 600; color: #1a1a1a; }
    .pipe-time { color: rgba(26,26,26,.4); }
    .pipe-url {
        color: #f472b4;
        text-decoration: none;
        font-weight: 600;
        font-size: 11px;
    }

    .pipe-connector {
        width: 20px;
        height: 1.5px;
        background: linear-gradient(90deg, rgba(244,114,180,.4), rgba(168,85,247,.4));
        flex-shrink: 0;
    }

    /* ════════════════════════════════
       BUILDER PAGE
    ════════════════════════════════ */
    .builder-page {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background: #f9f9fb;
    }

    /* ── Top bar ── */
    .builder-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 28px;
        height: 60px;
        background: rgba(255,255,255,.9);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid rgba(0,0,0,.07);
        position: sticky;
        top: 0;
        z-index: 50;
        gap: 16px;
    }

    .back-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13.5px;
        font-weight: 500;
        color: rgba(26,26,26,.55);
        background: none;
        border: none;
        cursor: pointer;
        padding: 6px 10px;
        border-radius: 8px;
        transition: background .15s, color .15s;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .back-btn:hover { background: rgba(0,0,0,.05); color: #1a1a1a; }

    .builder-topbar-center { flex: 1; display: flex; justify-content: center; }

    .wf-name-input {
        width: 100%;
        max-width: 360px;
        padding: 7px 14px;
        border-radius: 8px;
        border: 1.5px solid rgba(0,0,0,.1);
        background: #fff;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: #1a1a1a;
        outline: none;
        text-align: center;
        transition: border-color .18s, box-shadow .18s;
    }

    .wf-name-input::placeholder { color: rgba(26,26,26,.3); font-weight: 400; }
    .wf-name-input:focus {
        border-color: #f472b4;
        box-shadow: 0 0 0 3px rgba(244,114,180,.12);
    }

    /* ── Body ── */
    .builder-body {
        display: grid;
        grid-template-columns: 1fr 360px;
        gap: 24px;
        padding: 28px 28px 60px;
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
    }

    /* ── Left panel ── */
    .builder-left {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .config-section {
        background: #fff;
        border: 1px solid rgba(0,0,0,.07);
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 1px 4px rgba(0,0,0,.03);
    }

    .section-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 650;
        color: rgba(26,26,26,.5);
        text-transform: uppercase;
        letter-spacing: .6px;
        margin-bottom: 16px;
    }

    .step-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(244,114,180,.15);
        color: #f472b4;
        font-size: 11px;
        font-weight: 700;
        margin-left: 2px;
    }

    /* Document picker */
    .selected-doc {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 16px;
        background: rgba(244,114,180,.06);
        border: 1px solid rgba(244,114,180,.2);
        border-radius: 10px;
    }

    .selected-doc-title {
        font-size: 13.5px;
        font-weight: 600;
        color: #1a1a1a;
        flex: 1;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .link-btn {
        background: none;
        border: none;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        font-weight: 500;
        color: #f472b4;
        cursor: pointer;
        flex-shrink: 0;
    }

    .doc-pick-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 12px 16px;
        border-radius: 10px;
        border: 1.5px dashed rgba(0,0,0,.12);
        background: rgba(0,0,0,.02);
        font-family: 'Inter', sans-serif;
        font-size: 13.5px;
        color: rgba(26,26,26,.45);
        cursor: pointer;
        transition: border-color .18s, background .18s;
    }

    .doc-pick-btn:hover {
        border-color: rgba(244,114,180,.4);
        background: rgba(244,114,180,.04);
        color: rgba(26,26,26,.7);
    }

    .doc-pick-icon { font-size: 16px; }

    .doc-pick-btn svg { margin-left: auto; }

    /* Steps */
    .steps-list {
        display: flex;
        flex-direction: column;
    }

    .step-card {
        background: #fafafa;
        border: 1px solid rgba(0,0,0,.07);
        border-radius: 14px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        transition: border-color .18s;
    }

    .step-card:hover { border-color: rgba(244,114,180,.25); }

    .step-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: -4px;
    }

    .step-num-badge {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: linear-gradient(135deg, #f472b4, #a855f7);
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .step-header-label {
        font-size: 13px;
        font-weight: 650;
        color: #1a1a1a;
        flex: 1;
    }

    /* Fields */
    .field-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .field-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }

    .field-label {
        font-size: 11.5px;
        font-weight: 600;
        color: rgba(26,26,26,.45);
        text-transform: uppercase;
        letter-spacing: .4px;
    }

    .field-sublabel {
        font-size: 11px;
        font-weight: 400;
        text-transform: none;
        letter-spacing: 0;
        color: rgba(26,26,26,.35);
    }

    .field-input, .field-textarea {
        padding: 9px 12px;
        border-radius: 8px;
        border: 1.5px solid rgba(0,0,0,.1);
        background: #fff;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        color: #1a1a1a;
        outline: none;
        transition: border-color .18s, box-shadow .18s;
        width: 100%;
    }

    .field-input:focus, .field-textarea:focus {
        border-color: #f472b4;
        box-shadow: 0 0 0 3px rgba(244,114,180,.1);
    }

    .field-textarea { resize: vertical; min-height: 58px; line-height: 1.5; }

    /* Platform pills */
    .platform-pills {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .platform-pill {
        padding: 6px 14px;
        border-radius: 999px;
        font-family: 'Inter', sans-serif;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        border: 1.5px solid transparent;
        background: rgba(0,0,0,.05);
        color: rgba(26,26,26,.5);
        transition: all .18s;
    }

    .platform-pill:hover {
        background: var(--p-bg);
        color: var(--p-color);
        border-color: var(--p-color);
    }

    .platform-pill.selected {
        background: var(--p-bg);
        color: var(--p-color);
        border-color: var(--p-color);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--p-color) 10%, transparent);
    }

    /* Token row */
    .token-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 2px;
    }

    .token-label {
        font-size: 11px;
        color: rgba(26,26,26,.4);
        font-weight: 500;
    }

    .token-btn {
        padding: 2px 8px;
        border-radius: 6px;
        background: rgba(244,114,180,.1);
        border: 1px solid rgba(244,114,180,.25);
        color: #db2777;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 11px;
        cursor: pointer;
        transition: background .15s;
    }

    .token-btn:hover { background: rgba(244,114,180,.2); }

    /* Step connector */
    .step-connector {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 4px 0;
        gap: 0;
    }

    .connector-line {
        width: 1.5px;
        height: 16px;
        background: linear-gradient(180deg, rgba(244,114,180,.4), rgba(168,85,247,.4));
    }

    .connector-arrow { display: block; }

    /* Add step */
    .add-step-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        margin-top: 16px;
        padding: 11px;
        border-radius: 10px;
        border: 1.5px dashed rgba(244,114,180,.35);
        background: rgba(244,114,180,.04);
        font-family: 'Inter', sans-serif;
        font-size: 13.5px;
        font-weight: 600;
        color: #f472b4;
        cursor: pointer;
        transition: background .18s, border-color .18s;
    }

    .add-step-btn:hover {
        background: rgba(244,114,180,.09);
        border-color: rgba(244,114,180,.6);
    }

    /* ── Right panel ── */
    .builder-right {
        display: flex;
        flex-direction: column;
        gap: 16px;
        position: sticky;
        top: 88px; /* topbar height + gap */
        align-self: flex-start;
    }

    .preview-card {
        background: #fff;
        border: 1px solid rgba(0,0,0,.07);
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 1px 4px rgba(0,0,0,.03);
    }

    .preview-header { margin-bottom: 20px; }

    .preview-tag {
        display: inline-block;
        font-size: 10.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .7px;
        color: #f472b4;
        background: rgba(244,114,180,.1);
        padding: 2px 8px;
        border-radius: 999px;
        margin-bottom: 8px;
    }

    .preview-wf-name {
        font-size: 15px;
        font-weight: 700;
        color: #1a1a1a;
        letter-spacing: -.3px;
        margin-bottom: 4px;
    }

    .preview-doc {
        font-size: 12px;
        color: rgba(26,26,26,.4);
    }

    /* Timeline */
    .preview-timeline {
        display: flex;
        flex-direction: column;
    }

    .timeline-item {
        display: flex;
        gap: 12px;
    }

    .timeline-left {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex-shrink: 0;
    }

    .timeline-dot {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        color: #fff;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(0,0,0,.15);
    }

    .timeline-line {
        width: 1.5px;
        flex: 1;
        min-height: 16px;
        background: rgba(0,0,0,.08);
        margin: 3px 0;
    }

    .timeline-content {
        padding-bottom: 20px;
        flex: 1;
        min-width: 0;
    }

    .timeline-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 26px;
    }

    .timeline-platform {
        font-size: 13px;
        font-weight: 650;
    }

    .timeline-platform.muted { color: rgba(26,26,26,.35) !important; }

    .timeline-time {
        font-size: 11.5px;
        color: rgba(26,26,26,.4);
        white-space: nowrap;
    }

    .timeline-note {
        margin-top: 5px;
        font-size: 12px;
        color: rgba(26,26,26,.5);
        line-height: 1.5;
        background: rgba(0,0,0,.03);
        border-radius: 6px;
        padding: 6px 8px;
        font-style: italic;
        word-break: break-word;
    }

    /* Explainer card */
    .explainer-card {
        display: flex;
        gap: 12px;
        padding: 16px;
        background: rgba(248,231,218,.3);
        border: 1px solid rgba(244,114,180,.15);
        border-radius: 12px;
    }

    .explainer-icon { font-size: 18px; flex-shrink: 0; }

    .explainer-title {
        font-size: 13px;
        font-weight: 650;
        color: #1a1a1a;
        margin-bottom: 4px;
    }

    .explainer-body {
        font-size: 12px;
        color: rgba(26,26,26,.5);
        line-height: 1.6;
    }

    .token-code {
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 11px;
        background: rgba(244,114,180,.12);
        color: #db2777;
        padding: 1px 5px;
        border-radius: 4px;
    }

    /* ════════════════════════════════
       MODAL
    ════════════════════════════════ */
    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.35);
        backdrop-filter: blur(4px);
        z-index: 200;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        animation: fadeIn .15s ease;
    }

    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

    .modal {
        background: #fff;
        border-radius: 20px;
        width: 100%;
        max-width: 480px;
        box-shadow: 0 20px 60px rgba(0,0,0,.18);
        animation: slideUp .2s ease;
        overflow: hidden;
    }

    @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid rgba(0,0,0,.07);
    }

    .modal-header h3 {
        font-size: 15px;
        font-weight: 700;
        color: #1a1a1a;
    }

    .modal-list {
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        max-height: 380px;
        overflow-y: auto;
    }

    .doc-row {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px 14px;
        border-radius: 12px;
        border: none;
        background: transparent;
        cursor: pointer;
        text-align: left;
        font-family: 'Inter', sans-serif;
        transition: background .15s;
    }

    .doc-row:hover { background: rgba(244,114,180,.07); }

    .doc-row-icon { font-size: 18px; flex-shrink: 0; }

    .doc-row-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 0;
    }

    .doc-row-title {
        font-size: 13.5px;
        font-weight: 600;
        color: #1a1a1a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .doc-row-date {
        font-size: 11.5px;
        color: rgba(26,26,26,.4);
    }

    .doc-row svg { color: rgba(26,26,26,.3); flex-shrink: 0; }

    /* ════════════════════════════════
       SHARED BUTTONS / UTILITIES
    ════════════════════════════════ */
    .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 9px 20px;
        border-radius: 9px;
        font-family: 'Inter', sans-serif;
        font-size: 13.5px;
        font-weight: 650;
        border: none;
        cursor: pointer;
        transition: opacity .18s, box-shadow .18s;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .btn-primary {
        background: linear-gradient(135deg, #f472b4, #a855f7);
        color: #fff;
        box-shadow: 0 2px 8px rgba(244,114,180,.3);
    }

    .btn-primary:hover {
        opacity: .9;
        box-shadow: 0 4px 16px rgba(244,114,180,.45);
    }

    .btn-icon { font-size: 15px; line-height: 1; }

    .icon-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: none;
        background: rgba(0,0,0,.04);
        color: rgba(26,26,26,.45);
        cursor: pointer;
        flex-shrink: 0;
        transition: background .15s, color .15s;
    }

    .icon-btn:hover { background: rgba(0,0,0,.08); color: #1a1a1a; }
    .icon-btn.danger:hover { background: rgba(239,68,68,.1); color: #ef4444; }
    .icon-btn.small { width: 24px; height: 24px; border-radius: 6px; }

    /* ════════════════════════════════
       RESPONSIVE
    ════════════════════════════════ */
    @media (max-width: 900px) {
        .builder-body {
            grid-template-columns: 1fr;
            padding: 20px 16px 60px;
        }

        .builder-right {
            position: static;
        }

        .page { padding: 32px 20px; }
    }

    @media (max-width: 600px) {
        .page-header { flex-direction: column; }
        .field-row { grid-template-columns: 1fr; }
        .builder-topbar { padding: 0 16px; }
        .wf-name-input { max-width: 200px; font-size: 13px; }
    }
</style>
