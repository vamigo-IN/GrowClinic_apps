export interface TeamMember {
    name: string;
    role: string;
    bio?: string;
    image?: string; // optional path under /public, e.g. "/images/team/aman.jpg"
    linkedin?: string;
}

// Add real team members here to populate the "People behind GrowClinic" section
// on the About page. While this list is empty, that section is hidden, so the
// page stays clean and launch-ready until you have real names, roles and photos.
export const team: TeamMember[] = [
    // {
    //   name: "Aman Pratap Singh",
    //   role: "Founder",
    //   bio: "Short credential-led bio that builds trust with doctors.",
    //   image: "/images/team/aman.jpg",
    //   linkedin: "https://www.linkedin.com/in/...",
    // },
];
