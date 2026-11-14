import { describe, expect, it } from 'vitest';
import { assertMigrationHistory } from '../scripts/check-d1-migrations.mjs';

const first = { name: '0001_initial.sql', sql: 'CREATE TABLE example (id TEXT);\n' };
const second = { name: '0002_column.sql', sql: 'ALTER TABLE example ADD COLUMN title TEXT;\n' };

describe('D1 migration history guard', () => {
  it('accepts unchanged history and appended migrations', () => {
    expect(() => assertMigrationHistory([first], [first])).not.toThrow();
    expect(() => assertMigrationHistory([first, second], [first])).not.toThrow();
  });

  it('rejects edits including whitespace to existing migrations', () => {
    expect(() => assertMigrationHistory([{ ...first, sql: `${first.sql}\n` }], [first]))
      .toThrow(/must not be edited/);
  });

  it('rejects deletion and renaming', () => {
    expect(() => assertMigrationHistory([second], [first, second])).toThrow(/append-only/);
    expect(() => assertMigrationHistory([{ ...first, name: '0001_renamed.sql' }], [first]))
      .toThrow(/append-only/);
  });

  it('rejects inserting a migration before the baseline tail', () => {
    const third = { name: '0003_later.sql', sql: 'SELECT 1;' };
    expect(() => assertMigrationHistory([first, second, third], [first, third]))
      .toThrow(/append-only/);
  });

  it('rejects duplicate numbers even when filenames differ', () => {
    expect(() => assertMigrationHistory([first, { ...second, name: '0001_other.sql' }], []))
      .toThrow(/Duplicate or out-of-order/);
  });

  it('rejects out-of-order and invalid filenames', () => {
    expect(() => assertMigrationHistory([second, first], [])).toThrow(/out-of-order/);
    expect(() => assertMigrationHistory([{ name: 'change.sql', sql: '' }], []))
      .toThrow(/Invalid migration filename/);
  });

  it('rejects an empty migration directory', () => {
    expect(() => assertMigrationHistory([], [])).toThrow(/No D1 migrations/);
  });
});
