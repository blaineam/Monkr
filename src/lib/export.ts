import { toPng, toJpeg } from 'html-to-image';
import type { ExportFormat, ExportScale } from './types';

export async function exportCanvas(
	element: HTMLElement,
	format: ExportFormat,
	scale: ExportScale
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
	link.download = `monkr-mockup-${Date.now()}.${format}`;
	link.href = dataUrl;
	link.click();
}
