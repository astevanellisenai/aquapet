// Carrega Twind no navegador via ESM CDN
import { install } from 'https://esm.sh/@twind/core@1.1.3';
import presetTailwind from 'https://esm.sh/@twind/preset-tailwind@1.1.3';
import { config } from '/js/twind-theme.js';

install({ ...config, presets: [presetTailwind()] });
