/**
 * Shared utility functions extracted for testability.
 * These are pure functions with no Svelte/DOM dependencies.
 */

/** Format an ISO date string to a human-readable short date. */
export function formatDate(iso: string): string {
	if (!iso) return "";
	const d = new Date(iso);
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/** Return a content preview placeholder for a document. */
export function excerpt(): string {
	return "Open to view content";
}

/**
 * Remove HTML elements that TipTap cannot render
 * (images, SVG, video, audio, object, embed, figure, picture).
 */
export function stripUnsupportedMedia(html: string): string {
	return html
		.replace(/<img\b[^>]*\/?>/gi, "")
		.replace(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi, "")
		.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, "")
		.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
		.replace(/<video\b[^>]*>[\s\S]*?<\/video>/gi, "")
		.replace(/<audio\b[^>]*>[\s\S]*?<\/audio>/gi, "")
		.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, "")
		.replace(/<embed\b[^>]*\/?>/gi, "")
		.trim();
}

/**
 * Strip file extension from a filename.
 * e.g. "report.docx" → "report"
 */
export function stripExtension(filename: string): string {
	return filename.replace(/\.[^/.]+$/, "");
}

/**
 * Check whether a filename ends with a supported import extension.
 */
export function isSupportedImportFile(filename: string): boolean {
	const lower = filename.toLowerCase();
	return lower.endsWith(".docx") || lower.endsWith(".pdf");
}

/**
 * Return the singular or plural form of "document" based on count.
 */
export function docCountLabel(count: number): string {
	return `${count} document${count === 1 ? "" : "s"}`;
}

/**
 * Return the document title falling back to "Untitled" when empty.
 */
export function resolveDocTitle(title: string | undefined | null): string {
	return title?.trim() || "Untitled";
}
