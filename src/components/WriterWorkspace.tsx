import { useRef, useState } from 'react';
import { BookmarkPlus, Check, Copy, ImagePlus, Loader2, Send, Trash2, X } from 'lucide-react';
import type { AttachmentFile, ChatMessage, GalleryItem, WriterMode } from '../types/studio';
import {
  BRAND_DP_URL,
  readFileAsAttachment,
  SAMPLE_BAG_URL,
  urlToAttachment,
} from '../utils/fileHelpers';

interface WriterWorkspaceProps {
  messages: ChatMessage[];
  onMessagesChange: (next: ChatMessage[]) => void;
  userDpUrl: string;
  userName: string;
  onSaveToGallery: (item: GalleryItem) => void;
}

const WRITER_MODES: Array<{ id: WriterMode; label: string; hint: string }> = [
  { id: 'general', label: 'General AI', hint: 'Ask anything in Hindi, Hinglish, or English' },
  { id: 'bag_designer', label: 'Bag & Product Design', hint: 'Design bags, materials, specs & descriptions' },
  { id: 'social_caption', label: 'Captions & Posts', hint: 'Instagram, WhatsApp & YouTube captions' },
  { id: 'video_script', label: 'Video Script', hint: 'Scene-by-scene reels & AI video scripts' },
  { id: 'story', label: 'Story & Dialogue', hint: 'Creative stories & scripts' },
];

const QUICK_STARTERS = [
  'Is bag ka stylish product description aur price idea likho',
  'Ek 30-second village morning reel ka video script Hindi me likho',
  'Handmade canvas bag banane ke liye best material aur size batao',
  'Mere uploaded photo ke liye 5 Instagram captions likho',
];

export function WriterWorkspace({
  messages,
  onMessagesChange,
  userDpUrl,
  userName,
  onSaveToGallery,
}: WriterWorkspaceProps) {
  const [mode, setMode] = useState<WriterMode>('general');
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorText('');
    try {
      const loaded = await Promise.all(Array.from(files).slice(0, 4).map(readFileAsAttachment));
      setAttachments((prev) => [...prev, ...loaded].slice(0, 4));
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Unable to attach selected photo.');
    }
  };

  const handleLoadSampleBag = async () => {
    setErrorText('');
    try {
      const sample = await urlToAttachment(SAMPLE_BAG_URL, 'canvas-tote-bag.jpg');
      setAttachments((prev) => [...prev, sample].slice(0, 4));
      setMode('bag_designer');
      if (!input.trim()) {
        setInput('Is bag photo ko dekhkar iska design breakdown aur product description likho.');
      }
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Could not load sample photo.');
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const promptText =
      input.trim() || 'Please inspect this uploaded photo and write helpful creative details.';
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: promptText,
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode,
    };

    const nextMessages = [...messages, userMsg];
    onMessagesChange(nextMessages);
    setInput('');
    const currentAttachments = [...attachments];
    setAttachments([]);
    setIsLoading(true);
    setErrorText('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          messages: nextMessages.map((m) => ({ role: m.role, text: m.text })),
          attachments: currentAttachments.map((a) => ({
            mimeType: a.mimeType,
            data: a.base64Data,
          })),
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.reply,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode,
      };
      onMessagesChange([...nextMessages, aiMsg]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to reach Online AI.';
      setErrorText(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleSaveText = (msg: ChatMessage) => {
    onSaveToGallery({
      id: `txt-${Date.now()}`,
      type: 'text',
      title: msg.text.split('\n')[0].slice(0, 48) || 'Online AI Writing',
      prompt: msg.mode || 'general',
      textContent: msg.text,
      createdAt: new Date().toISOString(),
    });
    setSavedId(msg.id);
    setTimeout(() => setSavedId(null), 1800);
  };

  return (
    <section aria-label="AI Writer and Photo Chat" className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            AI Writer & Photo Assistant
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Free unlimited writing, Hinglish & Hindi support · Upload any photo to analyze or describe
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadSampleBag}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            Try Sample Bag Photo
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => onMessagesChange([])}
              aria-label="Clear conversation history"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900">
        {WRITER_MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              title={m.hint}
              className={`rounded-md px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                active
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Conversation Area */}
      <div className="min-h-[340px] rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-start justify-center py-6">
            <div className="flex items-center gap-3">
              <img
                src={BRAND_DP_URL}
                alt="Online AI avatar"
                referrerPolicy="no-referrer"
                className="h-11 w-11 rounded-full border border-slate-200 object-cover dark:border-slate-700"
              />
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Namaste! Welcome to Online AI
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Kuch bhi likhein ya apni photo upload karein — bag design, story, caption, ya script.
                </p>
              </div>
            </div>

            <div className="mt-6 grid w-full gap-2.5 sm:grid-cols-2">
              {QUICK_STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => setInput(starter)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:border-emerald-500 hover:bg-emerald-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-emerald-600"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <article
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <img
                    src={isUser ? userDpUrl : BRAND_DP_URL}
                    alt={isUser ? userName : 'Online AI'}
                    referrerPolicy="no-referrer"
                    className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                  />
                  <div
                    className={`max-w-[82%] rounded-xl border px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
                    }`}
                  >
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-2.5 flex flex-wrap gap-2">
                        {msg.attachments.map((att) => (
                          <img
                            key={att.id}
                            src={att.dataUrl}
                            alt={att.name}
                            referrerPolicy="no-referrer"
                            className="h-24 w-24 rounded-lg border border-white/20 object-cover"
                          />
                        ))}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                    <div
                      className={`mt-2 flex items-center justify-between gap-4 text-xs ${
                        isUser ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span className="tabular-nums">{msg.createdAt}</span>
                      {!isUser && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.text)}
                            aria-label="Copy response text"
                            className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-200/70 dark:hover:bg-slate-800"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveText(msg)}
                            aria-label="Save writing to gallery"
                            className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-200/70 dark:hover:bg-slate-800"
                          >
                            {savedId === msg.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Saved</span>
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="h-3.5 w-3.5" />
                                <span>Save</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                <span>Online AI is writing...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {errorText && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {errorText}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
      >
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
            {attachments.map((att) => (
              <div key={att.id} className="relative">
                <img
                  src={att.dataUrl}
                  alt={att.name}
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((item) => item.id !== att.id))}
                  aria-label={`Remove ${att.name}`}
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <label htmlFor="writer-prompt-input" className="sr-only">
          Write your prompt for Online AI
        </label>
        <textarea
          id="writer-prompt-input"
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Yahan likhein (Hindi, Hinglish, or English)... ya photo upload karke sawaal poochein"
          className="w-full resize-none bg-transparent px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
        />

        <div className="mt-2 flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
              id="writer-photo-upload"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <ImagePlus className="h-4 w-4 text-emerald-600" />
              <span>Upload Photo</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || (!input.trim() && attachments.length === 0)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 whitespace-nowrap"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span>Send</span>
          </button>
        </div>
      </form>
    </section>
  );
}
