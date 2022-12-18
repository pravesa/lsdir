import lsdirp from '../src';

describe('Test suite for lsdirp without using glob', () => {
  // Path of the sample directory for testing purpose
  const testRootDir = 'tests/sample_dir';

  let paths: string[] | Map<string, string[]>;

  // Test that error is not thrown for "." when fullPath is false
  test('should not throw error for "." when fullPath is false', () => {
    // Error will not be caught if not wraped in a function
    expect(() => lsdirp(['**'], {flatten: true})).not.toThrow();
  });

  // Test for files to be listed recursively excluding dot files
  test('should list files from subdirectories recursively excl. dot files', () => {
    paths = lsdirp(['**'], {root: testRootDir, flatten: true});

    expect(paths).toHaveLength(9);
  });

  // Test for files to be listed recursively including dot files
  test('should list files from subdirectories recursively incl. dot files', () => {
    paths = lsdirp(['**/(.)?*'], {root: testRootDir, flatten: true});

    expect(paths).toHaveLength(11);
  });

  // Test for error to be thrown and ignored from reading when passed arg prefixed with (!).
  test('should warn and ignore from reading when passed arg prefixed with (!)', () => {
    const spyConsoleWarn = jest
      .spyOn(global.console, 'warn')
      .mockImplementation(() => undefined);

    paths = lsdirp(['!src/**'], {root: testRootDir, flatten: true});

    expect(spyConsoleWarn).toHaveBeenCalled();
    expect(paths).toHaveLength(0);

    spyConsoleWarn.mockRestore();
  });

  // Test for error to be thrown and ignored from reading when passed arg prefixed with (!).
  test('should not warn and ignore all files that matches with (!)', () => {
    const spyConsoleWarn = jest
      .spyOn(global.console, 'warn')
      .mockImplementation(() => undefined);

    paths = lsdirp(['utils/!(*.js)'], {root: testRootDir, flatten: true});

    expect(spyConsoleWarn).not.toHaveBeenCalled();
    expect(paths).toHaveLength(1);

    spyConsoleWarn.mockRestore();
  });

  // Test for files to be ignored excl. dot files if matches the negated (!) pattern.
  test('should ignore files excl. dot files that match the negated (!) pattern', () => {
    paths = lsdirp(['src/**/!(*.ts)'], {root: testRootDir, flatten: true});

    expect(paths).toHaveLength(3);
  });

  // Test for files to be ignored incl. dot files if matches the negated (!) pattern.
  test('should ignore files incl. dot files that match the negated (!) pattern', () => {
    paths = lsdirp(['src/**/*.!(ts)'], {root: testRootDir, flatten: true});

    expect(paths).toHaveLength(2);
  });

  // Test for ENOTDIR error to be not thrown when passed arg contains ** and is file.
  test('should not throw ENOTDIR error if passed arg contains ** and is file', () => {
    const spyConsoleError = jest
      .spyOn(global.console, 'error')
      .mockImplementation(() => undefined);

    // Error will not be caught if not wraped in a function
    expect(() => lsdirp(['src/**/file.js'], {root: testRootDir})).not.toThrow(
      /ENOTDIR/
    );
    expect(spyConsoleError).not.toHaveBeenCalled();

    spyConsoleError.mockRestore();
  });

  // Test for files to be listed that matches the pattern.
  test('should list only matched files', () => {
    paths = lsdirp(['src/**/file.js'], {root: testRootDir, flatten: true});

    expect(paths).toHaveLength(1);
  });

  // Test for dir to be ignored from reading if specified in ignorePaths option from any depth.
  test('should not include dir that specified in ignorePaths option from any depth', () => {
    paths = lsdirp(['.'], {
      ignorePaths: ['**/src'],
    });
    expect(paths.has('./src')).toBe(false);
    expect(paths.has('./' + testRootDir + '/utils')).toBe(true);
    expect(paths.has('./' + testRootDir + '/src')).toBe(false);
  });

  // Test for file to be ignored that specified in ignorePaths option.
  test('should not include file that specified in ignorePaths option', () => {
    paths = lsdirp(['.'], {
      ignorePaths: ['**/utils/file.js'],
    });
    expect(paths.get('./' + testRootDir + '/utils')).toHaveLength(2);
  });

  // Test for file to be ignored that specified in ignorePaths option from any depth.
  test('should ignore all files that matches the specified pattern in ignorePaths option', () => {
    paths = lsdirp(['.'], {
      root: testRootDir,
      flatten: true,
      ignorePaths: ['**/*.js', '**/sub_dir/*.ts'],
    });
    expect(paths).toHaveLength(7);
  });
});
