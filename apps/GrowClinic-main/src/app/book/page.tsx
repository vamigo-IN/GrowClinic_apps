import { redirect } from "next/navigation";

// Up-front call booking is no longer offered — clinics start with the audit, and
// the team books a call once the report is ready. Send any old links to Contact.
export default function BookConsultationPage() {
    redirect("/contact");
}
