import type {
	AppStoreConfig,
	BackgroundConfig,
	BackgroundType,
	CanvasSize,
	ExportFormat,
	ExportScale,
	FrameStyle,
	MonkrState,
	SceneObject,
	ShadowConfig,
	TextBlock,
	TextOverlay
} from '../types';
import type { LayoutTemplate } from '../templates';
import type { ScenePreset } from '../scenes';
import type { MockupScene } from '../mockups';
import { mockupScenes } from '../mockups';

let _nextId = 1;
function genId(): string {
	return `obj-${_nextId++}`;
}

let _nextTextId = 1;
function genTextId(): string {
	return `txt-${_nextTextId++}`;
}

function createDefaultTextBlock(overrides?: Partial<TextBlock>): TextBlock {
	return {
		id: genTextId(),
		text: '',
		fontSize: 48,
		color: '#ffffff',
		position: 'custom',
		fontWeight: 600,
		fontFamily: 'Inter',
		textAlign: 'center',
		letterSpacing: -0.5,
		lineHeight: 1.2,
		x: 50,
		y: 15,
		tiltX: 0,
		tiltY: 0,
		rotation: 0,
		shadow: {
			enabled: false,
			color: 'rgba(0, 0, 0, 0.5)',
			blur: 10,
			offsetX: 0,
			offsetY: 4
		},
		arcDegrees: 0,
		pathType: 'arc' as const,
		maxWidth: 0,
		...overrides
	};
}

function createDefaultAppStore(): AppStoreConfig {
	return {
		enabled: false,
		numSections: 3,
		sectionWidth: 1290,
		sectionHeight: 2796,
		presetName: 'iPhone 6.7"'
	};
}

function createDefaultObject(): SceneObject {
	return {
		id: genId(),
		deviceId: 'iphone-16-pro',
		deviceColorId: 'natural-titanium',
		screenshotUrl: null,
		screenshotFile: null,
		extraScreenshots: [],
		x: 50,
		y: 50,
		scale: 1,
		rotation: 0,
		tiltX: 0,
		tiltY: 0,
		shadow: {
			enabled: true,
			color: 'rgba(0, 0, 0, 0.4)',
			blur: 60,
			spread: 0,
			offsetX: 0,
			offsetY: 24
		},
		frameStyle: 'default',
		borderRadius: 16,
		glow: { enabled: false, color: 'rgba(255,255,255,0.6)', blur: 20, spread: 2 }
	};
}

function createDefaultState(): MonkrState {
	const firstObj = createDefaultObject();
	return {
		background: {
			type: 'gradient',
			solidColor: '#1e1b4b',
			gradientCss:
				'radial-gradient(at 20% 80%, #7c3aed 0%, transparent 60%), radial-gradient(at 80% 20%, #ec4899 0%, transparent 60%), radial-gradient(at 50% 50%, #2563eb 0%, transparent 80%), #1e1b4b',
			gradientName: 'Purple Haze',
			imageUrl: null
		},
		sceneObjects: [firstObj],
		selectedObjectId: firstObj.id,
		exportConfig: {
			scale: 2,
			format: 'png'
		},
		canvasSize: {
			width: 1920,
			height: 1080,
			presetName: 'Landscape 16:9'
		},
		padding: 80,
		textOverlay: {
			enabled: false,
			text: '',
			fontSize: 48,
			color: '#ffffff',
			position: 'above',
			fontWeight: 600,
			fontFamily: 'Inter',
			textAlign: 'center',
			letterSpacing: -0.5,
			lineHeight: 1.2,
			x: 50,
			y: 50,
			tiltX: 0,
			tiltY: 0,
			rotation: 0,
			shadow: {
				enabled: false,
				color: 'rgba(0, 0, 0, 0.5)',
				blur: 10,
				offsetX: 0,
				offsetY: 4
			},
			arcDegrees: 0,
			pathType: 'arc' as const
		},
		textBlocks: [],
		selectedTextId: null,
		activeMockupId: null,
		mockupImageUrl: null,
		mockupScreenshotUrl: null,
		mockupScreenshotFile: null,
		mockupCorners: null,
		appStore: createDefaultAppStore(),
		animation: {
			enabled: false,
			duration: 2000,
			fps: 30,
			loop: true,
			presetId: null
		}
	};
}

const AUTOSAVE_KEY = 'monkr_autosave';

/** Convert a blob URL to a base64 data URL */
async function blobUrlToDataUrl(blobUrl: string | null): Promise<string | null> {
	if (!blobUrl) return null;
	try {
		const blob = await fetch(blobUrl).then((r) => r.blob());
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result as string);
			reader.onerror = () => resolve(null);
			reader.readAsDataURL(blob);
		});
	} catch {
		return null;
	}
}

/** Resize an image blob URL to a JPEG data URL capped at maxDim to save space */
async function blobUrlToCompressedDataUrl(blobUrl: string | null, maxDim = 1200): Promise<string | null> {
	if (!blobUrl) return null;
	try {
		const blob = await fetch(blobUrl).then((r) => r.blob());
		const bmp = await createImageBitmap(blob);
		const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
		const w = Math.round(bmp.width * scale);
		const h = Math.round(bmp.height * scale);
		const canvas = new OffscreenCanvas(w, h);
		const ctx = canvas.getContext('2d')!;
		ctx.drawImage(bmp, 0, 0, w, h);
		bmp.close();
		const outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result as string);
			reader.onerror = () => resolve(null);
			reader.readAsDataURL(outBlob);
		});
	} catch {
		return blobUrlToDataUrl(blobUrl);
	}
}

/** Serialize state for localStorage (converts images to data URLs) */
async function serializeState(state: MonkrState): Promise<string> {
	// Convert background image blob URL to data URL so it persists
	let bgImageDataUrl: string | null = null;
	if (state.background.type === 'image' && state.background.imageUrl) {
		bgImageDataUrl = await blobUrlToCompressedDataUrl(state.background.imageUrl);
	}

	// Convert device screenshots to compressed data URLs
	const sceneObjects = await Promise.all(
		state.sceneObjects.map(async (o) => ({
			...o,
			screenshotUrl: await blobUrlToCompressedDataUrl(o.screenshotUrl),
			screenshotFile: null,
			extraScreenshots: [] // extras are too large for localStorage
		}))
	);

	return JSON.stringify({
		version: 3,
		background: { ...state.background, imageUrl: bgImageDataUrl },
		canvasSize: state.canvasSize,
		padding: state.padding,
		exportConfig: state.exportConfig,
		textOverlay: state.textOverlay,
		textBlocks: state.textBlocks,
		selectedTextId: state.selectedTextId,
		sceneObjects,
		selectedObjectId: state.selectedObjectId,
		activeMockupId: state.activeMockupId,
		mockupImageUrl: null,
		mockupScreenshotUrl: null,
		mockupScreenshotFile: null,
		mockupCorners: state.mockupCorners,
		appStore: state.appStore,
		animation: state.animation
	});
}

/** Load persisted state from localStorage, merging with defaults */
function loadPersistedState(): MonkrState {
	if (typeof window === 'undefined') return createDefaultState();
	try {
		const raw = localStorage.getItem(AUTOSAVE_KEY);
		if (!raw) return createDefaultState();
		const saved = JSON.parse(raw);
		if (!saved.version) return createDefaultState();
		const defaults = createDefaultState();
		// Restore background image from data URL if present
		const savedBg = saved.background ?? {};
		let bgImageUrl: string | null = null;
		let bgType = savedBg.type ?? defaults.background.type;
		if (savedBg.imageUrl && savedBg.imageUrl.startsWith('data:')) {
			try {
				const [header, base64] = savedBg.imageUrl.split(',');
				const mime = header.match(/data:(.*?);/)?.[1] ?? 'image/png';
				const bytes = atob(base64);
				const arr = new Uint8Array(bytes.length);
				for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
				bgImageUrl = URL.createObjectURL(new Blob([arr], { type: mime }));
			} catch {
				bgType = bgType === 'image' ? 'gradient' : bgType;
			}
		} else if (bgType === 'image') {
			// No data URL available, fall back to gradient
			bgType = 'gradient';
		}
		const state: MonkrState = {
			background: { ...defaults.background, ...savedBg, imageUrl: bgImageUrl, type: bgType },
			canvasSize: saved.canvasSize ?? defaults.canvasSize,
			padding: saved.padding ?? defaults.padding,
			exportConfig: saved.exportConfig ?? defaults.exportConfig,
			textOverlay: { ...defaults.textOverlay, ...saved.textOverlay },
			textBlocks: (saved.textBlocks ?? []).map((tb: TextBlock) => ({
				...createDefaultTextBlock(),
				...tb,
				id: genTextId()
			})),
			selectedTextId: null,
			sceneObjects: (saved.sceneObjects ?? []).map((o: any) => {
				let screenshotUrl: string | null = null;
				if (o.screenshotUrl && typeof o.screenshotUrl === 'string' && o.screenshotUrl.startsWith('data:')) {
					try {
						const [header, base64] = o.screenshotUrl.split(',');
						const mime = header.match(/data:(.*?);/)?.[1] ?? 'image/png';
						const bytes = atob(base64);
						const arr = new Uint8Array(bytes.length);
						for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
						screenshotUrl = URL.createObjectURL(new Blob([arr], { type: mime }));
					} catch { /* ignore */ }
				}
				return {
					...createDefaultObject(),
					...o,
					screenshotUrl,
					screenshotFile: null,
					extraScreenshots: [],
					id: genId()
				};
			}),
			selectedObjectId: null,
			activeMockupId: saved.activeMockupId ?? null,
			mockupImageUrl: null,
			mockupScreenshotUrl: null,
			mockupScreenshotFile: null,
			mockupCorners: saved.mockupCorners ?? null,
			appStore: saved.appStore
				? { ...createDefaultAppStore(), ...saved.appStore }
				: createDefaultAppStore(),
			animation: saved.animation ?? { enabled: false, duration: 2000, fps: 30, loop: true, presetId: null }
		};
		if (state.sceneObjects.length === 0) {
			state.sceneObjects = [createDefaultObject()];
		}
		state.selectedObjectId = state.sceneObjects[0]?.id ?? null;

		// Re-fetch mockup scene photo if a mockup was active
		if (state.activeMockupId) {
			const scene = mockupScenes.find((m) => m.id === state.activeMockupId);
			if (scene) {
				fetch(scene.imageUrl)
					.then((r) => r.blob())
					.then((blob) => {
						state.mockupImageUrl = URL.createObjectURL(blob);
					});
			}
		}

		return state;
	} catch {
		return createDefaultState();
	}
}

class MonkrStore {
	private _state = $state<MonkrState>(loadPersistedState());
	private _saveTimer: ReturnType<typeof setTimeout> | null = null;

	/** Debounced auto-save to localStorage */
	private _scheduleSave() {
		if (this._saveTimer) clearTimeout(this._saveTimer);
		this._saveTimer = setTimeout(async () => {
			try {
				const json = await serializeState(this._state);
				localStorage.setItem(AUTOSAVE_KEY, json);
			} catch { /* quota exceeded — silently ignore */ }
		}, 500);
	}

	// ─── Getters ────────────────────────────────────────────

	get background(): BackgroundConfig {
		return this._state.background;
	}

	get sceneObjects(): SceneObject[] {
		return this._state.sceneObjects;
	}

	get selectedObjectId(): string | null {
		return this._state.selectedObjectId;
	}

	get selectedObject(): SceneObject | undefined {
		return this._state.sceneObjects.find((o) => o.id === this._state.selectedObjectId);
	}

	get exportConfig() {
		return this._state.exportConfig;
	}

	get canvasSize(): CanvasSize {
		return this._state.canvasSize;
	}

	get padding(): number {
		return this._state.padding;
	}

	get textOverlay(): TextOverlay {
		return this._state.textOverlay;
	}

	get textBlocks(): TextBlock[] {
		return this._state.textBlocks;
	}

	get selectedTextId(): string | null {
		return this._state.selectedTextId;
	}

	get selectedTextBlock(): TextBlock | undefined {
		return this._state.textBlocks.find((t) => t.id === this._state.selectedTextId);
	}

	get activeMockupId(): string | null {
		return this._state.activeMockupId;
	}

	get activeMockup(): MockupScene | undefined {
		return this._state.activeMockupId
			? mockupScenes.find((m) => m.id === this._state.activeMockupId)
			: undefined;
	}

	get mockupImageUrl(): string | null {
		return this._state.mockupImageUrl;
	}

	get mockupScreenshotUrl(): string | null {
		return this._state.mockupScreenshotUrl;
	}

	get mockupCorners(): [[number, number], [number, number], [number, number], [number, number]] | null {
		if (this._state.mockupCorners) return this._state.mockupCorners;
		const mockup = this.activeMockup;
		return mockup ? mockup.screenCorners : null;
	}

	// ─── Background ─────────────────────────────────────────

	setBackgroundType(type: BackgroundType) {
		this._state.background = { ...this._state.background, type };
		this._scheduleSave();
	}

	setBackgroundColor(color: string) {
		this._state.background = { ...this._state.background, solidColor: color, type: 'solid' };
		this._scheduleSave();
	}

	setBackgroundGradient(css: string, name: string) {
		this._state.background = {
			...this._state.background,
			gradientCss: css,
			gradientName: name,
			type: 'gradient'
		};
		this._scheduleSave();
	}

	setBackgroundImage(file: File) {
		const url = URL.createObjectURL(file);
		if (this._state.background.imageUrl) {
			URL.revokeObjectURL(this._state.background.imageUrl);
		}
		this._state.background = { ...this._state.background, imageUrl: url, type: 'image' };
		this._scheduleSave();
	}

	// ─── Scene Objects ──────────────────────────────────────

	addObject(deviceId?: string) {
		const obj = createDefaultObject();
		if (deviceId) obj.deviceId = deviceId;
		this._state.sceneObjects = [...this._state.sceneObjects, obj];
		this._state.selectedObjectId = obj.id;
		this._scheduleSave();
	}

	removeObject(id: string) {
		const obj = this._state.sceneObjects.find((o) => o.id === id);
		if (obj?.screenshotUrl) URL.revokeObjectURL(obj.screenshotUrl);
		this._state.sceneObjects = this._state.sceneObjects.filter((o) => o.id !== id);
		if (this._state.selectedObjectId === id) {
			this._state.selectedObjectId = this._state.sceneObjects[0]?.id ?? null;
		}
		this._scheduleSave();
	}

	duplicateObject(id: string) {
		const obj = this._state.sceneObjects.find((o) => o.id === id);
		if (!obj) return;
		const newObj: SceneObject = {
			...obj,
			id: genId(),
			x: Math.min(obj.x + 5, 90),
			y: Math.min(obj.y + 5, 90),
			screenshotFile: null // Don't clone the file reference
		};
		this._state.sceneObjects = [...this._state.sceneObjects, newObj];
		this._state.selectedObjectId = newObj.id;
		this._scheduleSave();
	}

	selectObject(id: string | null) {
		this._state.selectedObjectId = id;
		this._scheduleSave();
	}

	updateObject(id: string, update: Partial<SceneObject>) {
		this._state.sceneObjects = this._state.sceneObjects.map((o) =>
			o.id === id ? { ...o, ...update } : o
		);
		this._scheduleSave();
	}

	setObjectDevice(id: string, deviceId: string) {
		this.updateObject(id, { deviceId });
	}

	setObjectDeviceColor(id: string, colorId: string) {
		this.updateObject(id, { deviceColorId: colorId });
	}

	setObjectScreenshot(id: string, file: File) {
		const obj = this._state.sceneObjects.find((o) => o.id === id);
		if (obj?.screenshotUrl) URL.revokeObjectURL(obj.screenshotUrl);
		const url = URL.createObjectURL(file);
		this.updateObject(id, { screenshotUrl: url, screenshotFile: file });
	}

	removeObjectScreenshot(id: string) {
		const obj = this._state.sceneObjects.find((o) => o.id === id);
		if (obj?.screenshotUrl) URL.revokeObjectURL(obj.screenshotUrl);
		this.updateObject(id, { screenshotUrl: null, screenshotFile: null });
	}

	addObjectExtraScreenshots(id: string, files: File[]) {
		const obj = this._state.sceneObjects.find((o) => o.id === id);
		if (!obj) return;
		const newExtras = files.map((f) => ({ url: URL.createObjectURL(f), file: f }));

		// If primary screenshot is empty, use the first file as primary
		if (!obj.screenshotUrl && newExtras.length > 0) {
			const [first, ...rest] = newExtras;
			this.updateObject(id, {
				screenshotUrl: first.url,
				screenshotFile: first.file,
				extraScreenshots: [...obj.extraScreenshots, ...rest]
			});
		} else {
			this.updateObject(id, { extraScreenshots: [...obj.extraScreenshots, ...newExtras] });
		}
	}

	removeObjectExtraScreenshot(id: string, index: number) {
		const obj = this._state.sceneObjects.find((o) => o.id === id);
		if (!obj) return;
		const extra = obj.extraScreenshots[index];
		if (extra) URL.revokeObjectURL(extra.url);
		const updated = [...obj.extraScreenshots];
		updated.splice(index, 1);
		this.updateObject(id, { extraScreenshots: updated });
	}

	clearObjectExtraScreenshots(id: string) {
		const obj = this._state.sceneObjects.find((o) => o.id === id);
		if (!obj) return;
		obj.extraScreenshots.forEach((e) => URL.revokeObjectURL(e.url));
		this.updateObject(id, { extraScreenshots: [] });
	}

	setObjectShadow(id: string, shadow: Partial<ShadowConfig>) {
		const obj = this._state.sceneObjects.find((o) => o.id === id);
		if (!obj) return;
		this.updateObject(id, { shadow: { ...obj.shadow, ...shadow } });
	}

	setObjectFrameStyle(id: string, frameStyle: FrameStyle) {
		this.updateObject(id, { frameStyle });
	}

	setObjectGlow(id: string, glow: Partial<SceneObject['glow']>) {
		const obj = this._state.sceneObjects.find((o) => o.id === id);
		if (!obj) return;
		this.updateObject(id, { glow: { ...obj.glow, ...glow } });
	}

	applyTemplate(template: LayoutTemplate) {
		const positions = template.positions;
		// Match existing objects to positions. Add or remove objects as needed.
		const targetCount = positions.length;
		while (this._state.sceneObjects.length < targetCount) {
			const obj = createDefaultObject();
			this._state.sceneObjects = [...this._state.sceneObjects, obj];
		}
		while (this._state.sceneObjects.length > targetCount) {
			const last = this._state.sceneObjects[this._state.sceneObjects.length - 1];
			if (last.screenshotUrl) URL.revokeObjectURL(last.screenshotUrl);
			this._state.sceneObjects = this._state.sceneObjects.slice(0, -1);
		}
		// Apply positions
		this._state.sceneObjects = this._state.sceneObjects.map((obj, i) => ({
			...obj,
			x: positions[i].x,
			y: positions[i].y,
			scale: positions[i].scale,
			rotation: positions[i].rotation,
			tiltX: positions[i].tiltX,
			tiltY: positions[i].tiltY
		}));
		this._state.selectedObjectId = this._state.sceneObjects[0]?.id ?? null;
		this._scheduleSave();
	}

	applyScene(scene: ScenePreset) {
		// Clear any active mockup
		this.clearMockup();

		// Clean up existing blob URLs
		this._state.sceneObjects.forEach((o) => {
			if (o.screenshotUrl) URL.revokeObjectURL(o.screenshotUrl);
		});
		if (this._state.background.imageUrl) URL.revokeObjectURL(this._state.background.imageUrl);

		// Set canvas size
		this._state.canvasSize = { width: scene.canvasWidth, height: scene.canvasHeight, presetName: 'Custom' };

		// Set background
		if (scene.backgroundImageUrl) {
			// Fetch image as blob for consistent handling
			this._state.background = {
				...this._state.background,
				type: 'image',
				imageUrl: null,
				gradientName: scene.name
			};
			fetch(scene.backgroundImageUrl)
				.then((r) => r.blob())
				.then((blob) => {
					const url = URL.createObjectURL(blob);
					this._state.background = { ...this._state.background, imageUrl: url, type: 'image' };
				});
		} else if (scene.backgroundCss) {
			this._state.background = {
				...this._state.background,
				type: 'gradient',
				gradientCss: scene.backgroundCss,
				gradientName: scene.name,
				imageUrl: null
			};
		}

		// Apply App Store mode if scene has it
		if (scene.appStore) {
			this._state.appStore = {
				enabled: true,
				numSections: scene.appStore.numSections,
				sectionWidth: scene.appStore.sectionWidth,
				sectionHeight: scene.appStore.sectionHeight,
				presetName: scene.appStore.presetName
			};
		} else {
			this._state.appStore.enabled = false;
		}

		// Create scene objects
		this._state.sceneObjects = scene.devices.map((d) => ({
			...createDefaultObject(),
			deviceId: d.deviceId,
			deviceColorId: d.colorId,
			x: d.x,
			y: d.y,
			scale: d.scale,
			rotation: d.rotation,
			tiltX: d.tiltX,
			tiltY: d.tiltY
		}));
		this._state.selectedObjectId = this._state.sceneObjects[0]?.id ?? null;

		// Apply text blocks from scene preset
		if (scene.textBlocks && scene.textBlocks.length > 0) {
			this._state.textBlocks = scene.textBlocks.map((tb) =>
				createDefaultTextBlock({
					text: tb.text,
					x: tb.x,
					y: tb.y,
					fontSize: tb.fontSize,
					color: tb.color,
					fontWeight: tb.fontWeight
				})
			);
			this._state.selectedTextId = this._state.textBlocks[0]?.id ?? null;
		} else {
			this._state.textBlocks = [];
			this._state.selectedTextId = null;
		}

		this._scheduleSave();
	}

	// ─── Perspective Mockups ───────────────────────────────

	setMockupCorner(index: 0 | 1 | 2 | 3, x: number, y: number) {
		const current = this.mockupCorners;
		if (!current) return;
		const next: [[number, number], [number, number], [number, number], [number, number]] = [
			[...current[0]] as [number, number],
			[...current[1]] as [number, number],
			[...current[2]] as [number, number],
			[...current[3]] as [number, number]
		];
		next[index] = [x, y];
		this._state.mockupCorners = next;
		this._scheduleSave();
	}

	applyMockup(scene: MockupScene) {
		// Clean up existing mockup blob URL
		if (this._state.mockupImageUrl) URL.revokeObjectURL(this._state.mockupImageUrl);

		this._state.activeMockupId = scene.id;
		this._state.mockupCorners = null; // Reset to scene defaults
		this._state.canvasSize = { width: scene.canvasWidth, height: scene.canvasHeight, presetName: 'Mockup' };

		// Fetch scene photo as blob
		this._state.mockupImageUrl = null;
		fetch(scene.imageUrl)
			.then((r) => r.blob())
			.then((blob) => {
				const url = URL.createObjectURL(blob);
				this._state.mockupImageUrl = url;
			});

		// Keep the existing mockup screenshot if we have one
		this._scheduleSave();
	}

	setMockupScreenshot(file: File) {
		if (this._state.mockupScreenshotUrl) URL.revokeObjectURL(this._state.mockupScreenshotUrl);
		const url = URL.createObjectURL(file);
		this._state.mockupScreenshotUrl = url;
		this._state.mockupScreenshotFile = file;
		this._scheduleSave();
	}

	removeMockupScreenshot() {
		if (this._state.mockupScreenshotUrl) URL.revokeObjectURL(this._state.mockupScreenshotUrl);
		this._state.mockupScreenshotUrl = null;
		this._state.mockupScreenshotFile = null;
		this._scheduleSave();
	}

	clearMockup() {
		if (this._state.mockupImageUrl) URL.revokeObjectURL(this._state.mockupImageUrl);
		if (this._state.mockupScreenshotUrl) URL.revokeObjectURL(this._state.mockupScreenshotUrl);
		this._state.activeMockupId = null;
		this._state.mockupImageUrl = null;
		this._state.mockupScreenshotUrl = null;
		this._state.mockupScreenshotFile = null;
		this._scheduleSave();
	}

	// ─── Canvas & Export ────────────────────────────────────

	setExportScale(scale: ExportScale) {
		this._state.exportConfig = { ...this._state.exportConfig, scale };
		this._scheduleSave();
	}

	setExportFormat(format: ExportFormat) {
		this._state.exportConfig = { ...this._state.exportConfig, format };
		this._scheduleSave();
	}

	setCanvasSize(size: Partial<CanvasSize>) {
		this._state.canvasSize = { ...this._state.canvasSize, ...size };
		this._scheduleSave();
	}

	setPadding(padding: number) {
		this._state.padding = padding;
		this._scheduleSave();
	}

	setTextOverlay(overlay: Partial<TextOverlay>) {
		this._state.textOverlay = { ...this._state.textOverlay, ...overlay };
		this._scheduleSave();
	}

	// ─── Text Blocks ──────────────────────────────────────

	addTextBlock(overrides?: Partial<TextBlock>) {
		const tb = createDefaultTextBlock(overrides);
		this._state.textBlocks = [...this._state.textBlocks, tb];
		this._state.selectedTextId = tb.id;
		this._scheduleSave();
	}

	removeTextBlock(id: string) {
		this._state.textBlocks = this._state.textBlocks.filter((t) => t.id !== id);
		if (this._state.selectedTextId === id) {
			this._state.selectedTextId = this._state.textBlocks[0]?.id ?? null;
		}
		this._scheduleSave();
	}

	selectTextBlock(id: string | null) {
		this._state.selectedTextId = id;
	}

	updateTextBlock(id: string, update: Partial<TextBlock>) {
		this._state.textBlocks = this._state.textBlocks.map((t) =>
			t.id === id ? { ...t, ...update } : t
		);
		this._scheduleSave();
	}

	duplicateTextBlock(id: string) {
		const tb = this._state.textBlocks.find((t) => t.id === id);
		if (!tb) return;
		const newTb: TextBlock = {
			...tb,
			id: genTextId(),
			x: Math.min(tb.x + 5, 95),
			y: Math.min(tb.y + 5, 95)
		};
		this._state.textBlocks = [...this._state.textBlocks, newTb];
		this._state.selectedTextId = newTb.id;
		this._scheduleSave();
	}

	// ─── App Store Multi-Canvas ───────────────────────────

	get appStore(): AppStoreConfig {
		return this._state.appStore;
	}

	get appStoreEnabled(): boolean {
		return this._state.appStore.enabled;
	}

	setAppStoreEnabled(enabled: boolean) {
		this._state.appStore.enabled = enabled;
		if (enabled) {
			const cfg = this._state.appStore;
			this._state.canvasSize = {
				width: cfg.sectionWidth * cfg.numSections,
				height: cfg.sectionHeight,
				presetName: `${cfg.presetName} x${cfg.numSections}`
			};
		}
		this._scheduleSave();
	}

	setAppStoreSectionSize(width: number, height: number, presetName: string) {
		this._state.appStore.sectionWidth = width;
		this._state.appStore.sectionHeight = height;
		this._state.appStore.presetName = presetName;
		if (this._state.appStore.enabled) {
			this._state.canvasSize = {
				width: width * this._state.appStore.numSections,
				height,
				presetName: `${presetName} x${this._state.appStore.numSections}`
			};
		}
		this._scheduleSave();
	}

	setAppStoreNumSections(num: number) {
		this._state.appStore.numSections = Math.max(1, Math.min(10, num));
		if (this._state.appStore.enabled) {
			const cfg = this._state.appStore;
			this._state.canvasSize = {
				width: cfg.sectionWidth * cfg.numSections,
				height: cfg.sectionHeight,
				presetName: `${cfg.presetName} x${cfg.numSections}`
			};
		}
		this._scheduleSave();
	}

	// ─── Animation ────────────────────────────────────────

	get animation() {
		return this._state.animation;
	}

	setAnimationEnabled(enabled: boolean) {
		this._state.animation = { ...this._state.animation, enabled };
		this._scheduleSave();
	}

	setAnimationPreset(presetId: string | null) {
		this._state.animation = { ...this._state.animation, presetId };
		this._scheduleSave();
	}

	setAnimationDuration(duration: number) {
		this._state.animation = { ...this._state.animation, duration };
		this._scheduleSave();
	}

	setAnimationFps(fps: number) {
		this._state.animation = { ...this._state.animation, fps };
		this._scheduleSave();
	}

	setAnimationLoop(loop: boolean) {
		this._state.animation = { ...this._state.animation, loop };
		this._scheduleSave();
	}

	/** Reset project to default state and clear auto-save */
	resetProject() {
		// Clean up blob URLs
		this._state.sceneObjects.forEach((o) => {
			if (o.screenshotUrl) URL.revokeObjectURL(o.screenshotUrl);
		});
		if (this._state.background.imageUrl) URL.revokeObjectURL(this._state.background.imageUrl);
		if (this._state.mockupImageUrl) URL.revokeObjectURL(this._state.mockupImageUrl);
		if (this._state.mockupScreenshotUrl) URL.revokeObjectURL(this._state.mockupScreenshotUrl);
		this._state = createDefaultState();
		try { localStorage.removeItem(AUTOSAVE_KEY); } catch {}
	}

	// ─── Project Save / Load ───────────────────────────────

	/** Convert a blob URL or File to a data URL */
	private async _toDataUrl(blobUrl: string | null, file: File | null): Promise<string | null> {
		if (!blobUrl && !file) return null;
		try {
			const blob = file ? file : await fetch(blobUrl!).then((r) => r.blob());
			return new Promise((resolve) => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result as string);
				reader.onerror = () => resolve(null);
				reader.readAsDataURL(blob);
			});
		} catch {
			return null;
		}
	}

	/** Serialize current project state to a JSON string (includes screenshots as data URLs) */
	async exportProject(): Promise<string> {
		const state = this._state;

		// Convert background image to data URL
		let bgImageDataUrl: string | null = null;
		if (state.background.type === 'image' && state.background.imageUrl) {
			bgImageDataUrl = await this._toDataUrl(state.background.imageUrl, null);
		}

		// Convert screenshots to data URLs
		const sceneObjects = await Promise.all(
			state.sceneObjects.map(async (o) => {
				const extraScreenshots = await Promise.all(
					o.extraScreenshots.map(async (e) => ({
						url: await this._toDataUrl(e.url, e.file) ?? '',
						file: null
					}))
				);
				return {
					...o,
					screenshotUrl: await this._toDataUrl(o.screenshotUrl, o.screenshotFile),
					screenshotFile: null,
					extraScreenshots: extraScreenshots.filter((e) => e.url)
				};
			})
		);

		const project = {
			version: 3,
			background: {
				...state.background,
				imageUrl: bgImageDataUrl
			},
			canvasSize: state.canvasSize,
			padding: state.padding,
			exportConfig: state.exportConfig,
			textOverlay: state.textOverlay,
			textBlocks: state.textBlocks,
			sceneObjects
		};
		return JSON.stringify(project, null, 2);
	}

	/** Save project as a downloadable .monkr JSON file */
	async saveProject(name = 'monkr-project') {
		const json = await this.exportProject();
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${name}.monkr`;
		a.click();
		URL.revokeObjectURL(url);
	}

	/** Convert a data URL to a blob URL */
	private _dataUrlToBlobUrl(dataUrl: string | null): string | null {
		if (!dataUrl || !dataUrl.startsWith('data:')) return null;
		try {
			const [header, base64] = dataUrl.split(',');
			const mime = header.match(/data:(.*?);/)?.[1] ?? 'image/png';
			const bytes = atob(base64);
			const arr = new Uint8Array(bytes.length);
			for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
			const blob = new Blob([arr], { type: mime });
			return URL.createObjectURL(blob);
		} catch {
			return null;
		}
	}

	/** Load project from a .monkr JSON file */
	loadProject(file: File): Promise<void> {
		return file.text().then((json) => {
			const project = JSON.parse(json);
			if (!project.version) throw new Error('Invalid project file');
			// Clean up existing blob URLs
			this._state.sceneObjects.forEach((o) => {
				if (o.screenshotUrl) URL.revokeObjectURL(o.screenshotUrl);
			});
			if (this._state.background.imageUrl) URL.revokeObjectURL(this._state.background.imageUrl);

			// Restore background image from data URL
			let bgImageUrl: string | null = null;
			let bgType = project.background?.type ?? 'gradient';
			if (project.background?.imageUrl?.startsWith('data:')) {
				bgImageUrl = this._dataUrlToBlobUrl(project.background.imageUrl);
			}

			this._state = {
				...createDefaultState(),
				background: {
					...createDefaultState().background,
					...project.background,
					imageUrl: bgImageUrl,
					type: bgImageUrl ? bgType : (bgType === 'image' ? 'gradient' : bgType)
				},
				canvasSize: project.canvasSize ?? createDefaultState().canvasSize,
				padding: project.padding ?? 60,
				exportConfig: project.exportConfig ?? createDefaultState().exportConfig,
				textOverlay: { ...createDefaultState().textOverlay, ...project.textOverlay },
				textBlocks: (project.textBlocks ?? []).map((tb: TextBlock) => ({
					...createDefaultTextBlock(),
					...tb,
					id: genTextId()
				})),
				selectedTextId: null,
				sceneObjects: (project.sceneObjects ?? []).map((o: any) => {
					const screenshotUrl = this._dataUrlToBlobUrl(o.screenshotUrl as string | null);
					const extraScreenshots = (o.extraScreenshots ?? []).map((e: any) => ({
						url: this._dataUrlToBlobUrl(e.url) ?? '',
						file: null
					})).filter((e: any) => e.url);
					return {
						...createDefaultObject(),
						...o,
						screenshotUrl,
						screenshotFile: null,
						extraScreenshots,
						id: genId()
					};
				}),
				selectedObjectId: null
			};
			if (this._state.sceneObjects.length > 0) {
				this._state.selectedObjectId = this._state.sceneObjects[0].id;
			}
		});
	}

	/** Get list of saved projects from localStorage */
	getSavedProjects(): Array<{ name: string; date: string }> {
		const raw = localStorage.getItem('monkr_projects');
		return raw ? JSON.parse(raw) : [];
	}

	/** Save current project to localStorage */
	async saveToLocalStorage(name: string) {
		const projects = this.getSavedProjects();
		const json = await this.exportProject();
		const existing = projects.findIndex((p) => p.name === name);
		const entry = { name, date: new Date().toISOString(), data: json };
		const stored = JSON.parse(localStorage.getItem('monkr_project_data') ?? '{}');
		stored[name] = json;
		localStorage.setItem('monkr_project_data', JSON.stringify(stored));
		if (existing >= 0) {
			projects[existing].date = entry.date;
		} else {
			projects.push({ name, date: entry.date });
		}
		localStorage.setItem('monkr_projects', JSON.stringify(projects));
	}

	/** Load a project from localStorage by name */
	loadFromLocalStorage(name: string) {
		const stored = JSON.parse(localStorage.getItem('monkr_project_data') ?? '{}');
		const json = stored[name];
		if (!json) return;
		const blob = new Blob([json], { type: 'application/json' });
		const file = new File([blob], `${name}.monkr`, { type: 'application/json' });
		return this.loadProject(file);
	}

	/** Delete a project from localStorage */
	deleteFromLocalStorage(name: string) {
		const projects = this.getSavedProjects().filter((p) => p.name !== name);
		localStorage.setItem('monkr_projects', JSON.stringify(projects));
		const stored = JSON.parse(localStorage.getItem('monkr_project_data') ?? '{}');
		delete stored[name];
		localStorage.setItem('monkr_project_data', JSON.stringify(stored));
	}
}

export const store = new MonkrStore();
