import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ROLES, Role } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { LatencyService } from '../../core/services/latency.service';
import { describeHttpError } from '../../core/utils/http-error';
import { Logo } from '../../shared/components/logo';

interface DemoAccount {
  userId: string;
  password: string;
  role: Role;
  note: string;
}

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    Logo,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly latency = inject(LatencyService);

  /** Filled from the URL (?returnUrl=...&reason=...) by the router. */
  readonly returnUrl = input<string>();
  readonly reason = input<string>();

  protected readonly roles = ROLES;
  protected readonly demoAccounts: DemoAccount[] = [
    { userId: 'deepak', password: 'Admin@123', role: 'Admin', note: 'Sees every record, manages users' },
    { userId: 'deep', password: 'User@123', role: 'General User', note: 'Sees only his own records' },
  ];

  protected readonly form = inject(FormBuilder).nonNullable.group({
    userId: ['', Validators.required],
    password: ['', Validators.required],
    role: ['General User' as Role, Validators.required],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected useDemoAccount(account: DemoAccount): void {
    this.form.setValue({ userId: account.userId, password: account.password, role: account.role });
    this.errorMessage.set(null);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.auth
      .login(this.form.getRawValue())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl(this.safeReturnUrl()),
        error: (error: unknown) => this.errorMessage.set(describeHttpError(error)),
      });
  }

  /** Only follow return addresses inside this app, never an outside website. */
  private safeReturnUrl(): string {
    const url = this.returnUrl();
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/dashboard';
  }
}
