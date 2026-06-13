// components/video-show/video-cart.tsx
import { join } from "node:path";
import { readdir } from "node:fs/promises";
import VideoPlayerClient from "./video-player-client";

export default async function VideosCart() {
  // Lecture simplifiée du dossier côté serveur (RSC)
  const videos = await readdir(join(process.cwd(), "public", "video"), { withFileTypes: true })
    .then((files) => files.filter((f) => f.isFile() && f.name.endsWith(".webm")).map((f) => f.name))
    .catch(() => []);

  return (
    <section className="bg-slate-950 py-12 text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Vidéos de présentation</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Nos Capsules en Continu</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">Une immersion visuelle dans notre univers.</p>
        </header>

        {videos.length > 0 ? (
          <VideoPlayerClient videos={videos} />
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 py-10 text-center text-slate-500">
            Aucune vidéo disponible pour le moment.
          </div>
        )}
      </div>
    </section>
  );
}
