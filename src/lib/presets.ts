import type { CanvasPreset } from './types';

export const canvasPresets: CanvasPreset[] = [
	// General
	{ name: 'Landscape 16:9', width: 1920, height: 1080, category: 'General' },
	{ name: 'Portrait 9:16', width: 1080, height: 1920, category: 'General' },
	{ name: 'Square 1:1', width: 1080, height: 1080, category: 'General' },
	{ name: 'Ultrawide', width: 2560, height: 1080, category: 'General' },
	// Social
	{ name: 'Dribbble', width: 1600, height: 1200, category: 'Social' },
	{ name: 'Twitter Post', width: 1600, height: 900, category: 'Social' },
	{ name: 'Instagram Post', width: 1080, height: 1080, category: 'Social' },
	{ name: 'Instagram Story', width: 1080, height: 1920, category: 'Social' },
	{ name: 'LinkedIn Post', width: 1200, height: 627, category: 'Social' },
	{ name: 'Product Hunt', width: 1270, height: 760, category: 'Social' },
	{ name: 'Open Graph', width: 1200, height: 630, category: 'Social' },
	// App Store
	{ name: 'iPhone 6.9"', width: 1320, height: 2868, category: 'App Store' },
	{ name: 'iPhone 6.7"', width: 1290, height: 2796, category: 'App Store' },
	{ name: 'iPhone 6.5"', width: 1284, height: 2778, category: 'App Store' },
	{ name: 'iPhone 5.5"', width: 1242, height: 2208, category: 'App Store' },
	{ name: 'iPad Pro 13"', width: 2048, height: 2732, category: 'App Store' },
	{ name: 'iPad Pro 11"', width: 1668, height: 2388, category: 'App Store' },
	{ name: 'Mac App', width: 2880, height: 1800, category: 'App Store' },
	{ name: 'Apple TV', width: 1920, height: 1080, category: 'App Store' },
	{ name: 'Apple Watch', width: 410, height: 502, category: 'App Store' },
	// Play Store
	{ name: 'Play Phone', width: 1080, height: 1920, category: 'Play Store' },
	{ name: 'Play Tablet 7"', width: 1200, height: 1920, category: 'Play Store' },
	{ name: 'Play Tablet 10"', width: 1920, height: 1200, category: 'Play Store' },
	{ name: 'Feature Graphic', width: 1024, height: 500, category: 'Play Store' },
];
