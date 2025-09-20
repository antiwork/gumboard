import { GoogleGenerativeAI } from "@google/generative-ai";

export const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY!);
export const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
