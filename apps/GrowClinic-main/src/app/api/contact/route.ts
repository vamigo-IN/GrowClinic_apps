import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { sendContactConfirmationWhatsApp } from "@/lib/whatsapp";
import { pushToCrm } from "@/lib/push-to-crm";
import { escapeHtml } from "@/lib/html";
import { isEmail, text } from "@/lib/input";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = text(body?.name, 120);
    const email = text(body?.email, 254);
    const phone = text(body?.phone, 40);
    const source = text(body?.source, 64);
    const message = text(body?.message, 5000);

    if (!name || !email || !source || !message) {
      return NextResponse.json(
        { error: "Name, email, source, and message are required fields." },
        { status: 400 }
      );
    }
    if (!isEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
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

    // 1b. Forward to audit tool CRM (fire-and-forget — never blocks the response).
    pushToCrm({
      name,
      email,
      phone: phone || null,
      source: "growclinic-contact",
      message,
    });

    // 1c. Append to Google Sheet via a free Apps Script web app (fire-and-forget).
    //     Set CONTACT_SHEET_WEBHOOK_URL to your deployed Apps Script /exec URL.
    if (process.env.CONTACT_SHEET_WEBHOOK_URL) {
      void (async () => {
        try {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 8000);
          await fetch(process.env.CONTACT_SHEET_WEBHOOK_URL as string, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              email,
              phone: phone || "",
              source,
              message,
              submittedAt: new Date().toISOString(),
            }),
            signal: controller.signal,
          });
          clearTimeout(t);
        } catch (err) {
          console.error("Contact sheet sync failed:", err);
        }
      })();
    }

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
            <h2>Hi ${escapeHtml(name)},</h2>
            <p>Thank you for reaching out to GrowClinic! We have received your message and our team will get back to you shortly.</p>
            <p><strong>A copy of your message:</strong></p>
            <blockquote style="border-left: 4px solid #14B8A6; padding-left: 10px; color: #555; white-space: pre-wrap;">
              ${escapeHtml(message)}
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

