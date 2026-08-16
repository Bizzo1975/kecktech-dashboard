import { ensurePageBySlug } from "@/lib/ensure-page";
import { PageBySlugEditor } from "@/components/admin/page-by-slug-editor";

export default async function AdminContactPageEditor() {
  const page = await ensurePageBySlug("contact");
  return (
    <PageBySlugEditor
      slug="contact"
      pageId={page.id}
      heading="Contact Page"
      description="Edit contact-page JSON consumed by Astro /contact."
    />
  );
}
