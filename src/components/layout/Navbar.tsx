"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "../ui/Button";

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
        { name: "Services", href: "/#services" },
        { name: "Testimonials", href: "/testimonials" },
        { name: "Case Study", href: "/projects" },
        { name: "Blog", href: "/blog" },
        { name: "Sync", href: "/sync", highlight: true },
    ];

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? "glass-morphism shadow-lg py-2 border-b border-black/5" : "bg-white/40 backdrop-blur-md py-4 border-b border-transparent"
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group transition-transform duration-300 hover:scale-105">
                        <Image
                            src="/images/logo.png"
                            alt="GrowClinic Logo"
                            width={160}
                            height={45}
                            className="h-9 w-auto"
                            priority
                        />
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-10">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`relative text-gray-700 font-medium transition-all duration-300 hover:text-primary group py-1 ${
                                    link.highlight ? "text-primary font-black uppercase tracking-widest text-xs px-4 py-1.5 bg-primary/5 rounded-full border border-primary/10" : ""
                                }`}
                            >
                                {link.name}
                                {!link.highlight && (
                                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-gradient transition-all duration-300 group-hover:w-full"></span>
                                )}
                            </Link>
                        ))}
                    </nav>

                    <div className="hidden md:flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            className="hidden lg:flex"
                            href="https://sync.growclinic.io"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Partner Login
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            className="shadow-glow"
                            href="#audit"
                        >
                            Get Free Audit
                        </Button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-primary focus:outline-none"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <div className="md:hidden pt-4 pb-2 border-t mt-4 border-gray-100 flex flex-col gap-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`text-gray-700 hover:text-primary font-medium block px-2 py-1 ${
                                    link.highlight ? "text-primary font-black uppercase tracking-widest text-sm bg-primary/5 rounded-lg border border-primary/10 px-3 mt-1" : ""
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
                                href="/contact"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Contact Us
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
