import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useUi } from "@/lib/ui-i18n";

export function ScreenshotGallery({
  images,
  thumbHeight = 140,
}: {
  images: string[];
  thumbHeight?: number;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const ui = useUi();

  if (!images || images.length === 0) return null;

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <>
      <div className="relative group">
        <div
          ref={scrollerRef}
          className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 -mx-1 px-1
            [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5
            [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightboxIndex(i)}
              style={{ height: thumbHeight }}
              className="snap-start shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border/50 bg-muted hover:border-primary/40 hover:shadow-md hover:scale-[1.02] transition-all duration-300"
              aria-label={`Open screenshot ${i + 1} of ${images.length}`}
            >
              <img src={src} alt={`Screenshot ${i + 1}`} className="h-full w-auto object-contain pointer-events-none" />
            </button>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-background/85 p-1.5 shadow-md border border-border/60 opacity-0 group-hover:opacity-100 transition"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-background/85 p-1.5 shadow-md border border-border/60 opacity-0 group-hover:opacity-100 transition"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
        {images.length > 1 && (
          <div className="mt-1 text-right text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            {images.length} · {ui.tapToEnlarge}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </>
  );
}

function Lightbox({
  images, index, onClose, onChange,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
}) {
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onChange(Math.max(0, index - 1));
      else if (e.key === "ArrowRight") onChange(Math.min(images.length - 1, index + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images.length, onChange, onClose]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && index < images.length - 1) onChange(index + 1);
      if (dx > 0 && index > 0) onChange(index - 1);
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/85 backdrop-blur-sm p-4"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 rounded-full bg-background/90 p-2 shadow-md"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {index > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(index - 1); }}
          className="absolute left-4 rounded-full bg-background/90 p-2 shadow-md"
          aria-label="Previous"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      <img
        src={images[index]}
        alt={`Screenshot ${index + 1} of ${images.length}`}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {index < images.length - 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(index + 1); }}
          className="absolute right-4 rounded-full bg-background/90 p-2 shadow-md"
          aria-label="Next"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
