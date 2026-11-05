import { useState } from 'react';
import BoudoirOrnament from './BoudoirOrnament';

export default function ProductImage({
  src,
  alt = '',
  className = '',
  imgClassName = '',
  arch = false,
}) {
  const [failedSrc, setFailedSrc] = useState(null);
  const hasError = !src || failedSrc === src;

  return (
    <div
      className={`aspect-[3/4] overflow-hidden bg-surface-muted border border-border/30 relative ${
        arch ? 'rounded-t-full' : ''
      } ${className}`.trim()}
    >
      {hasError ? (
        <div className="absolute inset-0 border border-border/20 m-3 flex flex-col items-center justify-center p-4 text-center select-none">
          <BoudoirOrnament variant="divider" className="w-16 text-border/60 mb-2" />
          <span className="font-serif tracking-widest text-sm text-text-light">
            БУДУАР
          </span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailedSrc(src)}
          className={`w-full h-full object-cover boudoir-photo transition-transform duration-700 ease-out ${imgClassName}`.trim()}
        />
      )}
    </div>
  );
}
