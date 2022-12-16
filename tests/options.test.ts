import path from 'path';
import lsdirp from '../src/index';

describe('', () => {
  // Sample directory for testing purpose
  const testRootDir = 'tests/sample_dir';

  let testPath: string,
    absTestPath: string,
    relTestPath: string,
    paths: string[] | Map<string, string[]>;

  // Convert windows path separator to posix style
  const toPosixSlash = (fsPath: string) => {
    return process.platform === 'win32' ? fsPath.replace(/\\/g, '/') : fsPath;
  };

  beforeAll(() => {
    // Dir path that is used for testing
    testPath = path.join(testRootDir, 'src');

    // Resolve relative and absolute path
    absTestPath = toPosixSlash(path.resolve('.', testPath));
    relTestPath = toPosixSlash(path.relative('.', testPath));
  });

  // Change the current root dir with root option
  test('root option', () => {
    paths = lsdirp(['src'], {root: testRootDir});

    // Get the path array for test path when flatten option is not used
    paths = paths.has(relTestPath) ? (paths.get(relTestPath) as string[]) : [];

    expect(paths).toHaveLength(5);
    expect(paths[0]).toContain(relTestPath);
  });

  // Test for returned paths to be in absolute path
  test('fullPath option', () => {
    paths = lsdirp(['src'], {
      root: testRootDir,
      fullPath: true,
    });

    // Get the path array for test path when flatten option is not used
    paths = paths.has(absTestPath) ? (paths.get(absTestPath) as string[]) : [];

    expect(paths).toHaveLength(5);
    expect(paths[0]).toContain(absTestPath);
  });

  // Test for returned paths to be relative path
  test('flatten option', () => {
    paths = lsdirp(['src'], {
      root: testRootDir,
      flatten: true,
    });

    // Expect the returned value to be an Array
    expect(paths).toBeInstanceOf(Array);
    expect(paths).toHaveLength(6);
  });

  test('ignorePaths option', () => {
    paths = lsdirp(['src'], {
      root: testRootDir,
      flatten: true,
      ignorePaths: ['**/*.js'],
    });

    expect(paths).toBeInstanceOf(Array);

    // This will not include .js file at any depth
    expect(paths).toHaveLength(5);
    expect(paths[0]).toContain(relTestPath);
  });
});
