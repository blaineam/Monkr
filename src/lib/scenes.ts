// Scene presets: curated combinations of layout templates + background images

export interface ScenePreset {
	id: string;
	name: string;
	description: string;
	/** CSS gradient background */
	backgroundCss?: string;
	/** Local background image URL from curated categories */
	backgroundImageUrl?: string;
	/** Device placements */
	devices: Array<{
		deviceId: string;
		colorId: string;
		x: number;
		y: number;
		scale: number;
		rotation: number;
		tiltX: number;
		tiltY: number;
	}>;
	canvasWidth: number;
	canvasHeight: number;
	/** App Store mode configuration */
	appStore?: {
		enabled: true;
		numSections: number;
		sectionWidth: number;
		sectionHeight: number;
		presetName: string;
	};
	/** Text blocks to add */
	textBlocks?: Array<{
		text: string;
		x: number;
		y: number;
		fontSize: number;
		color: string;
		fontWeight?: number;
	}>;
}

const bg = (category: string, file: string) => `/backgrounds/original/${category}/${file}`;

export const scenePresets: ScenePreset[] = [
	// ─── Single Device Scenes ─────────────────────────────
	{
		id: 'cosmic-hero',
		name: 'Cosmic Hero',
		description: 'Single phone on cosmic background',
		backgroundImageUrl: bg('cosmic', 'shots-3.jpg'),
		devices: [
			{ deviceId: 'iphone-16-pro', colorId: 'natural-titanium', x: 50, y: 48, scale: 0.85, rotation: -5, tiltX: -8, tiltY: 15 }
		],
		canvasWidth: 1920,
		canvasHeight: 1080
	},
	{
		id: 'abstract-center',
		name: 'Abstract Center',
		description: 'Centered phone on abstract gradient',
		backgroundImageUrl: bg('abstract', 'shots-5.jpg'),
		devices: [
			{ deviceId: 'iphone-16-pro', colorId: 'natural-titanium', x: 50, y: 50, scale: 1, rotation: 0, tiltX: 0, tiltY: 0 }
		],
		canvasWidth: 1920,
		canvasHeight: 1080
	},
	{
		id: 'radiant-tilt',
		name: 'Radiant Tilt',
		description: 'Tilted phone on radiant background',
		backgroundImageUrl: bg('radiant', '3.jpg'),
		devices: [
			{ deviceId: 'iphone-16-pro-max', colorId: 'natural-titanium', x: 50, y: 50, scale: 1, rotation: 0, tiltX: -8, tiltY: 12 }
		],
		canvasWidth: 1920,
		canvasHeight: 1080
	},
	{
		id: 'holo-laptop',
		name: 'Holo Laptop',
		description: 'MacBook on holographic gradient',
		backgroundImageUrl: bg('holo-gradients', '3.jpg'),
		devices: [
			{ deviceId: 'macbook-pro-16', colorId: 'silver', x: 50, y: 50, scale: 0.85, rotation: 0, tiltX: -3, tiltY: 0 }
		],
		canvasWidth: 1920,
		canvasHeight: 1080
	},

	// ─── Duo Scenes ───────────────────────────────────────
	{
		id: 'mystic-overlap',
		name: 'Mystic Overlap',
		description: 'Two phones overlapping on mystic bg',
		backgroundImageUrl: bg('mystic-gradients', '4.jpg'),
		devices: [
			{ deviceId: 'iphone-16-pro', colorId: 'natural-titanium', x: 40, y: 50, scale: 0.9, rotation: -5, tiltX: 0, tiltY: 8 },
			{ deviceId: 'iphone-16-pro', colorId: 'black-titanium', x: 60, y: 50, scale: 0.9, rotation: 5, tiltX: 0, tiltY: -8 }
		],
		canvasWidth: 1920,
		canvasHeight: 1080
	},
	{
		id: 'earth-side-by-side',
		name: 'Earth Duo',
		description: 'Two phones side by side on earth bg',
		backgroundImageUrl: bg('earth', '3.jpg'),
		devices: [
			{ deviceId: 'iphone-16-pro', colorId: 'natural-titanium', x: 35, y: 50, scale: 0.85, rotation: 0, tiltX: 0, tiltY: 0 },
			{ deviceId: 'iphone-16-pro', colorId: 'natural-titanium', x: 65, y: 50, scale: 0.85, rotation: 0, tiltX: 0, tiltY: 0 }
		],
		canvasWidth: 1920,
		canvasHeight: 1080
	},
	{
		id: 'glass-laptop-phone',
		name: 'Glass Responsive',
		description: 'Laptop + phone on glass background',
		backgroundImageUrl: bg('paper-glass', '5.jpg'),
		devices: [
			{ deviceId: 'macbook-pro-16', colorId: 'silver', x: 40, y: 48, scale: 0.75, rotation: 0, tiltX: 0, tiltY: 8 },
			{ deviceId: 'iphone-16-pro', colorId: 'natural-titanium', x: 78, y: 55, scale: 0.4, rotation: 0, tiltX: 0, tiltY: -8 }
		],
		canvasWidth: 1920,
		canvasHeight: 1080
	},
	{
		id: 'desktop-hero-left',
		name: 'Desktop Hero',
		description: 'Large + small phone on desktop wallpaper',
		backgroundImageUrl: bg('desktop', '1.jpg'),
		devices: [
			{ deviceId: 'iphone-16-pro', colorId: 'natural-titanium', x: 38, y: 50, scale: 1.1, rotation: -3, tiltX: 0, tiltY: 5 },
			{ deviceId: 'iphone-16-pro', colorId: 'black-titanium', x: 72, y: 55, scale: 0.7, rotation: 5, tiltX: 0, tiltY: -8 }
		],
		canvasWidth: 1920,
		canvasHeight: 1080
	},

	// ─── Triple / Multi Scenes ────────────────────────────
	{
		id: 'vintage-fan',
		name: 'Vintage Fan',
		description: 'Three phones fanned on vintage bg',
		backgroundImageUrl: bg('vintage-gradients', '2.jpg'),
		devices: [
			{ deviceId: 'iphone-16-pro', colorId: 'natural-titanium', x: 30, y: 52, scale: 0.75, rotation: -12, tiltX: 0, tiltY: 10 },
			{ deviceId: 'iphone-16-pro', colorId: 'natural-titanium', x: 50, y: 48, scale: 0.85, rotation: 0, tiltX: 0, tiltY: 0 },
			{ deviceId: 'iphone-16-pro', colorId: 'natural-titanium', x: 70, y: 52, scale: 0.75, rotation: 12, tiltX: 0, tiltY: -10 }
		],
		canvasWidth: 1920,
		canvasHeight: 1080
	},
	{
		id: 'cosmic-perspective',
		name: 'Cosmic Perspective',
		description: 'Three devices in perspective row',
		backgroundImageUrl: bg('cosmic', 'shots-7.jpg'),
		devices: [
			{ deviceId: 'iphone-16-pro', colorId: 'natural-titanium', x: 25, y: 50, scale: 0.7, rotation: 0, tiltX: 0, tiltY: 20 },
			{ deviceId: 'iphone-16-pro', colorId: 'natural-titanium', x: 50, y: 48, scale: 0.85, rotation: 0, tiltX: 0, tiltY: 0 },
			{ deviceId: 'iphone-16-pro', colorId: 'natural-titanium', x: 75, y: 50, scale: 0.7, rotation: 0, tiltX: 0, tiltY: -20 }
		],
		canvasWidth: 1920,
		canvasHeight: 1080
	},
	{
		id: 'abstract-responsive',
		name: 'Full Responsive',
		description: 'Laptop + tablet + phone on abstract bg',
		backgroundImageUrl: bg('abstract', 'shots-10.jpg'),
		devices: [
			{ deviceId: 'macbook-pro-16', colorId: 'silver', x: 32, y: 46, scale: 0.7, rotation: 0, tiltX: 0, tiltY: 12 },
			{ deviceId: 'ipad-pro-11', colorId: 'silver', x: 72, y: 44, scale: 0.48, rotation: 0, tiltX: 0, tiltY: -8 },
			{ deviceId: 'iphone-16-pro', colorId: 'natural-titanium', x: 92, y: 52, scale: 0.28, rotation: 0, tiltX: 0, tiltY: -12 }
		],
		canvasWidth: 1920,
		canvasHeight: 1080
	},
	{
		id: 'radiant-ecosystem',
		name: 'Ecosystem',
		description: 'Full Apple ecosystem on radiant bg',
		backgroundImageUrl: bg('radiant', '8.jpg'),
		devices: [
			{ deviceId: 'imac-24', colorId: 'blue', x: 50, y: 32, scale: 0.48, rotation: 0, tiltX: 0, tiltY: 0 },
			{ deviceId: 'macbook-pro-16', colorId: 'silver', x: 22, y: 62, scale: 0.42, rotation: -3, tiltX: -3, tiltY: 8 },
			{ deviceId: 'ipad-pro-11', colorId: 'silver', x: 68, y: 60, scale: 0.32, rotation: 3, tiltX: -3, tiltY: -6 },
			{ deviceId: 'iphone-16-pro', colorId: 'natural-titanium', x: 90, y: 66, scale: 0.2, rotation: 5, tiltX: 0, tiltY: -8 }
		],
		canvasWidth: 1920,
		canvasHeight: 1080
	},

	// ─── App Store Scenes ─────────────────────────────────
	{
		id: 'appstore-showcase-3',
		name: 'App Store Showcase',
		description: '3-slide iPhone App Store layout',
		backgroundCss: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d0d1a 100%)',
		appStore: {
			enabled: true,
			numSections: 3,
			sectionWidth: 1290,
			sectionHeight: 2796,
			presetName: 'iPhone 6.7"'
		},
		devices: [
			// Slide 1: centered hero phone
			{ deviceId: 'iphone-16-pro-max', colorId: 'natural-titanium', x: 16.7, y: 55, scale: 0.65, rotation: 0, tiltX: 0, tiltY: 0 },
			// Slide 2: two phones side by side
			{ deviceId: 'iphone-16-pro-max', colorId: 'natural-titanium', x: 43, y: 55, scale: 0.45, rotation: -5, tiltX: 0, tiltY: 8 },
			{ deviceId: 'iphone-16-pro-max', colorId: 'black-titanium', x: 57, y: 55, scale: 0.45, rotation: 5, tiltX: 0, tiltY: -8 },
			// Slide 3: tilted showcase
			{ deviceId: 'iphone-16-pro-max', colorId: 'natural-titanium', x: 83.3, y: 55, scale: 0.6, rotation: -8, tiltX: -5, tiltY: 12 }
		],
		canvasWidth: 3870, // 1290 * 3
		canvasHeight: 2796
	},
	{
		id: 'appstore-ipad-duo',
		name: 'iPad App Store',
		description: '3-slide iPad App Store layout',
		backgroundCss: 'linear-gradient(160deg, #1a0a2e 0%, #16213e 50%, #0a1628 100%)',
		appStore: {
			enabled: true,
			numSections: 3,
			sectionWidth: 2048,
			sectionHeight: 2732,
			presetName: 'iPad 12.9"'
		},
		devices: [
			// Slide 1: centered iPad
			{ deviceId: 'ipad-pro-13', colorId: 'silver', x: 16.7, y: 52, scale: 0.55, rotation: 0, tiltX: 0, tiltY: 0 },
			// Slide 2: iPad + iPhone
			{ deviceId: 'ipad-pro-13', colorId: 'silver', x: 45, y: 48, scale: 0.45, rotation: -3, tiltX: 0, tiltY: 6 },
			{ deviceId: 'iphone-16-pro', colorId: 'natural-titanium', x: 58, y: 62, scale: 0.2, rotation: 5, tiltX: 0, tiltY: -8 },
			// Slide 3: landscape iPad
			{ deviceId: 'ipad-pro-13', colorId: 'silver', x: 83.3, y: 50, scale: 0.5, rotation: 0, tiltX: -4, tiltY: 10 }
		],
		canvasWidth: 6144, // 2048 * 3
		canvasHeight: 2732
	}
];
