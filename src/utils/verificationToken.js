import { randomBytes, createHash } from "node:crypto";

const generateVerificationToken = () => {
  const token = randomBytes(32).toString("hex");
  
  const hashedToken = createHash("sha256").update(token).digest("hex");

  return {
    token,
    hashedToken,
  };
};

export default generateVerificationToken;
