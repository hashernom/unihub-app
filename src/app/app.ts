import { Component, inject, type OnInit, type OnDestroy } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
    ).subscribe(() => {
      // Force-hide old pages in the ionic outlet stack
      const pages = document.querySelectorAll('ion-router-outlet > .ion-page-hidden');
      pages.forEach((p: Element) => {
        (p as HTMLElement).style.display = 'none';
        (p as HTMLElement).style.visibility = 'hidden';
      });
      // Ensure current page is visible
      const active = document.querySelectorAll('ion-router-outlet > .ion-page:not(.ion-page-hidden)');
      active.forEach((p: Element) => {
        (p as HTMLElement).style.display = '';
        (p as HTMLElement).style.visibility = '';
      });
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
