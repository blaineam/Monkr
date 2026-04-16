import { toPng, toBlob } from 'html-to-image';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export interface AnimationKeyframe {
	/** Time in ms from start */
	time: number;
	/** Property values at this keyframe */
	props: Record<string, number>;
}

export interface AnimationTrack {
	/** Target object ID or 'camera' */
	targetId: string;
	/** Property name (e.g. 'rotation', 'x', 'y', 'scale', 'tiltX', 'tiltY') */
	property: string;
	keyframes: AnimationKeyframe[];
}

export type AnimationPreset = {
	id: string;
	name: string;
	description: string;
	duration: number;
	/** Generates tracks for the given object IDs */
	createTracks: (objectIds: string[]) => AnimationTrack[];
};

/** Linear interpolation between keyframes */
function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/** Ease in-out cubic */
function easeInOut(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Get interpolated value at time t for a track */
export function getValueAtTime(track: AnimationTrack, time: number): number | undefined {
	const kfs = track.keyframes;
	if (kfs.length === 0) return undefined;
	if (kfs.length === 1) return kfs[0].props[track.property];
	if (time <= kfs[0].time) return kfs[0].props[track.property];
	if (time >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].props[track.property];

	for (let i = 0; i < kfs.length - 1; i++) {
		if (time >= kfs[i].time && time <= kfs[i + 1].time) {
			const t = (time - kfs[i].time) / (kfs[i + 1].time - kfs[i].time);
			const a = kfs[i].props[track.property] ?? 0;
			const b = kfs[i + 1].props[track.property] ?? 0;
			return lerp(a, b, easeInOut(t));
		}
	}
	return kfs[kfs.length - 1].props[track.property];
}

/** Built-in animation presets */
export const animationPresets: AnimationPreset[] = [
	{
		id: 'spin-360',
		name: 'Full Spin',
		description: 'Rotate device 360 degrees',
		duration: 2000,
		createTracks: (ids) =>
			ids.map((id) => ({
				targetId: id,
				property: 'rotation',
				keyframes: [
					{ time: 0, props: { rotation: 0 } },
					{ time: 2000, props: { rotation: 360 } }
				]
			}))
	},
	{
		id: 'rock',
		name: 'Rock',
		description: 'Gentle rocking motion',
		duration: 2000,
		createTracks: (ids) =>
			ids.map((id) => ({
				targetId: id,
				property: 'rotation',
				keyframes: [
					{ time: 0, props: { rotation: -8 } },
					{ time: 500, props: { rotation: 8 } },
					{ time: 1000, props: { rotation: -8 } },
					{ time: 1500, props: { rotation: 8 } },
					{ time: 2000, props: { rotation: -8 } }
				]
			}))
	},
	{
		id: 'tilt-showcase',
		name: 'Tilt Showcase',
		description: '3D tilt to show depth',
		duration: 3000,
		createTracks: (ids) =>
			ids.flatMap((id) => [
				{
					targetId: id,
					property: 'tiltY',
					keyframes: [
						{ time: 0, props: { tiltY: -20 } },
						{ time: 1500, props: { tiltY: 20 } },
						{ time: 3000, props: { tiltY: -20 } }
					]
				},
				{
					targetId: id,
					property: 'tiltX',
					keyframes: [
						{ time: 0, props: { tiltX: 5 } },
						{ time: 750, props: { tiltX: -5 } },
						{ time: 1500, props: { tiltX: 5 } },
						{ time: 2250, props: { tiltX: -5 } },
						{ time: 3000, props: { tiltX: 5 } }
					]
				}
			])
	},
	{
		id: 'float',
		name: 'Float',
		description: 'Gentle floating up and down',
		duration: 2500,
		createTracks: (ids) =>
			ids.map((id) => ({
				targetId: id,
				property: 'y',
				keyframes: [
					{ time: 0, props: { y: 48 } },
					{ time: 1250, props: { y: 52 } },
					{ time: 2500, props: { y: 48 } }
				]
			}))
	},
	{
		id: 'zoom-in-out',
		name: 'Zoom Pulse',
		description: 'Scale up and back down',
		duration: 2000,
		createTracks: (ids) =>
			ids.map((id) => ({
				targetId: id,
				property: 'scale',
				keyframes: [
					{ time: 0, props: { scale: 1 } },
					{ time: 1000, props: { scale: 1.15 } },
					{ time: 2000, props: { scale: 1 } }
				]
			}))
	},
	{
		id: 'slide-in',
		name: 'Slide In',
		description: 'Slide from right to center',
		duration: 1500,
		createTracks: (ids) =>
			ids.map((id) => ({
				targetId: id,
				property: 'x',
				keyframes: [
					{ time: 0, props: { x: 120 } },
					{ time: 1500, props: { x: 50 } }
				]
			}))
	}
];

/** Scale a preset's tracks to a target duration */
export function scaleTracksToduration(tracks: AnimationTrack[], presetDuration: number, targetDuration: number): AnimationTrack[] {
	if (presetDuration === targetDuration || presetDuration <= 0) return tracks;
	const ratio = targetDuration / presetDuration;
	return tracks.map((t) => ({
		...t,
		keyframes: t.keyframes.map((kf) => ({
			...kf,
			time: kf.time * ratio
		}))
	}));
}

export interface AnimationConfig {
	enabled: boolean;
	duration: number;
	fps: number;
	loop: boolean;
	tracks: AnimationTrack[];
	presetId: string | null;
}

export function createDefaultAnimationConfig(): AnimationConfig {
	return {
		enabled: false,
		duration: 2000,
		fps: 30,
		loop: true,
		tracks: [],
		presetId: null
	};
}

// ─── Frame Capture ────────────────────────────────────────────

const MAX_EXPORT_FPS = 60;

export type AnimResolution = '1080p' | '4k';

const RESOLUTION_CAPS: Record<AnimResolution, { w: number; h: number }> = {
	'1080p': { w: 1920, h: 1080 },
	'4k': { w: 3840, h: 2160 }
};

/**
 * Compute pixelRatio for html-to-image capture, capped to the target resolution.
 */
function computeExportPixelRatio(element: HTMLElement, resolution: AnimResolution = '1080p'): number {
	const w = element.offsetWidth;
	const h = element.offsetHeight;
	if (w <= 0 || h <= 0) return 1;
	const cap = RESOLUTION_CAPS[resolution];
	const scaleW = cap.w / w;
	const scaleH = cap.h / h;
	return Math.min(1, scaleW, scaleH);
}

/**
 * Temporarily remove CSS transform from the canvas element before capture.
 * The canvas uses `transform: scale(viewScale)` to fit the viewport, but
 * html-to-image clones inline styles including that transform — resulting
 * in the content being rendered at a tiny scale in the top-left corner.
 */
export function stripTransformForCapture(element: HTMLElement): () => void {
	const original = element.style.transform;
	const originalOrigin = element.style.transformOrigin;
	element.style.transform = 'none';
	element.style.transformOrigin = '';
	return () => {
		element.style.transform = original;
		element.style.transformOrigin = originalOrigin;
	};
}

/** Convert a fetch-able URL to a base64 data URL */
async function urlToDataUrl(url: string): Promise<string> {
	const resp = await fetch(url);
	const blob = await resp.blob();
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

/**
 * Pre-inline all images within a DOM subtree as base64 data URLs.
 * This includes both <img> elements and CSS background-image URLs.
 *
 * html-to-image clones the DOM and re-fetches/re-encodes every image
 * source for EACH frame. By inlining them as data URLs first, the cloned
 * DOM inherits the data URLs and the library skips all I/O — this is
 * the single biggest speedup for frame capture on Safari.
 *
 * Returns a cleanup function that restores original sources.
 */
export async function preInlineImages(root: HTMLElement): Promise<() => void> {
	const imgOriginals = new Map<HTMLImageElement, string>();
	const bgOriginals = new Map<HTMLElement, string>();

	// Inline <img> src attributes
	const imgs = root.querySelectorAll('img');
	await Promise.all(Array.from(imgs).map(async (img) => {
		const src = img.src;
		if (!src || src.startsWith('data:')) return;
		imgOriginals.set(img, src);
		try {
			img.src = await urlToDataUrl(src);
		} catch {
			// leave original src
		}
	}));

	// Inline CSS background-image url() values
	const allElements = root.querySelectorAll<HTMLElement>('*');
	await Promise.all(Array.from(allElements).map(async (el) => {
		const bgImg = el.style.backgroundImage;
		if (!bgImg || !bgImg.includes('url(')) return;
		const match = bgImg.match(/url\(["']?([^"')]+)["']?\)/);
		if (!match || !match[1] || match[1].startsWith('data:')) return;
		const url = match[1];
		bgOriginals.set(el, bgImg);
		try {
			const dataUrl = await urlToDataUrl(url);
			el.style.backgroundImage = `url(${dataUrl})`;
		} catch {
			// leave original
		}
	}));

	return () => {
		for (const [img, src] of imgOriginals) img.src = src;
		for (const [el, bg] of bgOriginals) el.style.backgroundImage = bg;
	};
}

// ─── Video Export ─────────────────────────────────────────────

export type VideoFormat = 'mp4' | 'mov' | 'webm';

let _ffmpeg: FFmpeg | null = null;
let _ffmpegLoading = false;

/** Get or initialize the shared FFmpeg instance */
async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
	if (_ffmpeg && _ffmpeg.loaded) return _ffmpeg;
	if (_ffmpegLoading) {
		while (_ffmpegLoading) await new Promise((r) => setTimeout(r, 100));
		if (_ffmpeg?.loaded) return _ffmpeg;
	}
	_ffmpegLoading = true;
	const ffmpeg = new FFmpeg();
	if (onLog) ffmpeg.on('log', ({ message }) => onLog(message));
	const useMT = typeof SharedArrayBuffer !== 'undefined';
	if (useMT) {
		await ffmpeg.load({
			coreURL: 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm/ffmpeg-core.js',
			wasmURL: 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm/ffmpeg-core.wasm',
			workerURL: 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm/ffmpeg-core.worker.js'
		});
	} else {
		await ffmpeg.load({
			coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
			wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm'
		});
	}
	_ffmpeg = ffmpeg;
	_ffmpegLoading = false;
	return ffmpeg;
}

/**
 * Capture frames and stream them directly to FFmpeg's virtual filesystem,
 * then encode and return the video.
 *
 * Previous approach stored ALL frame Blobs in a JS array, which for a
 * 2s/30fps/1080p animation could consume 200-300MB+ of heap and crash
 * the tab. This version writes each frame to FFmpeg's WASM FS immediately
 * after capture and releases the Blob, keeping JS heap usage constant.
 */
export async function captureAndExportVideo(
	element: HTMLElement,
	duration: number,
	fps: number,
	onFrame: (time: number) => void,
	width: number,
	height: number,
	loop: boolean,
	format: VideoFormat = 'mp4',
	resolution: AnimResolution = '1080p',
	onProgress?: (pct: number) => void,
	onStatus?: (msg: string) => void,
	onLog?: (msg: string) => void,
	isCancelled?: () => boolean
): Promise<Blob | null> {
	const clampedFps = Math.min(fps, MAX_EXPORT_FPS);
	const totalFrames = Math.ceil((duration / 1000) * clampedFps);
	const frameInterval = duration / totalFrames;
	const pixelRatio = computeExportPixelRatio(element, resolution);

	// ── Phase 1: Load FFmpeg while pre-inlining images ──
	onStatus?.('Loading FFmpeg...');
	onProgress?.(0);

	const [ffmpeg, restoreImages] = await Promise.all([
		getFFmpeg(onLog),
		preInlineImages(element)
	]);

	// Strip the viewScale CSS transform so html-to-image captures at full size
	const restoreTransform = stripTransformForCapture(element);

	let frameCount = 0;

	try {
		// ── Phase 2: Capture frames → stream to FFmpeg FS ──
		onStatus?.('Capturing frames...');

		for (let i = 0; i < totalFrames; i++) {
			if (isCancelled?.()) return null;

			const time = i * frameInterval;
			onFrame(time);

			// Yield to let Svelte flush DOM updates
			await new Promise<void>((r) => setTimeout(r, 0));

			const blob = await toBlob(element, { pixelRatio, cacheBust: false });
			if (blob) {
				// Write frame directly to FFmpeg FS — blob is GC'd after this
				const data = new Uint8Array(await blob.arrayBuffer());
				const frameName = `frame${String(frameCount).padStart(5, '0')}.png`;
				await ffmpeg.writeFile(frameName, data);
				frameCount++;
			}
			// Frame capture is 70% of total progress
			onProgress?.((i + 1) / totalFrames * 70);
		}
	} finally {
		// Restore original image sources and CSS transform
		restoreImages();
		restoreTransform();
	}

	if (isCancelled?.() || frameCount === 0) return null;

	// If looping, duplicate frames in FFmpeg FS (just copy references)
	if (loop) {
		onStatus?.('Preparing loop...');
		for (let i = 0; i < frameCount; i++) {
			const srcName = `frame${String(i).padStart(5, '0')}.png`;
			const dstName = `frame${String(frameCount + i).padStart(5, '0')}.png`;
			const data = await ffmpeg.readFile(srcName);
			await ffmpeg.writeFile(dstName, data);
		}
	}

	const totalWrittenFrames = loop ? frameCount * 2 : frameCount;

	// ── Phase 3: Encode video ──
	onStatus?.('Encoding video...');
	onProgress?.(75);

	const ext = format === 'mov' ? 'mov' : format === 'webm' ? 'webm' : 'mp4';
	const outputFile = `output.${ext}`;

	if (format === 'webm') {
		await ffmpeg.exec([
			'-framerate', String(clampedFps),
			'-i', 'frame%05d.png',
			'-c:v', 'libvpx-vp9',
			'-pix_fmt', 'yuva420p',
			'-b:v', '2M',
			'-an',
			outputFile
		]);
	} else {
		const ew = width % 2 === 0 ? width : width + 1;
		const eh = height % 2 === 0 ? height : height + 1;
		await ffmpeg.exec([
			'-framerate', String(clampedFps),
			'-i', 'frame%05d.png',
			'-vf', `scale=${ew}:${eh}`,
			'-c:v', 'libx264',
			'-pix_fmt', 'yuv420p',
			'-preset', 'fast',
			'-crf', '18',
			'-an',
			outputFile
		]);
	}

	onProgress?.(90);
	onStatus?.('Reading output...');

	const result = await ffmpeg.readFile(outputFile);

	// Clean up FFmpeg FS
	for (let i = 0; i < totalWrittenFrames; i++) {
		await ffmpeg.deleteFile(`frame${String(i).padStart(5, '0')}.png`).catch(() => {});
	}
	await ffmpeg.deleteFile(outputFile).catch(() => {});

	onProgress?.(95);

	const mimeType = format === 'webm' ? 'video/webm'
		: format === 'mov' ? 'video/quicktime'
		: 'video/mp4';
	return new Blob([result], { type: mimeType });
}
