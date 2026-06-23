import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ErrorHandlerService } from './core/services/error-handler.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly router = inject(Router);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly theme = inject(ThemeService);

  ngOnInit(): void {
    this.errorHandler.registerNavigator({ navigate: (commands) => this.router.navigate(commands) });
    this.theme.initializeTheme().catch(() => {
      console.warn('[App] Failed to initialize theme');
    });
  }
}
