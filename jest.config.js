const nextJest = require('next/jest'); // eslint-disable-line @typescript-eslint/no-require-imports

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/tests/e2e/'],
};

module.exports = createJestConfig(customJestConfig);
