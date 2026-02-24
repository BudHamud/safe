import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gastoscajafuerte.app',
  appName: 'CajaFuerte',
  webDir: 'public',
  server: {
    url: 'https://zafe.vercel.app',
    cleartext: true
  }
};

export default config;
