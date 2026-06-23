import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-list',
  imports: [],
  templateUrl: './skeleton-list.component.html',
  styleUrl: './skeleton-list.component.scss',
})
export class SkeletonListComponent {
  readonly count = input<number>(3);
  readonly type = input<'card' | 'item' | 'avatar'>('card');

  readonly items = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
