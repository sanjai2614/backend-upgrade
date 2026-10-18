import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUrl = process.env.MONGO_URL;

  if (!mongoUrl) {
    throw new Error("MONGO_URL is missing");
  }

  const connection = await mongoose.connect(mongoUrl);

  console.log(`MongoDB connected: ${connection.connection.host}`);
};

export default connectDB;
