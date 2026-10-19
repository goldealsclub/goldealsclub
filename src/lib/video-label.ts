/**
 * Le robot vidéo enregistre la légende prête à publier dans le champ `label`
 * de la vidéo, après ce séparateur (le serveur n'accepte que des fichiers vidéo).
 * Le site public n'affiche que le titre ; l'admin propose de copier la légende.
 */
export const CAPTION_SEPARATOR = "\n\n— Légende —\n";

export function splitVideoLabel(label: string | null | undefined): { title: string; caption: string } {
  const raw = label ?? "";
  const i = raw.indexOf(CAPTION_SEPARATOR);
  if (i < 0) return { title: raw, caption: "" };
  return { title: raw.slice(0, i), caption: raw.slice(i + CAPTION_SEPARATOR.length).trim() };
}
