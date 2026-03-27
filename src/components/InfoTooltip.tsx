import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

interface InfoTooltipProps {
  text: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text }) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const show = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ top: rect.top - 6, left: rect.left + rect.width / 2 });
    setVisible(true);
  };

  const hide = () => setVisible(false);

  return (
    <>
      <span ref={ref} className="info-icon" onMouseEnter={show} onMouseLeave={hide}>
        <Info size={11} strokeWidth={1.8} />
      </span>
      {visible &&
        createPortal(
          <div className="info-bubble-portal" style={{ top: pos.top, left: pos.left }}>
            {text}
          </div>,
          document.body
        )}
    </>
  );
};

export default InfoTooltip;
