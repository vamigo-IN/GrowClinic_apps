/**
 * Core utility for sending WhatsApp messages.
 * This is designed to be provider-agnostic.
 * You can configure the provider (e.g., Meta Graph API, Interakt, Wati) via environment variables.
 */

export async function sendWhatsAppMessage(to: string, message: string) {
    // Basic phone number cleaning (removing spaces, dashes, etc.)
    const cleanNumber = to.replace(/\D/g, "");
    
    // Check for required environment variables
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiToken = process.env.WHATSAPP_API_TOKEN;
    const provider = process.env.WHATSAPP_PROVIDER || "meta"; // default to meta graph api structure

    if (!apiUrl || !apiToken) {
        console.warn("WhatsApp API credentials are not configured. Message not sent.");
        return { success: false, error: "Missing configuration" };
    }

    try {
        let response;
        
        if (provider === "meta") {
            // Implementation for Meta (Facebook) Graph API for WhatsApp
            response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: cleanNumber,
                    type: "text",
                    text: { body: message }
                }),
            });
        } else {
            // Generic implementation for other providers (Interakt, Wati, etc.)
            // Most use a similar structure with different auth headers
            response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    to: cleanNumber,
                    message: message,
                }),
            });
        }

        const data = await response.json();
        
        if (!response.ok) {
            console.error("WhatsApp API Error:", data);
            return { success: false, error: data };
        }

        return { success: true, data };
    } catch (error) {
        console.error("Failed to send WhatsApp message:", error);
        return { success: false, error };
    }
}
