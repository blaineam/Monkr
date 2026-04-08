import { toPng } from 'html-to-image';
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

/**
 * Capture frames from a DOM element.
 *
 * Uses toPng (data URL) instead of toBlob for faster capture on Safari,
 * then batch-converts to blobs at the end. Also caps output to 4K and
 * clamps FPS to 60.
 */
export async function captureFrames(
	element: HTMLElement,
	duration: number,
	fps: number,
	onFrame: (time: number) => void,
	onProgress?: (pct: number) => void
): Promise<Blob[]> {
	const clampedFps = Math.min(fps, MAX_EXPORT_FPS);
	const totalFrames = Math.ceil((duration / 1000) * clampedFps);
	const frameInterval = duration / totalFrames;
	const dataUrls: string[] = [];
	const pixelRatio = computeExportPixelRatio(element);

	for (let i = 0; i < totalFrames; i++) {
		const time = i * frameInterval;
		onFrame(time);

		// Single RAF to let Svelte flush DOM updates
		await new Promise<void>((r) => requestAnimationFrame(() => r()));

		// toPng returns a data URL — faster than toBlob on Safari
		const dataUrl = await toPng(element, {
			pixelRatio,
			cacheBust: false
		});
		dataUrls.push(dataUrl);
		onProgress?.((i + 1) / totalFrames * 100);
	}

	// Batch convert data URLs to blobs
	const frames: Blob[] = [];
	for (const dataUrl of dataUrls) {
		const res = await fetch(dataUrl);
		frames.push(await res.blob());
	}
	return frames;
}

export type VideoFormat = 'mp4' | 'mov' | 'webm';

let _ffmpeg: FFmpeg | null = null;
let _ffmpegLoading = false;

/** Get or initialize the shared FFmpeg instance */
async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
	if (_ffmpeg && _ffmpeg.loaded) return _ffmpeg;
	if (_ffmpegLoading) {
		// Wait for in-flight load
		while (_ffmpegLoading) await new Promise((r) => setTimeout(r, 100));
		if (_ffmpeg?.loaded) return _ffmpeg;
	}
	_ffmpegLoading = true;
	const ffmpeg = new FFmpeg();
	if (onLog) ffmpeg.on('log', ({ message }) => onLog(message));
	// Use single-threaded core (no SharedArrayBuffer requirement) as fallback
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

/** Export frames as MP4 video using FFmpeg WASM */
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

	// Write frame PNGs to FFmpeg virtual FS
	const allFrames = loop ? [...frames, ...frames] : frames;
	for (let i = 0; i < allFrames.length; i++) {
		const data = new Uint8Array(await allFrames[i].arrayBuffer());
		await ffmpeg.writeFile(`frame${String(i).padStart(5, '0')}.png`, data);
	}

	// Encode to chosen format
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
		// MP4 or MOV — use H.264
		// Ensure dimensions are even (H.264 requirement)
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
