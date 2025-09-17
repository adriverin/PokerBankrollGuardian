import { useEffect, useState } from 'react';
import dayjs from '@/utils/dayjs';

export function useLiveTimer(startIso?: string, running = false) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startIso || !running) {
      setElapsed(0);
      return;
    }
    const compute = () => {
      const diff = dayjs().diff(dayjs(startIso), 'second');
      setElapsed(diff);
    };
    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [startIso, running]);

  return elapsed;
}
