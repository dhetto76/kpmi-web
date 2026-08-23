import { useEffect, useId, useState } from "react";
import { useFetcher } from "react-router";
import { Eye, EyeOff, KeyRound, X } from "lucide-react";

/**
 * Sets another account's password.
 *
 * The inputs stay controlled so `close()` can clear them — a password must not
 * survive in the DOM after the panel is dismissed. The fetcher carries the
 * values in its own POST rather than the page's form, so a stray Enter
 * elsewhere on the page cannot submit a password.
 */
export function PasswordControl({ id, userName }: { id: string; userName: string }) {
  const passwordId = useId();
  const confirmId = useId();
  const fetcher = useFetcher<{ error?: string; ok?: boolean }>();
  const pending = fetcher.state !== "idle";

  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const error = fetcher.data?.error ?? null;

  // Closing on success has to wait for the response, which arrives after the
  // submit handler has already returned.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      setPassword("");
      setConfirmation("");
      setShowPassword(false);
      setOpen(false);
      setMessage("Kata sandi berhasil diatur.");
    }
  }, [fetcher.state, fetcher.data]);

  function close() {
    if (pending) return;
    setOpen(false);
    setPassword("");
    setConfirmation("");
    setShowPassword(false);
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
    <fetcher.Form
      method="post"
      className="w-64 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3"
    >
      <input type="hidden" name="intent" value="set-user-password" />
      <input type="hidden" name="id" value={id} />

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
          name="password"
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
        name="confirm_password"
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
    </fetcher.Form>
  );
}
