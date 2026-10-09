import { Pipe, PipeTransform } from '@angular/core';

/** "Deepak Kumar" -> "DK", "Deep" -> "D". Used for the round avatar badges. */
@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  transform(name: string | null | undefined): string {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    const first = words[0]?.[0] ?? '';
    const last = words.length > 1 ? (words[words.length - 1][0] ?? '') : '';
    return (first + last).toUpperCase();
  }
}
