import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { Modal } from "../../../shared/components/Modal";
import { deleteProfileImage, deleteVideo, listAthleteVideos, setVideoPublication, uploadAthleteVideo, uploadProfileImage } from "../schoolApi";
import type { Athlete, AthleteVideo } from "../types";

export function AthleteMediaDialog({ athlete, onClose }: { athlete: Athlete; onClose: () => void }) {
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [videoToDelete, setVideoToDelete] = useState<AthleteVideo | null>(null);
  const videosQuery = useQuery({ queryKey: ["school", "athlete-videos", athlete.id], queryFn: () => listAthleteVideos(athlete.id) });
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["school", "athletes"] }),
      queryClient.invalidateQueries({ queryKey: ["school", "athlete-videos", athlete.id] })
    ]);
  };
  const imageMutation = useMutation({ mutationFn: (file: File) => uploadProfileImage(athlete.id, file), onSuccess: invalidate });
  const removeImageMutation = useMutation({ mutationFn: () => deleteProfileImage(athlete.id), onSuccess: invalidate });
  const videoMutation = useMutation({ mutationFn: (file: File) => uploadAthleteVideo(athlete.id, file, caption), onSuccess: async () => { setCaption(""); await invalidate(); } });
  const publicationMutation = useMutation({ mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => setVideoPublication(id, isPublished), onSuccess: invalidate });
  const removeVideoMutation = useMutation({ mutationFn: (id: string) => deleteVideo(id), onSuccess: async () => { setVideoToDelete(null); await invalidate(); } });
  const imageUrl = imageMutation.data?.url ?? athlete.profileImageUrl;

  return (
    <>
      <Modal title={`${athlete.firstName} ${athlete.lastName} · Medya`} onClose={onClose}>
        <div className="max-h-[75vh] space-y-6 overflow-y-auto pr-1">
          <section>
            <h3 className="text-sm font-semibold text-slate-900">Profil fotoğrafı</h3>
            <div className="mt-3 flex items-center gap-4">
              {imageUrl ? <img src={imageUrl} alt="" className="size-16 rounded-full object-cover" /> : <div className="grid size-16 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">{athlete.firstName[0]}{athlete.lastName[0]}</div>}
              <div className="flex flex-wrap gap-2">
                <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) imageMutation.mutate(file); event.target.value = ""; }} />
                <button type="button" onClick={() => imageInputRef.current?.click()} disabled={imageMutation.isPending} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:opacity-60">
                  {imageMutation.isPending ? "Yükleniyor…" : imageUrl ? "Değiştir" : "Fotoğraf ekle"}
                </button>
                {imageUrl && <button type="button" onClick={() => removeImageMutation.mutate()} disabled={removeImageMutation.isPending} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-red-600 hover:border-red-300 disabled:opacity-60">Kaldır</button>}
              </div>
            </div>
            {(imageMutation.isError || removeImageMutation.isError) && <p className="mt-2 text-xs text-red-600">Fotoğraf işlemi başarısız oldu. JPEG, PNG veya WebP ve en fazla 5 MB kullanın.</p>}
          </section>

          <section className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Yeni video</h3>
            <p className="mt-1 text-xs text-slate-500">MP4 veya MOV, en fazla 100 MB. Video önce taslak olarak eklenir.</p>
            <div className="mt-3 space-y-2">
              <textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={300} placeholder="Kısa bir açıklama ekleyin" className="min-h-20 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) videoMutation.mutate(file); event.target.value = ""; }} />
              <button type="button" onClick={() => videoInputRef.current?.click()} disabled={videoMutation.isPending} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {videoMutation.isPending ? "Video yükleniyor…" : "Video seç ve yükle"}
              </button>
              {videoMutation.isError && <p className="text-xs text-red-600">Video yüklenemedi. Formatı, dosya boyutunu ve bağlantınızı kontrol edin.</p>}
            </div>
          </section>

          <section className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Videolar</h3>
            {videosQuery.isLoading && <p className="mt-3 text-sm text-slate-400">Videolar yükleniyor…</p>}
            {videosQuery.isError && <p className="mt-3 text-sm text-red-600">Videolar yüklenemedi.</p>}
            {!videosQuery.isLoading && (videosQuery.data ?? []).length === 0 && <p className="mt-3 text-sm text-slate-500">Henüz video eklenmedi.</p>}
            <div className="mt-3 space-y-4">
              {(videosQuery.data ?? []).map((video) => <VideoItem key={video.id} video={video} busy={publicationMutation.isPending || removeVideoMutation.isPending} onToggle={() => publicationMutation.mutate({ id: video.id, isPublished: !video.isPublished })} onDelete={() => setVideoToDelete(video)} />)}
            </div>
          </section>
        </div>
      </Modal>

      {videoToDelete && <ConfirmDialog title="Videoyu sil" message="Bu video feed'den kaldırılacak ve local medya dosyası silinecek." confirmLabel="Sil" busy={removeVideoMutation.isPending} onConfirm={() => removeVideoMutation.mutate(videoToDelete.id)} onCancel={() => setVideoToDelete(null)} />}
    </>
  );
}

function VideoItem({ video, busy, onToggle, onDelete }: { video: AthleteVideo; busy: boolean; onToggle: () => void; onDelete: () => void }) {
  return (
    <article className="rounded-xl border border-slate-200 p-3">
      <video src={video.videoUrl} controls className="aspect-video w-full rounded-lg bg-slate-950" />
      {video.caption && <p className="mt-2 text-sm text-slate-700">{video.caption}</p>}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={video.isPublished ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700" : "rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700"}>{video.isPublished ? "Yayında" : "Taslak"}</span>
        <div className="flex gap-2">
          <button type="button" onClick={onToggle} disabled={busy} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:opacity-60">{video.isPublished ? "Yayından kaldır" : "Yayınla"}</button>
          <button type="button" onClick={onDelete} disabled={busy} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:border-red-300 disabled:opacity-60">Sil</button>
        </div>
      </div>
    </article>
  );
}
