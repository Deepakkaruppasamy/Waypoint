import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { RecordService } from '../../core/services/record.service';
import { UserService } from '../../core/services/user.service';
import { describeHttpError } from '../../core/utils/http-error';
import { ApiActivity } from '../../shared/components/api-activity';
import { InitialsPipe } from '../../shared/pipes/initials.pipe';
import { RecordsTable } from './components/records-table';

interface Permission {
  label: string;
  allowed: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, MatButtonModule, MatIconModule, ApiActivity, InitialsPipe, RecordsTable],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly recordService = inject(RecordService);

  /**
   * Two independent requests, started together as soon as the page opens.
   *
   * rxResource wraps an Observable in signals: isLoading(), error(), value().
   * Each card reads its own resource, so each one fills in the moment its
   * own response arrives - neither waits for the other.
   */
  protected readonly profile = rxResource({ stream: () => this.userService.getProfile() });
  protected readonly records = rxResource({ stream: () => this.recordService.list() });

  protected readonly loading = computed(() => this.profile.isLoading() || this.records.isLoading());
  protected readonly filter = signal('');

  protected readonly firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? '');
  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly greeting = greetingFor(new Date().getHours());

  protected readonly permissions = computed<Permission[]>(() => {
    const admin = this.isAdmin();
    return [
      { label: 'View your own records', allowed: true },
      { label: "View other people's records", allowed: admin },
      { label: 'View “Admin only” records', allowed: admin },
      { label: 'Add, edit and remove users', allowed: admin },
    ];
  });

  protected readonly describeError = describeHttpError;

  protected reload(): void {
    this.profile.reload();
    this.records.reload();
  }

  protected percent(part: number, whole: number): number {
    return whole === 0 ? 0 : Math.round((part / whole) * 100);
  }
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
