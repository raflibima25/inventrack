"use client";

import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Photo = {
  id: string;
  filePath: string;
};

type Props = {
  photos: Photo[];
  assetName: string;
};

export function PhotoCarousel({ photos, assetName }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (photos.length === 0) return null;

  // Single photo — no carousel needed
  if (photos.length === 1) {
    return (
      <div className="overflow-hidden rounded-xl">
        <img
          src={photos[0].filePath}
          alt={assetName}
          className="w-full object-cover"
          style={{ maxHeight: 320 }}
        />
      </div>
    );
  }

  function scrollTo(index: number) {
    if (!scrollRef.current) return;
    const child = scrollRef.current.children[index] as HTMLElement;
    child?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setActiveIndex(index);
  }

  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollLeft, offsetWidth } = scrollRef.current;
    const index = Math.round(scrollLeft / offsetWidth);
    setActiveIndex(index);
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Scrollable Images */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto"
        style={{
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            style={{
              scrollSnapAlign: "start",
              flexShrink: 0,
              width: "100%",
            }}
          >
            <img
              src={photo.filePath}
              alt={`${assetName} foto ${i + 1}`}
              className="w-full object-cover"
              style={{ maxHeight: 320, minHeight: 200 }}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Counter badge */}
      <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
        {activeIndex + 1} / {photos.length}
      </div>

      {/* Prev button */}
      {activeIndex > 0 && (
        <button
          onClick={() => scrollTo(activeIndex - 1)}
          aria-label="Foto sebelumnya"
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Next button */}
      {activeIndex < photos.length - 1 && (
        <button
          onClick={() => scrollTo(activeIndex + 1)}
          aria-label="Foto berikutnya"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            aria-label={`Foto ${i + 1}`}
            className="rounded-full transition-all"
            style={{
              width: i === activeIndex ? 20 : 8,
              height: 8,
              backgroundColor: i === activeIndex ? "white" : "rgba(255,255,255,0.5)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
