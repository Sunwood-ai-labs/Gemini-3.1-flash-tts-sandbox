import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface TTSOptions {
  text: string;
  voice: VoiceName;
  temperature?: number;
  onChunk?: (base64: string) => void;
}

/**
 * PCMStreamPlayer handles sequential playback of PCM audio chunks
 * to achieve true low-latency streaming.
 */
export class PCMStreamPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime: number = 0;
  private sampleRate: number;

  constructor(sampleRate: number = 24000) {
    this.sampleRate = sampleRate;
  }

  private initContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.nextStartTime = this.audioCtx.currentTime;
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  feed(base64Data: string) {
    this.initContext();
    if (!this.audioCtx) return;

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Int16Array(len / 2);
    
    for (let i = 0; i < len; i += 2) {
      const low = binaryString.charCodeAt(i);
      const high = binaryString.charCodeAt(i + 1);
      let val = low | (high << 8);
      if (val > 32767) val -= 65536;
      bytes[i / 2] = val;
    }

    const buffer = this.audioCtx.createBuffer(1, bytes.length, this.sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < bytes.length; i++) {
      channelData[i] = bytes[i] / 32768;
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioCtx.destination);

    // Schedule playback to start after the previous chunk ends
    const startTime = Math.max(this.nextStartTime, this.audioCtx.currentTime);
    source.start(startTime);
    this.nextStartTime = startTime + buffer.duration;
  }

  async stop() {
    if (this.audioCtx) {
      await this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

export async function generateSpeech({ text, voice, onChunk }: TTSOptions) {
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
        const chunkData = part.inlineData.data;
        base64Audio += chunkData;
        if (onChunk) {
          onChunk(chunkData);
        }
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
