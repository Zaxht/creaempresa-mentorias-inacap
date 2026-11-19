import { DomainError } from '../domain/rules.mjs';

// Adaptador de pruebas; el contrato se reemplaza por persistencia cloud.
export class MemoryRepository {
  constructor(records = []) {
    this.records = new Map(records.map((item) => [item.id, structuredClone(item)]));
  }

  async list() {
    return structuredClone([...this.records.values()]);
  }

  async get(id) {
    const value = this.records.get(id);
    return value ? structuredClone(value) : undefined;
  }

  async save(record, expectedVersion) {
    if (this.records.get(record.id)?.version !== expectedVersion) {
      throw new DomainError('CONFLICT', 'La mentoría cambió. Recargue antes de guardar.', 409);
    }
    this.records.set(record.id, structuredClone(record));
  }
}
