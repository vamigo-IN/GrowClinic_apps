import React from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "outline" | "white";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: "sm" | "md" | "lg";
    children: React.ReactNode;
    className?: string;
    href?: string;
    target?: string;
    rel?: string;
}

export function Button({ variant = "primary", size = "md", children, className = "", href, target, rel, ...props }: ButtonProps) {
    const baseStyles = "inline-flex items-center justify-center font-semibold rounded-lg transition-colors duration-200 px-6 py-3 text-center";

    const variants = {
        primary: "bg-primary-gradient hover:opacity-90 text-white shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-0.5",
        secondary: "bg-accent hover:bg-accent-hover text-white shadow-xl shadow-accent/20 hover:shadow-accent/35 transition-all duration-300 hover:-translate-y-0.5",
        outline: "border-2 border-primary text-primary hover:bg-primary/5 transition-all duration-300",
        white: "bg-white text-primary hover:bg-gray-50 shadow-xl shadow-black/5 hover:shadow-black/10 transition-all duration-300 hover:-translate-y-0.5",
    };

    const sizeStyles = {
        sm: "px-4 py-2 text-sm",
        md: "px-6 py-3 text-base",
        lg: "px-8 py-4 text-lg",
    };

    const combinedClassName = `${baseStyles} ${variants[variant]} ${sizeStyles[size]} ${className}`;

    if (href) {
        return (
            <Link href={href} className={combinedClassName} target={target} rel={rel}>
                {children}
            </Link>
        );
    }

    return (
        <button className={combinedClassName} {...props}>
            {children}
        </button>
    );
}
