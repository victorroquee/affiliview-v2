import React from "react";

interface LoadingOverlayProps {
  visible: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-pulse-wrap">
        <div className="loading-pulse-ring" />
        <div className="loading-pulse-ring loading-pulse-ring--2" />
        <div className="loading-pulse-dot" />
      </div>
      <span className="loading-overlay-label">Buscando dados...</span>
    </div>
  );
};

export default LoadingOverlay;
