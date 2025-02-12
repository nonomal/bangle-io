import { BaseError } from '@bangle.io/base-error';
import { ActionTestFixtureType } from '@bangle.io/test-utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { WorkspaceSliceAction } from '../common';
import { storageProviderHelpers } from '../storage-provider-helpers';
import { createStore, createWsInfo } from './test-utils';

// This shape (Record<actionName, action[]>) exists so the we can exhaustively
// make sure every action's serialization has been tested
const testFixtures: ActionTestFixtureType<WorkspaceSliceAction> = {
  'action::@bangle.io/slice-workspace:set-error': [
    {
      name: 'action::@bangle.io/slice-workspace:set-error',
      value: {
        error: new BaseError({
          message: 'hello-message',
          code: 'MY_CODE',
        }),
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-error',
      value: {
        error: new BaseError({
          message: 'hello-message',
        }),
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-error',
      value: {
        error: new BaseError({
          message: 'hello-message-2',
          code: 'CODE_2',
        }),
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-error',
      value: {
        error: new Error('vanilla-error'),
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-error',
      value: {
        error: Object.assign(new Error('vanilla-error-with-code'), {
          code: 'MY_CODE',
        }),
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-error',
      value: {
        error: undefined,
      },
    },
  ],

  'action::@bangle.io/slice-workspace:set-workspace-infos': [
    {
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {},
      },
    },
    {
      name: 'action::@bangle.io/slice-workspace:set-workspace-infos',
      value: {
        workspacesInfo: {
          testWs: createWsInfo({ name: 'testWs' }),
        },
      },
    },
  ],
  'action::@bangle.io/slice-workspace:refresh-ws-paths': [
    {
      name: 'action::@bangle.io/slice-workspace:refresh-ws-paths',
    },
    {
      name: 'action::@bangle.io/slice-workspace:refresh-ws-paths',
    },
  ],

  'action::@bangle.io/slice-workspace:set-opened-workspace': [
    {
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        openedWsPaths: OpenedWsPaths.createFromArray(['test-ws:one.md']),
        wsName: 'test-ws',
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        openedWsPaths: OpenedWsPaths.createEmpty(),
        wsName: 'test-ws',
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        openedWsPaths: OpenedWsPaths.createEmpty(),
        wsName: undefined,
      },
    },
  ],

  'action::@bangle.io/slice-workspace:update-recently-used-ws-paths': [
    {
      name: 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths',
      value: {
        recentlyUsedWsPaths: [],
        wsName: 'test-ws',
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths',
      value: {
        recentlyUsedWsPaths: ['test-ws:one.md'],
        wsName: 'test-ws',
      },
    },
  ],

  'action::@bangle.io/slice-workspace:update-ws-paths': [
    {
      name: 'action::@bangle.io/slice-workspace:update-ws-paths',
      value: {
        wsName: 'test-ws',
        wsPaths: ['test-ws:one.md'],
      },
    },

    {
      name: 'action::@bangle.io/slice-workspace:update-ws-paths',
      value: {
        wsName: 'test-ws',
        wsPaths: undefined,
      },
    },
  ],
};

const fixtures = Object.values(testFixtures).flatMap(
  (r: WorkspaceSliceAction[]) => r,
);

const { store } = createStore();

test.each(fixtures)(`%s actions serialization`, (action) => {
  const res: any = store.parseAction(store.serializeAction(action) as any);

  expect(res).toEqual({ ...action, fromStore: 'workspace-store' });
});

test('Vanilla Error actions serialization with code', () => {
  const error = Object.assign(new Error('vanilla-error-with-code'), {
    code: 'MY_CODE',
  });
  const action = {
    name: 'action::@bangle.io/slice-workspace:set-error',
    value: {
      error,
    },
  };

  expect(error.code).toEqual('MY_CODE');
  const res: any = store.parseAction(store.serializeAction(action) as any);
  expect(res.value.error.code).toEqual(error.code);
});

test('Vanilla Error actions serialization with thrower', () => {
  const error = Object.assign(new Error('vanilla-error-with-code'), {
    thrower: 'I_THREW_IT',
  });
  const action = {
    name: 'action::@bangle.io/slice-workspace:set-error',
    value: {
      error,
    },
  };

  expect(error.code).toBeUndefined();
  expect(error.thrower).toBe('I_THREW_IT');
  const res: any = store.parseAction(store.serializeAction(action) as any);
  expect(res.value.error.code).toEqual(error.code);
  expect(res.value.error.thrower).toEqual(error.thrower);
});

test('Error actions serialization with stack', () => {
  const error = Object.assign(new Error('vanilla-error-with-stack'), {
    stack: `stack`,
  });
  const action = {
    name: 'action::@bangle.io/slice-workspace:set-error',
    value: {
      error,
    },
  };

  const res: any = store.parseAction(store.serializeAction(action) as any);
  expect(res.value.error.stack).toEqual(error.stack);
});

test('Error actions serialization of base error', () => {
  const error = new BaseError({
    message: 'vanilla-error-with-stack',
    code: 'MY_CODE',
    thrower: 'test_thrower',
  });

  const action = {
    name: 'action::@bangle.io/slice-workspace:set-error' as const,
    value: {
      error,
    },
  };

  const res: any = store.parseAction(store.serializeAction(action) as any);
  expect(res.value.error.code).toEqual(error.code);
  expect(res.value.error.thrower).toEqual(error.thrower);
});

test('Error actions serialization with storage provider error', () => {
  const error = new Error('test-error');

  storageProviderHelpers.markAsStorageProviderError(error, 'test-provider');

  const action = {
    name: 'action::@bangle.io/slice-workspace:set-error' as const,
    value: {
      error,
    },
  };

  const res: any = store.parseAction(store.serializeAction(action) as any);
  expect(
    storageProviderHelpers.getStorageProviderNameFromError(res.value.error),
  ).toEqual('test-provider');
  expect(storageProviderHelpers.isStorageProviderError(res.value.error)).toBe(
    true,
  );
});
