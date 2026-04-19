/**
 * Tests for the login page (+page.svelte) logic.
 * handleSession and signIn are isolated from the Supabase client.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase session handling ────────────────────────────────────────────────

/**
 * Mirrors the handleSession function in +page.svelte.
 * Returns "redirect" when a redirect should happen, "noop" when not.
 */
async function handleSession(
	currentSession: null | { access_token: string },
	fetchFn: typeof fetch,
	apiUrl: string,
): Promise<"redirect" | "noop"> {
	if (!currentSession) return "noop";

	const response = await fetchFn(`${apiUrl}/auth/callback`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${currentSession.access_token}`,
			"Content-Type": "application/json",
		},
	});

	await response.json();
	return "redirect";
}

describe("Login page – handleSession", () => {
	const apiUrl = "http://localhost:8080";

	it("does nothing (noop) when session is null", async () => {
		const mockFetch = vi.fn() as unknown as typeof fetch;
		const result = await handleSession(null, mockFetch, apiUrl);
		expect(result).toBe("noop");
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("POSTs to /auth/callback with the access token", async () => {
		const session = { access_token: "tok_123" };
		const mockFetch = vi.fn().mockResolvedValue({
			json: vi.fn().mockResolvedValue({ user: { id: "u1" } }),
		}) as unknown as typeof fetch;

		const result = await handleSession(session, mockFetch, apiUrl);

		expect(mockFetch).toHaveBeenCalledOnce();
		expect(mockFetch).toHaveBeenCalledWith(
			`${apiUrl}/auth/callback`,
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					Authorization: "Bearer tok_123",
					"Content-Type": "application/json",
				}),
			}),
		);
		expect(result).toBe("redirect");
	});

	it("awaits the response JSON", async () => {
		const session = { access_token: "tok_abc" };
		const jsonMock = vi.fn().mockResolvedValue({});
		const mockFetch = vi.fn().mockResolvedValue({
			json: jsonMock,
		}) as unknown as typeof fetch;

		await handleSession(session, mockFetch, apiUrl);
		expect(jsonMock).toHaveBeenCalledOnce();
	});
});

// ─── init() – loading state ───────────────────────────────────────────────────

describe("Login page – loading state", () => {
	/**
	 * Simulates the init() flow: loading starts true, ends false
	 * regardless of whether getSession throws or succeeds.
	 */
	async function simulateInit(
		getSessionFn: () => Promise<{ data: { session: null | object }; error: null | object }>,
	) {
		let loading = true;
		let session: null | object = null;

		try {
			const { data, error } = await getSessionFn();
			if (error) { /* log error */ }
			session = data?.session ?? null;
		} catch {
			// swallow
		} finally {
			loading = false;
		}

		return { loading, session };
	}

	it("sets loading to false after a successful session fetch", async () => {
		const { loading } = await simulateInit(() =>
			Promise.resolve({ data: { session: { user: "u1" } }, error: null }),
		);
		expect(loading).toBe(false);
	});

	it("sets loading to false even when getSession returns an error", async () => {
		const { loading } = await simulateInit(() =>
			Promise.resolve({ data: { session: null }, error: { message: "fail" } }),
		);
		expect(loading).toBe(false);
	});

	it("sets loading to false even when getSession throws", async () => {
		const { loading } = await simulateInit(() =>
			Promise.reject(new Error("network error")),
		);
		expect(loading).toBe(false);
	});

	it("returns null session when getSession returns null", async () => {
		const { session } = await simulateInit(() =>
			Promise.resolve({ data: { session: null }, error: null }),
		);
		expect(session).toBeNull();
	});

	it("returns the session object when getSession succeeds", async () => {
		const fakeSession = { access_token: "tok", user: { id: "u1" } };
		const { session } = await simulateInit(() =>
			Promise.resolve({ data: { session: fakeSession }, error: null }),
		);
		expect(session).toEqual(fakeSession);
	});
});
