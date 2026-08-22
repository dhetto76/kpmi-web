"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { signUp } from "../actions";
import { Button, Card, Field, Input } from "@/components/ui";

/**
 * Step 1 of registration: account only.
 *
 * Business details are collected afterwards in the dashboard wizard. Keeping
 * signup to four fields means nobody is blocked by an NPWP or SIUP number they
 * do not have to hand.
 */
export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await signUp(formData);
      if (!result) return;
      if ("error" in result) setError(result.error);
      // Account created, but the project requires email confirmation, so there
      // is no session to redirect with. Show the check-your-inbox message.
      else if ("message" in result) setNotice(result.message);
    });
  }

  return (
    <Card className="p-8">
      <h1 className="font-display text-2xl font-extrabold text-maroon-900">
        Daftar Anggota
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Buat akun dulu — data usaha bisa dilengkapi setelahnya.
      </p>
      <div className="gold-rule mt-5 w-16" />

      <ol className="mt-6 flex items-center gap-2 text-xs font-medium">
        <li className="flex items-center gap-1.5 text-maroon-600">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-maroon-600 text-[10px] font-bold text-white">
            1
          </span>
          Akun
        </li>
        <span className="h-px flex-1 bg-gray-200" />
        <li className="flex items-center gap-1.5 text-gray-400">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-gray-200 text-[10px] font-bold">
            2
          </span>
          Profil
        </li>
        <span className="h-px flex-1 bg-gray-200" />
        <li className="flex items-center gap-1.5 text-gray-400">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-gray-200 text-[10px] font-bold">
            3
          </span>
          Usaha
        </li>
      </ol>

      {error && (
        <div className="mt-6 flex items-start gap-2.5 rounded-lg bg-red-50 p-3.5 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice ? (
        <div className="mt-6">
          <div className="flex items-start gap-2.5 rounded-lg bg-green-50 p-3.5 text-sm text-green-800">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{notice}</span>
          </div>
          <p className="mt-5 text-center text-sm text-gray-600">
            Sudah mengonfirmasi email?{" "}
            <Link href="/masuk" className="font-bold text-maroon-600 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      ) : (
      <form action={onSubmit} className="mt-6 space-y-4">
        <Field label="Nama Lengkap" required>
          <Input name="full_name" required autoComplete="name" placeholder="Nama lengkap Anda" />
        </Field>

        <Field label="Email" required>
          <Input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="nama@email.com"
          />
        </Field>

        <Field label="Kata Sandi" required hint="Minimal 8 karakter">
          <Input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Field>

        <Field label="Konfirmasi Kata Sandi" required>
          <Input
            name="confirm_password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Field>

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Memproses…" : "Buat Akun"}
        </Button>
      </form>
      )}

      {!notice && (
        <>
          <ul className="mt-6 space-y-1.5 border-t border-gray-100 pt-5 text-xs text-gray-500">
            {[
              "Gratis, tanpa biaya pendaftaran",
              "Data usaha bisa dilengkapi kapan saja",
              "Keanggotaan diverifikasi oleh pengurus",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0 text-green-600" />
                {t}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-center text-sm text-gray-600">
            Sudah punya akun?{" "}
            <Link href="/masuk" className="font-bold text-maroon-600 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </>
      )}
    </Card>
  );
}
