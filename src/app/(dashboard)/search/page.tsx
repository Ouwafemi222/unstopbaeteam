import { GlobalSearch } from "@/components/layout/global-search";

export default function SearchPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-neutral-900">Global Search</h1>
        <p className="text-neutral-500 mt-1">Search across team members, accounts, services, and countries</p>
      </div>
      <GlobalSearch large className="w-full" />
    </div>
  );
}
