import { DatabaseSync } from 'node:sqlite';
import { DomainError } from '../domain/rules.mjs';

export class SqliteRepository {
  constructor(path, records = []) {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS mentorias (
        id TEXT PRIMARY KEY,
        mentor_user_id TEXT NOT NULL,
        mentee_user_id TEXT NOT NULL,
        status TEXT NOT NULL,
        version INTEGER NOT NULL CHECK (version >= 0)
      );
      CREATE TABLE IF NOT EXISTS sesiones (
        mentoria_id TEXT NOT NULL REFERENCES mentorias(id),
        number INTEGER NOT NULL CHECK (number BETWEEN 1 AND 6),
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        summary TEXT NOT NULL CHECK (length(trim(summary)) BETWEEN 1 AND 2000),
        PRIMARY KEY (mentoria_id, number)
      );
    `);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const record of records) {
        const result = this.db.prepare(`
          INSERT OR IGNORE INTO mentorias VALUES (?, ?, ?, ?, ?)
        `).run(record.id, record.mentorUserId, record.menteeUserId, record.status, record.version);
        if (result.changes) this.writeSessions(record);
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      this.db.close();
      throw error;
    }
  }

  writeSessions(record) {
    const insert = this.db.prepare('INSERT INTO sesiones VALUES (?, ?, ?, ?, ?)');
    for (const session of record.sessions) {
      insert.run(record.id, session.number, session.date, session.status, session.summary);
    }
  }

  map(row) {
    if (!row) return undefined;
    return {
      id: row.id, mentorUserId: row.mentor_user_id, menteeUserId: row.mentee_user_id,
      status: row.status, version: row.version,
      sessions: this.db.prepare(`
        SELECT number, date, status, summary FROM sesiones WHERE mentoria_id = ? ORDER BY number
      `).all(row.id).map((session) => ({ ...session })),
    };
  }

  async list() {
    return this.db.prepare('SELECT * FROM mentorias ORDER BY id').all().map((row) => this.map(row));
  }

  async get(id) {
    return this.map(this.db.prepare('SELECT * FROM mentorias WHERE id = ?').get(id));
  }

  async save(record, expectedVersion) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = this.db.prepare(`
        UPDATE mentorias SET status = ?, version = version + 1 WHERE id = ? AND version = ?
      `).run(record.status, record.id, expectedVersion);
      if (!result.changes || record.version !== expectedVersion + 1) {
        throw new DomainError('CONFLICT', 'La mentoria cambio. Recargue antes de guardar.', 409);
      }
      // Version y sesiones se confirman juntas; una restriccion fallida revierte ambas.
      this.db.prepare('DELETE FROM sesiones WHERE mentoria_id = ?').run(record.id);
      this.writeSessions(record);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  close() {
    this.db.close();
  }
}
