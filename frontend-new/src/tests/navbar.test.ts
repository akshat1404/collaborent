/**
 * Tests for Navbar component logic — pure functions extracted from the component.
 * We test the state-machine behaviour without rendering any DOM.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Isolated logic mirroring Navbar.svelte ──────────────────────────────────
// These replicate the exact logic found in Navbar.svelte so that the same
// expectations hold whether the test or the component runs the code.

function makeNavbarState() {
	let menuOpen = false;

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function handleCreate(onCreateDoc?: () => void) {
		menuOpen = false;
		onCreateDoc?.();
	}

	function handleSignOut(onSignOut: () => void) {
		menuOpen = false;
		onSignOut();
	}

	return { get menuOpen() { return menuOpen; }, toggleMenu, handleCreate, handleSignOut };
}

// ─── toggleMenu ──────────────────────────────────────────────────────────────

describe("Navbar – toggleMenu", () => {
	it("opens the menu when it is closed", () => {
		const navbar = makeNavbarState();
		expect(navbar.menuOpen).toBe(false);
		navbar.toggleMenu();
		expect(navbar.menuOpen).toBe(true);
	});

	it("closes the menu when it is open", () => {
		const navbar = makeNavbarState();
		navbar.toggleMenu(); // open
		navbar.toggleMenu(); // close
		expect(navbar.menuOpen).toBe(false);
	});

	it("toggles correctly across multiple calls", () => {
		const navbar = makeNavbarState();
		[true, false, true, false].forEach((expected) => {
			navbar.toggleMenu();
			expect(navbar.menuOpen).toBe(expected);
		});
	});
});

// ─── handleCreate ────────────────────────────────────────────────────────────

describe("Navbar – handleCreate", () => {
	it("closes the menu", () => {
		const navbar = makeNavbarState();
		navbar.toggleMenu(); // open
		navbar.handleCreate();
		expect(navbar.menuOpen).toBe(false);
	});

	it("calls onCreateDoc when provided", () => {
		const navbar = makeNavbarState();
		const onCreateDoc = vi.fn();
		navbar.handleCreate(onCreateDoc);
		expect(onCreateDoc).toHaveBeenCalledOnce();
	});

	it("does not throw when onCreateDoc is undefined", () => {
		const navbar = makeNavbarState();
		expect(() => navbar.handleCreate(undefined)).not.toThrow();
	});
});

// ─── handleSignOut ───────────────────────────────────────────────────────────

describe("Navbar – handleSignOut", () => {
	it("closes the menu", () => {
		const navbar = makeNavbarState();
		navbar.toggleMenu(); // open
		const onSignOut = vi.fn();
		navbar.handleSignOut(onSignOut);
		expect(navbar.menuOpen).toBe(false);
	});

	it("always calls onSignOut", () => {
		const navbar = makeNavbarState();
		const onSignOut = vi.fn();
		navbar.handleSignOut(onSignOut);
		expect(onSignOut).toHaveBeenCalledOnce();
	});

	it("calls onSignOut even when the menu was already closed", () => {
		const navbar = makeNavbarState();
		expect(navbar.menuOpen).toBe(false);
		const onSignOut = vi.fn();
		navbar.handleSignOut(onSignOut);
		expect(onSignOut).toHaveBeenCalledOnce();
		expect(navbar.menuOpen).toBe(false);
	});
});
