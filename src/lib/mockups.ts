// Perspective mockup scenes: real-world photos with screen corner coordinates + masks
// The user's screenshot gets perspective-warped AND masked into the device screen

export type ScreenMaskType = 'iphone-dynamic-island' | 'iphone-notch' | 'ipad' | 'macbook' | 'macbook-notch' | 'monitor' | 'rect';

export interface MockupScene {
	id: string;
	name: string;
	description: string;
	/** URL to the photo (Unsplash with exact crop dimensions for stable coordinates) */
	imageUrl: string;
	/** Screen corner coordinates as percentages of the canvas (0-100)
	 *  Order: [topLeft, topRight, bottomRight, bottomLeft]
	 *  Each point is [x%, y%] */
	screenCorners: [[number, number], [number, number], [number, number], [number, number]];
	/** Canvas dimensions — matches the Unsplash crop aspect ratio */
	canvasWidth: number;
	canvasHeight: number;
	/** Screen mask shape to apply before perspective warp */
	screenMask: ScreenMaskType;
	/** Screen corner radius as percentage of screen width (for the mask) */
	screenRadius: number;
}

/**
 * Generate an SVG data URI mask for a device screen shape.
 * White = show screenshot, transparent = cut out (notch/dynamic island).
 * Applied to the source rectangle BEFORE perspective warp.
 */
export function generateScreenMask(
	w: number,
	h: number,
	maskType: ScreenMaskType,
	radiusPct: number
): string {
	const r = w * radiusPct / 100;

	let maskPath: string;

	switch (maskType) {
		case 'iphone-dynamic-island': {
			const pillW = w * 0.26;
			const pillH = h * 0.028;
			const pillR = pillH / 2;
			const pillX = (w - pillW) / 2;
			const pillY = h * 0.015;
			maskPath = roundedRectPath(0, 0, w, h, r);
			maskPath += ` ` + roundedRectPath(pillX, pillY, pillW, pillH, pillR, true);
			break;
		}
		case 'iphone-notch': {
			const notchW = w * 0.42;
			const notchH = h * 0.032;
			const notchR = notchH * 0.4;
			const notchX = (w - notchW) / 2;
			maskPath = roundedRectPath(0, 0, w, h, r);
			maskPath += ` ` + roundedRectPath(notchX, 0, notchW, notchH, notchR, true);
			break;
		}
		case 'macbook-notch': {
			const notchW = w * 0.06;
			const notchH = h * 0.025;
			const notchR = notchH * 0.5;
			const notchX = (w - notchW) / 2;
			maskPath = roundedRectPath(0, 0, w, h, r);
			maskPath += ` ` + roundedRectPath(notchX, 0, notchW, notchH, notchR, true);
			break;
		}
		case 'ipad':
		case 'macbook':
		case 'monitor':
		case 'rect':
		default:
			maskPath = roundedRectPath(0, 0, w, h, r);
			break;
	}

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${maskPath}" fill="white" fill-rule="evenodd"/></svg>`;
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Generate a rounded rect SVG path. If ccw=true, draws counter-clockwise (for cutouts with fill-rule=evenodd). */
function roundedRectPath(x: number, y: number, w: number, h: number, r: number, ccw = false): string {
	r = Math.min(r, w / 2, h / 2);
	if (ccw) {
		return `M ${x + r},${y} L ${x},${y} L ${x},${y + h - r} Q ${x},${y + h} ${x + r},${y + h} L ${x + w - r},${y + h} Q ${x + w},${y + h} ${x + w},${y + h - r} L ${x + w},${y + r} Q ${x + w},${y} ${x + w - r},${y} Z`;
	}
	return `M ${x + r},${y} H ${x + w - r} Q ${x + w},${y} ${x + w},${y + r} V ${y + h - r} Q ${x + w},${y + h} ${x + w - r},${y + h} H ${x + r} Q ${x},${y + h} ${x},${y + h - r} V ${y + r} Q ${x},${y} ${x + r},${y} Z`;
}

const unsplash = (id: string, w: number, h: number) =>
	`https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&q=80`;

// Coordinates calibrated from grid overlay measurements on each cropped photo
export const mockupScenes: MockupScene[] = [
	// ─── Laptops ──────────────────────────────────────────
	{
		id: 'laptop-minimal-desk',
		name: 'Minimal Desk',
		description: 'MacBook on a clean white desk',
		imageUrl: unsplash('photo-1517694712202-14dd9538aa97', 1920, 1280),
		screenCorners: [[13, 19], [54, 14], [56, 51], [12, 54]],
		canvasWidth: 1920,
		canvasHeight: 1280,
		screenMask: 'macbook',
		screenRadius: 1.2
	},
	{
		id: 'laptop-dark-desk',
		name: 'Dark Workspace',
		description: 'Laptop centered on desk with plants',
		imageUrl: unsplash('photo-1496181133206-80ce9b88a853', 1920, 1280),
		screenCorners: [[36, 32], [62, 32], [60, 63], [38, 63]],
		canvasWidth: 1920,
		canvasHeight: 1280,
		screenMask: 'macbook',
		screenRadius: 1.2
	},
	{
		id: 'laptop-coffee',
		name: 'Coffee & Code',
		description: 'Laptop next to coffee cup',
		imageUrl: unsplash('photo-1484788984921-03950022c9ef', 1920, 1280),
		// Laptop screen centered, with coffee cup to the left
		screenCorners: [[26, 17], [67, 17], [67, 55], [26, 55]],
		canvasWidth: 1920,
		canvasHeight: 1280,
		screenMask: 'macbook',
		screenRadius: 1.2
	},

	// ─── Phones ────────────────────────────────────────────
	{
		id: 'phone-hand-dark',
		name: 'Phone in Hand',
		description: 'Phone held against dark background',
		imageUrl: unsplash('photo-1585060544812-6b45742d762f', 1080, 1920),
		// Phone screen, slightly tilted with app icons visible
		screenCorners: [[14, 10], [34, 4], [38, 74], [18, 80]],
		canvasWidth: 1080,
		canvasHeight: 1920,
		screenMask: 'iphone-dynamic-island',
		screenRadius: 6
	},

	// ─── Phones ────────────────────────────────────────────
	{
		id: 'phone-table-flat',
		name: 'Phone on Table',
		description: 'iPhone flat on a wooden table',
		imageUrl: unsplash('photo-1512054502232-10a0a035d672', 1920, 1280),
		screenCorners: [[32, 12], [68, 12], [68, 88], [32, 88]],
		canvasWidth: 1920,
		canvasHeight: 1280,
		screenMask: 'iphone-dynamic-island',
		screenRadius: 6
	},
	{
		id: 'phone-minimal-white',
		name: 'Clean White',
		description: 'Phone on white surface',
		imageUrl: unsplash('photo-1580910051074-3eb694886f5b', 1080, 1920),
		screenCorners: [[22, 8], [78, 8], [78, 92], [22, 92]],
		canvasWidth: 1080,
		canvasHeight: 1920,
		screenMask: 'iphone-dynamic-island',
		screenRadius: 6
	},

	// ─── Tablets ───────────────────────────────────────────
	{
		id: 'ipad-desk',
		name: 'iPad on Desk',
		description: 'iPad laying flat on desk',
		imageUrl: unsplash('photo-1544244015-0df4b3ffc6b0', 1920, 1280),
		screenCorners: [[20, 10], [80, 10], [80, 85], [20, 85]],
		canvasWidth: 1920,
		canvasHeight: 1280,
		screenMask: 'ipad',
		screenRadius: 2
	},
	{
		id: 'ipad-hand-holding',
		name: 'iPad in Hands',
		description: 'Person holding an iPad',
		imageUrl: unsplash('photo-1585790050230-5dd28404ccb9', 1920, 1280),
		screenCorners: [[25, 15], [75, 15], [75, 85], [25, 85]],
		canvasWidth: 1920,
		canvasHeight: 1280,
		screenMask: 'ipad',
		screenRadius: 2
	},

	// ─── Monitors ─────────────────────────────────────────
	{
		id: 'monitor-desk-setup',
		name: 'Desk Setup',
		description: 'Monitor on a clean desk',
		imageUrl: unsplash('photo-1593062096033-9a26b09da705', 1920, 1280),
		screenCorners: [[15, 5], [85, 5], [85, 65], [15, 65]],
		canvasWidth: 1920,
		canvasHeight: 1280,
		screenMask: 'monitor',
		screenRadius: 0.5
	},
	{
		id: 'monitor-home-office',
		name: 'Home Office',
		description: 'iMac-style monitor on desk',
		imageUrl: unsplash('photo-1498050108023-c5249f4df085', 1920, 1280),
		screenCorners: [[13, 5], [74, 5], [74, 52], [13, 52]],
		canvasWidth: 1920,
		canvasHeight: 1280,
		screenMask: 'monitor',
		screenRadius: 0.5
	},

	// ─── TV ───────────────────────────────────────────────
	{
		id: 'tv-living-room',
		name: 'Living Room TV',
		description: 'TV mounted on wall in living room',
		imageUrl: unsplash('photo-1593784991095-a205069470b6', 1920, 1280),
		screenCorners: [[10, 8], [90, 8], [90, 72], [10, 72]],
		canvasWidth: 1920,
		canvasHeight: 1280,
		screenMask: 'rect',
		screenRadius: 0.3
	},
	{
		id: 'tv-entertainment-center',
		name: 'Entertainment Center',
		description: 'TV on entertainment stand',
		imageUrl: unsplash('photo-1558888401-3cc1de77652d', 1920, 1280),
		screenCorners: [[12, 5], [88, 5], [88, 68], [12, 68]],
		canvasWidth: 1920,
		canvasHeight: 1280,
		screenMask: 'rect',
		screenRadius: 0.3
	},

	// ─── Watch ────────────────────────────────────────────
	{
		id: 'watch-wrist',
		name: 'Watch on Wrist',
		description: 'Apple Watch on wrist',
		imageUrl: unsplash('photo-1434493789847-2a75b0ea7e42', 1920, 1280),
		screenCorners: [[30, 20], [70, 20], [70, 80], [30, 80]],
		canvasWidth: 1920,
		canvasHeight: 1280,
		screenMask: 'rect',
		screenRadius: 12
	}
];
