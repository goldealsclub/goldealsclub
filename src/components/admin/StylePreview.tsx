/**
 * Miniatures instantanées des 3 directions artistiques (Adidas / Zara / Nike).
 *
 * Approche : mockups HTML/CSS responsifs (aspect 9:16) qui reproduisent
 * fidèlement la composition de chaque scène DealScene Remotion :
 *  - Adidas  → bloc ink en bas, 3-stripes, dossard, prix XXL
 *  - Zara    → produit centré, titre serif, prix discret, beaucoup d'air
 *  - Nike    → bloc ink + chip accent orange, kinetic
 *
 * Aucune sneakers dessinée à la main (visuellement catastrophique) :
 * on rend un "bloc produit" sobre — un carré arrondi crème — qui sert
 * uniquement de repère de composition.
 */
import { BG_PRESETS, type BgPreset } from "@/pages/AdminVideoPage";
import { cn } from "@/lib/utils";

type StyleId = "adidas" | "zara" | "nike";

interface Blueprint {
  label: string;
  sub: string;
  // Affichage
  serif: boolean;
  showStripes: boolean;
  chipAccent: boolean; // chip discount en couleur d'accent (Nike)
  layout: "block" | "editorial" | "kinetic";
  discount: string;
  price: string;
  origPrice: string;
  brand: string;
  category: string;
  title: string;
}

const BLUEPRINTS: Record<StyleId, Blueprint> = {
  adidas: {
    label: "Adidas",
    sub: "Geometric & graphic",
    serif: false,
    showStripes: true,
    chipAccent: false,
    layout: "block",
    discount: "−45%",
    price: "59€",
    origPrice: "109 €",
    brand: "ADIDAS",
    category: "SNEAKERS",
    title: "SAMBA OG",
  },
  zara: {
    label: "Zara",
    sub: "Editorial fashion",
    serif: true,
    showStripes: false,
    chipAccent: false,
    layout: "editorial",
    discount: "",
    price: "199",
    origPrice: "279 €",
    brand: "ZARA",
    category: "SÉLECTION",
    title: "Bouclé Coat",
  },
  nike: {
    label: "Nike",
    sub: "Athletic & kinetic",
    serif: false,
    showStripes: false,
    chipAccent: true,
    layout: "kinetic",
    discount: "−50%",
    price: "89€",
    origPrice: "179 €",
    brand: "NIKE",
    category: "RUNNING",
    title: "AIR MAX 90",
  },
};

interface CardProps {
  styleId: StyleId;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const PreviewCard: React.FC<CardProps> = ({ styleId, active, disabled, onClick }) => {
  const b = BLUEPRINTS[styleId];
  const p = BG_PRESETS[styleId];
  const display = b.serif
    ? "'Playfair Display', Georgia, serif"
    : "'Archivo Black', 'Archivo', system-ui, sans-serif";
  const body = "Inter, system-ui, sans-serif";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "group relative flex flex-col items-stretch gap-2 rounded-lg border bg-card p-2 text-left transition",
        "hover:border-foreground/50 hover:shadow-md",
        "disabled:cursor-not-allowed disabled:opacity-60",
        active && "border-foreground ring-2 ring-foreground/80 shadow-md",
      )}
    >
      {/* Mockup 9:16 responsive */}
      <div
        className="relative w-full overflow-hidden rounded-md"
        style={{
          aspectRatio: "9 / 16",
          background: `linear-gradient(180deg, ${p.bgTop} 0%, ${p.bgMid} 50%, ${p.bgBot} 100%)`,
          color: p.ink,
          fontFamily: body,
        }}
      >
        {/* Header marque + dossard */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-[6%] py-[4%]">
          <span
            style={{
              fontFamily: b.serif ? body : display,
              fontWeight: b.serif ? 500 : 900,
              fontSize: "9px",
              letterSpacing: b.serif ? "0.4em" : "0.05em",
              color: p.ink,
            }}
          >
            {b.brand}
          </span>
          {b.layout !== "editorial" && (
            <span
              style={{
                fontFamily: display,
                fontWeight: 900,
                fontSize: "9px",
                padding: "2px 5px",
                border: `1.2px solid ${p.ink}`,
                color: p.ink,
                lineHeight: 1,
              }}
            >
              01/05
            </span>
          )}
          {b.layout === "editorial" && (
            <span
              style={{
                fontSize: "8px",
                letterSpacing: "0.3em",
                color: p.inkSoft,
              }}
            >
              01 — 05
            </span>
          )}
        </div>

        {/* Zone produit (carré arrondi crème, sobre, juste repère de compo) */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: b.layout === "editorial" ? "18%" : "16%",
            width: "72%",
            height: b.layout === "editorial" ? "44%" : "48%",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "8%",
              background: `linear-gradient(160deg, ${p.bgTop} 0%, ${p.bgBot} 100%)`,
              boxShadow: `inset 0 0 0 1px ${p.inkSoft}, 0 10px 18px -8px rgba(0,0,0,0.18)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: p.inkSoft,
              fontFamily: display,
              fontWeight: 900,
              fontSize: "10px",
              letterSpacing: "0.2em",
            }}
          >
            PRODUIT
          </div>
        </div>

        {/* ── ZARA : layout éditorial, titre serif centré, prix discret ── */}
        {b.layout === "editorial" && (
          <div
            className="absolute inset-x-0 flex flex-col items-center text-center"
            style={{ bottom: "8%", padding: "0 8%" }}
          >
            <span
              style={{
                fontSize: "7px",
                letterSpacing: "0.45em",
                color: p.inkSoft,
                marginBottom: "6px",
              }}
            >
              {b.category}
            </span>
            <span
              style={{
                fontFamily: display,
                fontWeight: 500,
                fontSize: "15px",
                lineHeight: 1.1,
                color: p.ink,
                marginBottom: "8px",
              }}
            >
              {b.title}
            </span>
            <div className="flex items-baseline gap-2">
              <span
                style={{
                  fontFamily: display,
                  fontWeight: 400,
                  fontSize: "22px",
                  lineHeight: 1,
                  color: p.ink,
                  letterSpacing: "-0.02em",
                }}
              >
                {b.price}
                <span style={{ fontSize: "11px", marginLeft: "2px" }}>€</span>
              </span>
              <span
                style={{
                  fontSize: "9px",
                  color: p.inkSoft,
                  textDecoration: "line-through",
                }}
              >
                {b.origPrice}
              </span>
            </div>
          </div>
        )}

        {/* ── ADIDAS / NIKE : bloc ink en bas avec prix XXL + chip ── */}
        {b.layout !== "editorial" && (
          <>
            {/* 3-stripes adidas frontière */}
            {b.showStripes && (
              <div
                className="absolute inset-x-0 flex flex-col gap-[2px]"
                style={{ bottom: "37%" }}
              >
                <div style={{ height: "1.5px", background: p.ink }} />
                <div style={{ height: "1.5px", background: p.ink }} />
                <div style={{ height: "1.5px", background: p.ink }} />
              </div>
            )}
            {/* bloc ink */}
            <div
              className="absolute inset-x-0 bottom-0 flex flex-col justify-between"
              style={{
                height: "34%",
                background: p.ink,
                color: "#fff",
                padding: "8% 6%",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "7px",
                    letterSpacing: "0.4em",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  {b.category}
                </div>
                <div
                  style={{
                    fontFamily: display,
                    fontWeight: 900,
                    fontSize: "14px",
                    marginTop: "3px",
                    letterSpacing: "-0.01em",
                    color: "#fff",
                  }}
                >
                  {b.title}
                </div>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div
                  style={{
                    fontFamily: display,
                    fontWeight: 900,
                    fontSize: "30px",
                    color: "#fff",
                    lineHeight: 0.9,
                    letterSpacing: "-0.05em",
                  }}
                >
                  {b.price}
                </div>
                <div
                  style={{
                    background: b.chipAccent ? p.accent : "#fff",
                    color: b.chipAccent ? "#fff" : p.ink,
                    padding: "4px 7px",
                    fontFamily: display,
                    fontWeight: 900,
                    fontSize: "13px",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {b.discount}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="px-1 pb-1">
        <div className="text-sm font-semibold leading-tight">{b.label}</div>
        <div className="text-[11px] text-muted-foreground leading-tight">{b.sub}</div>
      </div>

      {active && (
        <span
          aria-hidden
          className="absolute right-3 top-3 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background"
        >
          Actif
        </span>
      )}
    </button>
  );
};

interface Props {
  value: BgPreset;
  onChange: (v: BgPreset) => void;
  disabled?: boolean;
}

export const StylePreview: React.FC<Props> = ({ value, onChange, disabled }) => {
  const ids: StyleId[] = ["adidas", "zara", "nike"];
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {ids.map((id) => (
        <PreviewCard
          key={id}
          styleId={id}
          active={value === id}
          disabled={disabled}
          onClick={() => onChange(id)}
        />
      ))}
    </div>
  );
};
