import { useState } from 'react';

import type { ReactNode } from 'react';

interface ToolbarButtonProps {
  children: ReactNode;
  onClick: () => void;
  title?: string;
  highlight?: boolean;
}

export function ToolbarButton({
  children,
  onClick,
  title,
  highlight = false,
}: ToolbarButtonProps) {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '4px 10px',
        fontSize: '13px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        background: highlight
          ? hover
            ? '#dbeafe'
            : '#eff6ff'
          : hover
            ? '#f3f4f6'
            : 'transparent',
        color: highlight ? '#1d4ed8' : '#374151',
        fontWeight: highlight ? 600 : 400,
        transition: 'background 0.1s',
      }}
    >
      {children}
    </button>
  );
}
