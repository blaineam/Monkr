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
	hex: string;
	bezelImage: string;
}

export interface DeviceMeta {
	id: string;
	name: string;
	category: 'phone' | 'tablet' | 'laptop' | 'desktop';
	brand: string;
	frameWidth: number;
	frameHeight: number;
	screen: ScreenRegion;
	colors: DeviceColor[];
	year: number;
}

export type BackgroundType = 'solid' | 'gradient' | 'image';

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

export interface TransformConfig {
	shadow: ShadowConfig;
	borderRadius: number;
	tiltX: number;
	tiltY: number;
	zoom: number;
}

export type LayoutMode = 'single' | 'dual' | 'triple';
export type ExportFormat = 'png' | 'jpg';
export type ExportScale = 1 | 2 | 3;

export interface ExportConfig {
	scale: ExportScale;
	format: ExportFormat;
}

export interface ScreenshotSlot {
	url: string | null;
	file: File | null;
}

export interface MonkrState {
	background: BackgroundConfig;
	deviceId: string;
	deviceColorId: string;
	screenshots: ScreenshotSlot[];
	layout: LayoutMode;
	transform: TransformConfig;
	exportConfig: ExportConfig;
}

export interface GradientPreset {
	name: string;
	css: string;
}
