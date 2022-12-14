/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';

// Options to configure lsdir output
interface LsdirOptions {
  root?: string;
  flatten?: boolean;
  fullPath?: boolean;
}

// Default lsdir options
const opts: Required<LsdirOptions> = {
  root: '.',
  flatten: false,
  fullPath: false,
};

// Check whether the underlying platform is windows
const isWin = process.platform === 'win32';

/**
 * The `readDirTree()` method is similar to node's `fs.readDir()` except it also
 * reads the subdirectory contents recursively.
 * @param dir path to a dir
 * @param result array of paths mapped to dir
 */
const readDirTree = (dir: string, result: Map<string, string[]>) => {
  const filePaths: string[] = [];

  // Placing this here will make the result to be ordered as dir then subdirectories.
  result.set(dir, filePaths);

  fs.readdirSync(dir, {withFileTypes: true}).forEach((dirent) => {
    const contentPath = dir + '/' + dirent.name;

    if (dirent.isFile()) {
      // Push this path if it is a file.
      filePaths.push(contentPath);
    } else if (dirent.isDirectory()) {
      // Call readDirTree() with this path if it is a directory.
      readDirTree(contentPath, result);
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
 * @param options optional options to configure lsdir output
 * @returns array of paths mapped to dir or array of paths
 */
const lsdir = (dirs: string[], options: LsdirOptions = {}) => {
  const pathList = new Map<string, string[]>();

  // Merge the passed in options with default options
  mergeObj(opts, options);

  dirs.forEach((dir) => {
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
    // Try reading the path content and throw error for any of the
    // errors like ENOENT, EPERM, EACCES, etc
    try {
      readDirTree(dir, pathList);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      console.error('\x1B[38;5;196m' + err.message + '\x1B[0m\n');
      throw error;
    }
  });
  // Return array of paths if flatten is true else mapped array of paths.
  return opts.flatten ? flattenMapObject(pathList) : pathList;
};

export default lsdir;
