import { useEffect, useState } from 'react';

const useCountdown = (enabled = true, stopAt = null) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return undefined;

    const timerId = window.setInterval(() => {
      const nextNow = Date.now();
      setNow(nextNow);

      if (Number.isFinite(stopAt) && nextNow >= stopAt) {
        window.clearInterval(timerId);
      }
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [enabled, stopAt]);

  return now;
};

export default useCountdown;
