import { useEffect } from 'react';

let activeLockCount = 0;
let previousBodyOverflow = '';

const lockBodyScroll = () => {
  if (activeLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  activeLockCount += 1;
};

const unlockBodyScroll = () => {
  activeLockCount = Math.max(0, activeLockCount - 1);
  if (activeLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
  }
};

const useBodyScrollLock = (locked) => {
  useEffect(() => {
    if (!locked) return undefined;

    lockBodyScroll();
    return unlockBodyScroll;
  }, [locked]);
};

export default useBodyScrollLock;
