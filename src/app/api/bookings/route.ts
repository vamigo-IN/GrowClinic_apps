import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const { name, email, phone, clinicName, clinicType, challenge, preferredDate, preferredTime } = await req.json();

    if (!name || !email || !phone || !clinicName || !clinicType || !challenge) {
      return NextResponse.json(
        { error: "All fields are required for a consultation booking." },
        { status: 400 }
      );
    }

    // 1. Save to Database
    const booking = await prisma.consultationBooking.create({
      data: {
        name,
        email,
        phone,
        clinicName,
        clinicType,
        challenge,
        preferredDate: preferredDate || null,
        preferredTime: preferredTime || null,
      },
    });

    // 2. Send Greeting Email via Nodemailer
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: `"GrowClinic Team" <${process.env.SMTP_USER}>`,
        to: email, // Send greeting to the user who submitted the form
        subject: "Strategy Session Confirmed! - GrowClinic",
        html: `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1a1a1b; background-color: #ffffff;">
            <div style="text-align: center; padding: 40px 0; background: linear-gradient(135deg, #3586ff 0%, #14B8A6 100%); border-radius: 16px 16px 0 0;">
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.02em;">GrowClinic</h1>
              <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin-top: 5px; font-weight: 500;">Your Practice Growth, Accelerated</p>
            </div>
            
            <div style="padding: 40px; border: 1px solid #f0f0f1; border-top: none; border-radius: 0 0 16px 16px;">
              <h2 style="margin-top: 0; color: #111827; font-size: 20px; font-weight: 700;">Hi ${name},</h2>
              <p style="font-size: 16px; color: #4b5563;">Thank you for requesting a consultation with <strong>GrowClinic</strong>. Our team is excited to help you scale <strong>${clinicName}</strong>.</p>
              
              <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 30px 0;">
                <h3 style="margin-top: 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 15px;">Selected Time Slot</h3>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                  <p style="margin: 0; font-size: 18px; color: #0f172a; font-weight: 600;">
                    ${preferredDate ? new Date(preferredDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'To be confirmed'}
                  </p>
                  <p style="margin: 5px 0 0 0; font-size: 16px; color: #3586ff; font-weight: 700;">
                    ${preferredTime || 'Pending Call'}
                  </p>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                
                <p style="margin: 0; font-size: 14px; color: #64748b; margin-bottom: 5px;"><strong>Clinic Specialty:</strong> ${clinicType}</p>
                <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Current Challenge:</strong> "${challenge}"</p>
              </div>

              <p style="font-size: 15px; color: #4b5563;">Our growth expert will reach out to you at <strong>${phone}</strong> shortly to finalize the details and provide the meeting link.</p>
              
              <div style="margin-top: 40px; text-align: center;">
                <a href="https://growclinic.io/" style="background-color: #3586ff; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">Explore Case Studies</a>
              </div>
              
              <p style="margin-top: 40px; font-size: 14px; color: #94a3b8; border-top: 1px solid #f0f0f1; pt-20px;">Best regards,<br><strong style="color: #111827;">The GrowClinic Team</strong></p>
            </div>
            
            <div style="text-align: center; padding: 30px; color: #94a3b8; font-size: 12px;">
              <p>&copy; ${new Date().getFullYear()} GrowClinic. All rights reserved.</p>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    } else {
      console.warn("SMTP credentials are not configured. Email was not sent.");
    }

    // 3. Send WhatsApp Automated Message
    try {
        const whatsappMessage = 
`Hello ${name}, your strategy session with GrowClinic is confirmed! 🚀

Clinic: ${clinicName}
Date: ${preferredDate ? new Date(preferredDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD'}
Time: ${preferredTime || 'Pending Call'}

Our growth expert will call you at this number shortly.
GrowClinic - Your Practice Growth, Accelerated.`;

        await sendWhatsAppMessage(phone, whatsappMessage);
    } catch (wsError) {
        console.error("WhatsApp automation failed:", wsError);
    }

    return NextResponse.json({ success: true, data: booking }, { status: 201 });
  } catch (error: any) {
    console.error("Error processing consultation booking:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your booking." },
      { status: 500 }
    );
  }
}
