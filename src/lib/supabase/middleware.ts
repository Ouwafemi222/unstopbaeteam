import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_ONLY_PREFIXES = [
  "/team-members",
  "/accounts",
  "/messages",
  "/import",
  "/users",
  "/activity",
  "/settings",
  "/reports",
  "/performance",
  "/services",
  "/search",
];

const ADMIN_ROLE_SLUGS = new Set([
  "super_admin",
  "account_manager",
  "viewer",
  "team_leader",
  "finance_manager",
  "message_tracker",
]);

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/join") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/callback");

  const isPublicApi = pathname === "/api/join/register";

  if (!user && !isAuthPage && !isPublicApi && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const [{ data: teamMember }, { data: userRoles }] = await Promise.all([
      supabase.from("team_members").select("id").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role:roles(slug)").eq("user_id", user.id),
    ]);

    const roleSlugs =
      (userRoles as { role: { slug: string } | null }[] | null)
        ?.map((r) => r.role?.slug)
        .filter((slug): slug is string => !!slug) ?? [];

    const isAdmin = roleSlugs.some((slug) => ADMIN_ROLE_SLUGS.has(slug));
    const isScopedMember = !!teamMember && !isAdmin;

    if (isScopedMember) {
      const ownProfilePrefix = `/team-members/${teamMember.id}`;

      const teamMemberMatch = pathname.match(/^\/team-members\/([0-9a-f-]{36})(\/.*)?$/i);
      if (teamMemberMatch) {
        const targetId = teamMemberMatch[1];
        const subPath = teamMemberMatch[2] ?? "";

        if (pathname.startsWith(ownProfilePrefix)) {
          // Own profile — allow (sub-routes like /accounts/new handled on page)
        } else if (!subPath || subPath === "/") {
          const { data: target } = await supabase
            .from("team_members")
            .select("sponsor_id")
            .eq("id", targetId)
            .maybeSingle();

          if (target?.sponsor_id === teamMember.id) {
            // Sponsor read-only profile view
          } else {
            const url = request.nextUrl.clone();
            url.pathname = "/dashboard";
            return NextResponse.redirect(url);
          }
        } else {
          const url = request.nextUrl.clone();
          url.pathname = "/dashboard";
          return NextResponse.redirect(url);
        }
      } else {
        const blocked = ADMIN_ONLY_PREFIXES.some((prefix) => {
          if (!pathname.startsWith(prefix)) return false;
          if (prefix === "/team-members" && pathname.startsWith(ownProfilePrefix)) return false;
          return true;
        });

        if (blocked) {
          const url = request.nextUrl.clone();
          url.pathname = "/dashboard";
          return NextResponse.redirect(url);
        }
      }
    }

    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
