export const ATTACHMENT_BUCKET = 'attachments';

export const DOCUMENT_EXTS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'md',
]);

export const ARCHIVE_EXTS = new Set(['zip', 'rar', '7z']);

export const DOCUMENT_MAX_BYTES = 100 * 1024 * 1024;
export const ARCHIVE_MAX_BYTES = 300 * 1024 * 1024;

export const DEFAULT_TEMP_TTL_DAYS = 7;

