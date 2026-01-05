import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeMarksheet = async (base64Image: string): Promise<AnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming JPEG/PNG, API handles standard image types
              data: base64Image
            }
          },
          {
            text: `Analyze this marksheet image. Extract the student name, subject scores, and calculate totals.
            Also provide a brief summary and constructive feedback.
            If the image is not a marksheet, return null values or empty arrays but try to handle it gracefully.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            studentName: { type: Type.STRING, description: "Name of the student extracted from the document." },
            subjects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  score: { type: Type.NUMBER, description: "Marks obtained" },
                  fullMarks: { type: Type.NUMBER, description: "Total possible marks for this subject (default to 100 if unknown)" }
                }
              }
            },
            totalObtained: { type: Type.NUMBER },
            totalPossible: { type: Type.NUMBER },
            percentage: { type: Type.NUMBER },
            grade: { type: Type.STRING, description: "Overall grade (A, B, C, etc.)" },
            summary: { type: Type.STRING, description: "A brief 2-sentence summary of performance." },
            feedback: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of 3 constructive feedback points."
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to process marksheet. Please ensure the image is clear and try again.");
  }
};
