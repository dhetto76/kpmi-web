import { useState } from "react";
import { useFetcher } from "react-router";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Play,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  DEFAULT_GRADIENT,
  HERO_LIMITS,
  HERO_LINKS,
  MAX_SLIDES,
  type HeroSlideRow,
} from "@/lib/hero";

/**
 * Editor for the homepage carousel.
 *
 * Replaces hand-editing HERO_SLIDES in content/site.ts, so the shape of the
 * page follows what docs/hero-carousel.md asked a person to do by hand: one
 * card per slide, each with its own form, plus reorder and activate controls.
 *
 * Each card carries a live preview built from the same layers the real hero
 * uses — background image, maroon scrim, geometric pattern, centred copy.
 * Getting the contrast of white text over a photo wrong is the failure mode
 * that matters here, and it is invisible in a form full of text inputs.
 *
 * Reordering and activation go through a shared fetcher: they are list-wide
 * and only one runs at a time. Each slide's own save is a separate fetcher so
 * that saving one card does not put every other card into a pending state.
 */
export function CarouselEditor({
  slides,
  isFallback,
  canEdit,
  userId,
}: {
  slides: HeroSlideRow[];
  isFallback: boolean;
  canEdit: boolean;
  userId: string;
}) {
  const list = useFetcher<{ error?: string; message?: string }>();
  const pending = list.state !== "idle";

  const active = slides.filter((slide) => slide.is_active).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-maroon-900">
            Carousel Beranda
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-600">
            Banner besar di bagian atas halaman depan. Banner aktif berputar
            otomatis setiap 6 detik sesuai urutan di bawah.
          </p>
        </div>

        {canEdit && !isFallback && (
          <button
            type="button"
            onClick={() => list.submit({ intent: "create" }, { method: "post" })}
            disabled={pending || slides.length >= MAX_SLIDES}
            title={
              slides.length >= MAX_SLIDES
                ? `Maksimal ${MAX_SLIDES} banner`
                : "Tambah banner baru"
            }
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-maroon-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-maroon-700 disabled:opacity-50"
          >
            <Plus size={16} /> Tambah banner
          </button>
        )}
      </div>

      {isFallback && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Carousel ini masih memakai data bawaan aplikasi. Jalankan migrasi
          <code className="mx-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs">
            20260824000001_hero_slides.sql
          </code>
          agar dapat diubah dari halaman ini.
        </p>
      )}

      {list.data?.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {list.data.error}
        </p>
      )}
      {list.data?.message && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {list.data.message}
        </p>
      )}

      <p className="text-sm text-gray-500">
        <span className="font-bold text-gray-700">{active}</span> tampil di beranda
        {slides.length !== active && ` · ${slides.length - active} disembunyikan`}
      </p>

      {slides.length === 0 && (
        <p className="rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center text-sm text-gray-500 shadow-sm">
          Belum ada banner. Selama daftar ini kosong, beranda menampilkan banner
          bawaan aplikasi.
        </p>
      )}

      <div className="space-y-4">
        {slides.map((slide, index) => (
          <SlideCard
            key={slide.id || slide.title}
            slide={slide}
            index={index}
            isFirst={index === 0}
            isLast={index === slides.length - 1}
            canEdit={canEdit && !isFallback}
            userId={userId}
            listPending={pending}
            onList={(fields) => list.submit(fields, { method: "post" })}
          />
        ))}
      </div>

      {!canEdit && (
        <p className="text-sm text-gray-500">
          Hanya Super Admin yang dapat mengubah carousel beranda.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- One slide */

/** The subset of a row the live preview renders. */
function previewOf(slide: HeroSlideRow) {
  return {
    badge: slide.badge,
    title: slide.title,
    subtitle: slide.subtitle,
    image: slide.image_url ?? "",
    gradient: slide.gradient,
    primary: slide.primary_label,
    secondary: slide.secondary_label,
  };
}

function SlideCard({
  slide,
  index,
  isFirst,
  isLast,
  canEdit,
  userId,
  listPending,
  onList,
}: {
  slide: HeroSlideRow;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  canEdit: boolean;
  userId: string;
  listPending: boolean;
  onList: (fields: Record<string, string>) => void;
}) {
  const save = useFetcher<{ error?: string; message?: string }>();
  const saving = save.state !== "idle";

  const [confirming, setConfirming] = useState(false);

  // Mirrored into state so the preview updates as the administrator types.
  // The inputs stay uncontrolled apart from this: a save re-renders the card
  // from the loader, and controlled values would fight that.
  const [preview, setPreview] = useState(() => previewOf(slide));

  // After a save the loader hands back what was actually stored — the action
  // trims and defaults some fields — so the preview is re-derived from the new
  // row. Adjusting during render rather than in an effect: React re-runs this
  // component immediately, before anything is painted, so the preview never
  // shows the pre-save values for a frame.
  const [savedSlide, setSavedSlide] = useState(slide);
  if (savedSlide !== slide) {
    setSavedSlide(slide);
    setPreview(previewOf(slide));
  }

  const track =
    (key: keyof typeof preview) => (event: { target: { value: string } }) =>
      setPreview((prev) => ({ ...prev, [key]: event.target.value }));

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-sm",
        slide.is_active ? "border-gray-100" : "border-gray-200 bg-gray-50/60",
      )}
    >
      {/* ------------------------------------------------------ Card header */}
      <header className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-maroon-50 text-xs font-extrabold text-maroon-700">
          {index + 1}
        </span>

        <span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-900">
          {preview.title || "Tanpa judul"}
        </span>

        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
            slide.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600",
          )}
        >
          {slide.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
          {slide.is_active ? "Tampil" : "Disembunyikan"}
        </span>

        {canEdit && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => onList({ intent: "move", id: slide.id, direction: "up" })}
              disabled={listPending || isFirst}
              title="Naikkan urutan"
              className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 disabled:opacity-30"
            >
              <ChevronUp size={15} />
            </button>
            <button
              type="button"
              onClick={() => onList({ intent: "move", id: slide.id, direction: "down" })}
              disabled={listPending || isLast}
              title="Turunkan urutan"
              className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 disabled:opacity-30"
            >
              <ChevronDown size={15} />
            </button>

            <button
              type="button"
              onClick={() =>
                onList({
                  intent: "set-active",
                  id: slide.id,
                  is_active: String(!slide.is_active),
                })
              }
              disabled={listPending}
              title={slide.is_active ? "Sembunyikan dari beranda" : "Tampilkan di beranda"}
              className={cn(
                "rounded-lg p-2 disabled:opacity-50",
                slide.is_active
                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "bg-green-50 text-green-700 hover:bg-green-100",
              )}
            >
              {slide.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>

            {confirming ? (
              <span className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onList({ intent: "delete", id: slide.id })}
                  disabled={listPending}
                  className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Hapus
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                  Batal
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={listPending}
                title="Hapus banner"
                className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </header>

      <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* ----------------------------------------------------------- Form */}
        <save.Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value="save" />
          <input type="hidden" name="id" value={slide.id} />

          {save.data?.error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {save.data.error}
            </p>
          )}
          {save.data?.message && !save.data.error && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              {save.data.message}
            </p>
          )}

          <Field label="Label atas" hint="Teks kecil di atas judul. Boleh dikosongkan.">
            <Input
              name="badge"
              defaultValue={slide.badge}
              onChange={track("badge")}
              disabled={!canEdit}
              maxLength={HERO_LIMITS.badge}
              placeholder="Sejak 2010 · Komunitas Pengusaha Muslim Indonesia"
            />
          </Field>

          <Field label="Judul" hint="Idealnya tidak lebih dari dua baris.">
            <Input
              name="title"
              defaultValue={slide.title}
              onChange={track("title")}
              disabled={!canEdit}
              maxLength={HERO_LIMITS.title}
              required
            />
          </Field>

          <Field label="Deskripsi" hint="Satu kalimat penjelas di bawah judul.">
            <Textarea
              name="subtitle"
              defaultValue={slide.subtitle}
              onChange={track("subtitle")}
              disabled={!canEdit}
              maxLength={HERO_LIMITS.subtitle}
              className="min-h-20"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tombol utama">
              <Input
                name="primary_label"
                defaultValue={slide.primary_label}
                onChange={track("primary")}
                disabled={!canEdit}
                maxLength={HERO_LIMITS.label}
                placeholder="Gabung Sekarang"
              />
            </Field>
            <Field label="Tujuan tombol utama">
              <Select
                name="primary_href"
                defaultValue={slide.primary_href}
                disabled={!canEdit}
              >
                {HERO_LINKS.map((link) => (
                  <option key={link.href} value={link.href}>
                    {link.label} ({link.href})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Tombol kedua">
              <Input
                name="secondary_label"
                defaultValue={slide.secondary_label}
                onChange={track("secondary")}
                disabled={!canEdit}
                maxLength={HERO_LIMITS.label}
                placeholder="Jelajahi Direktori"
              />
            </Field>
            <Field label="Tujuan tombol kedua">
              <Select
                name="secondary_href"
                defaultValue={slide.secondary_href}
                disabled={!canEdit}
              >
                {HERO_LINKS.map((link) => (
                  <option key={link.href} value={link.href}>
                    {link.label} ({link.href})
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Gambar latar"
            hint="Foto lebar dan cenderung gelap. Kosongkan untuk memakai gradasi warna saja."
          >
            {canEdit ? (
              <ImageUpload
                name="image_url"
                bucket="hero"
                userId={userId}
                defaultValue={slide.image_url}
                label="Unggah gambar banner"
                aspect="wide"
              />
            ) : (
              <p className="text-sm text-gray-500">
                {slide.image_url ?? "Tanpa gambar — memakai gradasi warna."}
              </p>
            )}
          </Field>

          {/*
            The image widget owns `image_url`, so the preview only learns about
            a new upload on the next load. Mirroring it here would mean two
            inputs of the same name; the preview shows the saved image instead.
          */}

          <Field
            label="Gradasi warna"
            hint="Dipakai bila tidak ada gambar, dan sebagai warna dasar di belakangnya."
          >
            <Input
              name="gradient"
              defaultValue={slide.gradient}
              onChange={track("gradient")}
              disabled={!canEdit}
              maxLength={HERO_LIMITS.gradient}
              placeholder={DEFAULT_GRADIENT}
              className="font-mono text-xs"
            />
          </Field>

          {canEdit && (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-maroon-700 disabled:opacity-50"
            >
              <Save size={16} /> {saving ? "Menyimpan…" : "Simpan banner"}
            </button>
          )}
        </save.Form>

        {/* -------------------------------------------------------- Preview */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            Pratinjau
          </p>
          <SlidePreview {...preview} />
          <p className="mt-2 text-xs text-gray-500">
            Perkiraan tampilan di beranda. Gambar yang baru diunggah muncul di
            sini setelah banner disimpan.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Preview */

/**
 * A miniature of the real hero.
 *
 * Deliberately rebuilt rather than reusing HeroCarousel: that component reads
 * the live slide list, auto-rotates, and fills the viewport. What matters here
 * is only whether the white text stays readable over the chosen background,
 * so this mirrors the same layer stack at card size.
 */
function SlidePreview({
  badge,
  title,
  subtitle,
  image,
  gradient,
  primary,
  secondary,
}: {
  badge: string;
  title: string;
  subtitle: string;
  image: string;
  gradient: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="relative isolate aspect-[16/10] overflow-hidden rounded-xl border border-gray-200">
      <div className="absolute inset-0 -z-10" style={{ background: gradient }}>
        {image && (
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-maroon-950/85 via-maroon-900/70 to-maroon-800/60" />
      </div>

      <div className="pattern-geo absolute inset-0 -z-10" />

      <div className="flex h-full flex-col items-center justify-center px-5 text-center">
        {badge && (
          <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-semibold text-gold-300 backdrop-blur">
            <span className="text-gold-400">★</span>
            <span className="line-clamp-1">{badge}</span>
          </div>
        )}

        <p className="font-display text-lg font-extrabold leading-tight text-balance text-white">
          {title || "Tanpa judul"}
        </p>

        {subtitle && (
          <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-balance text-white/80">
            {subtitle}
          </p>
        )}

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {primary && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-400 px-3 py-1.5 text-[10px] font-bold text-maroon-950">
              {primary} <ArrowRight size={10} />
            </span>
          )}
          {secondary && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur">
              <Play size={9} />
              {secondary}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
