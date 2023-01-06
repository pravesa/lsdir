# lsdirp

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/pravesa/lsdirp/node-ci.yaml?label=test) ![npm](https://img.shields.io/npm/v/lsdirp) ![NPM](https://img.shields.io/npm/l/lsdirp)

`lsdirp` short for list(**ls**) directory(**dir**) content paths(**p**) is similar to fs.readdir() method but with the capability to read the directory recursively with or without using glob patterns.

## Usage

1. Install with npm or yarn,</br>

   ```sh
   npm install lsdirp
   # or
   yarn add lsdirp
   ```

2. Then, import the default function as follows and pass with arguments.

   Params</br>

   - `dirs` (**string[]**) - array of directories as string or glob patterns.
   - `options` (**object {}**) - lsdirp options.

   </br>

   ```ts
   // ES modules
   import lsdirp from 'lsdirp';

   // or

   // CommonJS
   const lsdirp = require('lsdirp');

   // returns map(n) {'dir_path' => ['file_paths']}
   const paths = lsdirp(['src/**/*.ts', 'utils'], options);
   ```

By passing optional options to second argument, lsdirp can be configured for desired output and format.

> **_Important :_** Always use forward slash (posix style path separator) for patterns. If patterns with windows style path separator is passed, it will be converted to posix style for further process.

## Options

list of available options,

```ts
{
  root: string,
  fullpath: boolean,
  flatten: boolean,
  ignorePaths: string[],
  prependPath: boolean,
  fileType: 'File' | 'Directory',
  includeParentDir: boolean;
  allowSymlinks: boolean;
  depth: number;
}
```

### Option description and example

```
// sample directory structure

// current working directory ---> project-1

workspace
├── project-1
│   ├── src
│   │   ├── somefile.ts
│   │   └── index.ts
│   ├── package.json
│   ├── main.ts
│   └── symlinkToSrc
│
└── project-2
    ├── src
    │   ├── anotherfile.js
    │   └── index.js
    ├── utils
    │   ├── logger.js
    │   └── index.js
    ├── package.json
    └── main.js
```

### `root`

**default : `'.'` or `process.cwd()`**</br>

Change the root dir from where to read dir contents and list all matching paths.

##### Example

```ts
// cwd -> project-1

lsdirp(['../project-2/src/**/*.js', '../project-2/utils/*.js']);

// or

lsdirp(['src/**/*.js', 'utils/*.js'], {
  root: '../project-2',
});
```

**Note:** The overrided root will be used for resolving the directory path in the list of directories to be read.

### `fullPath`

**default : `false`**</br>

By default, the returned value contains paths relative to the root. For absolute path, set this option to `true`.

##### Example

```ts
// cwd -> project-1

lsdirp(['src']);
// returns map(1) { 'src' => [ 'src/somefile.ts', 'src/index.ts' ] }

lsdirp(['src'], {fullPath: true});
// returns map(1) { 'workspace/src' => [
//                          'workspace/src/somefile.ts',
//                          'workspace/src/index.ts'
//                         ] }
```

**Note:** This is os specific. So, in windows, the full path starts with drive letter.

### `flatten`

**default : `false`**</br>

By default, lsdirp method returns array of paths mapped to each dir and subdirectory. With flatten `true`, the returned value will be array of all matched file paths. This option will have no effect when coupled with option prependPath set to `false`.

##### Example

```ts
// cwd -> project-1

lsdirp(['src'], {flatten: true});
// returns [ 'src/somefile.ts', 'src/index.ts' ]

lsdirp(['src'], {flatten: true, prependPath: false});
// returns map(1) { 'src' => [ 'somefile.ts', 'index.ts' ]}
```

**Note:** Depending on the glob pattern or contents, the returned map might contain empty array. But in flattened mode, those empty arrays are stripped.

### `ignorePaths`

**default : `['**/node_modules', '**/.git']`**</br>

This option takes array of patterns that will be used to ignore any file or directory matching that pattern. This accepts array of both string and glob pattern.

**_Important :_** Since, lsdirp uses relative or absolute path of the file / directory against the ignore path matcher, we advice you to use any of the below two methods to achieve expected result.

- #### Using `**` for matching paths to be ignored

  The `**` will match the file or directory at any depth. This is more flexible than the below one and at the same time shorter to write.

  ##### Example

  ```ts
  // cwd -> project-1

  // This will ignore all files / directories starting with 'some' at any depth in project-1.
  lsdirp(['src'], {ignorePaths: ['**/some*']});

  // This will ignore all '.ts' files at any depth from project-2 root.
  lsdirp(['.'], {root: '../project-2', ignorePaths: ['**/*.ts']});

  // This will ignore all '.ts' files in src dir only in project-2.
  lsdirp(['.'], {root: '../project-2', ignorePaths: ['**/src/*.ts']});
  ```

- #### Using `relative or absolute path`

  If `**` is not used, then to match the file / directory, we have to include the complete relative or absolute path depending on the `fullPath` option.

  ##### Example

  ```ts
  // cwd -> project-1

  // This will ignore all files starting with 'some' at any depth in project-1.
  lsdirp(['src'], {ignorePaths: ['src/some*.ts']});

  // This will ignore all '.ts' files at any depth from project-2 root.
  lsdirp(['.'], {
    root: '../project-2',
    ignorePaths: ['../project-2/*.ts'], // use relative path if fullPath is false
  });

  // This will ignore all '.ts' files at any depth from project-2 root.
  lsdirp(['.'], {
    root: '../project-2',
    fullPath: true,
    ignorePaths: ['D:/workspace/project-2/*.ts'], // use absolute path if fullPath is true
  });
  ```

### `prependPath`

**default : `true`**</br>

To get the list of names of the dirent entries without path to it, set this option to `false`.

##### Example

```ts
// cwd -> project-1

lsdirp(['src'], {prependPath: false});
// returns map(1) { 'src' => [ 'somefile.ts', 'index.ts' ]}
```

**Note:** Before `v2`, this option is `withFilePath`.

### `fileType`

**default : `File`**</br>

By default, the returned array of paths mapped to each matching dir will contain path whose type is a 'file'. To get list of directories, set `Directory` to fileType option.
This can be coupled with other options for desired result.

##### Example

```ts
// cwd -> project-1

lsdirp(['src'], {fileType: 'Directory', flatten: true});
// returns ['src']
```

### `includeParentDir`

**default : `true`**</br>

This option returns array of directory paths with passed in dir included.

##### Example

```ts
// cwd -> project-1

@default 'true'
lsdirp(['.'], {fileType: 'Directory'});
// returns ['.', './src']

lsdirp(['.'], {fileType: 'Directory', includeParentDir: false});
// returns ['./src']
```

### `allowSymlinks`

**default : `false`**</br>

This option allows the symlink paths to be included for reading if set `true`.

##### Example

```ts
// cwd -> project-1

lsdirp(['.'], {fileType: 'Directory', allowSymlinks: true});
// returns ['.', './src', './symlinkToSrc']
```

### `depth`

**default : `0`**</br>

By setting this option with any positive number, lsdirp will stop reading dir content at that specified depth of subdirectories. With glob patterns, this option will have effect only if `**` is included.

##### Example

```ts
// cwd -> project-1

lsdirp(['.'], {flatten: true, depth: 1});
// returns ['package.json', 'main.ts']
```

### Glob Patterns

This library uses [picomatch](https://github.com/micromatch/picomatch) for matching files and directories with glob patterns. One of the best and popular library for working with glob patterns. It is faster and accurate at matching patterns.

Refer picomatch's [Globbing features](https://github.com/micromatch/picomatch#globbing-features) for supported patterns to be used with `lsdirp`.

**Note:** `lsdirp` sets the recursion to false, if the glob pattern doesn't contain `**` pattern.
