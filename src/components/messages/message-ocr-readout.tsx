import { formatDate } from "@/lib/utils";

export function MessageOcrReadout({
  recordedDate,
  ocrDate,
  ocrTime,
  ocrBuyer,
  ocrGig,
  ocrText,
}: {
  recordedDate?: string | null;
  ocrDate?: string | null;
  ocrTime?: string | null;
  ocrBuyer?: string | null;
  ocrGig?: string | null;
  ocrText?: string | null;
}) {
  if (!ocrText && !ocrDate && !ocrTime && !ocrBuyer && !ocrGig) return null;

  const agrees =
    recordedDate && ocrDate ? recordedDate.slice(0, 10) === ocrDate.slice(0, 10) : null;

  return (
    <div className="mt-2 max-w-xs space-y-1 rounded-lg border border-[#7b1e3a]/15 bg-[#f6e8ec]/50 px-2.5 py-2 text-xs text-neutral-700">
      <p className="font-semibold text-[#7b1e3a]">What the screenshot says</p>
      <p>Date: {ocrDate ? formatDate(ocrDate) : "Not found"}</p>
      {ocrTime && <p>Time: {ocrTime}</p>}
      {ocrBuyer && <p>Buyer: {ocrBuyer}</p>}
      {ocrGig && <p>Noted: {ocrGig}</p>}
      {agrees === true && <p className="font-medium text-emerald-700">Matches the date recorded</p>}
      {agrees === false && (
        <p className="font-medium text-[#7b1e3a]">The recorded date does not match this screenshot</p>
      )}
      {ocrText && (
        <details className="pt-1">
          <summary className="cursor-pointer text-neutral-500">Full text read from the picture</summary>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap font-sans text-[11px] leading-snug text-neutral-600">
            {ocrText}
          </pre>
        </details>
      )}
    </div>
  );
}
