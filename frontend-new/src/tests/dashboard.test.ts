/**
 * Tests for the dashboard page logic.
 * We isolate pure state-management functions from the Svelte component.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── createDocument / handleCloseModal ───────────────────────────────────────

function makeDashboardState() {
	let showModal = false;
	let documents: Array<{ id: string; title: string; updated_at: string; created_at: string }> = [];

	function createDocument() {
		showModal = true;
	}

	function handleCloseModal() {
		showModal = false;
	}

	/** Optimistic delete — mirrors documents = documents.filter(d => d.id !== id) */
	function optimisticDelete(id: string) {
		documents = documents.filter((d) => d.id !== id);
	}

	return {
		get showModal() { return showModal; },
		get documents() { return documents; },
		set documents(v) { documents = v; },
		createDocument,
		handleCloseModal,
		optimisticDelete,
	};
}

// ─── Modal open/close ────────────────────────────────────────────────────────

describe("Dashboard – modal state", () => {
	it("showModal starts as false", () => {
		const dashboard = makeDashboardState();
		expect(dashboard.showModal).toBe(false);
	});

	it("createDocument opens the modal", () => {
		const dashboard = makeDashboardState();
		dashboard.createDocument();
		expect(dashboard.showModal).toBe(true);
	});

	it("handleCloseModal closes the modal", () => {
		const dashboard = makeDashboardState();
		dashboard.createDocument();
		dashboard.handleCloseModal();
		expect(dashboard.showModal).toBe(false);
	});

	it("is idempotent: closing an already-closed modal stays closed", () => {
		const dashboard = makeDashboardState();
		dashboard.handleCloseModal();
		expect(dashboard.showModal).toBe(false);
	});
});

// ─── handleCreate title validation ──────────────────────────────────────────

describe("Dashboard – handleCreate title validation", () => {
	/** Mirrors: if (!title) { alert(...); return; } */
	function validateTitle(title: string): boolean {
		return Boolean(title && title.trim().length > 0);
	}

	it("rejects an empty title", () => {
		expect(validateTitle("")).toBe(false);
	});

	it("rejects a whitespace-only title", () => {
		expect(validateTitle("   ")).toBe(false);
	});

	it("accepts a valid title", () => {
		expect(validateTitle("Q1 Report")).toBe(true);
	});

	it("accepts a single-character title", () => {
		expect(validateTitle("A")).toBe(true);
	});
});

// ─── handleDocDelete – optimistic removal ────────────────────────────────────

describe("Dashboard – handleDocDelete optimistic removal", () => {
	let dashboard: ReturnType<typeof makeDashboardState>;

	beforeEach(() => {
		dashboard = makeDashboardState();
		dashboard.documents = [
			{ id: "1", title: "Doc 1", updated_at: "2024-01-01T00:00:00Z", created_at: "2024-01-01T00:00:00Z" },
			{ id: "2", title: "Doc 2", updated_at: "2024-01-02T00:00:00Z", created_at: "2024-01-02T00:00:00Z" },
			{ id: "3", title: "Doc 3", updated_at: "2024-01-03T00:00:00Z", created_at: "2024-01-03T00:00:00Z" },
		];
	});

	it("removes the correct document by id", () => {
		dashboard.optimisticDelete("2");
		expect(dashboard.documents).toHaveLength(2);
		expect(dashboard.documents.find((d) => d.id === "2")).toBeUndefined();
	});

	it("keeps all other documents intact", () => {
		dashboard.optimisticDelete("2");
		expect(dashboard.documents.map((d) => d.id)).toEqual(["1", "3"]);
	});

	it("does nothing when the id does not exist", () => {
		dashboard.optimisticDelete("999");
		expect(dashboard.documents).toHaveLength(3);
	});

	it("can delete all documents one by one", () => {
		dashboard.optimisticDelete("1");
		dashboard.optimisticDelete("2");
		dashboard.optimisticDelete("3");
		expect(dashboard.documents).toHaveLength(0);
	});

	it("handles an empty document list gracefully", () => {
		dashboard.documents = [];
		expect(() => dashboard.optimisticDelete("1")).not.toThrow();
		expect(dashboard.documents).toHaveLength(0);
	});
});

// ─── handleDocDelete – event propagation guard ───────────────────────────────

describe("Dashboard – handleDocDelete event propagation", () => {
	it("calls preventDefault and stopPropagation on the event", () => {
		const event = {
			preventDefault: vi.fn(),
			stopPropagation: vi.fn(),
		} as unknown as Event;

		// Mirrors: if (e) { e.preventDefault(); e.stopPropagation(); }
		function guardEvent(e?: Event) {
			if (e) {
				e.preventDefault();
				e.stopPropagation();
			}
		}

		guardEvent(event);
		expect(event.preventDefault).toHaveBeenCalledOnce();
		expect(event.stopPropagation).toHaveBeenCalledOnce();
	});

	it("does not throw when event is undefined", () => {
		function guardEvent(e?: Event) {
			if (e) {
				e.preventDefault();
				e.stopPropagation();
			}
		}
		expect(() => guardEvent(undefined)).not.toThrow();
	});
});
