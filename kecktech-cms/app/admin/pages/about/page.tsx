import { ensurePageBySlug } from "@/lib/ensure-page";
import { PageBySlugEditor } from "@/components/admin/page-by-slug-editor";

export default async function AdminAboutPageEditor() {
  const page = await ensurePageBySlug("about");
  return (
    <PageBySlugEditor
      slug="about"
      pageId={page.id}
      heading="About Page"
      description="Edit about-page JSON consumed by Astro /about."
    />
  );
}
