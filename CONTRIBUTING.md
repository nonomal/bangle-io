# Contributing

This document covers how to setup [bangle.io](http://bangle.io) locally and also a brief overview of its architecture.

> Please, note this document is work in progress :nail_care: !

## Setup

### Prerequisites

- [Nodejs](https://nodejs.org/en/download/) > 16.0

- [Yarn](https://yarnpkg.com/) v3

### Local development

- `yarn install` to install

- `yarn start` to start bangle on `localhost:4000`

- `yarn jest` to run the tests

- `yarn g:playwright-dep` to install playwright dependencies if you want to run integration testing.

- `yarn g:e2e` to run the integration tests.

- `yarn g:build-prod-serve` to start a production optimized version of bangle on `localhost:1234`.

More commands in the `package.json`.

> Sometimes when running locally, the app might get stuck on loading, this is a known issue, try reloading the page a few times.

# Architecture

The repository is divided into multiple smaller node packages which are linked to each other via `yarn`.

### Directory structure

Bangle has the following top level directories containing smaller packages.

- `extensions:`All of the first party extensions sit here. If you are fixing a bug or extending a feature, you will most likely start here.

- `lib:` The packages that are shared across the app.

- `js-lib:` Independent packages that have no awareness of bangle and have no dependency on any other part of the code.

- `app:` The core app that bootstraps everything sits here.

- `worker:` Separate directory for any code that will be run the web worker.

- `tooling:` Focused on things like integration tests, scripts etc. Any code in here is not bundled in the production app.

### Extension file structure

Each extension must have the following top level files:

- `index.ts` The entry point for the extension.
- `style.css` A single css file containing all the styles of your extension.
- `style.ts`: A file which `imports` the `style.css` file.

**Please note** your `index.ts` file should not import `style.ts`. This restriction exists to keep the imports within the realms of standard Javascript.

### CSS conventions

You are expected to write your own css and not rely on any of the css classes available throughout Bangle as they are internal and subject to change.

### Contexts

Bangle uses a concept of context for sharing state across the extensions.

- `editor-manager-context` exposes the Editors.
- `extension-registry-context`: the glue code for the extension. If you are developing an extension you can ignore this.
- `page-context` for pending writes, page lifecycle, navigation etc.
- `serial-operation-context` for dispatching serial Operations.
- `ui-context` provides the UI state information, like sidebars, palettes etc.
- `workspace-context`: place for centralized workspace ops like note creation, renaming, deletion etc.

## Operations

Operations are used across bangle to dispatch complex state changes with the help of actions.

Operations exist in two different forms:

- Functional operations have the signature `(...parms) => (state, dispatch, store?) => {}`. 
- Serial operations, similar to functional operation but have a serializable notation so that they can be executed in contexts where functions are not possible, for example the `Operation Palette` UI. See this [extension's code](https://github.com/bangle-io/bangle-io/blob/dev/extensions/core-actions/index.ts) to get a rough idea.


## WsPaths

A file path in Bangle is denoted by a string with the following syntax:

- `wsPath`: A unique string representing a file and its workspace. `hello:foo/bar.md`.

- `wsName`: Workspace name, in `hello:foo/bar.md` `hello` is the workspace name.

## How editor opens a file?

1. User somehow clicks on a file and triggers pushWsPath
2. That then becomes a wsPath derived from history.location
3. An `<Editor />` gets mounted with new wsPath
4. At this point the editor is loaded with empty doc.
5. `@bangle.dev/collab-extension`'s collab-client sets up communication with worker thread.
6. Worker thread has a collab-manager instance running.
7. When collab-client calls getDocument, it is passed on to worker thread's manager
8. manager calls localDisk.getItem to get the document from indexdb.
9. Collab-client plugin refreshes the editor with correct content.