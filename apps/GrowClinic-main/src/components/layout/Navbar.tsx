"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "../ui/Button";
import { Stethoscope } from "lucide-react";

export function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { name: "Home", href: "/" },
        { name: "About", href: "/about" },
        { name: "Services", href: "/#services" },
        { name: "Testimonials", href: "/testimonials" },
        { name: "Case Studies", href: "/case-studies" },
        { name: "Blog", href: "/blog" },
        { name: "Sync", href: "/sync", highlight: true },
    ];

    return (
        <header
            className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
                isScrolled ? "px-3 pt-3 sm:px-5" : "px-0 pt-0"
            }`}
        >
            {/* Wrapper — full-width bar at top, floating frosted-glass tile on scroll */}
            <div
                className={`mx-auto transition-all duration-500 ${
                    isScrolled
                        ? "max-w-6xl rounded-[15px] border border-white/50 bg-white/70 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.35)] backdrop-blur-xl"
                        : "max-w-full rounded-none border-b border-black/5 bg-white/50 backdrop-blur-md"
                }`}
            >
                <div
                    className={`mx-auto max-w-7xl px-4 transition-all duration-500 sm:px-6 lg:px-8 ${
                        isScrolled ? "py-2.5" : "py-4"
                    }`}
                >
                    <div className="flex items-center justify-between gap-4">
                        {/* Logo */}
                        <Link
                            href="/"
                            className="flex h-10 items-center transition-transform duration-300 hover:scale-105"
                        >
                            <Image
                                src="/images/logo.png"
                                alt="GrowClinic Logo"
                                width={160}
                                height={45}
                                className="h-10 w-auto border-0"
                                priority
                                loading="eager"
                            />
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden items-center gap-7 md:flex">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`group relative font-medium text-gray-700 transition-all duration-300 hover:text-primary ${
                                        link.highlight
                                            ? "rounded-full border border-primary/10 bg-primary/5 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-primary"
                                            : "py-1"
                                    }`}
                                >
                                    {link.name}
                                    {!link.highlight && (
                                        <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary-gradient transition-all duration-300 group-hover:w-full" />
                                    )}
                                </Link>
                            ))}
                        </nav>

                        <div className="hidden items-center gap-4 md:flex">
                            <Button
                                variant="primary"
                                size="sm"
                                className="h-10 shrink-0 whitespace-nowrap shadow-glow"
                                href="https://audit.growclinic.io"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Stethoscope className="mr-2 h-4 w-4" />
                                Audit Your Clinic
                            </Button>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="text-primary focus:outline-none md:hidden"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>

                    {/* Mobile Navigation */}
                    {isMobileMenuOpen && (
                        <div className="mt-4 flex flex-col gap-4 border-t border-gray-100 pb-2 pt-4 md:hidden">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`block px-2 py-1 font-medium text-gray-700 hover:text-primary ${
                                        link.highlight
                                            ? "mt-1 rounded-lg border border-primary/10 bg-primary/5 px-3 text-sm font-black uppercase tracking-widest text-primary"
                                            : ""
                                    }`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="pt-2">
                                <Button
                                    variant="primary"
                                    className="w-full"
                                    href="https://audit.growclinic.io"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Audit Your Clinic
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
