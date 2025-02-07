import { useEffect, useRef } from "react";

const Dialog = ({ children, open, onOpenChange }) => {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      onOpenChange(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50"
    >
      {children}
    </div>
  );
};

const DialogContent = ({ children, className = "" }) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-lg w-full max-w-md mx-4 ${className}`}
    >
      {children}
    </div>
  );
};

const DialogHeader = ({ children }) => {
  return <div className="px-6 py-4 border-b border-gray-200">{children}</div>;
};

const DialogTitle = ({ children }) => {
  return <h2 className="text-xl font-semibold text-gray-900">{children}</h2>;
};

export { Dialog, DialogContent, DialogHeader, DialogTitle };
