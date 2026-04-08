import { toPng, toJpeg, toBlob } from 'html-to-image';
import type { ExportFormat, ExportScale } from './types';

export async function exportCanvas(
	element: HTMLElement,
	format: ExportFormat,
	scale: ExportScale,
	filePrefix?: string
): Promise<void> {
	const options = {
		pixelRatio: scale,
		cacheBust: true,
		quality: format === 'jpg' ? 0.95 : undefined
	};

	let dataUrl: string;

	if (format === 'jpg') {
		dataUrl = await toJpeg(element, { ...options, backgroundColor: '#000000' });
	} else {
		dataUrl = await toPng(element, options);
	}

	const link = document.createElement('a');
	link.download = `monkr-${filePrefix ?? 'mockup'}-${Date.now()}.${format}`;
	link.href = dataUrl;
	link.click();
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
	// First capture the full canvas at the desired scale
	const options = {
		pixelRatio: scale,
		cacheBust: true,
		quality: format === 'jpg' ? 0.95 : undefined
	};

	let fullDataUrl: string;
	if (format === 'jpg') {
		fullDataUrl = await toJpeg(element, { ...options, backgroundColor: '#000000' });
	} else {
		fullDataUrl = await toPng(element, options);
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
}

export async function copyToClipboard(
	element: HTMLElement,
	scale: ExportScale
): Promise<void> {
	const blob = await toBlob(element, {
		pixelRatio: scale,
		cacheBust: true
	});
	if (!blob) throw new Error('Failed to create image blob');

	await navigator.clipboard.write([
		new ClipboardItem({ 'image/png': blob })
	]);
}
