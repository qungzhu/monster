import type { CapacitorConfig } from '@capacitor/cli';

// Native shell (Android / iOS). The UI is served from the device; API calls
// go to VITE_API_BASE (see src/utils/apiBase.ts and npm run build:native).
const config: CapacitorConfig = {
  appId: 'com.furrypal.app',
  appName: '毛茸伙伴',
  webDir: 'dist-native',
  backgroundColor: '#0b1530',
};

export default config;
