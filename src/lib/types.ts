export interface ScreenRegion {
	x: number;
	y: number;
	width: number;
	height: number;
	borderRadius: number;
}

export interface DeviceColor {
	id: string;
	name: string;
	slug: string;
}

export interface DeviceMeta {
	id: string;
	name: string;
	category: 'phone' | 'tablet' | 'laptop' | 'browser' | 'tv';
	brand: string;
	slug: string;
	pngW: number;
	pngH: number;
	svgW: number;
	svgH: number;
	colors: DeviceColor[];
	year: number;
	notch?: 'dynamic-island' | 'notch' | 'punch-hole' | 'none';
	/** Override screen position as percentages when screen isn't centered in frame */
	screenTop?: number;
	screenLeft?: number;
}

export type BackgroundType = 'solid' | 'gradient' | 'image' | 'transparent' | 'magic';

export interface BackgroundConfig {
	type: BackgroundType;
	solidColor: string;
	gradientCss: string;
	gradientName: string;
	imageUrl: string | null;
}

export interface ShadowConfig {
	enabled: boolean;
	color: string;
	blur: number;
	spread: number;
	offsetX: number;
	offsetY: number;
}

export type FrameStyle = 'default' | 'outline' | 'none';

export interface TransformConfig {
	shadow: ShadowConfig;
	tiltX: number;
	tiltY: number;
	zoom: number;
}

export type ExportFormat = 'png' | 'jpg';
export type ExportScale = 1 | 2 | 3;

export interface ExportConfig {
	scale: ExportScale;
	format: ExportFormat;
}

export interface CanvasPreset {
	name: string;
	width: number;
	height: number;
	category?: string;
}

export interface CanvasSize {
	width: number;
	height: number;
	presetName: string;
}

export interface TextOverlay {
	enabled: boolean;
	text: string;
	fontSize: number;
	color: string;
	position: 'above' | 'below' | 'custom';
	fontWeight: number;
	fontFamily: string;
	textAlign: 'left' | 'center' | 'right';
	letterSpacing: number;
	lineHeight: number;
	/** Custom position as percentage (0-100) */
	x: number;
	y: number;
	tiltX: number;
	tiltY: number;
	rotation: number;
	shadow: {
		enabled: boolean;
		color: string;
		blur: number;
		offsetX: number;
		offsetY: number;
	};
	/** Arc text: 0 = straight, positive = curve up, negative = curve down, in degrees */
	arcDegrees: number;
	/** Text path shape: 'arc' for circular arc, 'wave' for S-curve wave */
	pathType: 'arc' | 'wave';
}

export interface SceneObject {
	id: string;
	deviceId: string;
	deviceColorId: string;
	screenshotUrl: string | null;
	screenshotFile: File | null;
	/** X position as percentage of canvas width (0-100) */
	x: number;
	/** Y position as percentage of canvas height (0-100) */
	y: number;
	scale: number;
	rotation: number;
	tiltX: number;
	tiltY: number;
	shadow: ShadowConfig;
	frameStyle: FrameStyle;
	/** Border radius in pixels for no-frame mode */
	borderRadius: number;
	/** Edge glow effect */
	glow: {
		enabled: boolean;
		color: string;
		blur: number;
		spread: number;
	};
}

export interface MonkrState {
	background: BackgroundConfig;
	sceneObjects: SceneObject[];
	selectedObjectId: string | null;
	exportConfig: ExportConfig;
	canvasSize: CanvasSize;
	padding: number;
	textOverlay: TextOverlay;
	/** Active perspective mockup scene ID (null = normal mode) */
	activeMockupId: string | null;
	/** Blob URL for the mockup scene photo */
	mockupImageUrl: string | null;
	/** Screenshot URL to composite into the mockup scene */
	mockupScreenshotUrl: string | null;
	mockupScreenshotFile: File | null;
	/** Adjusted screen corners for the active mockup (user-draggable) */
	mockupCorners: [[number, number], [number, number], [number, number], [number, number]] | null;
	/** App Store multi-canvas mode */
	appStore: AppStoreConfig;
	/** Animation config */
	animation: {
		enabled: boolean;
		duration: number;
		fps: number;
		loop: boolean;
		presetId: string | null;
	};
}

export interface GradientPreset {
	name: string;
	css: string;
	category?: string;
}

// ─── Multi-Canvas (App Store) ─────────────────────────

export interface AppStoreConfig {
	enabled: boolean;
	/** Number of sections/pages (1-10) */
	numSections: number;
	/** Per-section dimensions following App Store guidelines */
	sectionWidth: number;
	sectionHeight: number;
	presetName: string;
}
