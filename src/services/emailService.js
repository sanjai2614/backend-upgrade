import resend from "../config/email.js";

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });

export const sendVerificationEmail = async (name, email, verificationUrl) => {
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to: [email],
    subject: "Verify your TaskFlow email",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome to TaskFlow, ${escapeHtml(name)}!</h2>
        <p>Click below to verify your email address.</p>
        <p>
          <a href="${verificationUrl}"
             style="display:inline-block;padding:12px 20px;
                    background:#2563eb;color:#fff;
                    text-decoration:none;border-radius:6px;">
            Verify Email
          </a>
        </p>
        <p>This link expires in 15 minutes.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error("Email could not be sent");
  }
};
