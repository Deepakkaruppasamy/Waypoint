import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Observable, finalize } from 'rxjs';
import { ROLES, Role, User, UserChanges } from '../../../core/models/user.model';
import { UserService } from '../../../core/services/user.service';
import { describeHttpError } from '../../../core/utils/http-error';

export interface UserDialogData {
  /** The user to edit, or null to create a new one. */
  user: User | null;
}

/** At least 8 characters with a letter and a number - the same rule the API enforces. */
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

/**
 * Add / edit form for a user.
 *
 * The dialog saves by itself and only closes on success, so a server error
 * (for example "user ID already taken") appears inside the form without
 * losing what was typed.
 */
@Component({
  selector: 'app-user-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './user-dialog.html',
  styleUrl: './user-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDialog {
  private readonly userService = inject(UserService);
  private readonly dialogRef = inject<MatDialogRef<UserDialog, User>>(MatDialogRef);
  private readonly existing = inject<UserDialogData>(MAT_DIALOG_DATA).user;

  protected readonly isEdit = this.existing !== null;
  protected readonly roles = ROLES;
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    userId: [
      { value: this.existing?.userId ?? '', disabled: this.isEdit },
      [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9._-]+$/)],
    ],
    name: [this.existing?.name ?? '', Validators.required],
    email: [this.existing?.email ?? '', [Validators.required, Validators.email]],
    department: [this.existing?.department ?? '', Validators.required],
    role: [(this.existing?.role ?? 'General User') as Role, Validators.required],
    // Required for a new user; optional when editing (blank keeps the current password).
    password: [
      '',
      this.isEdit
        ? [Validators.pattern(PASSWORD_RULE)]
        : [Validators.required, Validators.pattern(PASSWORD_RULE)],
    ],
  });

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    this.buildRequest()
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (user) => this.dialogRef.close(user),
        error: (error: unknown) => this.errorMessage.set(describeHttpError(error)),
      });
  }

  private buildRequest(): Observable<User> {
    const value = this.form.getRawValue();

    if (!this.existing) return this.userService.create(value);

    const changes: UserChanges = {
      name: value.name,
      email: value.email,
      department: value.department,
      role: value.role,
    };
    if (value.password) changes.password = value.password;
    return this.userService.update(this.existing.id, changes);
  }
}
