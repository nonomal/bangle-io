import { BaseError, getLast, removeMdExtension } from '@bangle.io/utils';

export const NOTE_WS_PATH_EXTENSION = /.+\.md$/;

export type MaybeWsPath = string | undefined;

/**
 * Types of paths
 * filePath - /a/b/c.md simple file path
 * wsPath - <wsName>:<filePath>
 * fsPath - /<wsName>/<filePath> - this is what is used internally by the fs module
 */
// TODO add test where wsPath has `//`
export function resolvePath(wsPath: string, skipValidation = false) {
  if (!skipValidation) {
    validateWsPath(wsPath);
    // TODO currently this only works for fileWsPaths
    validateFileWsPath(wsPath);
  }
  const [wsName, filePath] = splitWsPath(wsPath);
  const filePathSplitted = filePath.split('/');
  const fileName: string | undefined = getLast(filePathSplitted);
  if (typeof fileName !== 'string') {
    throw new Error('fileName undefined');
  }
  const dirPath = filePathSplitted
    .slice(0, filePathSplitted.length - 1)
    .filter(Boolean)
    .join('/');
  return {
    wsPath,
    wsName,
    filePath, // wsName:filePath
    dirPath, // wsName:dirPath/fileName
    fileName,
    fileNameWithoutExt: removeMdExtension(fileName),
  };
}

export class PathValidationError extends BaseError {}

export function validWsName(wsName: string) {
  if (wsName === '') {
    throw new PathValidationError({
      message: 'Invalid wsName "' + wsName + '" .',
    });
  }
  if (wsName.includes(':')) {
    throw new PathValidationError({
      message: 'Invalid characters in  "' + wsName + '" .',
    });
  }
}

export function isWsPath(wsPath: string) {
  if (!wsPath || typeof wsPath !== 'string') {
    return false;
  }
  if (wsPath.split(':').length !== 2) {
    return false;
  }
  return true;
}

export function isValidFileWsPath(wsPath: string) {
  if (!isWsPath(wsPath)) {
    return false;
  }

  const items = wsPath.split('/');
  if (items[items.length - 1]?.includes('.')) {
    return true;
  }

  return false;
}

export function validateWsPath(wsPath: string) {
  if (wsPath.split('/').some((r) => r.length === 0)) {
    throw new PathValidationError({ message: 'Invalid path ' + wsPath });
  }

  const [wsName, filePath, ...others] = wsPath.split(':');

  if (others.length > 0) {
    throw new PathValidationError({
      message: 'Semicolon not allowed file path',
    });
  }

  if (!wsName || !filePath) {
    throw new PathValidationError({ message: 'Invalid wsPath ' + wsPath });
  }
}

// a file wsPath is workspace path to a file
export function validateFileWsPath(wsPath: string) {
  if (!isValidFileWsPath(wsPath)) {
    throw new PathValidationError({ message: 'Invalid wsPath ' + wsPath });
  }

  validateWsPath(wsPath);
}

// a note wsPath is every what a file wsPath is
// but restricted to only .md for now
export function validateNoteWsPath(wsPath: string) {
  validateFileWsPath(wsPath);
  if (!isValidNoteWsPath(wsPath)) {
    throw new PathValidationError({
      message: 'Notes can only be saved in .md format',
    });
  }
}

export function isValidNoteWsPath(wsPath: string) {
  return NOTE_WS_PATH_EXTENSION.test(wsPath);
}

export function sanitizeFilePath(filePath: string) {
  return filePath.replace(/[^\w\s-\.]/g, '');
}

/**
 * The local file paths are the paths supported by the file system.
 * For example ./my-file is a relative file.
 * @param {String} filePath - The file path read directly form the user input like an md file
 * @param {String} wsPath - the current file wsPath to resolve the relative path from
 * @returns {String} a valid wsPath to it
 */
export function parseLocalFilePath(filePath: string, wsPath: string) {
  if (filePath.startsWith('./')) {
    filePath = filePath.slice(2);
  }
  const { wsName, dirPath } = resolvePath(wsPath);
  let sampleDomain = 'https://bangle.io';
  if (dirPath) {
    sampleDomain += '/' + dirPath + '/';
  }
  let webPath = new URL(filePath, sampleDomain).pathname;

  if (webPath.startsWith('/')) {
    webPath = webPath.slice(1);
  }
  // need to decode uri as filesystems dont do encoding
  return filePathToWsPath(wsName, decodeURIComponent(webPath));
}

export const toFSPath = (wsPath: string) => {
  const { wsName, filePath } = resolvePath(wsPath);
  return [wsName, filePath].join('/');
};

export function fromFsPath(fsPath: string) {
  const [_wsName, ...f] = fsPath.split('/');
  if (!_wsName || _wsName.includes(':')) {
    return undefined;
  }

  return filePathToWsPath(_wsName, f.join('/'));
}

export function splitWsPath(wsPath: string): [string, string] {
  const [wsName, filePath] = wsPath.split(':');
  if (!wsName) {
    throw new PathValidationError({ message: 'Invalid wsName' });
  }

  if (!filePath) {
    throw new PathValidationError({ message: 'Invalid filePath' });
  }

  return [wsName, filePath];
}

export function updateFileName(wsPath: string, newFileName: string) {
  const { wsName, dirPath } = resolvePath(wsPath);

  return filePathToWsPath(wsName, `${dirPath}/${newFileName}`);
}

export function filePathToWsPath(wsName: string, filePath: string) {
  if (filePath.startsWith('/')) {
    filePath = filePath.slice(1);
  }
  return wsName + ':' + filePath;
}
