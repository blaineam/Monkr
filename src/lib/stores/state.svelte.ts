import type {
	BackgroundConfig,
	BackgroundType,
	ExportFormat,
	ExportScale,
	LayoutMode,
	MonkrState,
	ScreenshotSlot,
	ShadowConfig,
	TransformConfig
} from '../types';

function createDefaultState(): MonkrState {
	return {
		background: {
			type: 'gradient',
			solidColor: '#1e1b4b',
			gradientCss: 'linear-gradient(135deg, #7c3aed, #c026d3, #ec4899)',
			gradientName: 'Purple Haze',
			imageUrl: null
		},
		deviceId: 'iphone-15-pro',
		deviceColorId: 'natural-titanium',
		screenshots: [
			{ url: null, file: null },
			{ url: null, file: null },
			{ url: null, file: null }
		],
		layout: 'single',
		transform: {
			shadow: {
				enabled: true,
				color: 'rgba(0, 0, 0, 0.5)',
				blur: 40,
				spread: 0,
				offsetX: 0,
				offsetY: 20
			},
			borderRadius: 0,
			tiltX: 0,
			tiltY: 0,
			zoom: 1
		},
		exportConfig: {
			scale: 2,
			format: 'png'
		}
	};
}

class MonkrStore {
	private _state = $state<MonkrState>(createDefaultState());

	get background(): BackgroundConfig {
		return this._state.background;
	}

	get deviceId(): string {
		return this._state.deviceId;
	}

	get deviceColorId(): string {
		return this._state.deviceColorId;
	}

	get screenshots(): ScreenshotSlot[] {
		return this._state.screenshots;
	}

	get layout(): LayoutMode {
		return this._state.layout;
	}

	get transform(): TransformConfig {
		return this._state.transform;
	}

	get exportConfig() {
		return this._state.exportConfig;
	}

	get activeScreenshots(): (string | null)[] {
		const count = this._state.layout === 'single' ? 1 : this._state.layout === 'dual' ? 2 : 3;
		return this._state.screenshots.slice(0, count).map((s) => s.url);
	}

	setBackgroundType(type: BackgroundType) {
		this._state.background = { ...this._state.background, type };
	}

	setBackgroundColor(color: string) {
		this._state.background = { ...this._state.background, solidColor: color, type: 'solid' };
	}

	setBackgroundGradient(css: string, name: string) {
		this._state.background = {
			...this._state.background,
			gradientCss: css,
			gradientName: name,
			type: 'gradient'
		};
	}

	setBackgroundImage(file: File) {
		const url = URL.createObjectURL(file);
		if (this._state.background.imageUrl) {
			URL.revokeObjectURL(this._state.background.imageUrl);
		}
		this._state.background = { ...this._state.background, imageUrl: url, type: 'image' };
	}

	setDevice(deviceId: string) {
		this._state.deviceId = deviceId;
	}

	setDeviceColor(colorId: string) {
		this._state.deviceColorId = colorId;
	}

	addScreenshot(index: number, file: File) {
		const url = URL.createObjectURL(file);
		const screenshots = [...this._state.screenshots];
		if (screenshots[index]?.url) {
			URL.revokeObjectURL(screenshots[index].url!);
		}
		screenshots[index] = { url, file };
		this._state.screenshots = screenshots;
	}

	removeScreenshot(index: number) {
		const screenshots = [...this._state.screenshots];
		if (screenshots[index]?.url) {
			URL.revokeObjectURL(screenshots[index].url!);
		}
		screenshots[index] = { url: null, file: null };
		this._state.screenshots = screenshots;
	}

	setLayout(layout: LayoutMode) {
		this._state.layout = layout;
	}

	setShadow(shadow: Partial<ShadowConfig>) {
		this._state.transform = {
			...this._state.transform,
			shadow: { ...this._state.transform.shadow, ...shadow }
		};
	}

	setTransform(transform: Partial<TransformConfig>) {
		this._state.transform = { ...this._state.transform, ...transform };
	}

	setExportScale(scale: ExportScale) {
		this._state.exportConfig = { ...this._state.exportConfig, scale };
	}

	setExportFormat(format: ExportFormat) {
		this._state.exportConfig = { ...this._state.exportConfig, format };
	}
}

export const store = new MonkrStore();
