export const JWT_EXPIRES_IN = "1d";

export const DEFAULT_USER_IMAGE =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3Crect width='240' height='240' rx='120' fill='%23eaefff'/%3E%3Ccircle cx='120' cy='92' r='42' fill='%235f6fff'/%3E%3Cpath d='M48 206c12-46 39-70 72-70s60 24 72 70' fill='%235f6fff'/%3E%3C/svg%3E";

export const DEFAULT_DOCTOR_IMAGE = DEFAULT_USER_IMAGE;

export const DEFAULT_PET_IMAGE =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3Crect width='240' height='240' rx='120' fill='%23e7f4f5'/%3E%3Cellipse cx='120' cy='152' rx='34' ry='26' fill='%2314b8a6'/%3E%3Ccircle cx='86' cy='106' r='15' fill='%2314b8a6'/%3E%3Ccircle cx='114' cy='90' r='15' fill='%2314b8a6'/%3E%3Ccircle cx='142' cy='94' r='15' fill='%2314b8a6'/%3E%3Ccircle cx='168' cy='118' r='14' fill='%2314b8a6'/%3E%3C/svg%3E";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
