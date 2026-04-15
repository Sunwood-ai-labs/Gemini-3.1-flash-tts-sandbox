/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, 
  Square, 
  Volume2, 
  Settings2, 
  History, 
  Download, 
  Trash2,
  Mic2,
  Sparkles,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { generateSpeech, playRawAudio, VoiceName } from "@/src/lib/gemini";

interface HistoryItem {
  id: string;
  text: string;
  voice: VoiceName;
  timestamp: number;
  audioData: string;
}

export default function App() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<VoiceName>("Zephyr");
  const [style, setStyle] = useState("neutral");
  const [temperature, setTemperature] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const styles = [
    { id: "neutral", label: "Neutral", prompt: "" },
    { id: "cheerful", label: "Cheerful", prompt: "Say cheerfully: " },
    { id: "sad", label: "Sad", prompt: "Say sadly: " },
    { id: "excited", label: "Excited", prompt: "Say with great excitement: " },
    { id: "whisper", label: "Whisper", prompt: "Whisper this: " },
    { id: "serious", label: "Serious", prompt: "Say in a serious, professional tone: " },
  ];

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to synthesize.");
      return;
    }

    setIsLoading(true);
    try {
      // Prepend the style prompt if selected
      const selectedStyle = styles.find(s => s.id === style);
      const fullText = selectedStyle ? `${selectedStyle.prompt}${text}` : text;

      const audioData = await generateSpeech({ text: fullText, voice, temperature });
      
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        text: text.length > 50 ? text.slice(0, 50) + "..." : text,
        voice,
        timestamp: Date.now(),
        audioData,
      };
      
      setHistory(prev => [newItem, ...prev]);
      toast.success("Speech generated successfully!");
      
      setIsPlaying(true);
      await playRawAudio(audioData);
      setIsPlaying(false);
    } catch (error) {
      toast.error("Failed to generate speech. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayHistory = async (item: HistoryItem) => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      await playRawAudio(item.audioData);
    } catch (error) {
      toast.error("Failed to play audio.");
    } finally {
      setIsPlaying(false);
    }
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    toast.info("History item deleted.");
  };

  const handleDownload = (item: HistoryItem) => {
    const binaryString = atob(item.audioData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "audio/pcm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `speech-${item.voice}-${item.id.slice(0, 8)}.raw`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download started (Raw PCM data)");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header */}
      <header className="h-[60px] border-b bg-card flex items-center px-8 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <Mic2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">Gemini Voice Studio</span>
          <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">
            TTS PREVIEW
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9">Settings</Button>
          <Button size="sm" className="h-9 px-6">Login</Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[280px] bg-[#fafafa] border-r p-6 flex flex-col gap-8 overflow-y-auto">
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="text-[0.75rem] font-semibold uppercase text-muted-foreground tracking-wider block">
                Model Configuration
              </span>
              <Select disabled defaultValue="gemini-3.1-flash-tts">
                <SelectTrigger className="bg-card border-border h-9">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-3.1-flash-tts">gemini-3.1-flash-tts-preview</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <span className="text-[0.75rem] font-semibold uppercase text-muted-foreground tracking-wider block">
                Expression Style
              </span>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="bg-card border-border h-9">
                  <SelectValue placeholder="Select a style" />
                </SelectTrigger>
                <SelectContent>
                  {styles.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <span className="text-[0.75rem] font-semibold uppercase text-muted-foreground tracking-wider block">
                Voice Selection
              </span>
              <Select value={voice} onValueChange={(v) => setVoice(v as VoiceName)}>
                <SelectTrigger className="bg-card border-border h-9">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Zephyr">Zephyr (Default)</SelectItem>
                  <SelectItem value="Puck">Puck</SelectItem>
                  <SelectItem value="Charon">Charon</SelectItem>
                  <SelectItem value="Kore">Kore</SelectItem>
                  <SelectItem value="Fenrir">Fenrir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[0.875rem] font-medium">Temperature</span>
                <span className="text-muted-foreground text-xs">{temperature.toFixed(1)}</span>
              </div>
              <Slider
                value={[temperature]}
                onValueChange={(v: number[]) => setTemperature(v[0])}
                max={2}
                step={0.1}
                className="py-2"
              />
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-border/50">
            <span className="text-[0.75rem] font-semibold uppercase text-muted-foreground tracking-wider block mb-4">
              Recent Activity
            </span>
            <div className="space-y-1">
              <AnimatePresence initial={false}>
                {history.length === 0 ? (
                  <p className="text-[0.75rem] text-muted-foreground italic px-2">No recent activity</p>
                ) : (
                  history.slice(0, 5).map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[0.75rem] p-2 rounded hover:bg-secondary cursor-pointer transition-colors truncate border border-transparent hover:border-border"
                      onClick={() => handlePlayHistory(item)}
                    >
                      "{item.text}"
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto bg-background">
          <div className="flex justify-between items-end">
            <span className="text-[0.75rem] font-semibold uppercase text-muted-foreground tracking-wider">
              Transcript Input
            </span>
            <span className="text-[0.75rem] text-muted-foreground">
              {text.length} / 5000 chars
            </span>
          </div>

          <Textarea
            placeholder="Enter text to convert to speech..."
            className="flex-1 min-h-[300px] bg-card border-border text-foreground focus-visible:ring-primary/20 resize-none text-base leading-relaxed p-4"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="flex gap-4 items-center">
            <Button 
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-10 font-medium h-11"
              onClick={handleGenerate}
              disabled={isLoading || !text.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Generate Audio
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="h-11 px-8"
              onClick={() => setText("")}
              disabled={isLoading || !text}
            >
              Clear
            </Button>
          </div>

          {/* Audio Player Card (Visible when history has items) */}
          {history.length > 0 && (
            <div className="border border-border rounded-lg p-4 flex items-center gap-4 bg-card shadow-sm">
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full w-10 h-10 shrink-0"
                onClick={() => handlePlayHistory(history[0])}
                disabled={isPlaying}
              >
                {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </Button>
              <div className="flex-1 h-10 flex items-center gap-1 px-2">
                {/* Mock Waveform */}
                {[30, 60, 80, 40, 70, 90, 50, 40, 60, 30, 40, 80, 40, 50, 70, 30, 50, 20].map((h, i) => (
                  <div 
                    key={i} 
                    className={`flex-1 rounded-sm transition-all duration-300 ${isPlaying ? 'bg-primary opacity-100' : 'bg-muted-foreground opacity-30'}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <span className="text-[0.75rem] font-mono text-muted-foreground shrink-0">
                {isPlaying ? "PLAYING" : "READY"}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9"
                onClick={() => handleDownload(history[0])}
              >
                <Download className="w-3.5 h-3.5 mr-2" />
                Download .raw
              </Button>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex gap-3 items-center text-[0.8rem]">
            <span className="font-bold text-blue-800 shrink-0">Pro Tip:</span>
            <p className="text-blue-700">
              Gemini TTS follows natural language instructions. You can add cues like <strong>"Say it like you're telling a secret:"</strong> or <strong>"With a robotic voice:"</strong> directly into your text for custom expressions.
            </p>
          </div>
        </main>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
