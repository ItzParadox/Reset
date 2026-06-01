import { useEffect } from 'react';

/**
 * Locks body scroll while the component is mounted.
 * Restores the previous scroll position on cleanup.
 *
 * @param {boolean} active - Only locks when true (useful for conditional modals).
 */
export default function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;

    const prevBody = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    const prevHtmlOverflow = html.style.overflow;

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    html.style.overflow = 'hidden';

    return () => {
      body.style.overflow = prevBody.overflow;
      body.style.position = prevBody.position;
      body.style.top = prevBody.top;
      body.style.left = prevBody.left;
      body.style.right = prevBody.right;
      body.style.width = prevBody.width;
      html.style.overflow = prevHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
