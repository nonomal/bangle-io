import { BangleEditor, BangleEditorState } from '@bangle.dev/core';
import { valuePlugin } from '@bangle.dev/utils';

import { initialBangleStore } from '@bangle.io/bangle-store-context';
import {
  EditorDisplayType,
  EditorPluginMetadataKey,
} from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';
import { markdownParser } from '@bangle.io/markdown';
import type { EditorPluginMetadata } from '@bangle.io/shared-types';

import { createExtensionRegistry } from './extension-registry';

if (typeof jest === 'undefined') {
  throw new Error('Can only be with jest');
}
/**
 * Creates an editor from markdown string
 */
export function createEditorFromMd(
  md: string,
  {
    pluginMetadata = {},
    extensions = [],
    testId = 'test-editor',
  }: {
    pluginMetadata?: Partial<EditorPluginMetadata>;
    extensions?: Extension[];
    testId?: string;
  } = {},
) {
  md = md.trim();
  const container = document.body.appendChild(document.createElement('div'));
  container.setAttribute('data-testid', testId);

  const registry = createExtensionRegistry(extensions, { editorCore: true });

  const editorProps = {
    attributes: { class: 'bangle-editor ' },
  };

  let editor = new BangleEditor(container, {
    state: new BangleEditorState({
      specRegistry: registry.specRegistry,
      plugins: () => [
        valuePlugin(EditorPluginMetadataKey, {
          wsPath: 'test:my-test.md',
          editorDisplayType: EditorDisplayType.Page,
          editorId: 0,
          bangleStore: initialBangleStore,
          dispatchSerialOperation: () => {},
          ...pluginMetadata,
        }),
        ...registry.getPlugins(),
      ],
      editorProps,
      initialValue: markdownParser(
        md,
        registry.specRegistry,
        registry.markdownItPlugins,
      ),
    }),
  });

  return editor;
}
