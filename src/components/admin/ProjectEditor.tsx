"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "./ImageUpload";

interface ProjectEditorProps {
    id?: string;
    initialData?: any;
}

export function ProjectEditor({ id, initialData }: ProjectEditorProps) {
    const router = useRouter();
    const isNew = id === "new";
    
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: initialData?.title || "",
        slug: initialData?.slug || "",
        detail: initialData?.detail || "",
        growth: initialData?.growth || "",
        logoUrl: initialData?.logoUrl || "",
        doctorName: initialData?.doctorName || "",
        website: initialData?.website || "",
        specialty: initialData?.specialty || "",
        published: initialData?.published || false,
    });

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
            const url = isNew ? "/api/projects" : `/api/projects/${id}`;
            const method = isNew ? "POST" : "PATCH";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json();
                alert(`Error: ${data.error}`);
                throw new Error("Failed to save project");
            }

            router.push("/admin/projects");
            router.refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Project Title</label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-lg"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Smile Dental Care Digitization"
                            />
                        </div>

                        {/* Detail */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Case Study Details (Markdown)</label>
                            <textarea
                                required
                                rows={15}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary font-mono text-sm"
                                value={formData.detail}
                                onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
                                placeholder="Describe the project, challenges, and solutions..."
                            ></textarea>
                        </div>
                    </div>

                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
                            <h3 className="font-semibold text-gray-900 mb-2 border-b pb-2 text-sm uppercase tracking-wider">Project Info</h3>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Doctor Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    value={formData.doctorName}
                                    onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                                    placeholder="Dr. John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Growth Achievement</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-primary font-bold"
                                    value={formData.growth}
                                    onChange={(e) => setFormData({ ...formData, growth: e.target.value })}
                                    placeholder="20% to 150% Leads Growth"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Specialty</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    value={formData.specialty}
                                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                    placeholder="e.g. Dental, Dermatology"
                                />
                            </div>

                            <ImageUpload 
                                label="Clinic Logo"
                                value={formData.logoUrl}
                                onChange={(url) => setFormData({ ...formData, logoUrl: url })}
                            />

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Website (Optional)</label>
                                <input
                                    type="url"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    value={formData.website}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="pt-4">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Slug</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        required
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-xs font-mono bg-gray-50"
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleSlugAutogenerate}
                                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs font-bold transition"
                                    >
                                        AUTO
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                                        checked={formData.published}
                                        onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                                    />
                                    <span className="text-gray-900 font-semibold text-sm">Publish Showcase</span>
                                </label>
                            </div>
                        </div>

                        <Button type="submit" variant="primary" className="w-full py-4 shadow-xl" disabled={saving}>
                            {saving ? "Saving..." : (isNew ? "Create Project" : "Update Project")}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
