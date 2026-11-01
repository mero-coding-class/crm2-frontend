import { useLayoutEffect } from "react";

let activeLocks = 0;
let previousStyles = null;

const lockPageScroll = () => {
  if (typeof document === "undefined") return () => {};

  if (activeLocks === 0) {
    const html = document.documentElement;
    const body = document.body;
    const main = document.querySelector(".crm-main-scroll");
    const elements = [html, body, main].filter(Boolean);

    previousStyles = elements.map((element) => ({
      element,
      overflow: element.style.overflow,
      overflowY: element.style.overflowY,
      overscrollBehavior: element.style.overscrollBehavior,
    }));

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    if (main) {
      main.style.overflowY = "hidden";
      main.style.overscrollBehavior = "none";
    }
  }

  activeLocks += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    activeLocks = Math.max(0, activeLocks - 1);

    if (activeLocks === 0 && previousStyles) {
      previousStyles.forEach(({ element, overflow, overflowY, overscrollBehavior }) => {
        element.style.overflow = overflow;
        element.style.overflowY = overflowY;
        element.style.overscrollBehavior = overscrollBehavior;
      });
      previousStyles = null;
    }
  };
};

export default function useModalScrollLock(isOpen = true) {
  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    return lockPageScroll();
  }, [isOpen]);
}
