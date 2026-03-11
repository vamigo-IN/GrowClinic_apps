"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    label: string;
}

export function ImageUpload({ value, onChange, label }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");
            
            const data = await res.json();
            onChange(data.url);
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">{label}</label>
            <div className="flex items-start gap-4">
                {value ? (
                    <div className="relative group">
                        <img 
                            src={value} 
                            alt="Preview" 
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                        <button
                            type="button"
                            onClick={() => onChange("")}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove image"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-primary transition-all group"
                    >
                        <svg className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                )}
                
                <div className="flex-1 flex flex-col gap-2">
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? "Uploading..." : (value ? "Change Image" : "Select Image")}
                    </Button>
                    <p className="text-[10px] text-gray-400">Recommended: Square PNG/JPG, max 2MB.</p>
                </div>
            </div>
        </div>
    );
}
