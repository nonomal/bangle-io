import React, { ReactNode, useEffect, useRef } from 'react';

import {
  cx,
  isTouchDevice,
  safeScrollIntoViewIfNeeded,
} from '@bangle.io/utils';

export interface ItemType {
  uid: string;
  title: ReactNode;
  data?: any;
  leftNode?: ReactNode;
  rightNode?: ReactNode;
  rightHoverNode?: ReactNode;
  showDividerAbove?: boolean;
  description?: ReactNode;
  extraInfo?: ReactNode;
  isDisabled?: boolean;
}

export function PaletteItemUI({
  item,
  onClick,
  // styling
  isActive,
  className = '',
  scrollIntoViewIfNeeded = true,
  allowHover = !isTouchDevice(),
  style,
}: {
  allowHover?: boolean;
  item: ItemType;
  onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  isActive?: boolean;
  className?: string;
  scrollIntoViewIfNeeded?: boolean;
  style?: any;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollIntoViewIfNeeded && isActive) {
      ref.current && safeScrollIntoViewIfNeeded(ref.current, false);
    }
  }, [scrollIntoViewIfNeeded, isActive]);

  const titleElement = (
    <span>
      <span className="b-palette-title text-base font-normal">
        {item.title}
      </span>
      {item.extraInfo && (
        <span className="b-extra-info text-base font-light">
          {item.extraInfo}
        </span>
      )}
    </span>
  );

  return (
    <div
      data-id={item.uid}
      ref={ref}
      onClick={onClick}
      className={cx(
        'universal-palette-item',
        className,
        isActive && 'active',
        item.isDisabled && 'disabled',
        item.showDividerAbove && 'b-divider',
        allowHover && 'allow-hover',
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
            <span className="b-description text-sm">{item.description}</span>
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
