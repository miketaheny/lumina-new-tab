export interface ThemeDef {
  name: string;
  desc: string;
  colors: [number, number, number][];
  preview: string;
}

export const THEMES: Record<string, ThemeDef> = {
  cosmic: {
    name: 'Cosmic',
    desc: 'Deep space nebulae',
    colors: [
      [15, 10, 40], [45, 20, 80], [80, 30, 120], [20, 5, 60],
      [10, 40, 90], [50, 10, 100], [5, 5, 30],
    ],
    preview: 'linear-gradient(135deg,#0f0a28,#2d1450,#0a2850)',
  },
  aurora: {
    name: 'Aurora',
    desc: 'Northern lights',
    colors: [
      [5, 30, 25], [10, 80, 60], [20, 60, 90], [5, 40, 50],
      [15, 90, 70], [8, 50, 40], [3, 20, 35],
    ],
    preview: 'linear-gradient(135deg,#051e19,#0a503c,#14325a)',
  },
  sunset: {
    name: 'Sunset',
    desc: 'Golden hour glow',
    colors: [
      [80, 20, 10], [140, 60, 10], [180, 80, 30], [100, 30, 5],
      [160, 40, 20], [200, 100, 40], [60, 15, 8],
    ],
    preview: 'linear-gradient(135deg,#501408,#8c3c0a,#b4501e)',
  },
  ocean: {
    name: 'Ocean',
    desc: 'Abyssal depths',
    colors: [
      [5, 20, 60], [10, 40, 90], [5, 60, 80], [8, 30, 70],
      [3, 15, 50], [15, 50, 100], [2, 10, 40],
    ],
    preview: 'linear-gradient(135deg,#05143c,#0a285a,#053c50)',
  },
  forest: {
    name: 'Forest',
    desc: 'Midnight canopy',
    colors: [
      [10, 30, 10], [20, 50, 15], [5, 40, 20], [15, 60, 10],
      [8, 25, 15], [25, 45, 12], [6, 20, 8],
    ],
    preview: 'linear-gradient(135deg,#0a1e0a,#143214,#05280a)',
  },
  ember: {
    name: 'Ember',
    desc: 'Smoldering heat',
    colors: [
      [60, 10, 5], [100, 25, 8], [80, 15, 10], [120, 40, 5],
      [50, 8, 3], [140, 50, 10], [40, 5, 2],
    ],
    preview: 'linear-gradient(135deg,#3c0a05,#641908,#500f0a)',
  },
  minimal: {
    name: 'Minimal',
    desc: 'Clean monochrome',
    colors: [
      [12, 12, 14], [20, 20, 22], [8, 8, 10], [16, 16, 18],
      [25, 25, 28], [10, 10, 12], [6, 6, 8],
    ],
    preview: 'linear-gradient(135deg,#0c0c0e,#141416,#08080a)',
  },
  candy: {
    name: 'Candy',
    desc: 'Sweet pastels',
    colors: [
      [60, 10, 50], [100, 20, 80], [80, 30, 90], [120, 40, 60],
      [50, 15, 70], [140, 50, 90], [40, 8, 45],
    ],
    preview: 'linear-gradient(135deg,#3c0a32,#641450,#50205a)',
  },
};
