"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "./ImageUpload";

interface TestimonialEditorProps {
  id?: string;
  initialData?: any;
}

export function TestimonialEditor({ id, initialData }: TestimonialEditorProps) {
  const router = useRouter();
  const isNew = id === "new";

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    role: initialData?.role || "",
    company: initialData?.company || "",
    content: initialData?.content || "",
    avatarUrl: initialData?.avatarUrl || "",
    rating: initialData?.rating || 5,
    featured: initialData?.featured || false,
    published: initialData?.published ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = isNew ? "/api/testimonials" : `/api/testimonials/${id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(`Error: ${data.error}`);
        throw new Error("Failed to save testimonial");
      }

      router.push("/admin/testimonials");
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this testimonial?")) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/testimonials/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      router.push("/admin/testimonials");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error deleting testimonial");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            {/* Client Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Client Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Dr. Samantha Smith"
              />
            </div>

            {/* Testimonial Content */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Testimonial Content</label>
              <textarea
                required
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="What did the client say about your service?"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Role / Title</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Lead Dentist"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Clinic / Company Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g., Bright Smile Dental"
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-1 space-y-6">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-6">
              <h3 className="font-semibold text-gray-900 border-b pb-2 text-sm uppercase tracking-wider">Testimonial Options</h3>

              <ImageUpload
                label="Client Avatar"
                value={formData.avatarUrl}
                onChange={(url) => setFormData({ ...formData, avatarUrl: url })}
              />

              {/* Rating */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Rating (Stars)</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                >
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>
                      {r} Stars
                    </option>
                  ))}
                </select>
              </div>

              {/* Featured / Published */}
              <div className="space-y-4 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  />
                  <span className="text-gray-900 font-semibold text-sm">Published</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  />
                  <span className="text-gray-900 font-semibold text-sm">Featured on Home</span>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <Button type="submit" variant="primary" className="w-full py-4 shadow-xl" disabled={saving || deleting}>
                {saving ? "Saving..." : isNew ? "Create Testimonial" : "Update Testimonial"}
              </Button>
              
              {!isNew && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving || deleting}
                  className="w-full text-red-500 text-sm font-semibold hover:text-red-600 transition-colors py-2"
                >
                  {deleting ? "Deleting..." : "Delete Testimonial"}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
