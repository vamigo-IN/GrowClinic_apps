import React from "react";

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export function Card({ children, className = "", hoverEffect = false }: CardProps) {
    return (
        <div
            className={`bg-white rounded-[15px] p-6 shadow-lg shadow-black/5 border border-gray-100 ${hoverEffect ? "transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl" : ""
                } ${className}`}
        >
            {children}
        </div>
    );
}
