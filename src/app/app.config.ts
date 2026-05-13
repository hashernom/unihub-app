import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  isDevMode,
  importProvidersFrom,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideServiceWorker } from '@angular/service-worker';
import { IonicStorageModule } from '@ionic/storage-angular';

import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideIonicAngular({}),
    importProvidersFrom(IonicStorageModule.forRoot()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: AuthService) => () => auth.initialize(),
      deps: [AuthService],
      multi: true,
    },
  ],
};
