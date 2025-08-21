import { useEffect, useMemo, useState } from "react";

export function useBoardColumnMeta() {
  const [screenWidth, setScreenWidth] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      if (typeof window !== "undefined") {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setScreenWidth(window.innerWidth);
        }, 50);
      }
    };

    if (typeof window !== "undefined") {
      setScreenWidth(window.innerWidth);
    }
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const columnMeta = useMemo(() => {
    if (screenWidth < 576) return { count: 1, gap: 0 };
    if (screenWidth < 768) return { count: 2, gap: 2 };
    if (screenWidth < 992) return { count: 2, gap: 6 };
    if (screenWidth < 1200) return { count: 3, gap: 2 };
    return { count: Math.floor(screenWidth / 380), gap: 4 };
  }, [screenWidth]);

  return columnMeta;
}
