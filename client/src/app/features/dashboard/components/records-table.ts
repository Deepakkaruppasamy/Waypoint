import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, viewChild } from '@angular/core';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { PortalRecord, RecordStatus } from '../../../core/models/record.model';

const STATUS_STYLE: Record<RecordStatus, string> = {
  Open: 'tag--accent',
  'In Review': '',
  Approved: 'tag--ok',
  Closed: 'tag--neutral',
};

/** Sortable, filterable table of records. Knows nothing about where the data comes from. */
@Component({
  selector: 'app-records-table',
  imports: [DatePipe, MatTableModule, MatSortModule],
  templateUrl: './records-table.html',
  styleUrl: './records-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordsTable {
  readonly records = input.required<PortalRecord[]>();
  readonly filter = input('');
  /** Admins see whose record each row is; for general users every row is their own. */
  readonly showOwner = input(false);

  protected readonly columns = computed(() =>
    this.showOwner()
      ? ['id', 'title', 'category', 'ownerId', 'accessLevel', 'status', 'updatedAt']
      : ['id', 'title', 'category', 'accessLevel', 'status', 'updatedAt'],
  );

  protected readonly dataSource = new MatTableDataSource<PortalRecord>([]);
  private readonly sort = viewChild.required(MatSort);

  constructor() {
    // Keep Material's data source in step with the signal inputs.
    effect(() => (this.dataSource.data = this.records()));
    effect(() => (this.dataSource.filter = this.filter().trim().toLowerCase()));
    effect(() => (this.dataSource.sort = this.sort()));
  }

  protected statusClass(status: RecordStatus): string {
    return STATUS_STYLE[status];
  }
}
