<script lang="ts">
    import { onMount } from "svelte";
    import { supabase } from "$lib/supabase";

    let session: any = null;
    let loading = true;

    onMount(async () => {
        const { data } = await supabase.auth.getSession();
        session = data.session;

        if (session) {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/auth/callback`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        "Content-Type": "application/json",
                    },
                },
            );

            const result = await response.json();

            window.location.href = "/dashboard";
        }

        loading = false;
    });

    async function signIn() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${import.meta.env.VITE_SVELTE_DOMAIN}`,
            },
        });
        if (error) console.error(error);
    }
</script>

<main>
    <h1>Collaborent</h1>

    {#if loading}
        <p>Loading...</p>
    {:else if !session}
        <button on:click={signIn}>Continue with Google</button>
    {/if}
</main>
