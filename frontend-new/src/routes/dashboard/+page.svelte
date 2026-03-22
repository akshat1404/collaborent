<script lang="ts">
    import { onMount } from "svelte";
    import { supabase } from "$lib/supabase";

    let user = $state<any>(null);
    let loading = $state(true);

    onMount(() => {
        supabase.auth.getSession().then(({ data }) => {
            user = data.session?.user ?? null;
            loading = false;

            if (!user) {
                window.location.href = "/";
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            user = session?.user ?? null;
            loading = false;

            if (!user) {
                window.location.href = "/";
            }
        });

        return () => subscription.unsubscribe();
    });

    async function signOut() {
        await supabase.auth.signOut();
        window.location.href = "/";
    }
</script>

{#if loading}
    <p>Loading...</p>
{:else if user}
    <main>
        <h1>Dashboard</h1>
        <p>Welcome, {user?.user_metadata?.full_name}</p>
        <button onclick={signOut}>Sign out</button>
    </main>
{:else}
    <p>Not logged in, redirecting...</p>
{/if}
