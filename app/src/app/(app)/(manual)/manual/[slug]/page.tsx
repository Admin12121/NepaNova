import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import {
  getSectionBySlug,
  getAdjacentSections,
  getAllSlugs,
} from "@/config/manual";
import { getManualContent } from "@/config/manual/server";
import { createMdxComponents } from "@/components/manual/mdx-components";
import { TableOfContents } from "@/components/manual/toc";
import { PageNav } from "@/components/manual/page-nav";

interface ManualSlugPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ManualSlugPageProps) {
  const { slug } = await params;
  const section = getSectionBySlug(slug);

  if (!section) {
    return { title: "Page Not Found — Admin Manual" };
  }

  return {
    title: `${section.title} — Admin Manual`,
    description: section.description,
  };
}

export default async function ManualSlugPage({ params }: ManualSlugPageProps) {
  const { slug } = await params;
  const section = getSectionBySlug(slug);

  if (!section) {
    notFound();
  }

  const content = await getManualContent(slug);
  const { prev, next } = getAdjacentSections(slug);
  const mdxComponents = createMdxComponents();

  return (
    <div className="flex flex-1 h-[calc(100vh-3.5rem)] overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              {section.description}
            </p>
          </div>

          <article className="prose-manual">
            <MDXRemote
              source={content}
              components={mdxComponents}
              options={{
                mdxOptions: {
                  remarkPlugins: [remarkGfm],
                },
              }}
            />
          </article>

          <PageNav prev={prev} next={next} />
        </div>
      </main>

      <TableOfContents content={content} />
    </div>
  );
}
