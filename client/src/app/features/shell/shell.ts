import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiActivityService } from '../../core/services/api-activity.service';
import { AuthService } from '../../core/services/auth.service';
import { LatencyService } from '../../core/services/latency.service';
import { Logo } from '../../shared/components/logo';
import { InitialsPipe } from '../../shared/pipes/initials.pipe';

/** The frame around every signed-in page: header, navigation, progress bar. */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTooltipModule,
    Logo,
    InitialsPipe,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly latency = inject(LatencyService);
  protected readonly activity = inject(ApiActivityService);

  protected signOut(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
