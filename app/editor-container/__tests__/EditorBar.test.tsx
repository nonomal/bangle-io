/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { useBangleStoreDispatch } from '@bangle.io/bangle-store-context';
import { toggleNotesPalette } from '@bangle.io/shared-operations';

import { EditorBar } from '../EditorBar';

jest.mock('@bangle.io/bangle-store-context', () => {
  const obj = jest.requireActual('@bangle.io/bangle-store-context');
  return {
    ...obj,
    useBangleStoreDispatch: jest.fn(() => () => {}),
  };
});

jest.mock('@bangle.io/shared-operations', () => {
  const operations = jest.requireActual('@bangle.io/shared-operations');

  return {
    ...operations,
    toggleNotesPalette: jest.fn(() => () => {}),
  };
});

const toggleNotesPaletteMock = toggleNotesPalette as jest.MockedFunction<
  typeof toggleNotesPalette
>;

beforeEach(() => {
  (useBangleStoreDispatch as any).mockImplementation(() => () => {});
  toggleNotesPaletteMock.mockImplementation(() => () => {});
});

test('renders correctly', () => {
  let result = render(
    <div>
      <EditorBar
        isActive={false}
        showSplitEditor={false}
        wsPath={'mojo:test-dir/magic.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorOpen={false}
      />
    </div>,
  );

  expect(result.getByLabelText('note path').className).not.toContain('active');

  expect(result.container).toMatchSnapshot();
});

test('renders correctly when active', () => {
  let result = render(
    <div>
      <EditorBar
        isActive={true}
        showSplitEditor={false}
        wsPath={'mojo:test-dir/magic.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorOpen={false}
      />
    </div>,
  );

  expect(result.getByLabelText('note path').className).toContain('active');

  expect(result.container).toMatchSnapshot();
});

test('truncates large wsPath', () => {
  let result = render(
    <div>
      <EditorBar
        isActive={false}
        showSplitEditor={false}
        wsPath={'mojo:test-dir/magic/wow/last/two.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorOpen={false}
      />
    </div>,
  );

  expect(result.getByLabelText('note path')).toMatchSnapshot();
});

test('dispatches toggleNotesPalette on clicking wsPath', () => {
  let result = render(
    <div>
      <EditorBar
        isActive={false}
        showSplitEditor={true}
        wsPath={'mojo:test-dir/magic.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorOpen={true}
      />
    </div>,
  );

  fireEvent.click(result.getByLabelText('note path'));

  expect(toggleNotesPaletteMock).toBeCalledTimes(1);
});

test('renders splitscreen', () => {
  let result = render(
    <div>
      <EditorBar
        isActive={false}
        showSplitEditor={true}
        wsPath={'mojo:test-dir/magic.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorOpen={true}
      />
    </div>,
  );

  const splitButton = () => result.getByLabelText('Split screen');

  expect([...splitButton().classList.values()]).toContain('is-active');

  result.rerender(
    <div>
      <EditorBar
        isActive={false}
        showSplitEditor={true}
        wsPath={'mojo:test-dir/magic.md'}
        onClose={jest.fn()}
        onPressSecondaryEditor={jest.fn()}
        isSplitEditorOpen={false}
      />
    </div>,
  );

  expect([...splitButton().classList.values()]).not.toContain('is-active');
});
