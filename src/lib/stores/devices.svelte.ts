import type { DeviceMeta } from '../types';

// The device frame PNGs are stored at /devices/{slug}/{colorSlug}.png
// The screen mask SVG is at /devices/{slug}/display.svg
// Screen is always centered within the frame PNG:
//   phones/tablets: ratio 1.25 → screen = 80% of frame, 10% offset each side
//   laptops/desktops: ratio 1.5 → screen = 66.7% of frame, 16.7% offset each side

const builtInDevices: DeviceMeta[] = [
	// ─── iPhone 17 ──────────────────────────────────────────
	{
		id: 'iphone-17-pro-max', name: 'iPhone 17 Pro Max', category: 'phone', brand: 'Apple',
		slug: 'iphone-17-pro-max', pngW: 1650, pngH: 3585, svgW: 1320, svgH: 2869, year: 2025,
		notch: 'dynamic-island',
		colors: [
			{ id: 'cosmic-orange', name: 'Cosmic Orange', slug: 'cosmic-orange' },
			{ id: 'deep-blue', name: 'Deep Blue', slug: 'deep-blue' },
			{ id: 'silver', name: 'Silver', slug: 'silver' }
		]
	},
	{
		id: 'iphone-17-pro', name: 'iPhone 17 Pro', category: 'phone', brand: 'Apple',
		slug: 'iphone-17-pro', pngW: 1508, pngH: 3278, svgW: 1206, svgH: 2623, year: 2025,
		notch: 'dynamic-island',
		colors: [
			{ id: 'cosmic-orange', name: 'Cosmic Orange', slug: 'cosmic-orange' },
			{ id: 'deep-blue', name: 'Deep Blue', slug: 'deep-blue' },
			{ id: 'silver', name: 'Silver', slug: 'silver' }
		]
	},
	{
		id: 'iphone-17-air', name: 'iPhone 17 Air', category: 'phone', brand: 'Apple',
		slug: 'iphone-17-air', pngW: 1575, pngH: 3420, svgW: 1260, svgH: 2736, year: 2025,
		notch: 'dynamic-island',
		colors: [
			{ id: 'cloud-white', name: 'Cloud White', slug: 'cloud-white' },
			{ id: 'light-gold', name: 'Light Gold', slug: 'light-gold' },
			{ id: 'sky-blue', name: 'Sky Blue', slug: 'sky-blue' },
			{ id: 'space-black', name: 'Space Black', slug: 'space-black' }
		]
	},
	{
		id: 'iphone-17', name: 'iPhone 17', category: 'phone', brand: 'Apple',
		slug: 'iphone-17', pngW: 1508, pngH: 3278, svgW: 1206, svgH: 2623, year: 2025,
		notch: 'dynamic-island',
		colors: [
			{ id: 'black', name: 'Black', slug: 'black' },
			{ id: 'lavender', name: 'Lavender', slug: 'lavender' },
			{ id: 'mist-blue', name: 'Mist Blue', slug: 'mist-blue' },
			{ id: 'sage', name: 'Sage', slug: 'sage' },
			{ id: 'white', name: 'White', slug: 'white' }
		]
	},
	// ─── iPhone 16 ──────────────────────────────────────────
	{
		id: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max', category: 'phone', brand: 'Apple',
		slug: 'iphone-16-pro-max', pngW: 1650, pngH: 3587, svgW: 1320, svgH: 2869, year: 2024,
		notch: 'dynamic-island',
		colors: [
			{ id: 'black-titanium', name: 'Black Titanium', slug: 'black-titanium' },
			{ id: 'desert-titanium', name: 'Desert Titanium', slug: 'desert-titanium' },
			{ id: 'natural-titanium', name: 'Natural Titanium', slug: 'natural-titanium' },
			{ id: 'white-titanium', name: 'White Titanium', slug: 'white-titanium' }
		]
	},
	{
		id: 'iphone-16-pro', name: 'iPhone 16 Pro', category: 'phone', brand: 'Apple',
		slug: 'iphone-16-pro', pngW: 1508, pngH: 3279, svgW: 1206, svgH: 2623, year: 2024,
		notch: 'dynamic-island',
		colors: [
			{ id: 'black-titanium', name: 'Black Titanium', slug: 'black-titanium' },
			{ id: 'gold-titanium', name: 'Gold Titanium', slug: 'gold-titanium' },
			{ id: 'natural-titanium', name: 'Natural Titanium', slug: 'natural-titanium' },
			{ id: 'white-titanium', name: 'White Titanium', slug: 'white-titanium' }
		]
	},
	{
		id: 'iphone-16-plus', name: 'iPhone 16 Plus', category: 'phone', brand: 'Apple',
		slug: 'iphone-16-plus', pngW: 1613, pngH: 3496, svgW: 1290, svgH: 2797, year: 2024,
		notch: 'dynamic-island',
		colors: [
			{ id: 'black', name: 'Black', slug: 'black' },
			{ id: 'pink', name: 'Pink', slug: 'pink' },
			{ id: 'teal', name: 'Teal', slug: 'teal' },
			{ id: 'ultramarine', name: 'Ultramarine', slug: 'ultramarine' },
			{ id: 'white', name: 'White', slug: 'white' }
		]
	},
	{
		id: 'iphone-16', name: 'iPhone 16', category: 'phone', brand: 'Apple',
		slug: 'iphone-16', pngW: 1474, pngH: 3194, svgW: 1179, svgH: 2557, year: 2024,
		notch: 'dynamic-island',
		colors: [
			{ id: 'black', name: 'Black', slug: 'black' },
			{ id: 'pink', name: 'Pink', slug: 'pink' },
			{ id: 'teal', name: 'Teal', slug: 'teal' },
			{ id: 'ultramarine', name: 'Ultramarine', slug: 'ultramarine' },
			{ id: 'white', name: 'White', slug: 'white' }
		]
	},
	// ─── iPhone 15 ──────────────────────────────────────────
	{
		id: 'iphone-15-pro-max', name: 'iPhone 15 Pro Max', category: 'phone', brand: 'Apple',
		slug: 'iphone-15-pro-max', pngW: 1613, pngH: 3495, svgW: 1290, svgH: 2797, year: 2023,
		notch: 'dynamic-island',
		colors: [
			{ id: 'black-titanium', name: 'Black Titanium', slug: 'black-titanium' },
			{ id: 'dark-blue', name: 'Dark Blue', slug: 'dark-blue' },
			{ id: 'natural-titanium', name: 'Natural Titanium', slug: 'natural-titanium' },
			{ id: 'white-titanium', name: 'White Titanium', slug: 'white-titanium' }
		]
	},
	{
		id: 'iphone-15-pro', name: 'iPhone 15 Pro', category: 'phone', brand: 'Apple',
		slug: 'iphone-15-pro', pngW: 1474, pngH: 3195, svgW: 1179, svgH: 2557, year: 2023,
		notch: 'dynamic-island',
		colors: [
			{ id: 'black-titanium', name: 'Black Titanium', slug: 'black-titanium' },
			{ id: 'dark-blue', name: 'Dark Blue', slug: 'dark-blue' },
			{ id: 'natural-titanium', name: 'Natural Titanium', slug: 'natural-titanium' },
			{ id: 'white-titanium', name: 'White Titanium', slug: 'white-titanium' }
		]
	},
	{
		id: 'iphone-15-plus', name: 'iPhone 15 Plus', category: 'phone', brand: 'Apple',
		slug: 'iphone-15-plus', pngW: 1613, pngH: 3495, svgW: 1290, svgH: 2797, year: 2023,
		notch: 'dynamic-island',
		colors: [
			{ id: 'black', name: 'Black', slug: 'black' },
			{ id: 'blue', name: 'Blue', slug: 'blue' },
			{ id: 'green', name: 'Green', slug: 'green' },
			{ id: 'pink', name: 'Pink', slug: 'pink' },
			{ id: 'yellow', name: 'Yellow', slug: 'yellow' }
		]
	},
	{
		id: 'iphone-15', name: 'iPhone 15', category: 'phone', brand: 'Apple',
		slug: 'iphone-15', pngW: 1474, pngH: 3195, svgW: 1179, svgH: 2557, year: 2023,
		notch: 'dynamic-island',
		colors: [
			{ id: 'black', name: 'Black', slug: 'black' },
			{ id: 'blue', name: 'Blue', slug: 'blue' },
			{ id: 'green', name: 'Green', slug: 'green' },
			{ id: 'pink', name: 'Pink', slug: 'pink' },
			{ id: 'yellow', name: 'Yellow', slug: 'yellow' }
		]
	},
	// ─── iPhone 14 ──────────────────────────────────────────
	{
		id: 'iphone-14-pro-max', name: 'iPhone 14 Pro Max', category: 'phone', brand: 'Apple',
		slug: 'iphone-14-pro-max', pngW: 1613, pngH: 3495, svgW: 1290, svgH: 2796, year: 2022,
		notch: 'dynamic-island',
		colors: [
			{ id: 'space-black', name: 'Space Black', slug: 'space-black' }
		]
	},
	{
		id: 'iphone-14-pro', name: 'iPhone 14 Pro', category: 'phone', brand: 'Apple',
		slug: 'iphone-14-pro', pngW: 1475, pngH: 3195, svgW: 1179, svgH: 2556, year: 2022,
		notch: 'dynamic-island',
		colors: [
			{ id: 'gold', name: 'Gold', slug: 'gold' },
			{ id: 'silver', name: 'Silver', slug: 'silver' },
			{ id: 'space-black', name: 'Space Black', slug: 'space-black' }
		]
	},
	{
		id: 'iphone-14-plus', name: 'iPhone 14 Plus', category: 'phone', brand: 'Apple',
		slug: 'iphone-14-plus', pngW: 1605, pngH: 3473, svgW: 1284, svgH: 2778, year: 2022,
		notch: 'none',
		colors: [
			{ id: 'blue', name: 'Blue', slug: 'blue' },
			{ id: 'midnight', name: 'Midnight', slug: 'midnight' },
			{ id: 'purple', name: 'Purple', slug: 'purple' },
			{ id: 'red', name: 'Red', slug: 'red' },
			{ id: 'starlight', name: 'Starlight', slug: 'starlight' }
		]
	},
	{
		id: 'iphone-14', name: 'iPhone 14', category: 'phone', brand: 'Apple',
		slug: 'iphone-14', pngW: 1463, pngH: 3165, svgW: 1171, svgH: 2532, year: 2022,
		notch: 'none',
		colors: [
			{ id: 'blue', name: 'Blue', slug: 'blue' },
			{ id: 'midnight', name: 'Midnight', slug: 'midnight' },
			{ id: 'purple', name: 'Purple', slug: 'purple' },
			{ id: 'red', name: 'Red', slug: 'red' },
			{ id: 'starlight', name: 'Starlight', slug: 'starlight' }
		]
	},
	// ─── Android ────────────────────────────────────────────
	{
		id: 'pixel-7-pro', name: 'Pixel 7 Pro', category: 'phone', brand: 'Google',
		slug: 'pixel-7-pro', pngW: 600, pngH: 1301, svgW: 480, svgH: 1041, year: 2022,
		notch: 'punch-hole',
		colors: [
			{ id: 'hazel', name: 'Hazel', slug: 'hazel' },
			{ id: 'obsidian', name: 'Obsidian', slug: 'obsidian' },
			{ id: 'snow', name: 'Snow', slug: 'snow' }
		]
	},
	{
		id: 'nothing-phone', name: 'Nothing Phone', category: 'phone', brand: 'Nothing',
		slug: 'nothing-phone', pngW: 930, pngH: 2066, svgW: 744, svgH: 1652, year: 2023,
		notch: 'punch-hole',
		colors: [
			{ id: 'black', name: 'Black', slug: 'black' },
			{ id: 'white', name: 'White', slug: 'white' }
		]
	},
	// ─── Tablets ─────────────────────────────────────────────
	{
		id: 'ipad-pro-13', name: 'iPad Pro 13"', category: 'tablet', brand: 'Apple',
		slug: 'ipad-pro-13', pngW: 2560, pngH: 3415, svgW: 2048, svgH: 2733, year: 2024,
		notch: 'none',
		colors: [
			{ id: 'silver', name: 'Silver', slug: 'silver' },
			{ id: 'space-gray', name: 'Space Gray', slug: 'space-gray' }
		]
	},
	{
		id: 'ipad-pro-11', name: 'iPad Pro 11"', category: 'tablet', brand: 'Apple',
		slug: 'ipad-pro-11', pngW: 2085, pngH: 2985, svgW: 1668, svgH: 2389, year: 2024,
		notch: 'none',
		colors: [
			{ id: 'silver', name: 'Silver', slug: 'silver' },
			{ id: 'space-gray', name: 'Space Gray', slug: 'space-gray' }
		]
	},
	{
		id: 'ipad-air', name: 'iPad Air', category: 'tablet', brand: 'Apple',
		slug: 'ipad-air', pngW: 1538, pngH: 2213, svgW: 1231, svgH: 1771, year: 2024,
		notch: 'none',
		colors: [
			{ id: 'blue', name: 'Blue', slug: 'blue' },
			{ id: 'pink', name: 'Pink', slug: 'pink' },
			{ id: 'purple', name: 'Purple', slug: 'purple' },
			{ id: 'space-gray', name: 'Space Gray', slug: 'space-gray' },
			{ id: 'starlight', name: 'Starlight', slug: 'starlight' }
		]
	},
	{
		id: 'ipad-mini', name: 'iPad Mini', category: 'tablet', brand: 'Apple',
		slug: 'ipad-mini', pngW: 1140, pngH: 1737, svgW: 912, svgH: 1389, year: 2024,
		notch: 'none',
		colors: [
			{ id: 'pink', name: 'Pink', slug: 'pink' },
			{ id: 'purple', name: 'Purple', slug: 'purple' },
			{ id: 'space-gray', name: 'Space Gray', slug: 'space-gray' },
			{ id: 'starlight', name: 'Starlight', slug: 'starlight' }
		]
	},
	// ─── Laptops ─────────────────────────────────────────────
	{
		id: 'macbook-pro-16', name: 'MacBook Pro 16"', category: 'laptop', brand: 'Apple',
		slug: 'macbook-pro-16', pngW: 4893, pngH: 3164, svgW: 3262, svgH: 2109, year: 2024,
		screenTop: 16.72, screenLeft: 16.70,
		notch: 'notch',
		colors: [
			{ id: 'silver', name: 'Silver', slug: 'silver' }
		]
	},
	{
		id: 'macbook-air-m2', name: 'MacBook Air M2', category: 'laptop', brand: 'Apple',
		slug: 'macbook-air-m2', pngW: 1920, pngH: 1248, svgW: 1280, svgH: 832, year: 2023,
		screenTop: 16.67, screenLeft: 16.67,
		notch: 'none',
		colors: [
			{ id: 'midnight', name: 'Midnight', slug: 'midnight' },
			{ id: 'silver', name: 'Silver', slug: 'silver' },
			{ id: 'space-gray', name: 'Space Gray', slug: 'space-gray' },
			{ id: 'starlight', name: 'Starlight', slug: 'starlight' }
		]
	},
	{
		id: 'macbook-air-13', name: 'MacBook Air 13"', category: 'laptop', brand: 'Apple',
		slug: 'macbook-air-13', pngW: 3840, pngH: 2401, svgW: 2560, svgH: 1601, year: 2022,
		screenTop: 16.70, screenLeft: 16.67,
		notch: 'none',
		colors: [
			{ id: 'gold', name: 'Gold', slug: 'gold' },
			{ id: 'silver', name: 'Silver', slug: 'silver' },
			{ id: 'space-gray', name: 'Space Gray', slug: 'space-gray' }
		]
	},
	// ─── Desktops ────────────────────────────────────────────
	{
		id: 'imac-24', name: 'iMac 24"', category: 'laptop', brand: 'Apple',
		slug: 'imac-24', pngW: 3134, pngH: 2644, svgW: 2976, svgH: 1675, year: 2024,
		screenTop: 3.10, screenLeft: 2.55,
		notch: 'none',
		colors: [
			{ id: 'blue', name: 'Blue', slug: 'blue' },
			{ id: 'orange', name: 'Orange', slug: 'orange' },
			{ id: 'purple', name: 'Purple', slug: 'purple' },
			{ id: 'red', name: 'Red', slug: 'red' },
			{ id: 'silver', name: 'Silver', slug: 'silver' }
		]
	},
	{
		id: 'imac-pro', name: 'iMac Pro', category: 'laptop', brand: 'Apple',
		slug: 'imac-pro', pngW: 3954, pngH: 3270, svgW: 3652, svgH: 2055, year: 2023,
		screenTop: 5.29, screenLeft: 4.10,
		notch: 'none',
		colors: [
			{ id: 'space-gray', name: 'Space Gray', slug: 'space-gray' }
		]
	},
	{
		id: 'pro-display-xdr', name: 'Pro Display XDR', category: 'laptop', brand: 'Apple',
		slug: 'pro-display-xdr', pngW: 4006, pngH: 2972, svgW: 3904, svgH: 2198, year: 2024,
		screenTop: 1.82, screenLeft: 1.32,
		notch: 'none',
		colors: [
			{ id: 'silver', name: 'Silver', slug: 'silver' }
		]
	},
	// ─── TV (CSS-rendered, no PNG assets) ────────────────────
	{
		id: 'apple-tv-4k', name: 'Apple TV 4K', category: 'tv', brand: 'Apple',
		slug: '_css', pngW: 960, pngH: 590, svgW: 920, svgH: 518, year: 2024,
		notch: 'none',
		colors: [{ id: 'black', name: 'Black', slug: 'black' }]
	},
	{
		id: 'tv-flat', name: 'Flat Screen TV', category: 'tv', brand: 'Generic',
		slug: '_css', pngW: 960, pngH: 620, svgW: 900, svgH: 506, year: 2024,
		notch: 'none',
		colors: [
			{ id: 'black', name: 'Black', slug: 'black' },
			{ id: 'silver', name: 'Silver', slug: 'silver' }
		]
	},
	// ─── Browser (CSS-rendered, no PNG assets) ───────────────
	{
		id: 'browser-light', name: 'Browser (Light)', category: 'browser', brand: 'Generic',
		slug: '_css', pngW: 960, pngH: 640, svgW: 960, svgH: 596, year: 2024,
		notch: 'none',
		colors: [{ id: 'light', name: 'Light', slug: 'light' }]
	},
	{
		id: 'browser-dark', name: 'Browser (Dark)', category: 'browser', brand: 'Generic',
		slug: '_css', pngW: 960, pngH: 640, svgW: 960, svgH: 596, year: 2024,
		notch: 'none',
		colors: [{ id: 'dark', name: 'Dark', slug: 'dark' }]
	},
];

class DeviceRegistry {
	devices = $state<DeviceMeta[]>(builtInDevices);

	getDevice(id: string): DeviceMeta | undefined {
		return this.devices.find((d) => d.id === id);
	}

	getDeviceColor(deviceId: string, colorId: string) {
		const device = this.getDevice(deviceId);
		if (!device) return undefined;
		return device.colors.find((c) => c.id === colorId) ?? device.colors[0];
	}

	/** Get the frame PNG path for a device + color */
	getFrameUrl(device: DeviceMeta, colorSlug: string): string {
		return `/devices/${device.slug}/${colorSlug}.png`;
	}

	/** Get the screen mask SVG path for a device */
	getMaskUrl(device: DeviceMeta): string {
		return `/devices/${device.slug}/display.svg`;
	}

	/** Get screen position within the frame as percentages */
	getScreenRect(device: DeviceMeta): { left: number; top: number; width: number; height: number } {
		const width = (device.svgW / device.pngW) * 100;
		const height = (device.svgH / device.pngH) * 100;
		const left = device.screenLeft ?? ((device.pngW - device.svgW) / 2 / device.pngW) * 100;
		const top = device.screenTop ?? ((device.pngH - device.svgH) / 2 / device.pngH) * 100;
		return { left, top, width, height };
	}
}

export const deviceRegistry = new DeviceRegistry();
