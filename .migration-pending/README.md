# Not yet migrated

These files still import Next.js APIs. They belong to the member dashboard and
admin sections, which are not part of the public-site slice on this branch.

They are parked here rather than deleted so the next section has the original
implementations to port from, and so `tsc` over `app/` stays clean in the
meantime.

| File | Blocked on |
| --- | --- |
| `dashboard-nav.tsx` | `next/link`, `next/navigation`, `@/app/(auth)/actions` |
| `image-upload.tsx` | `next/image` |

The original Next.js route tree is not here; recover any of it from git:

    git show origin/main:"src/app/(member)/dashboard/page.tsx"
    git show feat/rbac-role-privileges:"src/app/(admin)/admin/page.tsx"
