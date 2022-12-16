# lsdirp

![npm](https://img.shields.io/npm/v/lsdirp) ![NPM](https://img.shields.io/npm/l/lsdirp) ![npm bundle size](https://img.shields.io/bundlephobia/minzip/lsdirp)

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

## Options

list of available options,

```ts
{
  root: string,
  fullpath: boolean,
  flatten: boolean,
  ignorePaths: string[],
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
│   └── main.ts
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

By default, lsdirp method returns paths relative to the root. For absolute path, set this option to true.

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

By default, lsdirp method returns array of paths mapped to each dir and subdirectory. With flatten 'true', the returned value will be array of all matched file paths.

```ts
// cwd -> project-1

lsdirp(['src'], {flatten: true});
// returns [ 'src/somefile.ts', 'src/index.ts' ]
```

**Note:** By default, depending on the glob pattern, the mapped dir might contain empty array. But in flattened mode, only matched paths are returned.

### `ignorePaths`

**default : `['**/node_modules', '**/.git']`**</br>

By default, lsdirp ignores node_modules and .git folder at any depth of the directory tree. Additionally, to ignore any file or directory, add it to the array list. This accepts both string and glob pattern.

```ts
// cwd -> project-1

lsdirp(['src/!in*.ts']);
// returns [ 'src/index.ts' ]

// or

// This is more flexible than the above one.
lsdirp(['src'], {ignorePaths: ['some*.ts']});
// returns [ 'src/index.ts' ]
```

**Note:** Negation (!) is not allowed at prefix of elements in directories argument. eg: ['!src/index.ts']

### Glob Patterns

This library uses [picomatch](https://github.com/micromatch/picomatch) for matching files and directories with glob patterns. One of the best and popular library for working with glob patterns. It is faster and accurate at matching patterns.

Refer picomatch's [Globbing features](https://github.com/micromatch/picomatch#globbing-features) for supported patterns to be used with `lsdirp`.

**Note:** `lsdirp` sets the recursion to false, if the glob pattern doesn't contain `**` pattern.
