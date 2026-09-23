import { toPng, toJpeg, toBlob, toCanvas } from 'html-to-image';
import { preInlineImages, stripTransformForCapture } from './animation';
import { exportFilter } from './capture-filter';
import type { ExportFormat, ExportScale } from './types';

/** Wait two animation frames so the browser repaints after DOM mutations before capture. */
function waitForRepaint(): Promise<void> {
	return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

/**
 * Safari ships a long-standing bug: images inside an SVG `foreignObject`
 * decode in a separate context from the main document, so the first capture
 * after a DOM mutation rasterizes with blank/black image content even though
 * the source <img> elements are fully decoded on the page. The fix used
 * across the html-to-image issue tracker is to capture twice — the first
 * pass warms Safari's SVG image cache, the second returns real pixels.
 *
 * Chromium and Firefox don't need this and pay an extra capture for nothing,
 * so we only double-tap on Safari.
 */
const isSafari =
	typeof navigator !== 'undefined' &&
	/^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

async function captureJpeg(
	element: HTMLElement,
	options: Parameters<typeof toJpeg>[1]
): Promise<string> {
	if (isSafari) await toJpeg(element, options);
	return toJpeg(element, options);
}

async function capturePng(
	element: HTMLElement,
	options: Parameters<typeof toPng>[1]
): Promise<string> {
	if (isSafari) await toPng(element, options);
	return toPng(element, options);
}

async function captureCanvas(
	element: HTMLElement,
	options: Parameters<typeof toCanvas>[1]
): Promise<HTMLCanvasElement> {
	if (isSafari) await toCanvas(element, options);
	return toCanvas(element, options);
}

async function captureBlob(
	element: HTMLElement,
	options: Parameters<typeof toBlob>[1]
): Promise<Blob | null> {
	if (isSafari) await toBlob(element, options);
	return toBlob(element, options);
}

/**
 * Capture `element` to a data URL, handling image inlining, the
 * transform-strip, repaint wait, and the Safari double-tap. This is the shared
 * core behind {@link exportCanvas}; headless automation calls it directly to
 * obtain pixels without triggering a browser download.
 */
export async function captureToDataUrl(
	element: HTMLElement,
	format: ExportFormat,
	scale: ExportScale,
	trimTransparent = false
): Promise<string> {
	const restoreImages = await preInlineImages(element);
	const restoreTransform = stripTransformForCapture(element);
	// Let the browser reflow/repaint after the transform strip and image inlining before
	// html-to-image clones the DOM — single rAF is sometimes not enough.
	await waitForRepaint();

	try {
		const options = {
			pixelRatio: scale,
			cacheBust: false,
			quality: format === 'jpg' ? 0.95 : undefined,
			filter: exportFilter
		};

		if (format === 'jpg') {
			return await captureJpeg(element, { ...options, backgroundColor: '#000000' });
		}
		if (trimTransparent) {
			return trimTransparentEdges(await captureCanvas(element, options)).toDataURL('image/png');
		}
		return await capturePng(element, options);
	} finally {
		restoreTransform();
		restoreImages();
	}
}

export async function exportCanvas(
	element: HTMLElement,
	format: ExportFormat,
	scale: ExportScale,
	filePrefix?: string,
	trimTransparent = false
): Promise<void> {
	const dataUrl = await captureToDataUrl(element, format, scale, trimTransparent);
	const link = document.createElement('a');
	link.download = `monkr-${filePrefix ?? 'mockup'}-${Date.now()}.${format}`;
	link.href = dataUrl;
	link.click();
}

/**
 * Crop a capture to the bounding box of every pixel with nonzero alpha, so
 * antialiased edges and soft shadows are kept whole. Works on the canvas
 * html-to-image already drew, before any PNG encode — no encode/decode round
 * trip. Scans inward from each edge and stops at the first visible pixel,
 * so the cost is the empty margin, not the whole image. A capture with no
 * visible pixels comes back untouched rather than failing the export.
 */
export function trimTransparentEdges(canvas: HTMLCanvasElement): HTMLCanvasElement {
	const { width: w, height: h } = canvas;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx || w === 0 || h === 0) return canvas;
	const data = ctx.getImageData(0, 0, w, h).data;
	const visible = (x: number, y: number) => data[(y * w + x) * 4 + 3] !== 0;
	const rowVisible = (y: number) => {
		for (let x = 0; x < w; x++) if (visible(x, y)) return true;
		return false;
	};
	const colVisible = (x: number, top: number, bottom: number) => {
		for (let y = top; y <= bottom; y++) if (visible(x, y)) return true;
		return false;
	};

	let top = 0;
	while (top < h && !rowVisible(top)) top++;
	if (top === h) return canvas; // nothing visible — export the full frame
	let bottom = h - 1;
	while (!rowVisible(bottom)) bottom--;
	let left = 0;
	while (!colVisible(left, top, bottom)) left++;
	let right = w - 1;
	while (!colVisible(right, top, bottom)) right--;

	if (left === 0 && top === 0 && right === w - 1 && bottom === h - 1) return canvas;
	const cropped = document.createElement('canvas');
	cropped.width = right - left + 1;
	cropped.height = bottom - top + 1;
	cropped
		.getContext('2d')!
		.drawImage(canvas, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
	return cropped;
}

/** Export a canvas element sliced into sections (for App Store mode) */
export async function exportCanvasSections(
	element: HTMLElement,
	numSections: number,
	sectionWidth: number,
	sectionHeight: number,
	format: ExportFormat,
	scale: ExportScale,
	filePrefix?: string
): Promise<void> {
	const restoreImages = await preInlineImages(element);
	const restoreTransform = stripTransformForCapture(element);
	await waitForRepaint();

	try {
		const options = {
			pixelRatio: scale,
			cacheBust: false,
			quality: format === 'jpg' ? 0.95 : undefined,
			filter: exportFilter
		};

		let fullDataUrl: string;
		if (format === 'jpg') {
			fullDataUrl = await captureJpeg(element, { ...options, backgroundColor: '#000000' });
		} else {
			fullDataUrl = await capturePng(element, options);
		}

		// Load the full image
		const img = new Image();
		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = reject;
			img.src = fullDataUrl;
		});

		// Slice into sections
		const sliceW = sectionWidth * scale;
		const sliceH = sectionHeight * scale;
		const canvas = document.createElement('canvas');
		canvas.width = sliceW;
		canvas.height = sliceH;
		const ctx = canvas.getContext('2d')!;

		for (let i = 0; i < numSections; i++) {
			ctx.clearRect(0, 0, sliceW, sliceH);
			ctx.drawImage(img, i * sliceW, 0, sliceW, sliceH, 0, 0, sliceW, sliceH);

			let dataUrl: string;
			if (format === 'jpg') {
				dataUrl = canvas.toDataURL('image/jpeg', 0.95);
			} else {
				dataUrl = canvas.toDataURL('image/png');
			}

			const link = document.createElement('a');
			link.download = `monkr-${filePrefix ? filePrefix + '-' : ''}slide-${i + 1}-${Date.now()}.${format}`;
			link.href = dataUrl;
			link.click();
			if (i < numSections - 1) await new Promise((r) => setTimeout(r, 300));
		}
	} finally {
		restoreTransform();
		restoreImages();
	}
}

export async function copyToClipboard(
	element: HTMLElement,
	scale: ExportScale,
	trimTransparent = false
): Promise<void> {
	const restoreImages = await preInlineImages(element);
	const restoreTransform = stripTransformForCapture(element);
	await waitForRepaint();

	try {
		const options = { pixelRatio: scale, cacheBust: false, filter: exportFilter };
		let blob: Blob | null;
		if (trimTransparent) {
			const trimmed = trimTransparentEdges(await captureCanvas(element, options));
			blob = await new Promise((resolve) => trimmed.toBlob(resolve, 'image/png'));
		} else {
			blob = await captureBlob(element, options);
		}
		if (!blob) throw new Error('Failed to create image blob');

		await navigator.clipboard.write([
			new ClipboardItem({ 'image/png': blob })
		]);
	} finally {
		restoreTransform();
		restoreImages();
	}
}
