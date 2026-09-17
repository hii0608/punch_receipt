import type { BackgroundFill } from './types';

export const SOLID_PALETTE = [
  '#E2FF4F',
  '#FF6B6B',
  '#FFB703',
  '#6BCBFF',
  '#C3B1FF',
  '#FF9ECD',
  '#2EC4B6',
  '#F4A261',
  '#1A1A1A',
  '#FFFFFF',
];

export const PAPER_COLORS = ['#FAF7F0', '#FFF1E6', '#F2F4F7', '#EAF4E4', '#FFFFFF', '#1F1D1A'];

export const INK_COLORS = ['#3A352E', '#5B7FBF', '#C8503C', '#2F6F4E', '#7A5AF8', '#FAF7F0'];

export const STICKER_COLORS = [
  '#C8503C',
  '#5B7FBF',
  '#E2A32D',
  '#2F6F4E',
  '#7A5AF8',
  '#E86AA6',
  '#3A352E',
  '#FAF7F0',
];

export const GRADIENT_PRESETS: { id: string; fill: BackgroundFill }[] = [
  {
    id: 'sunset',
    fill: {
      kind: 'gradient',
      type: 'linear',
      angle: 120,
      stops: [
        { offset: 0, color: '#FFB199' },
        { offset: 1, color: '#FF0844' },
      ],
    },
  },
  {
    id: 'mint',
    fill: {
      kind: 'gradient',
      type: 'linear',
      angle: 45,
      stops: [
        { offset: 0, color: '#A8FF78' },
        { offset: 1, color: '#78FFD6' },
      ],
    },
  },
  {
    id: 'dusk',
    fill: {
      kind: 'gradient',
      type: 'linear',
      angle: 160,
      stops: [
        { offset: 0, color: '#4E54C8' },
        { offset: 0.55, color: '#8F94FB' },
        { offset: 1, color: '#FFC3A0' },
      ],
    },
  },
  {
    id: 'peach',
    fill: {
      kind: 'gradient',
      type: 'radial',
      angle: 0,
      stops: [
        { offset: 0, color: '#FFF1E6' },
        { offset: 1, color: '#FFB4A2' },
      ],
    },
  },
  {
    id: 'lime',
    fill: {
      kind: 'gradient',
      type: 'linear',
      angle: 90,
      stops: [
        { offset: 0, color: '#E2FF4F' },
        { offset: 1, color: '#00C2A8' },
      ],
    },
  },
  {
    id: 'night',
    fill: {
      kind: 'gradient',
      type: 'radial',
      angle: 0,
      stops: [
        { offset: 0, color: '#3F4C8C' },
        { offset: 1, color: '#12121F' },
      ],
    },
  },
];
