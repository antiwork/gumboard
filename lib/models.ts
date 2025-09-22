import { GoogleGenerativeAI } from "@google/generative-ai";

export const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY!);
export const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
