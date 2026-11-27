import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listCountries, listNumbers } from "@/lib/phone-numbers/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const url = new URL(request.url);
  const locale = (url.searchParams.get("locale") || "").toLowerCase();
  try {
    if (!locale) {
      const countries = await listCountries();
      return NextResponse.json({ countries });
    }
    const numbers = await listNumbers(locale, url.searchParams.get("q") || "");
    return NextResponse.json({ numbers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The number list did not load";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
