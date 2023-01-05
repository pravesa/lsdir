import path from 'path';
import lsdirp from '../src/index';

describe('Test suite for lsdirp options', () => {
  // Path of the sample directory for testing purpose
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

  // Change the current root dir to another dir with root option
  test('root option', () => {
    paths = lsdirp(['src'], {root: testRootDir});

    // Expect the returned value to be Map when flatten is false
    expect(paths).toBeInstanceOf(Map);

    // Get the path array for test path when flatten option is not used
    paths = paths.has(relTestPath) ? (paths.get(relTestPath) as string[]) : [];

    expect(paths).toHaveLength(5);
    // Should not contain the cwd in returned paths.
    expect(paths[0]).not.toContain(process.cwd());
    expect(paths[0]).not.toContain(absTestPath);
  });

  // Test for returned paths to be in absolute path
  test('fullPath option', () => {
    paths = lsdirp(['src'], {
      root: testRootDir,
      fullPath: true,
    });

    // Expect the returned value to be Map when flatten is false
    expect(paths).toBeInstanceOf(Map);

    // Get the path array for test path when flatten option is not used
    paths = paths.has(absTestPath) ? (paths.get(absTestPath) as string[]) : [];

    expect(paths).toHaveLength(5);
    // Expect the path to be absolute path
    expect(paths[0]).toContain(absTestPath);
  });

  // Test for returned value to be array of paths and not to be absolute path
  // when fullPath is false.
  test('flatten option', () => {
    paths = lsdirp(['src'], {
      root: testRootDir,
      flatten: true,
    });

    // Expect the returned value to be an Array
    expect(paths).toBeInstanceOf(Array);
    expect(paths).toHaveLength(6);
    expect(paths[0]).not.toContain(absTestPath);
  });

  // Test for returned value to be array of paths with ignored paths and
  // not to be absolute path when fullPath is false.
  test('ignorePaths option', () => {
    paths = lsdirp(['src'], {
      root: testRootDir,
      flatten: true,
      ignorePaths: ['**/*.js'],
    });

    expect(paths).toBeInstanceOf(Array);

    // This will not include .js file at any depth
    expect(paths).toHaveLength(5);
    expect(paths[0]).not.toContain(absTestPath);
  });

  // Test for returned value to be Map when flatten is true
  // and should not contain path prefixed to the file.
  test('prependPath option', () => {
    paths = lsdirp(['src'], {
      root: testRootDir,
      flatten: true,
      prependPath: false,
    });

    // Expect the returned value to be Map
    expect(paths).toBeInstanceOf(Map);
    const files = paths.get(relTestPath) ?? [];

    expect(files[0]).toBe('.file');
    expect(files[0]).not.toContain(relTestPath);
  });

  // Test for returned value to be Array when flatten is false
  // and should contain only file type of directory.
  test('fileType option', () => {
    paths = lsdirp(['.'], {
      root: testRootDir,
      fileType: 'Directory',
    });

    // Expect the returned value to be Array
    expect(paths).toBeInstanceOf(Array);

    expect(paths).toContain('tests/sample_dir');
    expect(paths).toHaveLength(4);
  });
});
