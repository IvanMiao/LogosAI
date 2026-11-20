import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { Miniflare } from 'miniflare';
import { unstable_splitSqlQuery as splitSqlQuery } from 'wrangler';
import { assertMigratedFixture, assertDatabaseConstraints } from '../tests/fixtures/migration-assertions.mjs';

const PROJECT = fileURLToPath(new URL('../', import.meta.url));
const REPOSITORY = resolve(PROJECT, '..');
const MIGRATIONS_PATH = 'cloudflare/migrations';
const DATABASE = 'migration-check';
const WRANGLER = join(PROJECT, 'node_modules/wrangler/bin/wrangler.js');
const FIXTURE = fileURLToPath(new URL('../tests/fixtures/migration-baseline.sql', import.meta.url));

function git(...args) {
  return execFileSync('git', args, { cwd: REPOSITORY, encoding: 'utf8' }).trimEnd();
}

function readCurrentMigrations() {
  return readdirSync(join(REPOSITORY, MIGRATIONS_PATH), { recursive: true })
    .filter((name) => name.endsWith('.sql')).sort()
    .map((name) => ({ name, sql: readFileSync(join(REPOSITORY, MIGRATIONS_PATH, name), 'utf8') }));
}

function readBaseMigrations(ref) {
  const commit = git('rev-parse', '--verify', `${ref}^{commit}`);
  const paths = git('ls-tree', '-r', '--name-only', commit, '--', MIGRATIONS_PATH);
  return paths.split('\n').filter((path) => path.endsWith('.sql')).sort().map((path) => ({
    name: path.slice(`${MIGRATIONS_PATH}/`.length),
    // Do not trim SQL: even whitespace changes to published files are rejected.
    sql: execFileSync('git', ['show', `${commit}:${path}`], { cwd: REPOSITORY, encoding: 'utf8' }),
  }));
}

export function assertMigrationHistory(current, baseline) {
  assert.ok(current.length > 0, 'No D1 migrations found.');
  let previous = -1;
  for (const { name } of current) {
    const match = /^(\d{4})_[a-z0-9_-]+\.sql$/.exec(name);
    assert.ok(match, `Invalid migration filename: ${name}`);
    const number = Number(match[1]);
    assert.ok(number > previous, `Duplicate or out-of-order migration number: ${name}`);
    previous = number;
  }
  for (const [index, migration] of baseline.entries()) {
    assert.equal(current[index]?.name, migration.name,
      `Migration history must be append-only; missing, renamed, or displaced: ${migration.name}`);
    assert.equal(current[index].sql, migration.sql,
      `Existing migration must not be edited: ${migration.name}`);
  }
}

function invoke(database, args, expectedError) {
  const result = spawnSync(process.execPath, [WRANGLER, 'd1', ...args,
    '--config', database.config, '--local', '--persist-to', database.state], {
    cwd: dirname(database.config),
    encoding: 'utf8', timeout: 60_000, maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
  });
  if (result.error) throw result.error;
  const output = `${result.stdout}\n${result.stderr}`;
  if (expectedError) {
    assert.notEqual(result.status, 0, `Expected SQL failure: ${args.join(' ')}`);
    assert.match(output, expectedError);
  } else {
    assert.equal(result.status, 0, `Wrangler ${args[0]} failed:\n${output}`);
  }
  return result.stdout;
}

function createSqlExecutor(database) {
  let runtime;
  async function dispose() {
    await runtime?.dispose();
    runtime = undefined;
  }
  async function query(sql) {
    // Match Wrangler's local execute runtime, persistence layout, and SQL splitting.
    runtime ??= new Miniflare({
      modules: true, script: '', resourcePersistencePath: join(database.state, 'v3'),
      d1Databases: { DATABASE: '00000000-0000-0000-0000-000000000001' },
    });
    const db = await runtime.getD1Database('DATABASE');
    const results = await db.batch(splitSqlQuery(sql).map((statement) => db.prepare(statement)));
    return results.map((statement) => (statement.results ?? []).map((row) => Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, Array.isArray(value) ? `[${value.join(', ')}]` : value]),
    )));
  }
  return { query, dispose };
}

function createDatabase(root, label) {
  const folder = join(root, label);
  mkdirSync(join(folder, 'migrations'), { recursive: true });
  const database = { config: join(folder, 'wrangler.json'), state: join(folder, 'state') };
  // This isolated config has no production bindings, assets, or secret files.
  writeFileSync(database.config, JSON.stringify({
    name: 'logosai-migration-check', compatibility_date: '2026-08-08',
    d1_databases: [{ binding: 'DB', database_name: DATABASE,
      database_id: '00000000-0000-0000-0000-000000000001', migrations_dir: 'migrations' }],
  }));
  const executor = createSqlExecutor(database);
  async function apply(expectedError) {
    await executor.dispose();
    return invoke(database, ['migrations', 'apply', DATABASE], expectedError);
  }
  return {
    folder,
    apply,
    query: executor.query,
    seed: () => executor.query(readFileSync(FIXTURE, 'utf8')),
    expectFailure: (sql, pattern) => assert.rejects(executor.query(sql),
      (error) => { assert.match(String(error.cause?.message ?? error.message), pattern); return true; }),
    expectMigrationFailure: apply,
    dispose: executor.dispose,
  };
}

function writeMigrations(database, migrations) {
  for (const { name, sql } of migrations) {
    writeFileSync(join(database.folder, 'migrations', name), sql);
  }
}

async function seedDatabase(database, migrations) {
  await database.seed();
  if (migrations.some(({ name }) => name === '0002_reader_appearance.sql')) {
    await database.query(`UPDATE workspace_preferences SET reader_font_linked =
      CASE WHEN reader_font_family = close_reading_font_family THEN 1 ELSE 0 END`);
  }
}

async function snapshot(database) {
  const [schema] = await database.query(`
    SELECT type, name, tbl_name, sql FROM sqlite_schema
    WHERE name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*'
    ORDER BY type, name;
  `);
  const tables = schema.filter(({ type }) => type === 'table');
  const contents = await database.query(tables.map(({ name }) =>
    `SELECT * FROM "${name.replaceAll('"', '""')}"`).join(';'));
  // Compare the same database before/after an operation, without assuming its columns or row order.
  return { schema, contents: contents.map((rows) => rows.map((row) => JSON.stringify(row)).sort()) };
}

async function assertApplied(database, migrations) {
  const [applied, violations] = await database.query(
    'SELECT name FROM d1_migrations ORDER BY id; PRAGMA foreign_key_check',
  );
  assert.deepEqual(applied.map(({ name }) => name), migrations.map(({ name }) => name));
  assert.deepEqual(violations, [], 'Foreign key violations after migration.');
}

async function checkUpgrade(database, label, initial, current) {
  writeMigrations(database, initial);
  if (initial.length) {
    await database.apply();
    await seedDatabase(database, initial);
  }
  writeMigrations(database, current);
  await database.apply();
  if (!initial.length) await seedDatabase(database, current);
  await assertApplied(database, current);
  await assertMigratedFixture(database);
  const before = await snapshot(database);
  await database.apply();
  assert.deepEqual(await snapshot(database), before, 'Repeated apply changed data or migration records.');
  await assertDatabaseConstraints(database);
  console.log(`PASS ${label}: ${current.length} migrations, data, constraints, repeat apply`);
  return database;
}

async function checkFailedMigration(database, current) {
  const before = await snapshot(database);
  const migration = { name: '9999_ci_failure_probe.sql', sql: `
    CREATE TABLE "__ci_failure_probe" (id INTEGER PRIMARY KEY);
    INSERT INTO "__ci_failure_probe" (id) VALUES (1);
    INSERT INTO "__ci_failure_probe" (id) VALUES (1);
  ` };
  assert.ok(!current.some(({ name }) => name === migration.name));
  writeMigrations(database, [migration]);
  await database.expectMigrationFailure(/UNIQUE constraint failed/);
  assert.deepEqual(await snapshot(database), before, 'Failed migration left writes or an applied record.');
  console.log('PASS failed migration: partial writes rolled back; earlier migrations retained');
}

function upgradeCases(current, baseline) {
  const cases = new Map([['fresh', []]]);
  for (const checkpoint of ['0001_auth_and_reading.sql', '0003_reading_revision_guards.sql']) {
    const end = current.findIndex(({ name }) => name === checkpoint);
    assert.ok(end >= 0, `Missing historical regression checkpoint: ${checkpoint}`);
    cases.set(`after-${checkpoint.slice(0, 4)}`, current.slice(0, end + 1));
  }
  if (baseline.length) cases.set('base-ref', baseline);
  return cases;
}

async function main() {
  const { values } = parseArgs({ options: { 'base-ref': { type: 'string' } } });
  const baseRef = values['base-ref'] ?? process.env.MIGRATION_BASE_REF ?? 'origin/main';
  const current = readCurrentMigrations();
  const baseline = readBaseMigrations(baseRef);
  assertMigrationHistory(current, baseline);
  console.log(`PASS append-only migration history against ${baseRef}`);
  const root = mkdtempSync(join(tmpdir(), 'logosai-d1-migrations-'));
  let database;
  try {
    for (const [label, initial] of upgradeCases(current, baseline)) {
      await database?.dispose();
      database = createDatabase(root, label);
      await checkUpgrade(database, label, initial, current);
    }
    await checkFailedMigration(database, current);
  } finally {
    await database?.dispose();
    rmSync(root, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
