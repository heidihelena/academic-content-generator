import type { Config } from 'jest';

/**
 * Jest + ts-jest config. ts-jest honors the project's tsconfig (decorators +
 * emitDecoratorMetadata), so NestJS DI works in tests without extra setup.
 */
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '\\.(spec|e2e-spec)\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.module.ts'],
  // Optional native/cloud drivers aren't installed in CI; the suite uses the
  // in-memory driver, so nothing here touches better-sqlite3 / pg.
  testTimeout: 15000,
};

export default config;
