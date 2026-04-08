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

/** Serialize state for localStorage (strips blob URLs and File objects) */
function serializeState(state: MonkrState): string {
	return JSON.stringify({
		version: 2,
		background: { ...state.background, imageUrl: null },
		canvasSize: state.canvasSize,
		padding: state.padding,
		exportConfig: state.exportConfig,
		textOverlay: state.textOverlay,
		sceneObjects: state.sceneObjects.map((o) => ({
			...o,
			screenshotUrl: null,
			screenshotFile: null
		})),
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
		const state: MonkrState = {
			background: { ...defaults.background, ...saved.background, imageUrl: null },
			canvasSize: saved.canvasSize ?? defaults.canvasSize,
			padding: saved.padding ?? defaults.padding,
			exportConfig: saved.exportConfig ?? defaults.exportConfig,
			textOverlay: { ...defaults.textOverlay, ...saved.textOverlay },
			sceneObjects: (saved.sceneObjects ?? []).map((o: SceneObject) => ({
				...createDefaultObject(),
				...o,
				screenshotUrl: null,
				screenshotFile: null,
				id: genId()
			})),
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
		this._saveTimer = setTimeout(() => {
			try {
				localStorage.setItem(AUTOSAVE_KEY, serializeState(this._state));
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

	/** Serialize current project state to a JSON string (excludes blob URLs) */
	exportProject(): string {
		const state = this._state;
		const project = {
			version: 1,
			background: {
				...state.background,
				imageUrl: null // Can't serialize blob URLs
			},
			canvasSize: state.canvasSize,
			padding: state.padding,
			exportConfig: state.exportConfig,
			textOverlay: state.textOverlay,
			sceneObjects: state.sceneObjects.map((o) => ({
				...o,
				screenshotUrl: null, // Can't serialize blob URLs
				screenshotFile: null
			}))
		};
		return JSON.stringify(project, null, 2);
	}

	/** Save project as a downloadable .monkr JSON file */
	saveProject(name = 'monkr-project') {
		const json = this.exportProject();
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${name}.monkr`;
		a.click();
		URL.revokeObjectURL(url);
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
			this._state = {
				...createDefaultState(),
				background: { ...createDefaultState().background, ...project.background },
				canvasSize: project.canvasSize ?? createDefaultState().canvasSize,
				padding: project.padding ?? 60,
				exportConfig: project.exportConfig ?? createDefaultState().exportConfig,
				textOverlay: { ...createDefaultState().textOverlay, ...project.textOverlay },
				sceneObjects: (project.sceneObjects ?? []).map((o: SceneObject) => ({
					...createDefaultObject(),
					...o,
					id: genId()
				})),
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
	saveToLocalStorage(name: string) {
		const projects = this.getSavedProjects();
		const json = this.exportProject();
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
