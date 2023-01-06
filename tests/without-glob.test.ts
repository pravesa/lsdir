import lsdirp from '../src';

describe('Test suite for using lsdirp without glob', () => {
  // Path of the sample directory for testing purpose
  const testRootDir = 'tests/sample_dir';

  let paths: string[] | Map<string, string[]>;

  // Test that error is not thrown for "." when fullPath is false
  test('should not throw error for "." when fullPath is false', () => {
    // Error will not be caught if not wraped in a function
    expect(() => lsdirp(['.'], {flatten: true})).not.toThrow();
  });

  // Test for files to be listed recursively
  test('should list files incl. subdirectories recursively', () => {
    paths = lsdirp(['.'], {root: testRootDir, flatten: true});

    expect(paths).toHaveLength(11);
  });

  // Test for error to be thrown and ignore from reading when passed arg prefixed with (!).
  test('should throw error and ignored from reading when passed arg prefixed with (!)', () => {
    const spyConsoleWarn = jest
      .spyOn(global.console, 'warn')
      .mockImplementation(() => undefined);

    paths = lsdirp(['!src'], {root: testRootDir, flatten: true});

    expect(spyConsoleWarn).toHaveBeenCalled();
    expect(paths).toHaveLength(0);

    spyConsoleWarn.mockRestore();
  });

  // Test for ENOTDIR error to be thrown when passed arg is file.
  // test('should throw ENOTDIR error if passed arg is file', () => {
  //   const spyConsoleError = jest
  //     .spyOn(global.console, 'error')
  //     .mockImplementation(() => undefined);

  //   // Error will not be caught if not wraped in a function
  //   expect(() => lsdirp(['src/file.js'], {root: testRootDir})).toThrow(
  //     /ENOTDIR/
  //   );
  //   expect(spyConsoleError).toHaveBeenCalled();

  //   spyConsoleError.mockRestore();
  // });

  // Test for dir to be ignored from reading if specified in ignorePaths option.
  test('should not include dir that specified in ignorePaths option', () => {
    paths = lsdirp(['.'], {
      root: testRootDir,
      flatten: true,
      ignorePaths: ['sub_dir'],
    });
    expect(paths).toHaveLength(10);
  });

  // Test for file to be ignored if it's rel or abs path (depending on fullPath option) is
  // specified in ignorePaths option.
  test("should not include file if it's rel or abs path is specified in ignorePaths option", () => {
    paths = lsdirp(['.'], {
      root: testRootDir,
      flatten: true,
      ignorePaths: [testRootDir + '/utils/file.js'],
    });
    expect(paths).toHaveLength(10);
  });

  // Test that symlinks is ignored.
  test('should ignore symlinks by default', () => {
    paths = lsdirp(['.'], {
      root: testRootDir,
      fileType: 'Directory',
      flatten: true,
    });
    expect(paths).toHaveLength(4);
  });

  // Test that symlinks is included when allowSymlinks is true
  test('should include symlinks if allowSymlinks option is true', () => {
    paths = lsdirp(['.'], {
      root: testRootDir,
      fileType: 'Directory',
      flatten: true,
      allowSymlinks: true,
    });
    expect(paths).toHaveLength(6);
  });

  // Test that circular loop is avoided and the target is included only once with symlinks
  test('should avoid circular loop and include only once with symlinks', () => {
    paths = lsdirp(['..'], {
      root: testRootDir,
      fileType: 'Directory',
      flatten: true,
      allowSymlinks: true,
    });
    expect(paths).toHaveLength(12);
  });
});
