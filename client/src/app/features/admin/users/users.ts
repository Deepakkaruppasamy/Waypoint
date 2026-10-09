import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, finalize, switchMap, tap } from 'rxjs';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { describeHttpError } from '../../../core/utils/http-error';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/components/confirm-dialog';
import { InitialsPipe } from '../../../shared/pipes/initials.pipe';
import { UserDialog, UserDialogData } from './user-dialog';

@Component({
  selector: 'app-users',
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    InitialsPipe,
  ],
  templateUrl: './users.html',
  styleUrl: './users.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Users {
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly users = rxResource({ stream: () => this.userService.list() });
  protected readonly columns = ['name', 'email', 'department', 'role', 'createdAt', 'actions'];

  /** Id of the row that is being deleted right now, so only that row shows a spinner. */
  protected readonly deletingId = signal<string | null>(null);

  protected readonly describeError = describeHttpError;

  protected isSelf(user: User): boolean {
    return user.id === this.auth.user()?.id;
  }

  protected add(): void {
    this.openDialog({ user: null }).subscribe((created) => {
      this.users.update((list) => [...(list ?? []), created]);
      this.notify(`${created.name} was added.`);
    });
  }

  protected edit(user: User): void {
    this.openDialog({ user }).subscribe((saved) => {
      this.users.update((list) => (list ?? []).map((u) => (u.id === saved.id ? saved : u)));
      this.auth.refreshUser(saved);
      this.notify(`${saved.name} was updated.`);
    });
  }

  protected remove(user: User): void {
    const data: ConfirmDialogData = {
      title: `Remove ${user.name}?`,
      message: `The account “${user.userId}” and its records will be deleted. This cannot be undone.`,
      confirmLabel: 'Remove user',
    };

    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { data, width: '420px' })
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        tap(() => this.deletingId.set(user.id)),
        switchMap(() => this.userService.remove(user.id).pipe(finalize(() => this.deletingId.set(null)))),
      )
      .subscribe({
        next: () => {
          this.users.update((list) => (list ?? []).filter((u) => u.id !== user.id));
          this.notify(`${user.name} was removed.`);
        },
        error: (error: unknown) => this.notify(describeHttpError(error)),
      });
  }

  /** Opens the add/edit form. Emits the saved user, or nothing if the form was cancelled. */
  private openDialog(data: UserDialogData) {
    return this.dialog
      .open<UserDialog, UserDialogData, User>(UserDialog, { data, width: '520px', disableClose: true })
      .afterClosed()
      .pipe(filter((saved): saved is User => !!saved));
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 4000 });
  }
}
