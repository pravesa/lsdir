import path from 'path';
import lsdirp from '../src';

describe('Test suite for Paths to be always ignored', () => {
  // Path of the sample directory for testing purpose
  const testRootDir = 'tests/sample_dir';

  let absRootPath: string, paths: string[] | Map<string, string[]>;

  // Convert windows path separator to posix style
  const toPosixSlash = (fsPath: string) => {
    return process.platform === 'win32' ? fsPath.replace(/\\/g, '/') : fsPath;
  };

  beforeAll(() => {
    // Resolve relative and absolute path
    absRootPath = toPosixSlash(path.resolve('.'));
  });

  // Test for node_modules to be ignored.
  test('should ignore node_modules', () => {
    paths = lsdirp(['node_modules'], {root: testRootDir});

    expect(paths.has(testRootDir + '/node_modules')).toBe(false);
    expect(paths.size).toBe(0);
  });

  // Test for node_modules & .git to be ignored when fullPath is false.
  test('should ignore node_modules & .git when fullPath is false', () => {
    paths = lsdirp(['.']);

    expect(paths.has('./' + testRootDir + '/src')).toBe(true);

    // Ignores node_modules
    expect(paths.has('./node_modules')).toBe(false);
    expect(paths.has('./' + testRootDir + '/node_modules')).toBe(false);

    // Ignores .git
    expect(paths.has('./.git')).toBe(false);
    expect(paths.has('./' + testRootDir + '/.git')).toBe(false);
  });

  // Test for node_modules & .git to be ignored when fullPath is true.
  test('should ignore node_modules & .git when fullPath is true', () => {
    paths = lsdirp(['.'], {fullPath: true});

    expect(paths.has(absRootPath + '/' + testRootDir + '/src')).toBe(true);

    // Ignores node_modules
    expect(paths.has(absRootPath + '/node_modules')).toBe(false);
    expect(paths.has(absRootPath + '/' + testRootDir + '/node_modules')).toBe(
      false
    );

    // Ignores .git
    expect(paths.has(absRootPath + '/.git')).toBe(false);
    expect(paths.has(absRootPath + '/' + testRootDir + '/.git')).toBe(false);
  });
});
