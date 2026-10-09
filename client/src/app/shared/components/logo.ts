import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" [attr.fill]="background()" />
      <rect x="10.5" y="10.5" width="11" height="11" rx="2.5" fill="#f0b45a" transform="rotate(45 16 16)" />
    </svg>
  `,
  styles: ':host { display: inline-flex; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  readonly size = input(32);
  readonly background = input('#0e4a47');
}
