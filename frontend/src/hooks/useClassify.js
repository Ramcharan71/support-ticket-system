import { useState, useCallback, useRef } from 'react';
import { classifyText } from '../api/tickets';

export function useClassify() {
  const [isClassifying, setIsClassifying] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const classify = useCallback((text) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setError(null);

    if (!text || text.trim().length < 15) {
      return;
    }

    timerRef.current = setTimeout(async () => {
      setIsClassifying(true);
      try {
        const result = await classifyText(text);
        setSuggestion(result);
      } catch (err) {
        console.error('Classification failed:', err);
        setError('AI classification unavailable — please select manually.');
        setSuggestion(null);
      } finally {
        setIsClassifying(false);
      }
    }, 500);
  }, []);

  const resetSuggestion = useCallback(() => {
    setSuggestion(null);
    setError(null);
  }, []);

  return { classify, isClassifying, suggestion, error, resetSuggestion };
}
