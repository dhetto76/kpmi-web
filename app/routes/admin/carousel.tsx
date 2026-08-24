import { data } from "react-router";
import type { Route } from "./+types/carousel";
import { requireAdminContext } from "@/lib/auth.server";
import { SUPER_ADMIN_ONLY } from "@/lib/reference.server";
import { DEFAULT_GRADIENT, MAX_SLIDES, parseHeroSlide } from "@/lib/hero";
import { listHeroSlides } from "@/lib/hero.server";
import { CarouselEditor } from "@/components/admin/carousel-editor";

export const meta: Route.MetaFunction = () => [
  { title: "Carousel Beranda | Panel Admin" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);

  const { slides, isFallback } = await listHeroSlides(supabase);

  return data(
    { slides, isFallback, canEdit: ctx.isSuperAdmin, userId: ctx.userId },
    { headers },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { context: ctx, supabase, headers } = await requireAdminContext(request);

  // The homepage is national, not regional. A korwil admin runs a region, so
  // the carousel is super-admin work by the same rule as site settings. RLS
  // enforces this underneath.
  if (!ctx.isSuperAdmin) {
    return data({ error: SUPER_ADMIN_ONLY }, { status: 403, headers });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");
  const fail = (error: string, status = 400) => data({ error }, { status, headers });

  /* ------------------------------------------------------------- create */
  if (intent === "create") {
    const { count } = await supabase
      .from("hero_slides")
      .select("id", { count: "exact", head: true });

    if ((count ?? 0) >= MAX_SLIDES) {
      return fail(
        `Maksimal ${MAX_SLIDES} banner. Hapus atau nonaktifkan salah satu terlebih dahulu.`,
        409,
      );
    }

    // Appended to the end; spacing by 10 leaves room to reorder later.
    const { data: last } = await supabase
      .from("hero_slides")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("hero_slides").insert({
      title: "Banner baru",
      subtitle: "",
      badge: "",
      gradient: DEFAULT_GRADIENT,
      primary_label: "Gabung Sekarang",
      primary_href: "/daftar",
      secondary_label: "Jelajahi Direktori",
      secondary_href: "/bisnis",
      // New banners start switched off so a half-written draft never appears
      // on the homepage between saving and finishing.
      is_active: false,
      sort_order: (last?.sort_order ?? 0) + 10,
      updated_by: ctx.userId,
    });

    if (error) return fail("Gagal menambahkan banner.", 500);

    return data({ message: "Banner baru ditambahkan. Lengkapi lalu aktifkan." }, { headers });
  }

  /* --------------------------------------------------------------- save */
  if (intent === "save") {
    const id = String(formData.get("id") ?? "");
    if (!id) return fail("Banner tidak ditemukan.", 404);

    const parsed = parseHeroSlide(formData);
    if (!parsed.ok) return fail(parsed.error);

    const { error, count } = await supabase
      .from("hero_slides")
      .update({ ...parsed.value, updated_by: ctx.userId }, { count: "exact" })
      .eq("id", id);

    if (error) return fail("Gagal menyimpan banner.", 500);
    // RLS turns a forbidden write into zero rows rather than an error, so a
    // silent no-op has to be reported as one.
    if (!count) return fail("Banner tidak ditemukan.", 404);

    return data({ message: "Banner tersimpan." }, { headers });
  }

  /* -------------------------------------------------- activate / retire */
  if (intent === "set-active") {
    const id = String(formData.get("id") ?? "");
    const isActive = formData.get("is_active") === "true";

    const { error, count } = await supabase
      .from("hero_slides")
      .update({ is_active: isActive, updated_by: ctx.userId }, { count: "exact" })
      .eq("id", id);

    if (error) return fail("Gagal memperbarui status.", 500);
    if (!count) return fail("Banner tidak ditemukan.", 404);

    return data(
      {
        message: isActive
          ? "Banner ditampilkan di beranda."
          : "Banner disembunyikan dari beranda.",
      },
      { headers },
    );
  }

  /* ------------------------------------------------------------ reorder */
  if (intent === "move") {
    const id = String(formData.get("id") ?? "");
    const direction = formData.get("direction") === "up" ? "up" : "down";

    // Swap sort_order with the adjacent slide rather than renumbering the
    // list: two writes regardless of how many slides exist, and the values
    // stay spaced for later inserts.
    const { data: current } = await supabase
      .from("hero_slides")
      .select("id, sort_order")
      .eq("id", id)
      .maybeSingle();

    if (!current) return fail("Banner tidak ditemukan.", 404);

    // The nearest slide on the side being moved towards. `lte`/`gte` rather
    // than a strict comparison so a tie in sort_order still finds a partner;
    // the swap below breaks the tie.
    const adjacent = supabase
      .from("hero_slides")
      .select("id, sort_order")
      .neq("id", id);

    const { data: neighbour } =
      direction === "up"
        ? await adjacent
            .lte("sort_order", current.sort_order)
            .order("sort_order", { ascending: false })
            .limit(1)
            .maybeSingle()
        : await adjacent
            .gte("sort_order", current.sort_order)
            .order("sort_order", { ascending: true })
            .limit(1)
            .maybeSingle();

    // Already at the end of the list.
    if (!neighbour) return data({ message: "" }, { headers });

    // Equal values would make the swap a no-op, so break the tie by nudging
    // the neighbour one step past the moving slide.
    const [next, neighbourNext] =
      current.sort_order === neighbour.sort_order
        ? direction === "up"
          ? [current.sort_order - 1, neighbour.sort_order]
          : [current.sort_order + 1, neighbour.sort_order]
        : [neighbour.sort_order, current.sort_order];

    const { error } = await supabase
      .from("hero_slides")
      .update({ sort_order: next })
      .eq("id", current.id);
    if (error) return fail("Gagal mengubah urutan.", 500);

    const { error: neighbourError } = await supabase
      .from("hero_slides")
      .update({ sort_order: neighbourNext })
      .eq("id", neighbour.id);
    if (neighbourError) return fail("Gagal mengubah urutan.", 500);

    return data({ message: "Urutan diperbarui." }, { headers });
  }

  /* ------------------------------------------------------------- delete */
  if (intent === "delete") {
    const id = String(formData.get("id") ?? "");

    const { error, count } = await supabase
      .from("hero_slides")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) return fail("Gagal menghapus banner.", 500);
    if (!count) return fail("Banner tidak ditemukan.", 404);

    // The uploaded image is left in storage. It may be reused by another
    // slide, and an orphaned file costs nothing next to deleting one that
    // another banner still renders.
    return data({ message: "Banner dihapus." }, { headers });
  }

  return fail("Aksi tidak dikenal.");
}

export default function CarouselPage({ loaderData }: Route.ComponentProps) {
  return <CarouselEditor {...loaderData} />;
}
