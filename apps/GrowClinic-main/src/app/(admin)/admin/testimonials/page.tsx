import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteTestimonial } from "../actions";

export default async function AdminTestimonials() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const testimonials = await prisma.testimonial.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[var(--a-bright)]">Client Testimonials</h2>
          <p className="text-[var(--a-muted)] mt-1">Manage all client feedback and success stories.</p>
        </div>
        <Link href="/admin/testimonials/new">
          <Button variant="primary">Add New Testimonial</Button>
        </Link>
      </div>

      <div className="bg-[var(--a-panel)] rounded-xl shadow-sm border border-[var(--a-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[var(--a-bg)] text-[var(--a-muted)] text-xs font-semibold uppercase tracking-wider text-left">
              <tr>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Content</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--a-panel)] divide-y divide-gray-200 text-sm text-[var(--a-text)]">
              {testimonials.map((testimonial) => (
                <tr key={testimonial.id} className="hover:bg-[var(--a-hover)] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border border-[var(--a-border)]">
                        {testimonial.avatarUrl ? (
                          <img src={testimonial.avatarUrl} alt={testimonial.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{testimonial.name.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--a-bright)]">{testimonial.name}</p>
                        <p className="text-xs text-[var(--a-muted)]">
                          {testimonial.role}{testimonial.company ? ` @ ${testimonial.company}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="truncate text-[var(--a-text)] italic">"{testimonial.content}"</p>
                    <div className="flex text-yellow-500 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-3 h-3 ${i < testimonial.rating ? "fill-current" : "text-gray-300"}`} viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {testimonial.published ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 w-fit">
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--a-hover)] text-[var(--a-bright)] w-fit">
                          Draft
                        </span>
                      )}
                      {testimonial.featured && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary w-fit">
                          Featured
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/testimonials/${testimonial.id}`} className="text-primary hover:text-primary-dark transition-colors">
                        Edit
                      </Link>
                      <DeleteButton id={testimonial.id} onDelete={deleteTestimonial} itemName="testimonial" />
                    </div>
                  </td>
                </tr>
              ))}
              {testimonials.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[var(--a-muted)]">
                    No testimonials found. Add your first client success story!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
