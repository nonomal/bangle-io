import { createSelector } from 'reselect';

import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { isValidNoteWsPath, OpenedWsPaths } from '@bangle.io/ws-path';

export type WorkspaceStateKeys = keyof ConstructorParameters<
  typeof WorkspaceSliceState
>[0];

export interface WorkspaceInfoReg {
  [wsName: string]: WorkspaceInfo;
}

export class WorkspaceSliceState {
  constructor(
    protected mainFields: {
      error: WorkspaceSliceState['error'];
      openedWsPaths: WorkspaceSliceState['openedWsPaths'];
      recentlyUsedWsPaths: WorkspaceSliceState['recentlyUsedWsPaths'];
      refreshCounter: WorkspaceSliceState['refreshCounter'];
      workspacesInfo: WorkspaceSliceState['workspacesInfo'];
      wsName: WorkspaceSliceState['wsName'];
      wsPaths: WorkspaceSliceState['wsPaths'];
    },
    protected opts: any = {},
  ) {}

  static update(
    existing: WorkspaceSliceState,
    obj: Partial<ConstructorParameters<typeof WorkspaceSliceState>[0]>,
  ) {
    // retain instance if possible
    if (obj.openedWsPaths) {
      obj.openedWsPaths = existing.openedWsPaths.update(obj.openedWsPaths);
    }

    return new WorkspaceSliceState(Object.assign({}, existing.mainFields, obj));
  }

  // mainFields
  get wsPaths(): string[] | undefined {
    return this.mainFields.wsPaths;
  }
  get recentlyUsedWsPaths(): string[] | undefined {
    return this.mainFields.recentlyUsedWsPaths;
  }
  get wsName(): string | undefined {
    return this.mainFields.wsName;
  }
  get openedWsPaths(): OpenedWsPaths {
    return this.mainFields.openedWsPaths;
  }
  get workspacesInfo(): WorkspaceInfoReg | undefined {
    return this.mainFields.workspacesInfo;
  }
  get error(): Error | undefined {
    return this.mainFields.error;
  }

  // returns the current wsName refreshing for
  get refreshCounter(): number {
    return this.mainFields.refreshCounter;
  }

  // derived
  get noteWsPaths(): string[] | undefined {
    return selectNoteWsPaths(this);
  }
}

const selectNoteWsPaths = createSelector(
  (state: WorkspaceSliceState) => state.wsPaths,
  (wsPaths) => {
    return wsPaths?.filter((wsPath) => isValidNoteWsPath(wsPath));
  },
);
