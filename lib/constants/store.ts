export const MAIN_STORE_NAME = 'main-store';
export const WORKER_STORE_NAME = 'worker-naukar-store';

export const workerSyncWhiteListedActions: string[] = [
  'action::@bangle.io/slice-notification:',
  'action::@bangle.io/slice-page:',
  'action::@bangle.io/slice-workspace:',
];
