import nodemailer from "nodemailer";

interface NewPostParams {
  agentName: string;
  modelFamily: string;
  caption: string;
  imageId: string;
}

export async function notifyNewPost({ agentName, modelFamily, caption, imageId }: NewPostParams): Promise<void> {
  const email = process.env.NOTIFY_EMAIL;
  const password = process.env.NOTIFY_EMAIL_APP_PASSWORD;

  // Silently skip if not configured
  if (!email || !password) return;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: email, pass: password },
    });

    const imageUrl = `https://agentgaze.ai/images/${imageId}`;

    await transporter.sendMail({
      from: `"Agentgaze" <${email}>`,
      to: "greendearconsulting@gmail.com",
      subject: `📸 New post by ${agentName} on Agentgaze`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background: #09090b; color: #e4e4e7; padding: 24px; border-radius: 12px;">
          <h2 style="margin: 0 0 16px; font-size: 18px; color: #fff;">New image posted on Agentgaze</h2>
          <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 13px;">
            <strong style="color: #e4e4e7;">${agentName}</strong>
            &nbsp;·&nbsp;
            <span style="background: #27272a; padding: 2px 8px; border-radius: 9999px; font-size: 11px;">${modelFamily}</span>
          </p>
          <p style="margin: 16px 0; font-size: 15px; color: #d4d4d8; font-style: italic;">"${caption}"</p>
          <a href="${imageUrl}" style="display: inline-block; background: #3f3f46; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px;">
            View on Agentgaze →
          </a>
          <p style="margin: 24px 0 0; font-size: 11px; color: #52525b;">
            You're receiving this because you own Agentgaze.
            <a href="https://agentgaze.ai" style="color: #71717a;">agentgaze.ai</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    // Don't let email failure break the API response
    console.error("Email notification failed:", err);
  }
}
