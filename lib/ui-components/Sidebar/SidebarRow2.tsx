import React from 'react';

import { cx, isTouchDevice } from '@bangle.io/utils';

import { ItemType } from '../UniversalPalette/PaletteItem';

export function Row2({
  item,
  className = '',
  titleClassName = 'text-base font-normal',
  extraInfoClassName = 'text-base font-light',
  descriptionClassName = 'text-sm',
  onClick,
  isActive,
  style,
  // on touch devices having :hover forces you to click twice
  allowHover = !isTouchDevice(),
  extraInfoOnNewLine = false,
}: {
  item: ItemType;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  className?: string;
  titleClassName?: string;
  extraInfoClassName?: string;
  descriptionClassName?: string;
  isActive?: boolean;
  style?: any;
  allowHover?: boolean;
  extraInfoOnNewLine?: boolean;
}) {
  const titleElement = (
    <span className={cx(extraInfoOnNewLine && 'flex flex-col')}>
      <span className={'b-title ' + titleClassName}>{item.title}</span>
      {item.extraInfo && (
        <span
          className={cx(
            'b-extra-info ' + extraInfoClassName,
            extraInfoOnNewLine && 'extra-info-on-new-line',
          )}
        >
          {item.extraInfo}
        </span>
      )}
    </span>
  );

  return (
    <div
      role="button"
      data-id={item.uid}
      onClick={onClick}
      className={cx(
        'b-sidebar-row2',
        allowHover && 'hover',
        isActive && 'active',
        item.isDisabled && 'disabled',
        item.showDividerAbove && 'b-divider',
        className,
      )}
      style={{
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        userSelect: 'none',
        ...style,
      }}
    >
      <div className="flex flex-row">
        <div className="b-left-node">{item.leftNode}</div>
        {item.description ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {titleElement}
            <span className={'b-description ' + descriptionClassName}>
              {item.description}
            </span>
          </div>
        ) : (
          titleElement
        )}
      </div>
      <div className="flex flex-row">
        <span className="b-right-node">{item.rightNode}</span>
        <span className="b-right-hover-node">{item.rightHoverNode}</span>
      </div>
    </div>
  );
}
