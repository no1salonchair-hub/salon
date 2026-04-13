import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ModerationResult {
  isValid: boolean;
  isSafe: boolean;
  reason: string;
}

export async function moderateSalonImage(base64Image: string): Promise<ModerationResult> {
  // Remove data:image/jpeg;base64, prefix if present
  const base64Data = base64Image.split(',')[1] || base64Image;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data,
              },
            },
            {
              text: "Analyze this image for a salon marketplace. Check if it is a real photo of a salon, barbershop, or beauty parlor (interior or exterior). Also check for nudity, explicit content, or generic dummy/placeholder graphics. Return a JSON object with 'isValid' (boolean), 'isSafe' (boolean), and 'reason' (string).",
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: {
              type: Type.BOOLEAN,
              description: "Whether the image is a valid salon storefront or interior.",
            },
            isSafe: {
              type: Type.BOOLEAN,
              description: "Whether the image is safe (no nudity, explicit content).",
            },
            reason: {
              type: Type.STRING,
              description: "Brief reason for the decision.",
            },
          },
          required: ["isValid", "isSafe", "reason"],
        },
      },
    });

    const result = JSON.parse(response.text.trim());
    return result;
  } catch (error) {
    console.error("Image moderation error:", error);
    // Fallback to pending if AI fails
    return {
      isValid: false,
      isSafe: true,
      reason: "AI moderation failed, manual review required.",
    };
  }
}
