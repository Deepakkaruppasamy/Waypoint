import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiActivityService } from '../../core/services/api-activity.service';

/** Live list of recent API requests: what is still in flight and how long each one took. */
@Component({
  selector: 'app-api-activity',
  template: `
    @for (call of activity.calls(); track call.id) {
      <div class="call" [class]="call.state">
        <span class="method mono">{{ call.method }}</span>
        <span class="path mono" [title]="call.path">{{ call.path }}</span>
        <span class="result">
          @switch (call.state) {
            @case ('pending') {
              <span class="dots" aria-label="Waiting for response"><i></i><i></i><i></i></span>
            }
            @case ('cancelled') {
              cancelled
            }
            @default {
              <strong>{{ call.httpStatus }}</strong> · {{ call.durationMs }} ms
            }
          }
        </span>
      </div>
    } @empty {
      <p class="muted empty">No requests yet.</p>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 6px;
    }

    .call {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 10px;
      background: var(--mat-sys-surface-container);
      font-size: 0.86rem;
      border-left: 3px solid var(--wp-ok);
    }

    .call.pending {
      border-left-color: var(--wp-accent);
      background: var(--wp-accent-soft);
    }

    .call.error {
      border-left-color: var(--wp-danger);
    }

    .call.cancelled {
      border-left-color: var(--wp-line);
      color: var(--wp-muted);
    }

    .method {
      font-weight: 700;
    }

    .path {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .result {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .dots {
      display: inline-flex;
      gap: 4px;
    }

    .dots i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--wp-accent-ink);
      animation: pulse 1s ease-in-out infinite;
    }

    .dots i:nth-child(2) {
      animation-delay: 0.15s;
    }

    .dots i:nth-child(3) {
      animation-delay: 0.3s;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 0.25;
      }
      50% {
        opacity: 1;
      }
    }

    .empty {
      font-size: 0.88rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiActivity {
  protected readonly activity = inject(ApiActivityService);
}
