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

/** Max export dimensions — cap at 1080p for animation (keeps it fast) */
const MAX_ANIM_WIDTH = 1920;
const MAX_ANIM_HEIGHT = 1080;
const MAX_EXPORT_FPS = 60;

/** Compute a pixel ratio that keeps the output within bounds */
function computeExportPixelRatio(element: HTMLElement): number {
	const w = element.offsetWidth;
	const h = element.offsetHeight;
	if (w <= 0 || h <= 0) return 1;
	const scaleW = MAX_ANIM_WIDTH / w;
	const scaleH = MAX_ANIM_HEIGHT / h;
	return Math.min(1, scaleW, scaleH);
}

/**
 * Capture animation frames by rendering the live DOM for each frame.
 *
 * The caller's onFrame callback mutates the reactive store which updates
 * the DOM with the correct transforms for each time step. We then capture
 * the fully-rendered DOM via html-to-image.
 *
 * Optimizations over naive approach:
 *  - Capped at 1080p output (pixelRatio scales down large canvases)
 *  - FPS clamped to 60
 *  - setTimeout(0) instead of double-RAF for faster yields
 *  - cacheBust: false to reuse resolved resources across frames
 */
export async function captureFrames(
	element: HTMLElement,
	duration: number,
	fps: number,
	onFrame: (time: number) => void,
	onProgress?: (pct: number) => void,
	_tracks?: AnimationTrack[] // reserved for future use
): Promise<Blob[]> {
	const clampedFps = Math.min(fps, MAX_EXPORT_FPS);
	const totalFrames = Math.ceil((duration / 1000) * clampedFps);
	const frameInterval = duration / totalFrames;
	const pixelRatio = computeExportPixelRatio(element);
	const frames: Blob[] = [];

	for (let i = 0; i < totalFrames; i++) {
		const time = i * frameInterval;
		onFrame(time);

		// Yield to let Svelte flush DOM updates
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
