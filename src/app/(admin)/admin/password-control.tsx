"use client";

import { useId, useState, useTransition } from "react";
import { Eye, EyeOff, KeyRound, X } from "lucide-react";
import { setUserPassword } from "./actions";

export function PasswordControl({ id, userName }: { id: string; userName: string }) {
  const passwordId = useId();
  const confirmId = useId();
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    if (pending) return;
    setOpen(false);
    setPassword("");
    setConfirmation("");
    setError(null);
    setShowPassword(false);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await setUserPassword(id, password, confirmation);
      if ("error" in result) {
        setError(result.error);
        return;
      }

      setPassword("");
      setConfirmation("");
      setOpen(false);
      setMessage("Kata sandi berhasil diatur.");
    });
  }

  if (!open) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:border-maroon-200 hover:bg-maroon-50 hover:text-maroon-700"
          aria-label={`Atur kata sandi ${userName}`}
        >
          <KeyRound size={13} /> Atur sandi
        </button>
        {message && (
          <p role="status" className="text-xs font-medium text-green-700">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="w-64 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-bold text-gray-800">
          Sandi baru untuk {userName}
        </p>
        <button
          type="button"
          onClick={close}
          disabled={pending}
          aria-label="Tutup formulir kata sandi"
          className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50"
        >
          <X size={14} />
        </button>
      </div>

      <label htmlFor={passwordId} className="sr-only">
        Kata sandi baru
      </label>
      <div className="relative">
        <input
          id={passwordId}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          maxLength={72}
          required
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          disabled={pending}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-9 text-xs text-gray-900 outline-none focus:border-maroon-600 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700"
        >
          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      <label htmlFor={confirmId} className="sr-only">
        Konfirmasi kata sandi baru
      </label>
      <input
        id={confirmId}
        type={showPassword ? "text" : "password"}
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        minLength={8}
        maxLength={72}
        required
        autoComplete="new-password"
        placeholder="Ulangi kata sandi"
        disabled={pending}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-maroon-600 disabled:opacity-60"
      />

      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-maroon-600 px-3 py-2 text-xs font-bold text-white hover:bg-maroon-700 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : "Simpan kata sandi"}
      </button>
    </form>
  );
}
