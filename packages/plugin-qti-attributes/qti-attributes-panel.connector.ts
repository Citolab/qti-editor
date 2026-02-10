export interface ConnectorOverlay {
  setPath(path: string): void;
  hide(): void;
  destroy(): void;
}

export function createConnectorOverlay(doc: Document): ConnectorOverlay {
  const ns = 'http://www.w3.org/2000/svg';

  const svg = doc.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'fixed';
  svg.style.inset = '0';
  svg.style.width = '100vw';
  svg.style.height = '100vh';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '59';
  svg.style.overflow = 'visible';

  const path = doc.createElementNS(ns, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'rgba(37, 99, 235, 0.75)');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-dasharray', '7 5');
  path.style.filter = 'drop-shadow(0 1px 1px rgba(15, 23, 42, 0.25))';
  path.style.vectorEffect = 'non-scaling-stroke';
  svg.appendChild(path);

  doc.body.appendChild(svg);

  return {
    setPath(nextPath: string) {
      if (!nextPath) {
        svg.style.display = 'none';
        path.removeAttribute('d');
        return;
      }
      svg.style.display = 'block';
      path.setAttribute('d', nextPath);
    },
    hide() {
      svg.style.display = 'none';
      path.removeAttribute('d');
    },
    destroy() {
      svg.remove();
    },
  };
}
