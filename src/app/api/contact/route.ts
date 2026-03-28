import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { sendContactConfirmationWhatsApp } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const { name, email, phone, source, message } = await req.json();

    if (!name || !email || !source || !message) {
      return NextResponse.json(
        { error: "Name, email, source, and message are required fields." },
        { status: 400 }
      );
    }

    // 1. Save to Database
    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        source,
        message,
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
        subject: "Thank you for contacting GrowClinic!",
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2>Hi ${name},</h2>
            <p>Thank you for reaching out to GrowClinic! We have received your message and our team will get back to you shortly.</p>
            <p><strong>A copy of your message:</strong></p>
            <blockquote style="border-left: 4px solid #14B8A6; padding-left: 10px; color: #555;">
              ${message}
            </blockquote>
            <p>Best regards,<br>The GrowClinic Team</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    } else {
      console.warn("SMTP credentials are not configured. Email was not sent.");
    }

    // 3. Send WhatsApp Confirmation (fire-and-forget)
    if (phone) {
      sendContactConfirmationWhatsApp(phone, name).catch((err) =>
        console.error("WhatsApp contact confirmation failed:", err)
      );
    }

    return NextResponse.json({ success: true, data: contactMessage }, { status: 201 });
  } catch (error: any) {
    console.error("Error processing contact form:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}

