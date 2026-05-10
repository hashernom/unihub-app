import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.unihub.app',
  appName: 'UniHub',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: '#1E3A5F',
      androidSplashResourceName: 'splash',
      androidScaleType: 'centerCrop',
    },
  },
};

export default config;
