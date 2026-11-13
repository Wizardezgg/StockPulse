interface LogoProps {
  size?: 'sm' | 'md';
  showText?: boolean;
}

export function StockPulseLogo({ size = 'md', showText = true }: LogoProps) {
  const dim = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-[15px]' : 'text-[18px]';

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className={`${dim} rounded-lg bg-[#4F46E5] flex items-center justify-center shadow-sm shrink-0 overflow-hidden`}>
        <svg className="w-4/6 h-4/6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2 12 7 12 10 4 14 20 17 12 22 12" />
        </svg>
      </div>
      {showText && (
        <span className={`${textSize} font-semibold tracking-tight text-[#151c27] leading-none`}>
          StockPulse
        </span>
      )}
    </div>
  );
}
