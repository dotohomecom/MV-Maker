// 文件上传配置和验证工具

// 最大文件大小：100MB
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

// 允许的文件类型
export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  // 文本文件
  "text/plain": [".txt"],
  "text/markdown": [".md", ".markdown"],
  "text/csv": [".csv"],
  "text/html": [".html", ".htm"],
  "text/css": [".css"],
  "text/javascript": [".js"],
  "application/json": [".json"],
  "application/xml": [".xml"],
  "text/xml": [".xml"],

  // 文档
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],

  // 图片
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "image/svg+xml": [".svg"],
  "image/bmp": [".bmp"],

  // 音频
  "audio/mpeg": [".mp3"],
  "audio/wav": [".wav"],
  "audio/ogg": [".ogg"],
  "audio/webm": [".webm"],
  "audio/aac": [".aac"],
  "audio/flac": [".flac"],

  // 视频
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/ogg": [".ogv"],
  "video/quicktime": [".mov"],
  "video/x-msvideo": [".avi"],
};

// 禁止的文件扩展名（安全检测）
export const BLOCKED_EXTENSIONS = [
  // 可执行文件
  ".exe", ".msi", ".bat", ".cmd", ".com", ".scr", ".pif",
  ".app", ".dmg", ".pkg", ".deb", ".rpm",
  ".sh", ".bash", ".zsh", ".ps1", ".psm1",

  // 压缩文件
  ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz",
  ".tgz", ".tbz2", ".cab", ".iso",

  // 脚本和代码（潜在危险）
  ".dll", ".so", ".dylib",
  ".jar", ".class", ".war", ".ear",
  ".pyc", ".pyo",

  // 其他危险类型
  ".lnk", ".url", ".desktop",
  ".reg", ".inf", ".sys",
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File): FileValidationResult {
  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `文件大小超过限制（最大 ${MAX_FILE_SIZE / 1024 / 1024}MB）`,
    };
  }

  // 检查文件大小是否为0
  if (file.size === 0) {
    return {
      valid: false,
      error: "文件为空",
    };
  }

  // 获取文件扩展名
  const fileName = file.name.toLowerCase();
  const lastDotIndex = fileName.lastIndexOf(".");
  const extension = lastDotIndex !== -1 ? fileName.slice(lastDotIndex) : "";

  // 检查是否在黑名单中
  if (BLOCKED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `不支持的文件类型：${extension}（出于安全考虑，不允许上传可执行文件和压缩文件）`,
    };
  }

  // 检查 MIME 类型是否在白名单中
  const allowedMimeTypes = Object.keys(ALLOWED_FILE_TYPES);
  if (!allowedMimeTypes.includes(file.type) && file.type !== "") {
    // 如果 MIME 类型不在白名单中，检查扩展名
    const allAllowedExtensions = Object.values(ALLOWED_FILE_TYPES).flat();
    if (!allAllowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `不支持的文件类型：${file.type || extension}`,
      };
    }
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getFileIcon(file: File): string {
  const type = file.type;
  if (type.startsWith("image/")) return "🖼️";
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type === "application/pdf") return "📄";
  if (type.includes("word") || type.includes("document")) return "📝";
  if (type.includes("excel") || type.includes("spreadsheet")) return "📊";
  if (type.includes("powerpoint") || type.includes("presentation")) return "📽️";
  return "📎";
}
