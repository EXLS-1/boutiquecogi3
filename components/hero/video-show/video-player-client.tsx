// components/video-show/video-player-clientt.tsx

"use client";

import { useState, useRef, useEffect } from "react";

interface VideoPlayerClientProps {
  videos: string[];
}

export default function VideoPlayerClient({ videos }: VideoPlayerClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Gestion de la lecture automatique au changement de source
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error("Autoplay failed:", error);
      });
    }
  }, [currentIndex]);

  const handleVideoEnded = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % videos.length);
  };

  if (videos.length === 0) return null;

  return (
    <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
      <video
        ref={videoRef}
        src={`/video/${videos[currentIndex]}`}
        className="aspect-video w-full object-cover"
        muted
        playsInline
        onEnded={handleVideoEnded}
      />
      
      {/* Overlay discret pour indiquer le titre ou la progression (Optionnel) */}
      <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">En lecture</span>
          <span className="text-sm font-medium text-white/80">{videos[currentIndex]}</span>
        </div>
        <div className="text-xs text-slate-500">
          {currentIndex + 1} / {videos.length}
        </div>
      </div>
    </div>
  );
}