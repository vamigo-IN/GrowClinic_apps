import { revalidatePath } from "next/cache";

// Cache-busting helpers for the public, ISR-cached content surfaces.
// Call these from any post/case-study/testimonial mutation (route handlers
// and server actions) so an edit shows up immediately instead of waiting for
// the revalidate window.

export function revalidateBlog(slug?: string) {
  revalidatePath("/blog");
  revalidatePath("/blog/category/[categoryName]", "page");
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath("/"); // homepage surfaces latest posts
}

export function revalidateCaseStudies(slug?: string) {
  revalidatePath("/case-studies");
  if (slug) revalidatePath(`/case-studies/${slug}`);
  revalidatePath("/"); // homepage surfaces case studies
}

export function revalidateTestimonials() {
  revalidatePath("/testimonials");
  revalidatePath("/");
}
