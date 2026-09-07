import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} · ReelForge AI` : 'ReelForge AI';
    return () => {
      document.title = prev;
    };
  }, [title]);
}