<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/organized-folder.png?v=2" />
</svelte:head>

{@render children()}
