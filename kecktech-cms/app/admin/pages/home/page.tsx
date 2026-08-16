import { ensurePageBySlug } from "@/lib/ensure-page";
import { PageBySlugEditor } from "@/components/admin/page-by-slug-editor";

export default async function AdminHomePageEditor() {
  const page = await ensurePageBySlug("home");
  return (
    <PageBySlugEditor
      slug="home"
      pageId={page.id}
      heading="Home Page"
      description="Edit home hero / CTA JSON consumed by Astro marketing."
    />
  );
}
