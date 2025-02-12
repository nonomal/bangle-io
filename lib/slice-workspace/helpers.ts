import { WorkspaceTypeHelp } from '@bangle.io/constants';
import { ExtensionRegistry } from '@bangle.io/extension-registry';
import { markdownParser, markdownSerializer } from '@bangle.io/markdown';
import type { NoteFormatProvider } from '@bangle.io/shared-types';
import { BaseStorageProvider, HelpFsStorageProvider } from '@bangle.io/storage';
import { isValidNoteWsPath, OpenedWsPaths } from '@bangle.io/ws-path';

import { storageProviderHelpers } from './storage-provider-helpers';
import { WorkspaceSliceState } from './workspace-slice-state';

export function validateOpenedWsPaths(openedWsPath: OpenedWsPaths):
  | {
      valid: true;
    }
  | {
      invalidWsPath: string;
      valid: false;
    } {
  let invalidWsPath: string | undefined = undefined;

  openedWsPath.forEachWsPath((path) => {
    if (invalidWsPath || path == null) {
      return;
    }

    if (!isValidNoteWsPath(path)) {
      invalidWsPath = path;
    }
  });

  if (invalidWsPath) {
    return { valid: false, invalidWsPath: invalidWsPath };
  }

  return {
    valid: true,
  };
}

export function getPrevOpenedWsPathsFromSearch(
  search?: string,
): OpenedWsPaths | undefined {
  let searchParams = new URLSearchParams(search);
  let prev = searchParams.get('ws_paths');
  if (prev) {
    try {
      let openedWsPaths = OpenedWsPaths.createFromArray(JSON.parse(prev));
      return openedWsPaths;
    } catch (err) {
      return undefined;
    }
  }

  return undefined;
}

export function savePrevOpenedWsPathsToSearch(
  openedWsPaths: OpenedWsPaths,
  searchParams: URLSearchParams,
) {
  if (openedWsPaths.hasSomeOpenedWsPaths()) {
    searchParams.append('ws_paths', JSON.stringify(openedWsPaths.toArray()));
  }
}

export const getWsInfoIfNotDeleted = (
  wsName: string,
  workspacesInfo: Exclude<WorkspaceSliceState['workspacesInfo'], undefined>,
) => {
  const wsInfo = workspacesInfo[wsName];

  return wsInfo?.deleted ? undefined : wsInfo;
};

const storageProviderProxy = new WeakMap<
  BaseStorageProvider,
  BaseStorageProvider
>();

export function storageProviderErrorHandlerFromExtensionRegistry(
  workspaceType: string,
  extensionRegistry: ExtensionRegistry,
) {
  const errorHandler =
    extensionRegistry.getOnStorageErrorHandlers(workspaceType);

  return errorHandler;
}

export function storageProviderFromExtensionRegistry(
  workspaceType: string,
  extensionRegistry: ExtensionRegistry,
) {
  let provider: BaseStorageProvider | undefined;

  if (workspaceType === WorkspaceTypeHelp) {
    provider = new HelpFsStorageProvider();
  } else {
    provider = extensionRegistry.getStorageProvider(workspaceType);
  }

  if (!provider) {
    return undefined;
  }

  let existingProxy = storageProviderProxy.get(provider);

  if (existingProxy) {
    return existingProxy;
  }

  let proxy = new Proxy(provider, {
    get(target, method) {
      let fun = Reflect.get(target, method);
      if (typeof fun === 'function') {
        return <T>(...args: T[]) => {
          try {
            const result = Reflect.apply(fun, target, args);

            if (result.then) {
              return result.catch((err: unknown) => {
                storageProviderHelpers.markAsStorageProviderError(
                  err,
                  target.name,
                );

                throw err;
              });
            }

            return result;
          } catch (err) {
            storageProviderHelpers.markAsStorageProviderError(err, target.name);
            throw err;
          }
        };
      } else {
        return fun;
      }
    },
  });

  storageProviderProxy.set(provider, proxy);

  return proxy;
}

export const markdownFormatProvider: NoteFormatProvider = {
  name: 'markdown-format-provider',
  description: 'Saves notes in Markdown format',
  extensions: ['md'],

  serializeNote(doc, specRegistry) {
    return markdownSerializer(doc, specRegistry);
  },

  parseNote(value, specRegistry, plugins) {
    return markdownParser(value, specRegistry, plugins);
  },
};
