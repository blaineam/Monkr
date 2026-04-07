import type { DeviceMeta } from '../types';

// Built-in device definitions for the MVP.
// In the future these could be loaded from static JSON files.

const builtInDevices: DeviceMeta[] = [
	{
		id: 'iphone-15-pro',
		name: 'iPhone 15 Pro',
		category: 'phone',
		brand: 'Apple',
		frameWidth: 453,
		frameHeight: 912,
		screen: { x: 30, y: 30, width: 393, height: 852, borderRadius: 55 },
		colors: [
			{
				id: 'natural-titanium',
				name: 'Natural Titanium',
				hex: '#9a9a9f',
				bezelImage: ''
			},
			{
				id: 'blue-titanium',
				name: 'Blue Titanium',
				hex: '#3d4555',
				bezelImage: ''
			},
			{
				id: 'white-titanium',
				name: 'White Titanium',
				hex: '#f2f1eb',
				bezelImage: ''
			},
			{
				id: 'black-titanium',
				name: 'Black Titanium',
				hex: '#3c3b37',
				bezelImage: ''
			}
		],
		year: 2023
	},
	{
		id: 'iphone-16-pro',
		name: 'iPhone 16 Pro',
		category: 'phone',
		brand: 'Apple',
		frameWidth: 453,
		frameHeight: 922,
		screen: { x: 30, y: 30, width: 393, height: 862, borderRadius: 55 },
		colors: [
			{
				id: 'desert-titanium',
				name: 'Desert Titanium',
				hex: '#bfa48f',
				bezelImage: ''
			},
			{
				id: 'natural-titanium',
				name: 'Natural Titanium',
				hex: '#9a9a9f',
				bezelImage: ''
			},
			{
				id: 'white-titanium',
				name: 'White Titanium',
				hex: '#f2f1eb',
				bezelImage: ''
			},
			{
				id: 'black-titanium',
				name: 'Black Titanium',
				hex: '#3c3b37',
				bezelImage: ''
			}
		],
		year: 2024
	},
	{
		id: 'pixel-9-pro',
		name: 'Pixel 9 Pro',
		category: 'phone',
		brand: 'Google',
		frameWidth: 453,
		frameHeight: 932,
		screen: { x: 28, y: 28, width: 397, height: 876, borderRadius: 48 },
		colors: [
			{
				id: 'obsidian',
				name: 'Obsidian',
				hex: '#2d2d2d',
				bezelImage: ''
			},
			{
				id: 'porcelain',
				name: 'Porcelain',
				hex: '#f5f0e8',
				bezelImage: ''
			},
			{
				id: 'hazel',
				name: 'Hazel',
				hex: '#b5c5a3',
				bezelImage: ''
			}
		],
		year: 2024
	},
	{
		id: 'galaxy-s24-ultra',
		name: 'Galaxy S24 Ultra',
		category: 'phone',
		brand: 'Samsung',
		frameWidth: 453,
		frameHeight: 928,
		screen: { x: 22, y: 22, width: 409, height: 884, borderRadius: 38 },
		colors: [
			{
				id: 'titanium-gray',
				name: 'Titanium Gray',
				hex: '#9a9a96',
				bezelImage: ''
			},
			{
				id: 'titanium-black',
				name: 'Titanium Black',
				hex: '#2b2b2b',
				bezelImage: ''
			},
			{
				id: 'titanium-violet',
				name: 'Titanium Violet',
				hex: '#c5b9d0',
				bezelImage: ''
			}
		],
		year: 2024
	},
	{
		id: 'ipad-pro-13',
		name: 'iPad Pro 13"',
		category: 'tablet',
		brand: 'Apple',
		frameWidth: 870,
		frameHeight: 1194,
		screen: { x: 35, y: 35, width: 800, height: 1124, borderRadius: 30 },
		colors: [
			{
				id: 'space-black',
				name: 'Space Black',
				hex: '#2e2e2e',
				bezelImage: ''
			},
			{
				id: 'silver',
				name: 'Silver',
				hex: '#e3e3e0',
				bezelImage: ''
			}
		],
		year: 2024
	},
	{
		id: 'macbook-pro-16',
		name: 'MacBook Pro 16"',
		category: 'laptop',
		brand: 'Apple',
		frameWidth: 1120,
		frameHeight: 740,
		screen: { x: 95, y: 40, width: 930, height: 582, borderRadius: 12 },
		colors: [
			{
				id: 'space-black',
				name: 'Space Black',
				hex: '#2e2e2e',
				bezelImage: ''
			},
			{
				id: 'silver',
				name: 'Silver',
				hex: '#e3e3e0',
				bezelImage: ''
			}
		],
		year: 2024
	}
];

class DeviceRegistry {
	devices = $state<DeviceMeta[]>(builtInDevices);
	loading = $state(false);

	get allDevices(): DeviceMeta[] {
		return this.devices;
	}

	get phones(): DeviceMeta[] {
		return this.devices.filter((d) => d.category === 'phone');
	}

	get tablets(): DeviceMeta[] {
		return this.devices.filter((d) => d.category === 'tablet');
	}

	get laptops(): DeviceMeta[] {
		return this.devices.filter((d) => d.category === 'laptop');
	}

	getDevice(id: string): DeviceMeta | undefined {
		return this.devices.find((d) => d.id === id);
	}

	getDeviceColor(deviceId: string, colorId: string) {
		const device = this.getDevice(deviceId);
		if (!device) return undefined;
		return device.colors.find((c) => c.id === colorId) ?? device.colors[0];
	}
}

export const deviceRegistry = new DeviceRegistry();
