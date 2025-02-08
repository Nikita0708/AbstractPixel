import { useEffect, useRef } from "react";

// Declare the VANTA global to satisfy TypeScript
declare global {
  interface Window {
    VANTA: {
      CLOUDS: (config: any) => any;
    };
  }
}

const VantaBackground = () => {
  const vantaRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Three.js and Vanta scripts dynamically
    const loadScripts = async () => {
      const threeScript = document.createElement("script");
      threeScript.src =
        "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js";
      document.head.appendChild(threeScript);

      threeScript.onload = () => {
        const vantaScript = document.createElement("script");
        vantaScript.src =
          "https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.clouds.min.js";
        document.head.appendChild(vantaScript);

        vantaScript.onload = () => {
          if (!vantaRef.current && containerRef.current) {
            vantaRef.current = window.VANTA.CLOUDS({
              el: containerRef.current,
              mouseControls: true,
              touchControls: true,
              gyroControls: false,
              minHeight: window.innerHeight,
              minWidth: window.innerWidth,
              skyColor: "#07c983",
            });
          }
        };
      };
    };

    loadScripts();

    return () => {
      if (vantaRef.current) {
        vantaRef.current.destroy();
      }
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 -z-10" />;
};

export default VantaBackground;
