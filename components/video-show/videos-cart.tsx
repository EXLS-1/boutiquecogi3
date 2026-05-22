import { join } from "node:path";
import { readdir } from "node:fs/promises";

const VIDEO_DIRECTORY = join(process.cwd(), "public", "video");

async function getVideoFiles(): Promise<string[]> {
  try {
    const entries = await readdir(VIDEO_DIRECTORY, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".webm"))
      .map((entry) => entry.name);
  } catch (error) {
    console.error("VideosCart: impossible de lire le dossier public/video", error);
    return [];
  }
}

export default async function VideosCart() {
  const videos = await getVideoFiles();

  return (
    <section className="bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Vidéos de présentation</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Découvrez nos capsules video
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Toutes les vidéos .webm du dossier <code>public/video</code> sont affichées ici.
          </p>
        </div>

        {videos.length === 0 ? (
          <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 text-center">
            <p className="text-lg text-slate-300">
              Aucune vidéo .webm trouvée dans <code>public/video</code>. Ajoutez des fichiers .webm pour les présenter ici.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {videos.map((file) => (
              <article
                key={file}
                className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/90 shadow-xl shadow-slate-950/20"
              >
                <div className="relative overflow-hidden bg-slate-900">
                  <video
                    controls
                    preload="metadata"
                    className="h-72 w-full object-cover"
                    src={`/video/${file}`}
                  />
                </div>
                <div className="space-y-2 p-5">
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Vidéo</p>
                  <h3 className="text-lg font-semibold text-white">{file}</h3>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
