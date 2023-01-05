/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import picomatch from 'picomatch';

enum FileType {
  File = 0,
  Directory = 1,
}

// Options to configure lsdirp output
interface LsdirpOptions {
  /** Change the root dir from where to read directory content's path.
   * @default '.' or 'process.cwd()'
   * @see https://github.com/pravesa/lsdirp#root */
  root?: string;
  /** If true, array of paths will be returned. This option won't work
   * when prependPath option is 'false'.
   * @default 'false'
   * @see https://github.com/pravesa/lsdirp#flatten */
  flatten?: boolean;
  /** If true, the returned paths will be resolved to absolute path.
   * @default 'false'
   * @see https://github.com/pravesa/lsdirp#fullpath */
  fullPath?: boolean;
  /** To ignore any files or directories, add a list of patterns excluding
   * default ones. This might be tricky one, but it will be easier once get
   * used to it.
   * @default '["**\/node_modules", "**\/.git"]'
   * @see https://github.com/pravesa/lsdirp#ignorepaths */
  ignorePaths?: string[];
  /** If false, the returned value will be mapped array of dirent names that
   * won't be prepended with path.
   * @default 'true' */
  prependPath?: boolean;
  /** By default, matches any path whose file type is `File` recursively
   * or not depending on the pattern. If `Directory`, it will match only
   * path that is directory type.
   * @default 'File' */
  fileType?: keyof typeof FileType;
  /** Whether to include parent dir in the flatten array or not when fileType
   * is `Directory`.
   * @default 'true' */
  includeParentDir?: boolean;
}

// Overloaded type for lsdirp options where flatten is true
type _LsdirpOptions = LsdirpOptions & {
  flatten: true;
  prependPath?: true;
};

// Methods and properties for matching and ignoring paths using patterns
interface Matcher {
  isPathAllowed: picomatch.Matcher | (() => boolean);
  isIgnored: picomatch.Matcher;
  isRecursive: boolean;
}

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
  matcher: Matcher,
  prependPath: boolean,
  fileType: number
) => {
  const filePaths: string[] = [];

  // Placing this here will make the result to be ordered as dir then subdirectories.
  result.set(dir, filePaths);

  fs.readdirSync(dir, {withFileTypes: true}).forEach((dirent) => {
    const contentPath = dir + '/' + dirent.name;

    if (!matcher.isIgnored(contentPath) && !matcher.isIgnored(dirent.name)) {
      if (
        dirent.isFile() &&
        fileType === 0 &&
        matcher.isPathAllowed(dirent.name)
      ) {
        // Push this path if it is a file.
        filePaths.push(prependPath ? contentPath : dirent.name);
      } else if (dirent.isDirectory() && matcher.isRecursive) {
        // This allows to have mapped array of dirs
        if (fileType === 1) {
          filePaths.push(prependPath ? contentPath : dirent.name);
        }
        // Call readDirTree() with this path if it is a directory.
        readDirTree(contentPath, result, matcher, prependPath, fileType);
      }
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

// Flattens the mapped array values in file system tree order.
const flattenMapObject = (
  pathList: Map<string, string[]>,
  fileType: number,
  includeParentDir: boolean
) => {
  // Includes parent dir in the returned array
  if (fileType === 1 && includeParentDir) {
    const list = new Set<string>();
    pathList.forEach((subDirs, dir) => {
      list.add(dir);
      subDirs.forEach((dir) => {
        list.add(dir);
      });
    });

    return Array.from(list);
  }

  const list: string[] = [];
  pathList.forEach((paths) => {
    list.push(...paths);
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
function lsdirp(dirs: string[], options: _LsdirpOptions): string[];
function lsdirp(dirs: string[], options?: LsdirpOptions): Map<string, string[]>;
function lsdirp(dirs: string[], options: LsdirpOptions = {}) {
  const pathList = new Map<string, string[]>();

  // Default lsdirp options
  const opts: Required<LsdirpOptions> = {
    root: '.',
    flatten: false,
    fullPath: false,
    ignorePaths: [],
    prependPath: true,
    fileType: 'File',
    includeParentDir: true,
  };

  // Merge the passed in options with default options
  mergeObj(opts, options);

  // Push the always ignore dirs into ignorePaths options
  AlwaysIgnore.forEach((ignored) => {
    if (opts.ignorePaths?.indexOf(ignored) === -1) {
      opts.ignorePaths.push(ignored);
    }
  });

  // Set the file type that to be matched
  const fileType = FileType[opts.fileType];

  const matcher: Matcher = {
    isPathAllowed: () => true,
    isIgnored: picomatch(opts.ignorePaths, {
      // Remove leading dots from test string before matching
      // as globstar '**' won't match them. Enable the format
      // option only when fullPath is false.
      format: opts.fullPath
        ? undefined
        : (str: string) => str.replace(/^\/?(\.{1,2}\/)+/, ''),
    }),
    isRecursive: true,
  };

  // Get the drive letter of the cwd if windows.
  const driveLetter = isWin ? process.cwd().slice(0, 2) : '';

  dirs.forEach((dir) => {
    // Try reading the path content and throw error for any of the
    // errors like ENOENT, EPERM, EACCES, etc
    try {
      // Warn and ignore that dir from reading contents if negated pattern is used as prefix.
      if (dir[0] === '!') {
        console.warn(
          '\x1B[38;5;227m' +
            `Patterns in dirs parameter should not be prefixed with (!) negation (Found in '${dir}').\n` +
            'To ignore paths from listing, add list of patterns in ignorePaths option where negation is allowed.\n' +
            '\nSee Documentation: https://github.com/pravesa/lsdirp#lsdirp' +
            '\x1B[0m\n'
        );
        return;
      }

      // Retrieve information about the pattern with picomatch
      const {base, glob} = picomatch.scan(dir);

      // Set matcher if glob pattern is used for current dir
      if (glob !== '') {
        matcher.isPathAllowed = picomatch(glob);
        matcher.isRecursive = glob.indexOf('**') !== -1;
      }

      dir = path.posix.join(opts.root, base).replace(/\\/g, '/');

      // When fullPath is 'true', use the absolute path else resolve the relative path.
      if (opts.fullPath) {
        dir = driveLetter + path.posix.resolve('.', dir);
      } else {
        // When resolving for relative path {from} cwd {to} cwd ('.'), path.relative returns
        // empty string which will result in ENOENT error if passed to fs.readdirSync() as is.
        // So, set dir with cwd ('.') if empty string is returned.
        dir = path.posix.relative('.', dir) || '.';
      }

      // Call readDirTree() only if the dir is not ignored. The test string should
      // not contain leading dots as it won't be matched. So, resolve the test path
      // to absolute path before matching it for ignored paths.
      if (!matcher.isIgnored(dir)) {
        readDirTree(dir, pathList, matcher, opts.prependPath, fileType);
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      console.error('\x1B[38;5;196m' + err.message + '\x1B[0m\n');
      throw error;
    }
  });
  // Return array of paths if flatten and prependPath are 'true' else mapped array of paths.
  return opts.flatten && opts.prependPath
    ? flattenMapObject(pathList, fileType, opts.includeParentDir)
    : pathList;
}

export = lsdirp;
