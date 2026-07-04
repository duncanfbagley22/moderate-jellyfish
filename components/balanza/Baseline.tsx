interface BaselineProps {
  label?: string;
  className?: string;
}

export function Baseline({ label = 'BASELINE', className = '' }: BaselineProps) {
  return (
    <div className={`relative flex items-center gap-3 ${className}`}>
      {/* The text now sits on the far left */}
      <span className="font-mono-ui text-[10px] tracking-[0.2em] text-slate-500 dark:text-slate-400 shrink-0">
        {label}
      </span>
      
      {/* This single line will flex and fill all remaining space to the right */}
      <div className="baseline-line flex-1" />
    </div>
  );
}