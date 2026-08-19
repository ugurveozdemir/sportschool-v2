import { useEffect, useRef } from "react";

export function HlsVideo({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!src.includes(".m3u8") || video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return () => video.removeAttribute("src");
    }

    let disposed = false;
    let destroyPlayer: (() => void) | null = null;
    void import("hls.js").then(({ default: Hls }) => {
      if (disposed || !Hls.isSupported()) return;

      const hls = new Hls();
      destroyPlayer = () => hls.destroy();
      hls.loadSource(src);
      hls.attachMedia(video);
    });
    return () => {
      disposed = true;
      destroyPlayer?.();
    };
  }, [src]);

  return <video ref={videoRef} className={className} controls preload="metadata">Tarayıcınız video oynatmayı desteklemiyor.</video>;
}
