import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Maximize2 } from "lucide-react";
import { getUserScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookUploadButton } from "@/components/team-blueprint/book-upload-button";
import {
  BOOKS_BUCKET,
  bookStoragePath,
  findBlueprintBook,
} from "@/lib/team-blueprint/content";

interface BookReaderPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BookReaderPage({ params }: BookReaderPageProps) {
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  const { slug } = await params;
  const book = findBlueprintBook(slug);
  if (!book) notFound();

  const isSuperAdmin = scope.roleSlugs.includes("super_admin");
  const supabase = await createClient();
  const { data: signed } = await supabase.storage
    .from(BOOKS_BUCKET)
    .createSignedUrl(bookStoragePath(book.slug), 60 * 60);
  const pdfUrl = signed?.signedUrl ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild size="sm" variant="outline">
            <Link href="/team-blueprint">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Blueprint
            </Link>
          </Button>
          <h1 className="text-lg sm:text-xl font-bold text-neutral-900 truncate flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#7b1e3a] shrink-0" />
            {book.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {pdfUrl && (
            <Button asChild size="sm" variant="outline">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <Maximize2 className="mr-1.5 h-4 w-4" />
                Full screen
              </a>
            </Button>
          )}
          {isSuperAdmin && <BookUploadButton slug={book.slug} hasFile={!!pdfUrl} />}
        </div>
      </div>

      {pdfUrl ? (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 shadow-sm">
          <iframe
            src={pdfUrl}
            title={book.title}
            className="h-[calc(100vh-11rem)] min-h-[480px] w-full"
          />
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-6">
            <BookOpen className="h-12 w-12 text-neutral-300 mb-4" />
            <h2 className="text-lg font-semibold text-neutral-900">This book isn&apos;t available yet</h2>
            <p className="text-sm text-neutral-500 mt-2 max-w-md">
              {isSuperAdmin
                ? "Upload the PDF with the button above and the team can read it here."
                : "Your admin hasn't uploaded this book yet. Check back soon."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
