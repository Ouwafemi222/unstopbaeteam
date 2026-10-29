import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getMemberImageUrl } from "@/lib/storage/member-uploads";
import type { FiveStarReview } from "@/types/database";

export default async function MyStarsPage() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");
  if (!scope.teamMember) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-xl font-bold text-neutral-900">No team profile linked</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Your login needs a team member profile before you can record a 5-star review.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("five_star_reviews")
    .select("*")
    .eq("team_member_id", scope.teamMember.id)
    .order("received_date", { ascending: false });

  const reviews = (data ?? []) as FiveStarReview[];
  const withShots = await Promise.all(
    reviews.map(async (review) => ({
      review,
      url: await getMemberImageUrl(supabase, review.screenshot_path),
    }))
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">My 5 Stars</h1>
          <p className="mt-1 text-neutral-500">
            Each time a buyer leaves 5 stars, save the screenshot. That is the evidence the incentive uses.
          </p>
        </div>
        <Link href="/my-stars/new">
          <Button>
            <Plus className="h-4 w-4" />
            Record 5 stars
          </Button>
        </Link>
      </div>

      {withShots.length === 0 ? (
        <Card className="border-2 border-dashed border-[#7b1e3a]/25 bg-[#f6e8ec]/40">
          <CardContent className="flex flex-col items-center px-6 py-16 text-center">
            <Star className="mb-4 h-8 w-8 text-[#7b1e3a]" />
            <h2 className="text-lg font-semibold text-neutral-900">No 5-star evidence yet</h2>
            <p className="mt-2 max-w-md text-sm text-neutral-500">
              Open the review on Fiverr, take a screenshot, and save it here.
            </p>
            <Link href="/my-stars/new" className="mt-6">
              <Button>Record your first 5 stars</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {withShots.map(({ review, url }) => (
            <li key={review.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              {url && (
                <a href={url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="5-star review evidence" className="h-48 w-full object-cover" />
                </a>
              )}
              <div className="space-y-1 p-4">
                <p className="font-semibold text-neutral-900">{review.buyer_name || "Buyer"}</p>
                <p className="text-sm text-neutral-500">{formatDate(review.received_date)}</p>
                {review.gig_name && <p className="text-sm text-neutral-700">{review.gig_name}</p>}
                {review.note && <p className="text-sm text-neutral-500">{review.note}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
