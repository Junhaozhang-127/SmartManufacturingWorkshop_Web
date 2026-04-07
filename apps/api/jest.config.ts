import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@api/(.*)$': '<rootDir>/src/$1',
    '^@smw/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@smw/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
};

export default config;
