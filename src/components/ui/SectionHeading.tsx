import React from "react";

interface SectionHeadingProps {
    title: string | React.ReactNode;
    highlight?: string;
    subtitle?: string | React.ReactNode;
    centered?: boolean;
    className?: string;
    dark?: boolean;
    level?: 'h1' | 'h2' | 'h3';
}

export function SectionHeading({ 
    title, 
    highlight, 
    subtitle, 
    centered = true, 
    className = "", 
    dark = false,
    level = 'h2'
}: SectionHeadingProps) {
    const Tag = level;
    
    return (
        <div className={`mb-16 ${centered ? "text-center" : "text-left"} ${className}`}>
            <div className={`flex items-center gap-3 mb-4 ${centered ? "justify-center" : "justify-start"}`}>
                <span className="w-10 h-1.5 bg-primary rounded-full shadow-sm"></span>
                <span className="w-3 h-1.5 bg-accent rounded-full shadow-sm"></span>
            </div>
            <Tag className={`text-4xl md:text-5xl lg:text-7xl font-black mb-6 tracking-tight leading-[1.1] ${dark ? "text-white" : "text-slate-900"}`}>
                {title} {highlight && (
                    <span className="text-gradient itali inline-block">{highlight}</span>
                )}
            </Tag>
            {subtitle && (
                <p className={`text-xl max-w-4xl font-medium ${centered ? "mx-auto" : ""} ${dark ? "text-slate-300" : "text-slate-600"} leading-relaxed tracking-tight`}>
                    {subtitle}
                </p>
            )}
        </div>
    );
}
