import { useEffect, useState } from 'react';
import { pageContentAPI } from '@/lib/api';
import { DEFAULT_STATIC_PAGE_CONTENT } from '@/data/staticPageContent';

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const mergeStaticPageContent = (pageKey, incomingContent) => {
  const defaults = DEFAULT_STATIC_PAGE_CONTENT[pageKey] || {};

  const mergeValue = (baseValue, nextValue) => {
    if (Array.isArray(baseValue)) {
      return Array.isArray(nextValue) ? nextValue : baseValue;
    }

    if (isObject(baseValue)) {
      const result = { ...baseValue };
      const nextObject = isObject(nextValue) ? nextValue : {};
      Object.keys(nextObject).forEach((key) => {
        result[key] = mergeValue(baseValue[key], nextObject[key]);
      });
      return result;
    }

    return nextValue === undefined || nextValue === null ? baseValue : nextValue;
  };

  return mergeValue(defaults, incomingContent || {});
};

export const useStaticPageContent = (pageKey) => {
  const [content, setContent] = useState(() => mergeStaticPageContent(pageKey));

  useEffect(() => {
    let disposed = false;
    setContent(mergeStaticPageContent(pageKey));

    pageContentAPI.getPage(pageKey)
      .then((response) => {
        if (!disposed) {
          setContent(mergeStaticPageContent(pageKey, response.data?.content));
        }
      })
      .catch(() => {
        if (!disposed) {
          setContent(mergeStaticPageContent(pageKey));
        }
      });

    return () => {
      disposed = true;
    };
  }, [pageKey]);

  return content;
};

export const linesToArray = (value) => String(value || '')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

export const blocksToArray = (value) => String(value || '')
  .split(/\r?\n\s*\r?\n/)
  .map((block) => block.trim())
  .filter(Boolean);

export const arrayToLines = (items) => (Array.isArray(items) ? items.join('\n') : '');

export const arrayToBlocks = (items) => (Array.isArray(items) ? items.join('\n\n') : '');