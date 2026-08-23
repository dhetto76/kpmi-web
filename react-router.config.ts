import type { Config } from "@react-router/dev/config";

export default {
  // Server-side render by default. The public site reads Supabase per request
  // (session-dependent header, live counts), so pre-rendering the whole app
  // would serve stale or signed-out markup.
  ssr: true,
} satisfies Config;
