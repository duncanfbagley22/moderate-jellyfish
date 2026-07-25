"use client";

import { TITLE_BAR } from "../lib/win95";

type TitleBarProps = {
  icon?: string;
  label: string;
  onClose?: () => void;
};

const DECOY_BUTTON =
  "w-5 h-5 flex items-center justify-center text-[10px] font-bold text-black bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-gray-800 border-b-gray-800 leading-none shrink-0";

export function TitleBar({ icon = "", label, onClose }: TitleBarProps) {
  return (
    <div className={TITLE_BAR}>
      <span className="flex items-center gap-1.5 text-sm font-bold truncate">
        <span aria-hidden>{icon}</span>
        {label}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        <span aria-hidden className={DECOY_BUTTON}>
          _
        </span>
        <span aria-hidden className={DECOY_BUTTON}>
          ▢
        </span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`${DECOY_BUTTON} active:border-t-gray-800 active:border-l-gray-800 active:border-r-white active:border-b-white touch-manipulation`}
          >
            ✕
          </button>
        ) : (
          <span aria-hidden className={DECOY_BUTTON}>
            ✕
          </span>
        )}
      </div>
    </div>
  );
}
