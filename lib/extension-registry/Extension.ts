import React from 'react';

import type { RawSpecs } from '@bangle.dev/core';
import type { RenderNodeViewsFunction as BangleRenderNodeViewsFunction } from '@bangle.dev/react';

import { ApplicationStore, Slice } from '@bangle.io/create-store';
import type {
  EditorWatchPluginState,
  NoteFormatProvider,
  NoteSidebarWidget,
  SerialOperationDefinitionType,
  SerialOperationHandler,
} from '@bangle.io/shared-types';
import type { BaseStorageProvider } from '@bangle.io/storage';

import { EditorPluginDefinition } from './PluginType';

const _check = Symbol();

export type RenderReactNodeViewCb = (arg: {
  nodeViewRenderArg: Parameters<BangleRenderNodeViewsFunction>[0];
}) => React.ReactNode;

export type RenderReactNodeView = {
  [k: string]: RenderReactNodeViewCb;
};

export interface EditorConfig {
  name: string;
  specs?: RawSpecs[];
  plugins?: EditorPluginDefinition[];
  highPriorityPlugins?: EditorPluginDefinition[];
  markdownItPlugins?: any[];
  ReactComponent?: React.ComponentType<{
    key: string;
  }>;
  renderReactNodeView?: RenderReactNodeView;
  watchPluginStates?: EditorWatchPluginState[];
}

export type RegisterSerialOperationHandlerType = (
  cb: SerialOperationHandler,
) => () => void;

export type SerialOperationHandler2<
  OpType extends SerialOperationDefinitionType,
> = (
  bangleStore: ApplicationStore,
  abortSignal: AbortSignal,
) => {
  destroy?: () => void;
  handle: (
    serialOperation: OpType,
    payload: any,
    store: ApplicationStore,
  ) => boolean | void;
};
export interface ApplicationConfig<
  T = any,
  OpType extends SerialOperationDefinitionType = any,
> {
  name: string;
  ReactComponent?: React.ComponentType<{
    key: string;
  }>;
  operations?: Array<OpType>;
  sidebars?: Array<SidebarType>;
  operationHandler?: SerialOperationHandler2<OpType>;
  noteSidebarWidgets?: Array<NoteSidebarWidget>;
  slices?: Array<Slice<any>>;
  storageProvider?: BaseStorageProvider;
  noteFormatProvider?: NoteFormatProvider;
  // return true if the error was handled by your callback
  // and false if it cannot be handled
  onStorageError?: (
    error: Error & { code: string },
    store: ApplicationStore,
  ) => boolean;
}

export interface SidebarType {
  activitybarIcon: JSX.Element;
  hint: string;
  name: `sidebar::${string}`;
  ReactComponent: React.ComponentType<{}>;
  title: string;
}

interface Config<T, OpType extends SerialOperationDefinitionType> {
  application: ApplicationConfig<T, OpType>;
  editor: EditorConfig;
  initialState?: any;
  name: string;
}

export class Extension<
  T = unknown,
  OpType extends SerialOperationDefinitionType = any,
> {
  name: string;
  editor: EditorConfig;
  initialState?: any;
  application: ApplicationConfig<T, OpType>;

  constructor(ext: Config<T, OpType>, check: typeof _check) {
    if (check !== _check) {
      throw new Error('Instantiate class via `Extension.create({})`');
    }
    this.name = ext.name;
    this.editor = ext.editor;
    this.initialState = ext.initialState;
    this.application = ext.application;
  }

  static create<
    T = undefined,
    OpType extends SerialOperationDefinitionType = any,
  >(config: {
    name: string;
    initialState?: T;
    editor?: Omit<EditorConfig, 'name'>;
    application?: Omit<ApplicationConfig<T, OpType>, 'name'>;
  }) {
    const { name } = config;

    if (!name) {
      throw new Error('Extension: name is required');
    }

    if (!/^[a-z0-9-_@/\.]+$/.test(name)) {
      throw new Error(
        'Extension name must be npm package name which can only have the follow characters "a..z" "0..9" "@" "." "-" and "_"',
      );
    }

    const editor = Object.assign({}, config.editor, { name });
    const application = Object.assign({}, config.application, { name });
    const initialState = config.initialState;

    const {
      specs,
      plugins,
      highPriorityPlugins,
      markdownItPlugins,
      renderReactNodeView,
    } = editor;

    if (specs && !Array.isArray(specs)) {
      throw new Error('Extension: specs must be an array');
    }
    if (plugins && !Array.isArray(plugins)) {
      throw new Error('Extension: plugins must be an array');
    }
    if (highPriorityPlugins && !Array.isArray(highPriorityPlugins)) {
      throw new Error('Extension: highPriorityPlugins must be an array');
    }
    if (markdownItPlugins && !Array.isArray(markdownItPlugins)) {
      throw new Error('Extension: markdownItPlugins must be an array');
    }
    if (
      renderReactNodeView &&
      Object.values(renderReactNodeView).some((r) => typeof r !== 'function')
    ) {
      throw new Error(
        'Extension: renderReactNodeView must be an Object<string, function> where the function returns a react element',
      );
    }

    const {
      operations,
      sidebars,
      noteSidebarWidgets,
      slices,
      operationHandler,
      storageProvider,
      noteFormatProvider,
      onStorageError,
    } = application;

    if (operationHandler && !operations) {
      throw new Error(
        'Extension: operationHandler is required when defining operations',
      );
    }

    if (operations) {
      if (
        !operations.every(
          (a) =>
            hasCorrectScheme('operation', a.name) &&
            hasCorrectPackageName(name, a.name),
        )
      ) {
        throw new Error(
          `An operation must have a name with the following schema operation::<extension_pkg_name:xyz. For example 'operation::@bangle.io/example:hello-world'`,
        );
      }

      if (operations.length !== new Set(operations.map((r) => r.name)).size) {
        throw new Error('Operation name must be unique');
      }
    }

    if (sidebars) {
      if (!Array.isArray(sidebars)) {
        throw new Error('Extension: sidebars must be an array');
      }

      if (
        !sidebars.every((s) => {
          const validName =
            hasCorrectScheme('sidebar', s.name) &&
            hasCorrectPackageName(name, s.name);

          const validIcon = Boolean(s.activitybarIcon);
          const validComponent = Boolean(s.ReactComponent);
          const validHint = typeof s.hint === 'string';
          return (
            validName && validIcon && validIcon && validComponent && validHint
          );
        })
      ) {
        throw new Error('Extension: Invalid sidebars config.');
      }
    }

    if (slices) {
      if (
        !slices.every(
          (slice) =>
            slice instanceof Slice &&
            hasCorrectScheme('slice', slice.key) &&
            hasCorrectPackageName(name, slice.key),
        )
      ) {
        throw new Error(
          `Extension: invalid slice. Slice key must be prefixed with extension name followed by a semicolon (:). For example, "new SliceKey(\'slice::my-extension-name:xyz\')"`,
        );
      }
    }

    if (
      noteSidebarWidgets &&
      !noteSidebarWidgets.every((s) => {
        const validName =
          hasCorrectScheme('note-sidebar-widget', s.name) &&
          hasCorrectPackageName(name, s.name);

        return validName;
      })
    ) {
      throw new Error(
        'Extension: Invalid ntoe sidebar widget name. Example: "note-sidebar-widget::my-extension-name:xyz"',
      );
    }

    if (noteFormatProvider) {
      if (typeof noteFormatProvider.name !== 'string') {
        throw new Error('Extension: noteFormatProvider must have a valid name');
      }
      if (typeof noteFormatProvider.description !== 'string') {
        throw new Error(
          'Extension: noteFormatProvider must have a description name',
        );
      }
      if (
        typeof noteFormatProvider.parseNote !== 'function' ||
        typeof noteFormatProvider.serializeNote !== 'function'
      ) {
        throw new Error(
          'Extension: noteFormatProvider must have parseNote and serializeNote functions',
        );
      }
    }

    if (storageProvider) {
      if (typeof storageProvider.name !== 'string') {
        throw new Error('Extension: Storage provider must have a valid name');
      }
      if (typeof storageProvider.description !== 'string') {
        throw new Error(
          'Extension: Storage provider must have a valid description',
        );
      }
      if (typeof onStorageError !== 'function') {
        throw new Error(
          'Extension: onStorageError must be defined when storage provider is defined',
        );
      }
    }

    return new Extension<T, OpType>(
      { name, editor, application, initialState },
      _check,
    );
  }
}

function hasCorrectScheme(scheme: string, slug: string) {
  return scheme === resolveSlug(slug).scheme;
}

function hasCorrectPackageName(pkgName: string, slug: string) {
  return pkgName === resolveSlug(slug).pkgName;
}

function resolveSlug(slug: string) {
  if (slug.includes('?')) {
    throw new Error('Cannot have ? in the slug');
  }

  const [scheme, restString] = slug.split('::');
  const [pkgName, localSlug] = restString?.split(':') || [];
  return {
    scheme,
    pkgName,
    path: localSlug,
  };
}
