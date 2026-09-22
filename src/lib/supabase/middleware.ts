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
  "/weekly-activity",
  "/money",
  "/reserved-accounts",
  "/services",
  "/search",
  "/orders",
];

const ADMIN_ROLE_SLUGS = new Set([
  "super_admin",
  "account_manager",
  "viewer",
  "team_leader",
  "finance_manager",
  "message_tracker",
]);

function needsMemberGate(pathname: string): boolean {
  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/join")) {
    return false;
  }
  if (ADMIN_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  if (pathname.startsWith("/team-members")) return true;
  return false;
}

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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

  const isPublicApi =
    pathname === "/api/join/register" ||
    pathname === "/api/keep-alive" ||
    pathname.startsWith("/api/cron/");

  if (!user && !isAuthPage && !isPublicApi && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    if (isAuthPage || pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Fast path: member dashboards / my-* / profile don't need role DB hits here
    if (!needsMemberGate(pathname)) {
      return supabaseResponse;
    }

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
          // Own profile — allow
        } else if (!subPath || subPath === "/") {
          const { data: target } = await supabase
            .from("team_members")
            .select("sponsor_id")
            .eq("id", targetId)
            .maybeSingle();

          if (target?.sponsor_id !== teamMember.id) {
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
  }

  return supabaseResponse;
}
