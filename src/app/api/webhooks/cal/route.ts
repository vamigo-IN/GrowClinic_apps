import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// Verify the Cal.com signature securely
const verifyCalSignature = (signature: string | null, payloadString: string, secret: string) => {
    if (!signature) return false;
    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payloadString)
        .digest("hex");
    return signature === expectedSignature;
};

export async function POST(req: Request) {
    try {
        const payloadString = await req.text();
        const signature = req.headers.get("x-cal-signature-256");
        const webhookSecret = process.env.CAL_WEBHOOK_SECRET || "vamigo";

        if (!verifyCalSignature(signature, payloadString, webhookSecret)) {
            console.error("Invalid Cal.com webhook signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const body = JSON.parse(payloadString);

        if (body.triggerEvent === "BOOKING_CREATED") {
            const { payload } = body;
            const attendees = payload.attendees || [];
            if (attendees.length === 0) {
                return NextResponse.json({ success: true, message: "No attendees found." });
            }

            const guest = attendees[0];
            const name = guest.name || "Guest";
            const email = guest.email || "No email";
            
            // Cal.com sends answers inside payload.responses or guest custom fields
            const responses = payload.responses || {};
            
            // Extract custom fields from responses if they exist, or fallback to default strings/empty
            // Different users configure questions differently. 
            // We'll map anything that matches our schema semantically.
            
            // Look for phone
            const phone = responses.phone?.value || guest.timeZone || "N/A"; 
            
            // Look for Clinic Name
            const clinicNameObj = Object.values(responses).find((r: any) => 
                r.label?.toLowerCase().includes("clinic name") || r.label?.toLowerCase().includes("business name")
            ) as any;
            const clinicName = clinicNameObj?.value || "N/A";

            // Look for Clinic Type
            const clinicTypeObj = Object.values(responses).find((r: any) => 
                r.label?.toLowerCase().includes("specialty") || r.label?.toLowerCase().includes("clinic type")
            ) as any;
            const clinicType = clinicTypeObj?.value || "Multispeciality";

            // Look for Challenge/Notes
            // notes can also be mapped
            const notesObj = Object.values(responses).find((r: any) => 
                r.label?.toLowerCase().includes("notes") || r.label?.toLowerCase().includes("challenge") || r.label?.toLowerCase().includes("goal")
            ) as any;
            const challenge = notesObj?.value || payload.description || "N/A";

            // Look for datetime
            const preferredDate = new Date(payload.startTime).toISOString().split('T')[0];
            const preferredTime = new Date(payload.startTime).toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit'
            });

            // 1. Save to Database
            const booking = await prisma.consultationBooking.create({
                data: {
                    name,
                    email,
                    phone: String(phone),
                    clinicName: String(clinicName),
                    clinicType: String(clinicType),
                    challenge: String(challenge),
                    preferredDate,
                    preferredTime,
                },
            });

            // 2. Send Greeting Email via Nodemailer 
            // Only sending an email to the team for notification, or guest if configured
            if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: Number(process.env.SMTP_PORT) || 465,
                    secure: true,
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                });

                const mailOptions = {
                    from: `"GrowClinic Team" <${process.env.SMTP_USER}>`,
                    to: email, // Optional: send to guest, Cal.com usually sends its own confirmations
                    subject: "Strategy Session Confirmed! - GrowClinic",
                    html: `
                        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1a1a1b; background-color: #ffffff;">
                            <div style="text-align: center; padding: 40px 0; background: linear-gradient(135deg, #3586ff 0%, #14B8A6 100%); border-radius: 16px 16px 0 0;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.02em;">GrowClinic</h1>
                            <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin-top: 5px; font-weight: 500;">Your Practice Growth, Accelerated</p>
                            </div>
                            
                            <div style="padding: 40px; border: 1px solid #f0f0f1; border-top: none; border-radius: 0 0 16px 16px;">
                            <h2 style="margin-top: 0; color: #111827; font-size: 20px; font-weight: 700;">Hi ${name},</h2>
                            <p style="font-size: 16px; color: #4b5563;">Thank you for requesting a consultation with <strong>GrowClinic</strong>. Our team is excited to speak with you.</p>
                            
                            <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 30px 0;">
                                <h3 style="margin-top: 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 15px;">Selected Time Slot</h3>
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                                <p style="margin: 0; font-size: 18px; color: #0f172a; font-weight: 600;">
                                    ${new Date(preferredDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                                <p style="margin: 5px 0 0 0; font-size: 16px; color: #3586ff; font-weight: 700;">
                                    ${preferredTime}
                                </p>
                                </div>
                            </div>
                            <p style="font-size: 15px; color: #4b5563;">We look forward to meeting with you on the scheduled call.</p>
                            
                            <div style="margin-top: 40px; text-align: center;">
                                <a href="https://growclinic.io/" style="background-color: #3586ff; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">Explore Case Studies</a>
                            </div>
                            
                            <p style="margin-top: 40px; font-size: 14px; color: #94a3b8; border-top: 1px solid #f0f0f1; pt-20px;">Best regards,<br><strong style="color: #111827;">The GrowClinic Team</strong></p>
                            </div>
                        </div>
                    `,
                };

                await transporter.sendMail(mailOptions);
            }

            // 3. Send WhatsApp Automated Message
            try {
                if (phone && phone !== "N/A") {
                    const whatsappMessage = 
`Hello ${name}, your strategy session with GrowClinic is confirmed! 🚀

Date: ${new Date(preferredDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${preferredTime}

Our growth expert will see you on the call.
GrowClinic - Your Practice Growth, Accelerated.`;

                    await sendWhatsAppMessage(phone, whatsappMessage);
                }
            } catch (wsError) {
                console.error("WhatsApp automation failed:", wsError);
            }

            return NextResponse.json({ success: true, data: booking }, { status: 201 });
        }

        return NextResponse.json({ success: true, message: "Event ignored: " + body.triggerEvent });
    } catch (error: any) {
        console.error("Error processing cal.com webhook:", error);
        return NextResponse.json({ error: "An error occurred while processing the webhook." }, { status: 500 });
    }
}
