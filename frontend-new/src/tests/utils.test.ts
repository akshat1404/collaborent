import { describe, it, expect } from "vitest";
import {
	formatDate,
	excerpt,
	stripUnsupportedMedia,
	stripExtension,
	isSupportedImportFile,
	docCountLabel,
	resolveDocTitle,
} from "../lib/utils";

// ─── formatDate ─────────────────────────────────────────────────────────────

describe("formatDate", () => {
	it("returns empty string for empty input", () => {
		expect(formatDate("")).toBe("");
	});

	it("formats a valid ISO date string correctly", () => {
		// 2024-03-15 → "Mar 15, 2024" in en-US locale
		const result = formatDate("2024-03-15T00:00:00.000Z");
		expect(result).toMatch(/Mar/);
		expect(result).toMatch(/2024/);
	});

	it("formats January correctly", () => {
		const result = formatDate("2023-01-01T12:00:00.000Z");
		expect(result).toMatch(/Jan/);
		expect(result).toMatch(/2023/);
	});

	it("formats December correctly", () => {
		const result = formatDate("2025-12-25T00:00:00.000Z");
		expect(result).toMatch(/Dec/);
		expect(result).toMatch(/2025/);
	});

	it("returns a non-empty string for valid dates", () => {
		expect(formatDate("2024-06-20T09:30:00Z")).not.toBe("");
	});
});

// ─── excerpt ─────────────────────────────────────────────────────────────────

describe("excerpt", () => {
	it("always returns the placeholder string", () => {
		expect(excerpt()).toBe("Open to view content");
	});
});

// ─── stripUnsupportedMedia ───────────────────────────────────────────────────

describe("stripUnsupportedMedia", () => {
	it("removes <img> self-closing tags", () => {
		const input = `<p>Hello</p><img src="photo.jpg" /><p>World</p>`;
		const result = stripUnsupportedMedia(input);
		expect(result).not.toContain("<img");
		expect(result).toContain("<p>Hello</p>");
		expect(result).toContain("<p>World</p>");
	});

	it("removes <img> without self-closing slash", () => {
		const input = `<img src="x.png" alt="test"><p>text</p>`;
		expect(stripUnsupportedMedia(input)).not.toContain("<img");
	});

	it("removes <picture> blocks", () => {
		const input = `<picture><source srcset="a.webp"/><img src="a.jpg"/></picture><p>After</p>`;
		const result = stripUnsupportedMedia(input);
		expect(result).not.toContain("<picture");
		expect(result).toContain("<p>After</p>");
	});

	it("removes <figure> blocks", () => {
		const input = `<figure><img src="x.jpg"/><figcaption>caption</figcaption></figure><p>text</p>`;
		const result = stripUnsupportedMedia(input);
		expect(result).not.toContain("<figure");
		expect(result).not.toContain("<figcaption");
		expect(result).toContain("<p>text</p>");
	});

	it("removes <svg> blocks", () => {
		const input = `<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg><p>after</p>`;
		const result = stripUnsupportedMedia(input);
		expect(result).not.toContain("<svg");
		expect(result).toContain("<p>after</p>");
	});

	it("removes <video> blocks", () => {
		const input = `<video controls><source src="v.mp4"/></video><p>content</p>`;
		const result = stripUnsupportedMedia(input);
		expect(result).not.toContain("<video");
		expect(result).toContain("<p>content</p>");
	});

	it("removes <audio> blocks", () => {
		const input = `<audio controls><source src="a.mp3"/></audio><p>content</p>`;
		const result = stripUnsupportedMedia(input);
		expect(result).not.toContain("<audio");
		expect(result).toContain("<p>content</p>");
	});

	it("removes <object> blocks", () => {
		const input = `<object data="file.pdf" type="application/pdf"></object><p>after</p>`;
		const result = stripUnsupportedMedia(input);
		expect(result).not.toContain("<object");
		expect(result).toContain("<p>after</p>");
	});

	it("removes <embed> tags", () => {
		const input = `<embed src="movie.swf" /><p>after</p>`;
		const result = stripUnsupportedMedia(input);
		expect(result).not.toContain("<embed");
		expect(result).toContain("<p>after</p>");
	});

	it("leaves plain text and supported tags intact", () => {
		const input = `<p>This is <strong>bold</strong> text.</p>`;
		expect(stripUnsupportedMedia(input)).toBe(input);
	});

	it("returns an empty string when the input is all media", () => {
		const input = `<img src="x.jpg"/><svg><rect/></svg>`;
		expect(stripUnsupportedMedia(input)).toBe("");
	});

	it("trims leading/trailing whitespace from the result", () => {
		const input = `   <p>hello</p>   `;
		expect(stripUnsupportedMedia(input)).toBe("<p>hello</p>");
	});

	it("is case-insensitive for tag names", () => {
		const input = `<IMG SRC="x.jpg"><p>ok</p>`;
		const result = stripUnsupportedMedia(input);
		expect(result).not.toContain("<IMG");
		expect(result).toContain("<p>ok</p>");
	});
});

// ─── stripExtension ─────────────────────────────────────────────────────────

describe("stripExtension", () => {
	it("strips .docx extension", () => {
		expect(stripExtension("report.docx")).toBe("report");
	});

	it("strips .pdf extension", () => {
		expect(stripExtension("my-file.pdf")).toBe("my-file");
	});

	it("strips only the last extension in a dotted name", () => {
		expect(stripExtension("my.report.v2.docx")).toBe("my.report.v2");
	});

	it("returns the name unchanged when there is no extension", () => {
		expect(stripExtension("README")).toBe("README");
	});

	it("handles filenames with a single leading dot — the dot segment is treated as extension", () => {
		// ".gitignore" → regex sees ".gitignore" as an extension → strips it → ""
		// This edge case doesn't arise in practice (we only receive .docx/.pdf uploads)
		// so we document the actual behaviour rather than treating it as a bug.
		expect(stripExtension(".gitignore")).toBe("");
	});
});

// ─── isSupportedImportFile ─────────────────────────────────────────────────

describe("isSupportedImportFile", () => {
	it("returns true for .docx files", () => {
		expect(isSupportedImportFile("document.docx")).toBe(true);
	});

	it("returns true for .pdf files", () => {
		expect(isSupportedImportFile("report.pdf")).toBe(true);
	});

	it("returns true for uppercase extensions", () => {
		expect(isSupportedImportFile("FILE.DOCX")).toBe(true);
		expect(isSupportedImportFile("FILE.PDF")).toBe(true);
	});

	it("returns false for unsupported extensions", () => {
		expect(isSupportedImportFile("image.png")).toBe(false);
		expect(isSupportedImportFile("spreadsheet.xlsx")).toBe(false);
		expect(isSupportedImportFile("notes.txt")).toBe(false);
	});

	it("returns false for files with no extension", () => {
		expect(isSupportedImportFile("Makefile")).toBe(false);
	});
});

// ─── docCountLabel ──────────────────────────────────────────────────────────

describe("docCountLabel", () => {
	it("uses singular form for 1 document", () => {
		expect(docCountLabel(1)).toBe("1 document");
	});

	it("uses plural form for 0 documents", () => {
		expect(docCountLabel(0)).toBe("0 documents");
	});

	it("uses plural form for 2+ documents", () => {
		expect(docCountLabel(5)).toBe("5 documents");
		expect(docCountLabel(100)).toBe("100 documents");
	});
});

// ─── resolveDocTitle ────────────────────────────────────────────────────────

describe("resolveDocTitle", () => {
	it("returns the title when it is a non-empty string", () => {
		expect(resolveDocTitle("My Report")).toBe("My Report");
	});

	it("returns 'Untitled' for an empty string", () => {
		expect(resolveDocTitle("")).toBe("Untitled");
	});

	it("returns 'Untitled' for a whitespace-only string", () => {
		expect(resolveDocTitle("   ")).toBe("Untitled");
	});

	it("returns 'Untitled' for null", () => {
		expect(resolveDocTitle(null)).toBe("Untitled");
	});

	it("returns 'Untitled' for undefined", () => {
		expect(resolveDocTitle(undefined)).toBe("Untitled");
	});
});
