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
  const [lang, setLang] = useState<"en" | "ja">("ja");

  const t = {
    ja: {
      title: "Gemini 3.1 TTS 体験スタジオ",
      subtitle: "次世代リアルタイム音声合成の進化を体感する",
      modelConfig: "モデル設定",
      expressionStyle: "表現スタイル",
      voiceSelection: "ボイス選択",
      temperature: "温度 (表現の幅)",
      inputLabel: "読み上げテキスト",
      generateBtn: "音声を生成して再生",
      generating: "生成中...",
      clear: "クリア",
      history: "履歴",
      noHistory: "履歴はありません",
      latency: "低遅延",
      proTip: "Gemini 3.1 Flash TTS の新機能",
      feature1: "超低遅延: リアルタイム対話に最適化",
      feature2: "ネイティブ生成: 自然な抑揚とリズム",
      feature3: "指示遂行: 「ささやき」などの指示を理解",
      feature4: "高音質: クリアで人間らしい響き",
      placeholder: "ここにテキストを入力するか、下のプリセットを試してください...",
      presetsLabel: "進化を体験するプリセット",
    },
    en: {
      title: "Gemini 3.1 TTS Experience",
      subtitle: "Explore the evolution of real-time speech synthesis",
      modelConfig: "Model Config",
      expressionStyle: "Expression Style",
      voiceSelection: "Voice Selection",
      temperature: "Temperature",
      inputLabel: "Transcript Input",
      generateBtn: "Generate & Play",
      generating: "Generating...",
      clear: "Clear",
      history: "History",
      noHistory: "No history yet",
      latency: "LOW LATENCY",
      proTip: "What's New in Gemini 3.1 Flash TTS?",
      feature1: "Ultra-Low Latency: Optimized for real-time",
      feature2: "Native Modality: Natural prosody and flow",
      feature3: "Instruction Following: Understands style cues",
      feature4: "High Fidelity: Clear and human-like",
      placeholder: "Enter text here or try a preset below...",
      presetsLabel: "Experience Presets",
    }
  };

  const styles = [
    { id: "neutral", label: { ja: "標準", en: "Neutral" }, prompt: "" },
    { id: "cheerful", label: { ja: "明るく", en: "Cheerful" }, prompt: "Say cheerfully: " },
    { id: "sad", label: { ja: "悲しく", en: "Sad" }, prompt: "Say sadly: " },
    { id: "excited", label: { ja: "興奮", en: "Excited" }, prompt: "Say with great excitement: " },
    { id: "whisper", label: { ja: "ささやき", en: "Whisper" }, prompt: "Whisper this: " },
    { id: "serious", label: { ja: "真剣", en: "Serious" }, prompt: "Say in a serious, professional tone: " },
  ];

  const presets = [
    {
      title: { ja: "感情の指示 (指示遂行能力)", en: "Emotional Cues (Instruction Following)" },
      text: { 
        ja: "「すごく秘密めいた感じで、ささやくように言って：」ここだけの話なんだけど、実は Gemini 3.1 は指示を直接理解できるようになったんだよ。", 
        en: "Say it like you're telling a deep secret, whispering: I have a secret to tell you. Gemini 3.1 can now understand natural language instructions directly." 
      }
    },
    {
      title: { ja: "自然な抑揚 (ネイティブ生成)", en: "Natural Prosody (Native Modality)" },
      text: { 
        ja: "「ニュースキャスターのように、ハキハキと：」本日のニュースをお伝えします。Gemini 3.1 Flash TTS は、まるで人間が話しているかのような自然なリズムを実現しました。", 
        en: "Like a professional news anchor: Reporting live today. Gemini 3.1 Flash TTS achieves a natural rhythm that sounds just like a human speaker." 
      }
    },
    {
      title: { ja: "リアルタイム対話 (低遅延)", en: "Real-time Interaction (Low Latency)" },
      text: { 
        ja: "「友達と話しているように、カジュアルに：」ねえ、Gemini 3.1 って知ってる？反応がめちゃくちゃ速いから、本当の会話みたいにスムーズに話せるんだよ！", 
        en: "Casual conversation with a friend: Hey, have you heard about Gemini 3.1? It's so fast that it feels like we're having a real, smooth conversation!" 
      }
    }
  ];

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error(lang === "ja" ? "テキストを入力してください。" : "Please enter some text.");
      return;
    }

    setIsLoading(true);
    try {
      const selectedStyle = styles.find(s => s.id === style);
      const stylePrompt = selectedStyle?.prompt || "";
      const fullText = `${stylePrompt}${text}`;

      const audioData = await generateSpeech({ text: fullText, voice, temperature });
      
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        text: text.length > 40 ? text.slice(0, 40) + "..." : text,
        voice,
        timestamp: Date.now(),
        audioData,
      };
      
      setHistory(prev => [newItem, ...prev]);
      toast.success(lang === "ja" ? "音声を生成しました" : "Speech generated!");
      
      setIsPlaying(true);
      await playRawAudio(audioData);
      setIsPlaying(false);
    } catch (error) {
      toast.error(lang === "ja" ? "生成に失敗しました" : "Failed to generate.");
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
      toast.error("Error playing audio.");
    } finally {
      setIsPlaying(false);
    }
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
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
    a.download = `gemini-tts-${item.id.slice(0, 8)}.raw`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cur = t[lang];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header */}
      <header className="h-[70px] border-b bg-card flex items-center px-8 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Mic2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight leading-none">{cur.title}</h1>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-medium">
              {cur.subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-secondary p-1 rounded-md border">
            <button 
              onClick={() => setLang("ja")}
              className={`px-3 py-1 text-xs rounded transition-all ${lang === "ja" ? "bg-card shadow-sm font-bold" : "text-muted-foreground"}`}
            >
              JP
            </button>
            <button 
              onClick={() => setLang("en")}
              className={`px-3 py-1 text-xs rounded transition-all ${lang === "en" ? "bg-card shadow-sm font-bold" : "text-muted-foreground"}`}
            >
              EN
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full text-[10px] font-bold text-green-700">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {cur.latency}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[300px] bg-[#fafafa] border-r p-6 flex flex-col gap-8 overflow-y-auto">
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="text-[0.7rem] font-bold uppercase text-muted-foreground tracking-widest block">
                {cur.modelConfig}
              </span>
              <div className="bg-card border rounded-md p-2 text-xs font-mono text-zinc-500">
                gemini-3.1-flash-tts-preview
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[0.7rem] font-bold uppercase text-muted-foreground tracking-widest block">
                {cur.voiceSelection}
              </span>
              <Select value={voice} onValueChange={(v) => setVoice(v as VoiceName)}>
                <SelectTrigger className="bg-card border-border h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Zephyr">Zephyr</SelectItem>
                  <SelectItem value="Puck">Puck</SelectItem>
                  <SelectItem value="Charon">Charon</SelectItem>
                  <SelectItem value="Kore">Kore</SelectItem>
                  <SelectItem value="Fenrir">Fenrir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[0.8rem] font-bold">{cur.temperature}</span>
                <span className="text-primary font-mono text-xs">{temperature.toFixed(1)}</span>
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
            <span className="text-[0.7rem] font-bold uppercase text-muted-foreground tracking-widest block mb-4">
              {cur.history}
            </span>
            <div className="space-y-1">
              <AnimatePresence initial={false}>
                {history.length === 0 ? (
                  <p className="text-[0.75rem] text-muted-foreground italic px-2">{cur.noHistory}</p>
                ) : (
                  history.slice(0, 5).map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[0.75rem] p-2 rounded hover:bg-secondary cursor-pointer transition-colors truncate border border-transparent hover:border-border group flex justify-between items-center"
                    >
                      <span className="truncate flex-1" onClick={() => handlePlayHistory(item)}>"{item.text}"</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteHistory(item.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto bg-background">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-3 flex-1 max-w-xs">
              <span className="text-[0.7rem] font-bold uppercase text-muted-foreground tracking-widest block">
                {cur.expressionStyle}
              </span>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="bg-card border-border h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {styles.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.label[lang]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between items-end flex-1">
              <span className="text-[0.7rem] font-bold uppercase text-muted-foreground tracking-widest">
                {cur.inputLabel}
              </span>
              <span className="text-[0.7rem] text-muted-foreground font-mono">
                {text.length} / 5000
              </span>
            </div>
          </div>

          <Textarea
            placeholder={cur.placeholder}
            className="flex-1 min-h-[250px] bg-card border-border text-foreground focus-visible:ring-primary/10 resize-none text-lg leading-relaxed p-6 shadow-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {/* Presets */}
          <div className="space-y-3">
            <span className="text-[0.7rem] font-bold uppercase text-muted-foreground tracking-widest block">
              {cur.presetsLabel}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {presets.map((p, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setText(p.text[lang]);
                    setStyle("neutral");
                  }}
                  className="p-3 text-left border rounded-lg hover:bg-secondary transition-all group active:scale-[0.98]"
                >
                  <div className="text-[10px] font-bold text-primary mb-1 uppercase tracking-tighter group-hover:text-primary-foreground group-hover:bg-primary inline-block px-1 rounded">
                    Preset {i + 1}
                  </div>
                  <div className="text-xs font-bold block mb-1">{p.title[lang]}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-2 italic">"{p.text[lang]}"</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 items-center pt-2">
            <Button 
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-12 font-bold h-12 shadow-lg active:scale-95 transition-all"
              onClick={handleGenerate}
              disabled={isLoading || !text.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {cur.generating}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2 fill-current" />
                  {cur.generateBtn}
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="h-12 px-8 font-medium"
              onClick={() => setText("")}
              disabled={isLoading || !text}
            >
              {cur.clear}
            </Button>
          </div>

          {/* Audio Player Card */}
          {history.length > 0 && (
            <div className="border border-border rounded-xl p-5 flex items-center gap-5 bg-card shadow-md animate-in fade-in slide-in-from-bottom-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full w-12 h-12 shrink-0 border-2"
                onClick={() => handlePlayHistory(history[0])}
                disabled={isPlaying}
              >
                {isPlaying ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
              </Button>
              <div className="flex-1 h-12 flex items-center gap-1.5 px-2">
                {[30, 60, 80, 40, 70, 90, 50, 40, 60, 30, 40, 80, 40, 50, 70, 30, 50, 20, 40, 60, 30, 50, 80, 40].map((h, i) => (
                  <div 
                    key={i} 
                    className={`flex-1 rounded-full transition-all duration-500 ${isPlaying ? 'bg-primary scale-y-110' : 'bg-muted-foreground/20'}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] font-bold font-mono text-muted-foreground tracking-widest">
                  {isPlaying ? "PLAYING" : "READY"}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-[10px] font-bold uppercase tracking-wider"
                  onClick={() => handleDownload(history[0])}
                >
                  <Download className="w-3 h-3 mr-2" />
                  Download .raw
                </Button>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="bg-zinc-50 border border-zinc-200 p-5 rounded-xl space-y-4">
            <div className="flex items-center gap-2 font-bold text-zinc-800 text-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              {cur.proTip}
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-xs text-zinc-600 list-none">
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>{cur.feature1}</span>
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>{cur.feature2}</span>
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>{cur.feature3}</span>
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>{cur.feature4}</span>
              </li>
            </ul>
          </div>
        </main>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
