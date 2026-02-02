"use client";

import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  BranchPickerPrimitive,
  ActionBarPrimitive,
  useMessage,
  useComposerRuntime,
} from "@assistant-ui/react";
import ReactMarkdown from "react-markdown";
import { SendHorizontal, Square, ChevronLeft, ChevronRight, Copy, Check, RefreshCw, Sparkles, Paperclip, X, Image, FileText, Film, Music } from "lucide-react";
import { useState, useRef, useCallback } from "react";

// Markdown 渲染组件
function MarkdownText({ text }: { text: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-700">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

export function Thread() {
  return (
    <ThreadPrimitive.Root className="flex flex-col h-full bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="flex items-center justify-center py-4 px-6 border-b border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-xl bg-white/70 dark:bg-zinc-900/70">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-zinc-900" />
          </div>
          <span className="font-semibold text-zinc-800 dark:text-zinc-100">AI Assistant</span>
        </div>
      </header>

      {/* Messages Area */}
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <ThreadPrimitive.Empty>
            <EmptyState />
          </ThreadPrimitive.Empty>

          <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
        </div>
      </ThreadPrimitive.Viewport>

      {/* Input Area */}
      <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Composer />
        </div>
        <div className="text-center pb-3">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Powered by Gemini 3 Pro · 按 Enter 发送
          </span>
        </div>
      </div>
    </ThreadPrimitive.Root>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Animated gradient orb */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-2xl shadow-purple-500/30 animate-pulse">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-full blur-2xl -z-10" />
      </div>

      <h1 className="text-3xl font-bold bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-100 bg-clip-text text-transparent mb-3">
        你好，有什么可以帮你？
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-md text-base leading-relaxed">
        我是你的 AI 助手，可以回答问题、分析图片、编写代码，帮你完成各种任务。
      </p>

      {/* Quick action chips */}
      <div className="flex flex-wrap gap-2 mt-8 justify-center">
        {["写一段代码", "解释概念", "分析图片", "头脑风暴"].map((text) => (
          <button
            key={text}
            className="px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all hover:scale-105 active:scale-95"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
    </div>
  );
}

// 文件类型配置
interface FileAttachment {
  id: string;
  file: File;
  preview?: string;
  type: "image" | "video" | "audio" | "document";
}

const BLOCKED_EXTENSIONS = [
  ".exe", ".msi", ".bat", ".cmd", ".com", ".scr", ".pif",
  ".app", ".dmg", ".pkg", ".deb", ".rpm",
  ".sh", ".bash", ".zsh", ".ps1", ".psm1",
  ".dll", ".so", ".dylib",
  ".jar", ".class", ".war", ".ear",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function getFileType(file: File): FileAttachment["type"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `文件 ${file.name} 超过 100MB 限制` };
  }
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `不允许上传 ${ext} 类型的文件` };
  }
  return { valid: true };
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function FileIcon({ type }: { type: FileAttachment["type"] }) {
  switch (type) {
    case "image":
      return <Image className="w-4 h-4" />;
    case "video":
      return <Film className="w-4 h-4" />;
    case "audio":
      return <Music className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

function FilePreviewSmall({ attachment, onRemove }: { attachment: FileAttachment; onRemove: () => void }) {
  return (
    <div className="relative group/file">
      {attachment.type === "image" && attachment.preview ? (
        <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700">
          <img src={attachment.preview} alt={attachment.file.name} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-zinc-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ) : (
        <div className="relative flex items-center gap-1.5 pl-2 pr-6 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600">
          <div className="w-6 h-6 rounded bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <FileIcon type={attachment.type} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[80px]">
              {attachment.file.name}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-zinc-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function Composer() {
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRuntime = useComposerRuntime();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setError(null);

    const newAttachments: FileAttachment[] = [];

    for (const file of selectedFiles) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error || "文件验证失败");
        continue;
      }

      const attachment: FileAttachment = {
        id: Math.random().toString(36).slice(2),
        file,
        type: getFileType(file),
      };

      if (attachment.type === "image") {
        attachment.preview = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    }

    setFiles((prev) => [...prev, ...newAttachments]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const currentText = composerRuntime.getState().text || "";

    // 如果没有文件，直接发送文本
    if (files.length === 0) {
      if (currentText.trim()) {
        composerRuntime.send();
      }
      return;
    }

    // 有文件时，先转换为 base64，然后修改文本再发送
    const fileDataPromises = files.map(async (attachment) => {
      const buffer = await attachment.file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      return {
        name: attachment.file.name,
        type: attachment.file.type,
        size: attachment.file.size,
        data: base64,
      };
    });

    const fileData = await Promise.all(fileDataPromises);
    const filesJson = JSON.stringify(fileData);
    const messageWithFiles = `[FILES]${filesJson}[/FILES]\n${currentText}`;

    // 设置包含文件的消息并发送
    composerRuntime.setText(messageWithFiles);

    // 清理文件预览
    files.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);

    // 延迟发送，确保文本已更新
    setTimeout(() => {
      composerRuntime.send();
    }, 0);
  }, [files, composerRuntime]);

  const hasFiles = files.length > 0;

  return (
    <ComposerPrimitive.Root className="relative">
      {/* 错误提示 */}
      {error && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* 统一的输入框容器 */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm focus-within:border-purple-400 dark:focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all overflow-hidden">
        {/* 文件预览区域 - 在输入框内部顶部 */}
        {hasFiles && (
          <div className="flex flex-wrap gap-2 p-3 border-b border-zinc-100 dark:border-zinc-700/50">
            {files.map((attachment) => (
              <FilePreviewSmall
                key={attachment.id}
                attachment={attachment}
                onRemove={() => removeFile(attachment.id)}
              />
            ))}
          </div>
        )}

        {/* 输入区域 */}
        <div className="flex items-end">
          {/* 文件上传按钮 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.txt,.md,.json,.csv,.xml,.html,.css,.js,.ts,.jsx,.tsx,.py,.java,.c,.cpp,.go,.rs"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center w-10 h-10 ml-1 mb-1 text-zinc-400 hover:text-purple-500 transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* 文本输入 */}
          <ComposerPrimitive.Input
            placeholder="输入你的问题..."
            rows={1}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="flex-1 resize-none bg-transparent px-2 py-3 text-base outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 dark:text-zinc-100 max-h-40"
          />

          {/* 发送/取消按钮 */}
          <div className="pr-2 pb-2">
            <ThreadPrimitive.If running={false}>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <SendHorizontal className="w-4 h-4" />
              </button>
            </ThreadPrimitive.If>
            <ThreadPrimitive.If running>
              <ComposerPrimitive.Cancel className="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-500 hover:bg-zinc-600 text-white transition-all hover:scale-105 active:scale-95">
                <Square className="w-3.5 h-3.5 fill-current" />
              </ComposerPrimitive.Cancel>
            </ThreadPrimitive.If>
          </div>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end mb-6 animate-in slide-in-from-bottom-2 duration-300">
      <div className="max-w-[85%] md:max-w-[70%]">
        <div className="bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-lg shadow-purple-500/20">
          <MessagePrimitive.Content />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-start mb-6 group animate-in slide-in-from-bottom-2 duration-300">
      <div className="max-w-[85%] md:max-w-[75%]">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            {/* Message Content */}
            <div className="bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl rounded-tl-md px-4 py-3 text-zinc-800 dark:text-zinc-100 shadow-sm min-h-[44px]">
              <AssistantMessageContent />
            </div>

            {/* Action Bar - only show when not streaming */}
            <MessagePrimitive.If hasContent>
              <AssistantActionBar />
            </MessagePrimitive.If>
          </div>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessageContent() {
  const message = useMessage();
  const isStreaming = message.status?.type === "running";
  const hasContent = message.content && message.content.length > 0 &&
    message.content.some(part => part.type === "text" && (part as { type: "text"; text: string }).text.length > 0);

  // 如果正在 streaming 且没有内容，显示 typing indicator
  if (isStreaming && !hasContent) {
    return <TypingIndicator />;
  }

  return (
    <MessagePrimitive.Content
      components={{
        Text: MarkdownText,
      }}
    />
  );
}

function AssistantActionBar() {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <BranchPickerPrimitive.Root hideWhenSingleBranch className="flex items-center">
        <BranchPickerPrimitive.Previous className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </BranchPickerPrimitive.Previous>
        <span className="text-xs text-zinc-400 px-1 tabular-nums">
          <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
        </span>
        <BranchPickerPrimitive.Next className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </BranchPickerPrimitive.Next>
      </BranchPickerPrimitive.Root>

      <ActionBarPrimitive.Copy
        onClick={() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
      </ActionBarPrimitive.Copy>

      <ActionBarPrimitive.Reload className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
        <RefreshCw className="w-4 h-4" />
      </ActionBarPrimitive.Reload>
    </div>
  );
}
