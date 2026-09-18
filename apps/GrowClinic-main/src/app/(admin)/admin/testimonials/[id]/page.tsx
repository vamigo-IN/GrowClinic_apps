import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { TestimonialEditor } from "@/components/admin/TestimonialEditor";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditTestimonialPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/admin/login");

  const testimonial = await prisma.testimonial.findUnique({
    where: { id },
  });

  if (!testimonial) notFound();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[var(--a-bright)]">Edit Testimonial</h2>
          <p className="text-[var(--a-muted)] text-sm mt-1">Update feedback from {testimonial.name}.</p>
        </div>
        <Link href="/admin/testimonials">
          <Button variant="outline">Back to List</Button>
        </Link>
      </div>

      <TestimonialEditor id={id} initialData={testimonial} />
    </div>
  );
}
