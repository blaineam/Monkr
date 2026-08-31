/**
 * html-to-image node filter: drop editor-only chrome (anything tagged
 * `.monkr-export-ignore`) from a capture. Returning false excludes the node and
 * its whole subtree.
 *
 * Its own module because both export.ts and animation.ts capture, and export.ts
 * already imports from animation.ts — importing back the other way would make a
 * cycle.
 *
 * This is defence-in-depth, not the load-bearing fix. The transparency
 * checkerboard is a *sibling* of the capture root (see Canvas.svelte), so no
 * current export depends on this filter. It exists so future in-canvas editor
 * chrome has a documented way to opt out — and so all four capture call sites
 * look the same, which is what went wrong last time.
 */
export function exportFilter(node: HTMLElement): boolean {
	// Optional chaining rather than `instanceof HTMLElement`: html-to-image also
	// hands over text nodes (which have no classList), and instanceof is false
	// for elements from another realm, e.g. inside an iframe.
	return !node?.classList?.contains?.('monkr-export-ignore');
}
