"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { requestPasswordReset } from "../actions";
import { Button, Card, Field, Input } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await requestPasswordReset(formData);
      setState("error" in result ? "error" : "sent");
    });
  }

  if (state === "sent") {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 size={44} className="mx-auto text-green-600" />
        <h1 className="mt-4 font-display text-xl font-extrabold text-maroon-900">
          Periksa email Anda
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Jika email tersebut terdaftar, kami telah mengirimkan tautan untuk
          mengatur ulang kata sandi.
        </p>
        <Link
          href="/masuk"
          className="mt-6 inline-block text-sm font-bold text-maroon-600 hover:underline"
        >
          Kembali ke halaman masuk
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <h1 className="font-display text-2xl font-extrabold text-maroon-900">
        Lupa Kata Sandi
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Masukkan email Anda dan kami kirimkan tautan untuk mengatur ulang.
      </p>
      <div className="gold-rule mt-5 w-16" />

      {state === "error" && (
        <div className="mt-6 flex items-start gap-2.5 rounded-lg bg-red-50 p-3.5 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>Terjadi kesalahan. Silakan coba lagi.</span>
        </div>
      )}

      <form action={onSubmit} className="mt-6 space-y-4">
        <Field label="Email" required>
          <Input name="email" type="email" required placeholder="nama@email.com" />
        </Field>
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Mengirim…" : "Kirim Tautan"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        <Link href="/masuk" className="font-bold text-maroon-600 hover:underline">
          Kembali ke halaman masuk
        </Link>
      </p>
    </Card>
  );
}
