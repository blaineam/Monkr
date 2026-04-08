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

/** Max export resolution — clamp to 4K */
const MAX_EXPORT_WIDTH = 3840;
const MAX_EXPORT_HEIGHT = 2160;
const MAX_EXPORT_FPS = 60;

/** Compute a pixel ratio that keeps the output within 4K bounds */
function computeExportPixelRatio(element: HTMLElement): number {
	const w = element.offsetWidth;
	const h = element.offsetHeight;
	if (w <= 0 || h <= 0) return 1;
	const scaleW = MAX_EXPORT_WIDTH / w;
	const scaleH = MAX_EXPORT_HEIGHT / h;
	return Math.min(1, scaleW, scaleH);
}

/** Load an image element from a src URL */
function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}

interface ObjectSnapshot {
	id: string;
	/** Isolated object image (transparent background) */
	image: HTMLImageElement;
	/** Pixel width/height of the isolated image */
	imgW: number;
	imgH: number;
}

/**
 * Fast frame capture via canvas compositing.
 *
 * Strategy: capture the background and each object ONCE using html-to-image,
 * isolate each object by pixel-diffing against the background, then composite
 * every animation frame on a Canvas2D with pure drawImage + transform calls.
 *
 * html-to-image is called (1 + N) times total (N = object count),
 * instead of once per frame. For a 2s@30fps animation that's 2 calls vs 60.
 */
export async function captureFrames(
	element: HTMLElement,
	duration: number,
	fps: number,
	onFrame: (time: number) => void,
	onProgress?: (pct: number) => void,
	tracks?: AnimationTrack[]
): Promise<Blob[]> {
	const clampedFps = Math.min(fps, MAX_EXPORT_FPS);
	const totalFrames = Math.ceil((duration / 1000) * clampedFps);
	const frameInterval = duration / totalFrames;
	const pixelRatio = computeExportPixelRatio(element);

	// Find object wrapper elements
	const objectEls = element.querySelectorAll<HTMLElement>('[data-object-id]');

	// If no objects or no tracks, use slow path
	if (objectEls.length === 0 || !tracks || tracks.length === 0) {
		return captureFramesSlow(element, duration, fps, onFrame, onProgress);
	}

	// ─── Phase 1: Capture background (all objects hidden) ───
	onProgress?.(0);

	// Save & hide all objects
	const savedStyles: Map<HTMLElement, { vis: string }> = new Map();
	objectEls.forEach((el) => {
		savedStyles.set(el, { vis: el.style.visibility });
		el.style.visibility = 'hidden';
	});

	await new Promise<void>((r) => requestAnimationFrame(() => r()));
	const bgDataUrl = await toPng(element, { pixelRatio, cacheBust: false });
	const bgImg = await loadImage(bgDataUrl);

	const canvasW = bgImg.width;
	const canvasH = bgImg.height;

	// Get background pixel data for diffing
	const diffCvs = document.createElement('canvas');
	diffCvs.width = canvasW;
	diffCvs.height = canvasH;
	const diffCtx = diffCvs.getContext('2d', { willReadFrequently: true })!;
	diffCtx.drawImage(bgImg, 0, 0);
	const bgPixelData = diffCtx.getImageData(0, 0, canvasW, canvasH);

	// ─── Phase 2: Capture each object (show one at a time, diff with bg) ───
	const snapshots: ObjectSnapshot[] = [];

	for (const el of objectEls) {
		const objId = el.getAttribute('data-object-id')!;

		// Show only this object, positioned at center with identity transform
		el.style.visibility = 'visible';
		const savedTransform = el.style.transform;
		const savedLeft = el.style.left;
		const savedTop = el.style.top;

		el.style.left = '50%';
		el.style.top = '50%';
		el.style.transform = 'translate(-50%, -50%)';

		await new Promise<void>((r) => requestAnimationFrame(() => r()));
		const objDataUrl = await toPng(element, { pixelRatio, cacheBust: false });
		const objFullImg = await loadImage(objDataUrl);

		// Restore
		el.style.transform = savedTransform;
		el.style.left = savedLeft;
		el.style.top = savedTop;
		el.style.visibility = 'hidden';

		// Diff to isolate the object from the background
		diffCtx.clearRect(0, 0, canvasW, canvasH);
		diffCtx.drawImage(objFullImg, 0, 0);
		const objPixelData = diffCtx.getImageData(0, 0, canvasW, canvasH);
		const isoData = diffCtx.createImageData(canvasW, canvasH);

		let minX = canvasW, minY = canvasH, maxX = 0, maxY = 0;

		for (let p = 0; p < objPixelData.data.length; p += 4) {
			const dr = Math.abs(objPixelData.data[p] - bgPixelData.data[p]);
			const dg = Math.abs(objPixelData.data[p + 1] - bgPixelData.data[p + 1]);
			const db = Math.abs(objPixelData.data[p + 2] - bgPixelData.data[p + 2]);
			const diff = dr + dg + db;

			if (diff > 8) {
				isoData.data[p] = objPixelData.data[p];
				isoData.data[p + 1] = objPixelData.data[p + 1];
				isoData.data[p + 2] = objPixelData.data[p + 2];
				isoData.data[p + 3] = Math.min(255, diff * 4);

				const px = (p / 4) % canvasW;
				const py = Math.floor((p / 4) / canvasW);
				if (px < minX) minX = px;
				if (px > maxX) maxX = px;
				if (py < minY) minY = py;
				if (py > maxY) maxY = py;
			}
		}

		// Crop to bounding box
		const cropW = maxX - minX + 1;
		const cropH = maxY - minY + 1;
		if (cropW > 0 && cropH > 0) {
			diffCtx.putImageData(isoData, 0, 0);
			const croppedData = diffCtx.getImageData(minX, minY, cropW, cropH);
			const cropCvs = document.createElement('canvas');
			cropCvs.width = cropW;
			cropCvs.height = cropH;
			const cropCtx = cropCvs.getContext('2d')!;
			cropCtx.putImageData(croppedData, 0, 0);
			const croppedUrl = cropCvs.toDataURL('image/png');
			const croppedImg = await loadImage(croppedUrl);

			snapshots.push({ id: objId, image: croppedImg, imgW: cropW, imgH: cropH });
		}
	}

	// Restore all objects
	objectEls.forEach((el) => {
		const saved = savedStyles.get(el);
		if (saved) el.style.visibility = saved.vis;
	});

	onProgress?.(10);

	// ─── Phase 3: Composite each frame ───
	const compositeCvs = document.createElement('canvas');
	compositeCvs.width = canvasW;
	compositeCvs.height = canvasH;
	const compCtx = compositeCvs.getContext('2d')!;

	const frames: Blob[] = [];

	for (let i = 0; i < totalFrames; i++) {
		const time = i * frameInterval;

		// Evaluate track values for this time
		const animValues: Map<string, Map<string, number>> = new Map();
		for (const track of tracks) {
			const val = getValueAtTime(track, time);
			if (val !== undefined) {
				if (!animValues.has(track.targetId)) animValues.set(track.targetId, new Map());
				animValues.get(track.targetId)!.set(track.property, val);
			}
		}

		// Draw background
		compCtx.clearRect(0, 0, canvasW, canvasH);
		compCtx.drawImage(bgImg, 0, 0);

		// Draw each object with animated transforms
		for (const snap of snapshots) {
			const vals = animValues.get(snap.id);

			// Get animated properties (fall back to base values if not animated)
			const animX = vals?.get('x') ?? 50;
			const animY = vals?.get('y') ?? 50;
			const animScale = vals?.get('scale') ?? 1;
			const animRotation = vals?.get('rotation') ?? 0;
			// tiltX/tiltY aren't easily replicated in 2D canvas, but rotation + scale + position are

			// Object was captured centered at (50%, 50%) = (canvasW/2, canvasH/2).
			// Animated position is at (animX%, animY%).
			const posX = (animX / 100) * canvasW;
			const posY = (animY / 100) * canvasH;

			compCtx.save();
			compCtx.translate(posX, posY);
			compCtx.rotate((animRotation * Math.PI) / 180);
			compCtx.scale(animScale, animScale);
			// Draw centered
			compCtx.drawImage(snap.image, -snap.imgW / 2, -snap.imgH / 2);
			compCtx.restore();
		}

		const blob = await new Promise<Blob | null>((resolve) =>
			compositeCvs.toBlob((b) => resolve(b), 'image/png')
		);
		if (blob) frames.push(blob);
		onProgress?.(10 + ((i + 1) / totalFrames) * 90);
	}

	return frames;
}

/**
 * Slow fallback: captures the full DOM via html-to-image for every frame.
 * Used when compositing isn't possible.
 */
async function captureFramesSlow(
	element: HTMLElement,
	duration: number,
	fps: number,
	onFrame: (time: number) => void,
	onProgress?: (pct: number) => void
): Promise<Blob[]> {
	const clampedFps = Math.min(fps, MAX_EXPORT_FPS);
	const totalFrames = Math.ceil((duration / 1000) * clampedFps);
	const frameInterval = duration / totalFrames;
	const pixelRatio = computeExportPixelRatio(element);
	const frames: Blob[] = [];

	for (let i = 0; i < totalFrames; i++) {
		const time = i * frameInterval;
		onFrame(time);
		await new Promise<void>((r) => setTimeout(r, 0));

		const blob = await toBlob(element, { pixelRatio, cacheBust: false });
		if (blob) frames.push(blob);
		onProgress?.((i + 1) / totalFrames * 100);
	}

	return frames;
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

/** Export frames as video using FFmpeg WASM */
export async function exportAsVideo(
	frames: Blob[],
	width: number,
	height: number,
	fps: number,
	loop: boolean,
	format: VideoFormat = 'mp4',
	onLog?: (msg: string) => void
): Promise<Blob> {
	const ffmpeg = await getFFmpeg(onLog);

	const allFrames = loop ? [...frames, ...frames] : frames;
	for (let i = 0; i < allFrames.length; i++) {
		const data = new Uint8Array(await allFrames[i].arrayBuffer());
		await ffmpeg.writeFile(`frame${String(i).padStart(5, '0')}.png`, data);
	}

	const ext = format === 'mov' ? 'mov' : format === 'webm' ? 'webm' : 'mp4';
	const outputFile = `output.${ext}`;

	if (format === 'webm') {
		await ffmpeg.exec([
			'-framerate', String(fps),
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
			'-framerate', String(fps),
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

	const result = await ffmpeg.readFile(outputFile);

	// Clean up
	for (let i = 0; i < allFrames.length; i++) {
		await ffmpeg.deleteFile(`frame${String(i).padStart(5, '0')}.png`);
	}
	await ffmpeg.deleteFile(outputFile);

	const mimeType = format === 'webm' ? 'video/webm'
		: format === 'mov' ? 'video/quicktime'
		: 'video/mp4';
	return new Blob([result], { type: mimeType });
}
