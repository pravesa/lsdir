/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/'],
  testPathIgnorePatterns: ['tests/sample_dir', 'tests/symlink'],
};
