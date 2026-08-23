"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Loader2, ImageOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

type Bucket = "avatars" | "businesses" | "products";

async function uploadFile(bucket: Bucket, file: File, userId: string) {
  const supabase = createClient();

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  // Storage policies require the first path segment to be the user's id.
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return publicUrl;
}

function validate(file: File) {
  if (!ACCEPTED.includes(file.type)) {
    return "Format harus JPG, PNG, atau WebP.";
  }
  if (file.size > MAX_BYTES) {
    return "Ukuran berkas maksimal 5 MB.";
  }
  return null;
}

/* --------------------------------------------------------- Single image */

/**
 * Uploads one image and reports the public URL. The URL is mirrored into a
 * hidden input so the surrounding plain <form> submits it like any other field.
 */
export function ImageUpload({
  name,
  bucket,
  userId,
  defaultValue,
  label = "Unggah gambar",
  aspect = "square",
}: {
  name: string;
  bucket: Bucket;
  userId: string;
  defaultValue?: string | null;
  label?: string;
  aspect?: "square" | "wide";
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(file: File) {
    const problem = validate(file);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setBusy(true);
    try {
      setUrl(await uploadFile(bucket, file, userId));
    } catch {
      setError("Gagal mengunggah. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={url} />

      <div
        className={cn(
          "relative overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50",
          aspect === "square" ? "aspect-square max-w-44" : "aspect-[3/1]",
        )}
      >
        {url ? (
          <>
            <Image
              src={url}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => setUrl("")}
              aria-label="Hapus gambar"
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400 transition-colors hover:text-maroon-600"
          >
            {busy ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <Upload size={22} />
            )}
            <span className="px-3 text-center text-xs font-medium">
              {busy ? "Mengunggah…" : label}
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />

      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-gray-500">JPG, PNG, atau WebP. Maks 5 MB.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------- Multiple images */

/**
 * Uploads several images. Submits as repeated fields of the same name, which
 * FormData.getAll() reads back as an array.
 */
export function MultiImageUpload({
  name,
  bucket,
  userId,
  defaultValue = [],
  max = 6,
}: {
  name: string;
  bucket: Bucket;
  userId: string;
  defaultValue?: string[];
  max?: number;
}) {
  const [urls, setUrls] = useState<string[]>(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(files: FileList) {
    setError(null);

    const room = max - urls.length;
    if (room <= 0) {
      setError(`Maksimal ${max} gambar.`);
      return;
    }

    const chosen = Array.from(files).slice(0, room);
    for (const file of chosen) {
      const problem = validate(file);
      if (problem) {
        setError(problem);
        return;
      }
    }

    setBusy(true);
    try {
      const uploaded = await Promise.all(
        chosen.map((f) => uploadFile(bucket, f, userId)),
      );
      setUrls((prev) => [...prev, ...uploaded]);
    } catch {
      setError("Sebagian gambar gagal diunggah.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {urls.map((u) => (
        <input key={u} type="hidden" name={name} value={u} />
      ))}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {urls.map((u, i) => (
          <div
            key={u}
            className="relative aspect-square overflow-hidden rounded-lg border border-gray-200"
          >
            <Image
              src={u}
              alt=""
              fill
              sizes="150px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => setUrls((prev) => prev.filter((_, j) => j !== i))}
              aria-label="Hapus gambar"
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {urls.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 transition-colors hover:text-maroon-600"
          >
            {busy ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Upload size={20} />
            )}
            <span className="text-[10px] font-medium">Tambah</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) onPick(e.target.files);
          e.target.value = "";
        }}
      />

      {error ? (
        <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-gray-500">
          Hingga {max} gambar. JPG, PNG, atau WebP, maks 5 MB masing-masing.
        </p>
      )}
    </div>
  );
}

/** Placeholder for a card with no image. */
export function ImageFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-maroon-deep pattern-geo grid place-items-center text-white/25",
        className,
      )}
    >
      <ImageOff size={32} />
    </div>
  );
}
