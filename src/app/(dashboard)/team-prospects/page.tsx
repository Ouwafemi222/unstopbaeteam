import { redirect } from "next/navigation";
import { currentYearMonth } from "@/lib/utils/dates";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

/** Legacy route — daily prospects live under Weekly Activity. */
export default async function TeamProspectsRedirectPage({ searchParams }: Props) {
  const params = await searchParams;
  const month =
    params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentYearMonth();
  redirect(`/weekly-activity?tab=prospects&month=${month}`);
}
