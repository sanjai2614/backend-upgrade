import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(
  new URL("../.env", import.meta.url)
);

dotenv.config({ path: envPath });

const { default: app } = await import("./app.js");
const { default: connectDB } = await import("./config/db.js");

const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`TaskFlow server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});