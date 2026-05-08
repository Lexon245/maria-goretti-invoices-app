import { useCallback } from 'react';

/**
 * Returns a stable formatter function that respects the app's currency/locale settings.
 * Falls back to EUR / de-DE when settings haven't loaded yet.
 */
const useCurrency = (settings) => {
  const currency = settings?.default_currency || 'EUR';
  const locale   = settings?.locale          || 'de-DE';

  const format = useCallback(
    (value) => (value ?? 0).toLocaleString(locale, { style: 'currency', currency }),
    [currency, locale]
  );

  return format;
};

export default useCurrency;
