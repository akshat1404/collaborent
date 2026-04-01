import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { supabase } from '$lib/supabase';

export const ssr = false;

export const load: PageLoad = async ({ params }) => {
	const { id } = params;

	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		throw redirect(302, '/');
	}

	const res = await fetch(`${import.meta.env.VITE_API_URL}/documents/${id}`, {
		headers: {
			Authorization: `Bearer ${session.access_token}`
		}
	});

	if (res.status === 401) {
		throw redirect(302, '/');
	}

	if (res.status === 404) {
		throw error(404, 'Document not found');
	}

	if (!res.ok) {
		throw error(500, 'Failed to load document');
	}

	const document = await res.json();

	return { document };
};
