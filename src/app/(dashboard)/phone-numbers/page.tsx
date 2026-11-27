export default function PhoneNumbersPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Phone number</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Free virtual numbers for a Fiverr check. Choose a country, copy a number, then wait on this page for the text.
            These inboxes are public, so anyone can see the code.
          </p>
        </div>
        <a
          href="https://quackr.io/temporary-numbers"
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-[#7b1e3a] hover:underline"
        >
          Open in a new tab
        </a>
      </div>
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <iframe
          title="Free virtual phone numbers"
          src="https://quackr.io/temporary-numbers"
          className="h-[calc(100dvh-13rem)] min-h-[720px] w-full bg-white"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
