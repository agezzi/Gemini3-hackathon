
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { SYSTEM_INSTRUCTION, PROFILE_ANALYSIS_INSTRUCTION } from "../constants";
import { AnalysisResult, NeuralProfile } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");
  return new GoogleGenAI({ apiKey });
};

export const generateNeuralProfile = async (answers: Record<string, string>): Promise<NeuralProfile> => {
  const ai = getAI();
  const prompt = `Onboarding Questionnaire Results:\n${JSON.stringify(answers, null, 2)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: PROFILE_ANALYSIS_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryType: { type: Type.STRING },
            traits: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            scores: {
              type: Type.OBJECT,
              properties: {
                focus: { type: Type.NUMBER },
                sensory: { type: Type.NUMBER },
                processing: { type: Type.NUMBER },
                executive: { type: Type.NUMBER }
              },
              required: ["focus", "sensory", "processing", "executive"]
            }
          },
          required: ["primaryType", "traits", "recommendations", "scores"]
        }
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);
    return {
      ...result,
      context: answers.context || 'corporate'
    };
  } catch (err) {
    console.error("Profile generation failed:", err);
    return {
      primaryType: "Standard Executive Support",
      traits: ["General Task Fatigue"],
      context: (answers.context as any) || 'corporate',
      recommendations: ["Break tasks down", "Set clear timers"],
      scores: { focus: 50, sensory: 50, processing: 50, executive: 50 }
    };
  }
};

export const analyzeBehavior = async (
  history: string, 
  goals: string, 
  streak: number = 0,
  profile: NeuralProfile | null = null
): Promise<AnalysisResult> => {
  const ai = getAI();
  
  const prompt = `
  USER PROFILE: ${profile ? JSON.stringify(profile) : 'Not analyzed yet'}
  USER METRICS: Current Neural Persistence Score: ${streak} days.
  HISTORICAL DATA: ${history}
  NEXT DAY GOALS: ${goals}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: { type: Type.STRING },
            burnoutAlert: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                level: { type: Type.STRING },
                message: { type: Type.STRING },
                recoveryAction: { type: Type.STRING }
              },
              required: ["level", "message", "recoveryAction"]
            },
            quickWins: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING }
            },
            adaptedPlan: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["insights", "quickWins", "adaptedPlan", "explanation"]
        },
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      insights: result.insights || "Analysis incomplete.",
      quickWins: result.quickWins || [],
      adaptedPlan: result.adaptedPlan || "Plan generation failed.",
      explanation: result.explanation || "Explanation unavailable.",
      burnoutAlert: result.burnoutAlert || undefined
    };
  } catch (err) {
    console.error("Analysis failed:", err);
    throw new Error("Analysis failed. Please try again.");
  }
};

export const createChatSession = (profile: NeuralProfile | null) => {
  const ai = getAI();
  const systemInstruction = `You are "Dr. Neural", an expert behavioral psychologist and cognitive guide. 
  Your expertise is in Neurodiversity (ADHD, ASD, Dyslexia, Executive Dysfunction). 
  
  USER CONTEXT:
  Current Neural Profile: ${profile ? JSON.stringify(profile) : 'Unknown/Standard'}.
  
  YOUR GUIDELINES:
  1. Be empathetic but clinical and expert. 
  2. Provide actionable cognitive strategies (e.g., "The 5-Minute Rule", "Dopamine Anchoring", "Visual Scaffolding").
  3. Help the user adjust their NeuralPlan results if they feel overwhelmed.
  4. If they are in burnout, recommend immediate sensory reduction or "low-power mode" tasks.
  5. Keep responses concise and focused on cognitive ergonomics.`;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction,
      temperature: 0.7,
    }
  });
};
