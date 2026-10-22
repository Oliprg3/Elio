import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elioplus.tv',
  appName: 'elio+',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
