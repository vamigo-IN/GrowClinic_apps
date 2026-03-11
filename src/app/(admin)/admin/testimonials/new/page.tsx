import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TestimonialEditor } from "@/components/admin/TestimonialEditor";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function AdminNewTestimonialPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add New Testimonial</h2>
          <p className="text-gray-500 text-sm mt-1">Capture new client feedback to build trust with prospects.</p>
        </div>
        <Link href="/admin/testimonials">
          <Button variant="outline">Back to List</Button>
        </Link>
      </div>

      <TestimonialEditor id="new" />
    </div>
  );
}
