export interface ClientLogo {
    name: string;
    src: string;
}

// HOW TO ADD CLIENT LOGOS:
// 1. Drop each logo file into  public/images/clients/  (PNG or SVG, transparent
//    background works best, roughly 200–400px wide).
// 2. Add an entry below with its name and path.
// The scrolling marquee will pick them up automatically. While this list is
// empty, the marquee shows placeholder tiles so the effect is still visible.
export const clientLogos: ClientLogo[] = [
    { name: "Dr. Mody's Advanced Cardiac Care", src: "" },
    { name: "Fit Mantra", src: "" },
    { name: "Dr. Ronak Malani", src: "" },
    { name: "Smile Dental", src: "" },
    { name: "Skin Experts", src: "" },
    { name: "Vision Care Hospital", src: "" },
];
