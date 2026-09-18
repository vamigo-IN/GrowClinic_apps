"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin, assertEditor } from "@/lib/guards";
import { revalidateBlog, revalidateCaseStudies, revalidateTestimonials } from "@/lib/revalidate";

// Server actions are reachable by direct POST, so each one checks the session
// and role itself — with the same rules as the matching /api route
// (content: admin or manager; case studies: admin; viewer is read-only).

export async function deletePost(id: string) {
  await assertEditor();
  await prisma.post.delete({ where: { id } });
  revalidatePath("/admin/posts");
  revalidateBlog();
  return { success: true };
}

export async function deleteTestimonial(id: string) {
  await assertEditor();
  await prisma.testimonial.delete({ where: { id } });
  revalidatePath("/admin/testimonials");
  revalidateTestimonials();
  return { success: true };
}

export async function deleteCaseStudy(id: string) {
  await assertAdmin();
  await prisma.caseStudy.delete({ where: { id } });
  revalidatePath("/admin/casestudies");
  revalidateCaseStudies();
  return { success: true };
}

export async function deleteClientLogo(id: string) {
  await assertEditor();
  await prisma.clientLogo.delete({ where: { id } });
  revalidatePath("/admin/clients");
  revalidatePath("/");
  return { success: true };
}
