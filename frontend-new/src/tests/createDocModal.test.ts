/**
 * Tests for CreateDocModal component logic.
 * handleCreate and handleKeydown are isolated and tested without DOM.
 */
import { describe, it, expect, vi } from "vitest";
import { stripExtension, isSupportedImportFile } from "../lib/utils";

// ─── handleCreate logic ──────────────────────────────────────────────────────
// Mirrors CreateDocModal.handleCreate: trims the title and calls onCreate.

function makeModalState(initialTitle = "") {
	let title = initialTitle;

	function handleCreate(onCreate: (t: string) => void) {
		const trimmed = title.trim();
		if (!trimmed) return; // guard — do nothing for empty titles
		onCreate(trimmed);
	}

	function handleKeydown(
		key: string,
		onCreate: (t: string) => void,
		onClose: () => void,
	) {
		if (key === "Enter") handleCreate(onCreate);
		if (key === "Escape") onClose();
	}

	return {
		get title() { return title; },
		set title(v: string) { title = v; },
		handleCreate,
		handleKeydown,
	};
}

// ─── handleCreate ────────────────────────────────────────────────────────────

describe("CreateDocModal – handleCreate", () => {
	it("calls onCreate with the trimmed title", () => {
		const modal = makeModalState("  My Document  ");
		const onCreate = vi.fn();
		modal.handleCreate(onCreate);
		expect(onCreate).toHaveBeenCalledOnce();
		expect(onCreate).toHaveBeenCalledWith("My Document");
	});

	it("does NOT call onCreate when the title is empty", () => {
		const modal = makeModalState("");
		const onCreate = vi.fn();
		modal.handleCreate(onCreate);
		expect(onCreate).not.toHaveBeenCalled();
	});

	it("does NOT call onCreate when the title is whitespace only", () => {
		const modal = makeModalState("   ");
		const onCreate = vi.fn();
		modal.handleCreate(onCreate);
		expect(onCreate).not.toHaveBeenCalled();
	});

	it("trims whitespace from both ends", () => {
		const modal = makeModalState("\t  Hello World \t");
		const onCreate = vi.fn();
		modal.handleCreate(onCreate);
		expect(onCreate).toHaveBeenCalledWith("Hello World");
	});

	it("preserves internal whitespace in the title", () => {
		const modal = makeModalState("  Quarterly Report Q1 2024  ");
		const onCreate = vi.fn();
		modal.handleCreate(onCreate);
		expect(onCreate).toHaveBeenCalledWith("Quarterly Report Q1 2024");
	});
});

// ─── handleKeydown ───────────────────────────────────────────────────────────

describe("CreateDocModal – handleKeydown", () => {
	it("triggers Create on Enter key with a non-empty title", () => {
		const modal = makeModalState("My Doc");
		const onCreate = vi.fn();
		const onClose = vi.fn();
		modal.handleKeydown("Enter", onCreate, onClose);
		expect(onCreate).toHaveBeenCalledWith("My Doc");
		expect(onClose).not.toHaveBeenCalled();
	});

	it("does NOT trigger Create on Enter key when title is empty", () => {
		const modal = makeModalState("");
		const onCreate = vi.fn();
		const onClose = vi.fn();
		modal.handleKeydown("Enter", onCreate, onClose);
		expect(onCreate).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("triggers Close on Escape key", () => {
		const modal = makeModalState("Some title");
		const onCreate = vi.fn();
		const onClose = vi.fn();
		modal.handleKeydown("Escape", onCreate, onClose);
		expect(onClose).toHaveBeenCalledOnce();
		expect(onCreate).not.toHaveBeenCalled();
	});

	it("does nothing for unrelated keys", () => {
		const modal = makeModalState("My Doc");
		const onCreate = vi.fn();
		const onClose = vi.fn();
		modal.handleKeydown("Tab", onCreate, onClose);
		modal.handleKeydown("ArrowDown", onCreate, onClose);
		modal.handleKeydown("a", onCreate, onClose);
		expect(onCreate).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});
});

// ─── File-name auto-fill logic ───────────────────────────────────────────────

describe("CreateDocModal – file-name auto-fill", () => {
	it("strips .docx extension for auto-filled title", () => {
		expect(stripExtension("my-report.docx")).toBe("my-report");
	});

	it("strips .pdf extension for auto-filled title", () => {
		expect(stripExtension("invoice.pdf")).toBe("invoice");
	});

	it("does not auto-fill when title already has content", () => {
		// Simulates: if (!title.trim()) { title = stripExtension(file.name); }
		const existingTitle = "Custom Title";
		const fileName = "report.pdf";
		const result = existingTitle.trim() ? existingTitle : stripExtension(fileName);
		expect(result).toBe("Custom Title");
	});

	it("auto-fills from filename when title is empty", () => {
		const existingTitle = "";
		const fileName = "quarterly-review.docx";
		const result = existingTitle.trim() ? existingTitle : stripExtension(fileName);
		expect(result).toBe("quarterly-review");
	});
});

// ─── File validation ─────────────────────────────────────────────────────────

describe("CreateDocModal – file validation", () => {
	it("accepts .docx files", () => {
		expect(isSupportedImportFile("contract.docx")).toBe(true);
	});

	it("accepts .pdf files", () => {
		expect(isSupportedImportFile("policy.pdf")).toBe(true);
	});

	it("rejects unsupported files", () => {
		expect(isSupportedImportFile("notes.txt")).toBe(false);
		expect(isSupportedImportFile("photo.png")).toBe(false);
		expect(isSupportedImportFile("data.csv")).toBe(false);
	});

	it("validates case-insensitively", () => {
		expect(isSupportedImportFile("CONTRACT.DOCX")).toBe(true);
		expect(isSupportedImportFile("POLICY.PDF")).toBe(true);
	});
});

// ─── Empty content fallback ──────────────────────────────────────────────────

describe("CreateDocModal – empty content fallback", () => {
	/**
	 * After file processing, if the stripped HTML has no visible text,
	 * the component falls back to a placeholder message.
	 */
	function resolveContent(rawHtml: string): string {
		const visibleText = rawHtml.replace(/<[^>]+>/g, "").trim();
		return visibleText
			? rawHtml
			: "<p>Document imported – no compatible text content found.</p>";
	}

	it("keeps content when visible text exists", () => {
		const html = "<p>Hello world</p>";
		expect(resolveContent(html)).toBe(html);
	});

	it("falls back to placeholder when content is only tags with no text", () => {
		const html = "<div><p></p></div>";
		expect(resolveContent(html)).toBe(
			"<p>Document imported – no compatible text content found.</p>",
		);
	});

	it("falls back to placeholder for empty string", () => {
		expect(resolveContent("")).toBe(
			"<p>Document imported – no compatible text content found.</p>",
		);
	});

	it("falls back when content is only whitespace", () => {
		expect(resolveContent("   ")).toBe(
			"<p>Document imported – no compatible text content found.</p>",
		);
	});
});
