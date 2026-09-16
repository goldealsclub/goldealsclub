import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type PublishedVideo = {
  id: string;
  label: string;
  category: string;
  public_url: string;
  published_at: string;
  style: string;
};

const PublishedVideos = () => {
  const [videos, setVideos] = useState<PublishedVideo[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("generated_videos" as any)
        .select("id,label,category,public_url,published_at,style")
        .eq("is_published", true)
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(3);
      setVideos(((data as any[]) || []) as PublishedVideo[]);
    })();
  }, []);

  if (videos.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-16">
      <h2 className="font-display text-2xl md:text-3xl tracking-wider mb-2">En vidéo</h2>
      <p className="font-body text-xs text-foreground/50 mb-8">
        Les sélections du moment, en mouvement.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((v) => (
          <figure key={v.id} className="flex flex-col gap-2">
            <video
              src={v.public_url}
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
              className="w-full aspect-[9/16] object-cover bg-foreground/5"
            />
            <figcaption className="font-body text-xs uppercase tracking-widest text-foreground/60">
              {v.label}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};

export default PublishedVideos;
