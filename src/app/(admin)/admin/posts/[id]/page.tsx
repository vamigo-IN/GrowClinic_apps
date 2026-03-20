"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/admin/ImageUpload";
import RichTextEditor from "@/components/admin/RichTextEditor";

// Assuming we use this for both new and edit paths
export default function PostEditor() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === "new";
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featuredImage: "",
    category: "Healthcare Trends",
    published: false,
    tags: "" // Comma separated for simple input
  });

  useEffect(() => {
    if (!isNew) {
      // Fetch existing post logic would go here
      // For this implementation, we will assume it's stubbed or handled by an API call
      fetch(`/api/posts/${params.id}`)
        .then(res => res.json())
        .then(data => {
            if (data && !data.error) {
                setFormData({
                    title: data.title,
                    slug: data.slug,
                    excerpt: data.excerpt || "",
                    content: data.content,
                    featuredImage: data.featuredImage || "",
                    category: data.category || "Healthcare Trends",
                    published: data.published,
                    tags: data.tags?.map((t: any) => t.name).join(", ") || ""
                });
            }
        })
        .finally(() => setLoading(false));
    }
  }, [isNew, params.id]);

  const handleSlugAutogenerate = () => {
    if (!formData.title) return;
    const generatedSlug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    setFormData({ ...formData, slug: generatedSlug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Convert comma-separated string back to array of tags
      const tagArray = formData.tags
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const payload = {
        ...formData,
        tags: tagArray
      };

      const url = isNew ? "/api/posts" : `/api/posts/${params.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
         const data = await res.json();
         alert(`Error: ${data.error}`);
         throw new Error("Failed to save post");
      }

      router.push("/admin/posts");
      router.refresh();
      
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading editor...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">{isNew ? "Create New Article" : "Edit Article"}</h2>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Title</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-lg"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter article title"
                />
              </div>

              {/* Content (Rich Text Editor) */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Content</label>
                <RichTextEditor 
                  content={formData.content}
                  onChange={(html) => setFormData({ ...formData, content: html })}
                />
              </div>
              
              {/* Excerpt */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Excerpt</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Short summary for SEO and blog listing"
                ></textarea>
              </div>
            </div>

            <div className="md:col-span-1 space-y-6">
              {/* Publishing Settings */}
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4 border-b pb-2">Settings</h3>
                
                <div className="mb-4">
                  <label className="block text-sm text-gray-700 font-medium mb-1">Category</label>
                  <input
                    type="text"
                    list="category-suggestions"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Enter or select category"
                  />
                  <datalist id="category-suggestions">
                    <option value="Healthcare Trends" />
                    <option value="Patient Acquisition" />
                    <option value="Clinic Management" />
                    <option value="Digital Marketing" />
                    <option value="Case Studies" />
                  </datalist>
                </div>

                <div className="mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
                      checked={formData.published}
                      onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    />
                    <span className="text-gray-900 font-medium">Publish Post</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-8">Checking this makes the post visible to the public.</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-gray-700 font-medium mb-1">URL Slug</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    />
                    <button 
                      type="button" 
                      onClick={handleSlugAutogenerate}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-sm font-medium transition"
                    >
                      Auto
                    </button>
                  </div>
                </div>

                <ImageUpload 
                  label="Featured Image"
                  value={formData.featuredImage}
                  onChange={(url) => setFormData({ ...formData, featuredImage: url })}
                />

                <div>
                  <label className="block text-sm text-gray-700 font-medium mb-1">Tags (Comma separated)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="healthcare, marketing, seo"
                  />
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full py-3" disabled={saving}>
                {saving ? "Saving..." : (isNew ? "Create Article" : "Save Changes")}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
