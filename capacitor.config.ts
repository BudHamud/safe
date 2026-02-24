import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gastoscajafuerte.app',
  appName: 'CajaFuerte',
  webDir: 'public',
  server: {
    url: 'http://192.168.68.54:3000',
    cleartext: true
  }
};

export default config;
