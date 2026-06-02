import { useState, useRef, useEffect, type ReactNode } from 'react';

interface DropdownItem {
  label: string;
  title?: string;
  onClick: () => void;
  devOnly?: boolean;
}

interface DropdownMenuProps {
  label: ReactNode;
  items: DropdownItem[];
  isDev?: boolean;
}

export function DropdownMenu({ label, items, isDev = false }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const visible = items.filter(item => !item.devOnly || isDev);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => setOpen(o => !o)}
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
          background: hover ? '#f3f4f6' : 'transparent',
          color: '#374151',
          fontWeight: 400,
          transition: 'background 0.1s',
        }}
      >
        {label}
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          zIndex: 100,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,.08)',
          minWidth: '200px',
          padding: '4px 0',
        }}>
          {visible.map(item => (
            <button
              key={item.label}
              onClick={() => { item.onClick(); setOpen(false); }}
              title={item.title}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '6px 14px',
                fontSize: '13px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#374151',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
