<script lang="ts">
    import { onMount } from "svelte";
    import { supabase } from "../../lib/supabase";

    let user: any = null;
    let loading = true;

    onMount(async () => {
        const { data } = await supabase.auth.getSession();
        user = data.session?.user ?? null;
        loading = false;

        if (!user) {
            window.location.href = "/";
        }
    });

    async function signOut() {
        await supabase.auth.signOut();
        window.location.href = "/";
    }
</script>

<main>
    {#if loading}
        <p>Loading...</p>
    {:else if user}
        <h1>Dashboard</h1>
    {/if}
</main>
