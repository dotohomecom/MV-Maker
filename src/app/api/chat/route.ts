import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, convertToModelMessages, type ModelMessage } from "ai";

export const maxDuration = 60;

// 服务商配置
const PROVIDERS = {
  bytecatcode: createOpenAI({
    baseURL: "https://bytecatcode.org/v1",
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  }),
  // 本地服务使用 Google Gemini 原生格式
  local: createGoogleGenerativeAI({
    baseURL: "http://127.0.0.1:8045/v1beta",
    apiKey: process.env.LOCAL_API_KEY || "sk-local",
  }),
};

// 当前使用的服务商和模型
const CURRENT_PROVIDER = "local" as keyof typeof PROVIDERS;
const CURRENT_MODEL = "gemini-3-pro";

interface FileAttachment {
  name: string;
  type: string;
  size: number;
  data: string;
}

// AI SDK 消息内容类型
type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; image: string; mimeType?: string };

const BLOCKED_EXTENSIONS = [
  ".exe", ".msi", ".bat", ".cmd", ".com", ".scr", ".pif",
  ".app", ".dmg", ".pkg", ".deb", ".rpm",
  ".sh", ".bash", ".zsh", ".ps1", ".psm1",
  ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz",
  ".tgz", ".tbz2", ".cab", ".iso",
  ".dll", ".so", ".dylib",
  ".jar", ".class", ".war", ".ear",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024;

function validateFileServer(file: FileAttachment): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `文件 ${file.name} 超过大小限制` };
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
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function isTextBasedFile(mimeType: string): boolean {
  const textTypes = [
    "application/json",
    "application/xml",
    "application/javascript",
    "application/typescript",
    "application/x-yaml",
  ];
  return textTypes.includes(mimeType) || mimeType.startsWith("text/");
}

function parseFilesFromText(text: string): { files: FileAttachment[]; remainingText: string } {
  const filesMatch = text.match(/\[FILES\]([\s\S]*?)\[\/FILES\]/);
  if (!filesMatch) {
    return { files: [], remainingText: text };
  }

  try {
    const files = JSON.parse(filesMatch[1]) as FileAttachment[];
    const remainingText = text.replace(/\[FILES\][\s\S]*?\[\/FILES\]\n?/, "").trim();
    return { files, remainingText };
  } catch {
    return { files: [], remainingText: text };
  }
}

function processFiles(files: FileAttachment[], userText: string): ContentPart[] {
  const content: ContentPart[] = [];

  for (const file of files) {
    const validation = validateFileServer(file);
    if (!validation.valid) {
      content.push({ type: "text", text: `[文件验证失败: ${validation.error}]` });
      continue;
    }

    if (file.type.startsWith("image/")) {
      content.push({
        type: "image",
        image: `data:${file.type};base64,${file.data}`,
        mimeType: file.type,
      });
      content.push({
        type: "text",
        text: `[已上传图片: ${file.name}]`,
      });
    } else if (file.type.startsWith("video/")) {
      content.push({
        type: "image",
        image: `data:${file.type};base64,${file.data}`,
        mimeType: file.type,
      });
      content.push({
        type: "text",
        text: `[已上传视频: ${file.name}，请分析视频内容]`,
      });
    } else if (file.type.startsWith("audio/")) {
      content.push({
        type: "image",
        image: `data:${file.type};base64,${file.data}`,
        mimeType: file.type,
      });
      content.push({
        type: "text",
        text: `[已上传音频: ${file.name}，请分析音频内容]`,
      });
    } else if (isTextBasedFile(file.type)) {
      try {
        const textContent = Buffer.from(file.data, "base64").toString("utf-8");
        content.push({
          type: "text",
          text: `[文件: ${file.name}]\n\`\`\`\n${textContent}\n\`\`\``,
        });
      } catch {
        content.push({
          type: "text",
          text: `[文件: ${file.name}] (无法解码)`,
        });
      }
    } else if (file.type === "application/pdf") {
      content.push({
        type: "image",
        image: `data:${file.type};base64,${file.data}`,
        mimeType: file.type,
      });
      content.push({
        type: "text",
        text: `[已上传 PDF: ${file.name}，请分析文档内容]`,
      });
    } else {
      content.push({
        type: "text",
        text: `[已上传文件: ${file.name}, 大小: ${formatFileSize(file.size)}, 类型: ${file.type}]`,
      });
    }
  }

  if (userText) {
    content.push({ type: "text", text: userText });
  }

  return content;
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  const modelMessages = await convertToModelMessages(messages);

  const processedMessages = modelMessages.map((message) => {
    if (message.role !== "user") return message;

    if (typeof message.content === "string") {
      const { files, remainingText } = parseFilesFromText(message.content);
      if (files.length > 0) {
        return {
          ...message,
          content: processFiles(files, remainingText),
        };
      }
      return message;
    }

    if (Array.isArray(message.content)) {
      const newContent: ContentPart[] = [];

      for (const part of message.content) {
        if (part.type === "text" && typeof part.text === "string") {
          const { files, remainingText } = parseFilesFromText(part.text);
          if (files.length > 0) {
            newContent.push(...processFiles(files, remainingText));
          } else {
            newContent.push({ type: "text", text: part.text });
          }
        } else if (part.type === "image") {
          newContent.push(part as ContentPart);
        } else if (part.type === "text") {
          newContent.push({ type: "text", text: String(part.text || "") });
        }
      }

      return { ...message, content: newContent };
    }

    return message;
  }) as ModelMessage[];

  const provider = PROVIDERS[CURRENT_PROVIDER];

  const result = streamText({
    model: provider(CURRENT_MODEL),
    system: `你是一个友好、专业的AI助手。请用中文回复用户的问题。
保持回答简洁明了，必要时使用 markdown 格式。

当用户上传文件时：
- 对于图片：仔细描述图片内容，回答用户关于图片的问题
- 对于视频：分析视频内容，描述视频中发生的事情
- 对于音频：分析音频内容，转录或描述音频
- 对于文档：分析文档内容，提取关键信息
- 对于代码文件：分析代码，提供建议或解释`,
    messages: processedMessages,
  });

  return result.toUIMessageStreamResponse();
}
