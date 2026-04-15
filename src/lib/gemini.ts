import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface TTSOptions {
  text: string;
  voice: VoiceName;
  temperature?: number;
}

export async function generateSpeech({ text, voice }: TTSOptions) {
  try {
    const response = await ai.models.generateContentStream({
      model: "gemini-3.1-flash-tts-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: `## Transcript:\n${text}` }],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    } as any);

    let base64Audio = "";
    for await (const chunk of response) {
      const part = chunk.candidates?.[0]?.content?.parts?.[0];
      if (part?.inlineData?.data) {
        base64Audio += part.inlineData.data;
      }
    }
    
    if (!base64Audio) {
      throw new Error("No audio data received from Gemini.");
    }

    return base64Audio;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
}

/**
 * Plays raw PCM audio data (base64) using AudioContext.
 * Assumes 24kHz sample rate, mono, 16-bit PCM.
 */
export async function playRawAudio(base64Data: string, sampleRate: number = 24000) {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Int16Array(len / 2);
  
  for (let i = 0; i < len; i += 2) {
    // Combine two 8-bit values into one 16-bit signed integer (little-endian)
    const low = binaryString.charCodeAt(i);
    const high = binaryString.charCodeAt(i + 1);
    let val = low | (high << 8);
    if (val > 32767) val -= 65536;
    bytes[i / 2] = val;
  }

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const buffer = audioCtx.createBuffer(1, bytes.length, sampleRate);
  const channelData = buffer.getChannelData(0);

  for (let i = 0; i < bytes.length; i++) {
    // Convert 16-bit PCM to float range [-1, 1]
    channelData[i] = bytes[i] / 32768;
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start();
  
  return new Promise<void>((resolve) => {
    source.onended = () => {
      audioCtx.close();
      resolve();
    };
  });
}
