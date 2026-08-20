"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { signIn } from "../actions";
import { Button, Card, Field, Input } from "@/components/ui";

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signIn(formData);
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <Card className="p-8">
      <h1 className="font-display text-2xl font-extrabold text-maroon-900">Masuk</h1>
      <p className="mt-1 text-sm text-gray-600">
        Masuk untuk mengelola profil, usaha, dan produk Anda.
      </p>
      <div className="gold-rule mt-5 w-16" />

      {error && (
        <div className="mt-6 flex items-start gap-2.5 rounded-lg bg-red-50 p-3.5 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form action={onSubmit} className="mt-6 space-y-4">
        <Field label="Email" required>
          <Input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="nama@email.com"
          />
        </Field>

        <Field label="Kata Sandi" required>
          <Input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </Field>

        <div className="text-right">
          <Link href="/lupa-sandi" className="text-sm font-medium text-maroon-600 hover:underline">
            Lupa kata sandi?
          </Link>
        </div>

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Memproses…" : "Masuk"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-bold text-maroon-600 hover:underline">
          Daftar sekarang
        </Link>
      </p>
    </Card>
  );
}
