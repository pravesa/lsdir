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
  /** To read or include symlink's content, set this to `true`.
   * @default 'false' */
  allowSymlinks?: boolean;
  /** Specify the depth of sub directories to read. By default, recursive (0) read
   * is enabled. With glob patterns, `**` will set this to 0 else 1.
   * @default 0 */
  depth?: number;
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
}

// Check whether the underlying platform is windows
const isWin = process.platform === 'win32';

// This should be always ignored from any depth. Otherwise, it will
// take long time to read all subdirectories for large projects.
const AlwaysIgnore = ['**/node_modules', '**/.git'];

let inodes: Set<number> | null = null;

/**
 * The `readDirTree()` method is similar to node's `fs.readDir()` except it also
 * reads the subdirectory contents recursively.
 * @param dir path to a dir
 * @param r array of paths mapped to dir
 * @param m matcher object
 * @param d depth
 * @param p prependPath option
 * @param f fileType
 * @param s allowSymlinks
 */
const readDirTree = (
  dir: string,
  r: Map<string, string[]>,
  m: Matcher,
  d: number,
  p: boolean,
  f: number,
  s: boolean
) => {
  let depth = d;
  // Read recursively if depth is 0 else stop reading at specified depth.
  if (depth === 0 || depth-- > 1) {
    const filePaths: string[] = [];

    // Placing this here will make the result to be ordered as dir then subdirectories.
    r.set(dir, filePaths);

    fs.readdirSync(dir, {withFileTypes: true}).forEach((dirent) => {
      const contentPath = dir + '/' + dirent.name;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const type: number = (dirent as any)[
        Object.getOwnPropertySymbols(dirent)[0]
      ];

      if (!m.isIgnored(contentPath) && !m.isIgnored(dirent.name)) {
        switch (type) {
          case 1: // 'File'
            if (f === 0 && m.isPathAllowed(dirent.name)) {
              // Push this path if it is a file.
              filePaths.push(p ? contentPath : dirent.name);
            }
            break;
          case 2: // 'Directory'
            // This allows to have mapped array of dirs
            if (f === 1) {
              filePaths.push(p ? contentPath : dirent.name);
            }
            // Call readDirTree() with this path if it is a directory.
            readDirTree(contentPath, r, m, depth, p, f, s);

            break;
          case 3: // 'Symbolic Links'
            if (s) {
              // Use lstat for metadata about symlink itself
              const lstat = fs.lstatSync(contentPath);
              // Use stat for checking the file type of the symlink's target.
              const stat = fs.statSync(contentPath);

              // Check whether the inodes set has current symlink's inode entry.
              // If exist, do nothing to avoid circular loop.
              if (inodes && !inodes.has(lstat.ino)) {
                // Add the dirent's inode to the set if not exist
                inodes.add(lstat.ino);

                // Push to the filePaths list if the symlink points to file or fileType
                // option set to 'Directory'.
                if (
                  (stat.isFile() && f === 0) ||
                  (stat.isDirectory() && f === 1)
                ) {
                  filePaths.push(p ? contentPath : dirent.name);
                }
                // Read the symlink's content if the target is 'Directory'
                if (stat.isDirectory()) {
                  readDirTree(contentPath, r, m, depth, p, f, s);
                }
              }
            }
            break;
          default:
            break;
        }
      }
    });
  }
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

  inodes = new Set<number>();

  // Default lsdirp options
  const opts: Required<LsdirpOptions> = {
    root: '.',
    flatten: false,
    fullPath: false,
    ignorePaths: [],
    prependPath: true,
    fileType: 'File',
    includeParentDir: true,
    allowSymlinks: false,
    depth: 0,
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
    isIgnored: (() => {
      // eslint-disable-next-line no-useless-catch
      try {
        // Throw error if the pattern is not a valid string
        return picomatch(opts.ignorePaths, {
          // Remove leading dots from test string before matching
          // as globstar '**' won't match them. Enable the format
          // option only when fullPath is false.
          format: opts.fullPath
            ? undefined
            : (str: string) => str.replace(/^\/?(\.{1,2}\/)+/, ''),
        });
      } catch (error) {
        throw error;
      }
    })(),
  };

  // Get the drive letter of the cwd if windows.
  const driveLetter = isWin ? process.cwd().slice(0, 2) : '';

  let depth = opts.depth > 0 ? opts.depth + 1 : 0;

  dirs.forEach((dir) => {
    try {
      // Throw error if the pattern is not a valid string
      if (typeof dir !== 'string' || dir === '') {
        throw new TypeError(
          `Expected pattern to be a non-empty string but received ${
            dir === '' ? 'empty string' : typeof dir
          } (${dir})`
        );
      }
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
        depth = glob.indexOf('**') !== -1 ? depth : 2;
      }

      dir = path.posix
        .join(opts.root, path.relative('.', base))
        .replace(/\\/g, '/');

      // When fullPath is 'true', use the absolute path else resolve the relative path.
      if (opts.fullPath) {
        dir = driveLetter + path.posix.resolve('.', dir);
      } else {
        // When resolving for relative path {from} cwd {to} cwd ('.'), path.relative returns
        // empty string which will result in ENOENT error if passed to fs.readdirSync() as is.
        // So, set dir with cwd ('.') if empty string is returned.
        dir = path.posix.relative('.', dir) || '.';
      }

      const lstat = fs.lstatSync(dir);

      // Do not readDirTree() if the path is file or allowSymlinks is false or the
      // path should be ignored.
      if (
        (lstat.isDirectory() ||
          (lstat.isSymbolicLink() && opts.allowSymlinks)) &&
        !matcher.isIgnored(dir)
      ) {
        readDirTree(
          dir,
          pathList,
          matcher,
          depth,
          opts.prependPath,
          fileType,
          opts.allowSymlinks
        );
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        console.error('\x1B[38;5;196m' + err.message + '\x1B[0m\n');
        throw error;
      }
    }
  });

  inodes = null;

  // Return array of paths if flatten and prependPath are 'true' else mapped array of paths.
  return opts.flatten && opts.prependPath
    ? flattenMapObject(pathList, fileType, opts.includeParentDir)
    : pathList;
}

export = lsdirp;
