import React from 'react';

export default function PlacePlaceholder({
  name,
  className = 'h-48 w-full',
}: {
  name?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden border border-line ${className}`}
      style={{
        background: 'radial-gradient(circle at 50% 45%, #2a2016 0%, #1a140f 50%, #0f0d0b 100%)',
      }}
    >
      {/* Decorative concentric plate rings drawn in pure CSS */}
      <div className="relative flex items-center justify-center">
        {/* Outer plate rim */}
        <div className="h-28 w-28 rounded-full border-2 border-[#3d3224]/80 shadow-[0_0_24px_rgba(245,165,36,0.08)] flex items-center justify-center">
          {/* Inner rim */}
          <div className="h-22 w-22 rounded-full border border-[#524432]/60 bg-[#1f1912]/80 flex items-center justify-center shadow-inner">
            {/* Plate base */}
            <div className="h-16 w-16 rounded-full border border-[var(--star)]/20 bg-[#16120d] flex items-center justify-center">
              {/* Minimalist fork & knife or food symbol */}
              <div className="flex items-center gap-1.5 opacity-60">
                {/* Fork */}
                <div className="flex flex-col items-center">
                  <div className="flex gap-0.5">
                    <span className="w-0.5 h-3 bg-accent rounded-full"></span>
                    <span className="w-0.5 h-3.5 bg-accent rounded-full"></span>
                    <span className="w-0.5 h-3 bg-accent rounded-full"></span>
                  </div>
                  <span className="w-0.5 h-4 bg-accent rounded-full mt-0.5"></span>
                </div>
                {/* Knife */}
                <div className="flex flex-col items-center">
                  <span className="w-1 h-3.5 bg-[#A39A8B] rounded-tr-md"></span>
                  <span className="w-0.5 h-4 bg-[#A39A8B] rounded-full mt-0.5"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {name && (
        <span className="absolute bottom-2 left-3 right-3 truncate text-center font-display text-xs text-muted/80">
          {name}
        </span>
      )}
    </div>
  );
}
