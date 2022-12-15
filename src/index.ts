/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import picomatch from 'picomatch';

// Options to configure lsdirp output
interface LsdirpOptions {
  root?: string;
  flatten?: boolean;
  fullPath?: boolean;
  ignorePaths?: string[];
}

// Methods and properties for matching and ignoring paths using patterns
interface Matcher {
  isPathAllowed: picomatch.Matcher | (() => boolean);
  isIgnored: picomatch.Matcher;
  isRecursive: boolean;
}

// Default lsdirp options
const opts: Required<LsdirpOptions> = {
  root: '.',
  flatten: false,
  fullPath: false,
  ignorePaths: [],
};

// Check whether the underlying platform is windows
const isWin = process.platform === 'win32';

// This should be always ignored from any depth. Otherwise, it will
// take long time to read all subdirectories for large projects.
const AlwaysIgnore = ['**/node_modules', '**/.git'];

/**
 * The `readDirTree()` method is similar to node's `fs.readDir()` except it also
 * reads the subdirectory contents recursively.
 * @param dir path to a dir
 * @param result array of paths mapped to dir
 */
const readDirTree = (
  dir: string,
  result: Map<string, string[]>,
  matcher: Matcher
) => {
  const filePaths: string[] = [];

  // Placing this here will make the result to be ordered as dir then subdirectories.
  result.set(dir, filePaths);

  fs.readdirSync(dir, {withFileTypes: true}).forEach((dirent) => {
    const contentPath = dir + '/' + dirent.name;

    if (
      dirent.isFile() &&
      matcher.isPathAllowed(dirent.name) &&
      !matcher.isIgnored(dirent.name)
    ) {
      // Push this path if it is a file.
      filePaths.push(contentPath);
    } else if (
      dirent.isDirectory() &&
      matcher.isRecursive &&
      !matcher.isIgnored(dirent.name)
    ) {
      // Call readDirTree() with this path if it is a directory.
      readDirTree(contentPath, result, matcher);
    }
  });
};

/**
 * This method accepts two objects and overrides the target object by source object values
 * unless it is undefined or null values.
 * @param target object that will be overrided
 * @param source object that overrides the target object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mergeObj = <T extends Record<string, any>>(target: T, source: T) => {
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      target[key] = source[key] ?? target[key];
    }
  }
};

// Flattens the mapped array values in insertion order.
const flattenMapObject = (dirs: Map<string, string[]>) => {
  const list: string[] = [];
  dirs.forEach((files) => {
    list.push(...files);
  });
  return list;
};

/**
 * This method returns list of paths for all the directories in the dirs argument.
 * It also accepts optional options for configuring the output to be returned.
 * @param dirs array of directories
 * @param options optional options to configure lsdirp output
 * @returns array of paths mapped to dir or array of paths
 */
const lsdirp = (dirs: string[], options: LsdirpOptions = {}) => {
  const pathList = new Map<string, string[]>();

  // Merge the passed in options with default options
  mergeObj(opts, options);

  // Push the always ignore dirs into ignorePaths options
  AlwaysIgnore.forEach((ignored) => {
    if (opts.ignorePaths?.indexOf(ignored) === -1) {
      opts.ignorePaths.push(ignored);
    }
  });

  dirs.forEach((dir) => {
    // Try reading the path content and throw error for any of the
    // errors like ENOENT, EPERM, EACCES, etc
    try {
      // Throw exception if negated pattern is used for dir that to be traversed.
      if (dir[0] === '!') {
        throw new Error(
          `Negated (!) patterns are not allowed in dirs parameter (Found in '${dir}').\n` +
            'To ignore paths, use ignorePaths option.'
        );
      }

      const matcher: Matcher = {
        isPathAllowed: () => true,
        isIgnored: picomatch(opts.ignorePaths),
        isRecursive: true,
      };

      // Join the root and dir path
      dir = path.join(opts.root, dir);

      // Resolve the path to get the absolute path if fullpath is true
      // else return the relative path.
      dir = opts.fullPath
        ? path.resolve(process.cwd(), dir)
        : path.relative(process.cwd(), dir);

      // Replace all `\` with `/` for unix style path
      if (isWin) {
        dir = dir.replace(/\\/g, '/');
      }

      // Retrieve information about the pattern with picomatch
      const {base, glob} = picomatch.scan(dir);

      // Set matcher if glob pattern is used for current dir
      if (glob !== '') {
        matcher.isPathAllowed = picomatch(glob);
        matcher.isRecursive = glob.indexOf('**') !== -1;
      }

      // When root dir ('.') is passed to path.relative, it returns empty string.
      // Eventually, passing this empty value to readDir() will result in ENOENT
      // error. So, set dir with '.' if the base is empty string.
      dir = base || '.';

      // Call readDirTree() only if the dir is not ignored. The test string should
      // not contain leading dots as it won't be matched. So, resolve the test path
      // to absolute path before matching it for ignored paths.
      if (
        !matcher.isIgnored(path.resolve(process.cwd(), dir).replace(/\\/g, '/'))
      ) {
        readDirTree(dir, pathList, matcher);
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      console.error('\x1B[38;5;196m' + err.message + '\x1B[0m\n');
      throw error;
    }
  });
  // Return array of paths if flatten is true else mapped array of paths.
  return opts.flatten ? flattenMapObject(pathList) : pathList;
};

export default lsdirp;
