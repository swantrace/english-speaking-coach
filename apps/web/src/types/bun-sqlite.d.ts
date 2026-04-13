declare module "bun:sqlite" {
  export class Database {
    constructor(filename?: string, options?: Record<string, unknown>);
    run(sql: string, ...params: unknown[]): unknown;
  }
}
