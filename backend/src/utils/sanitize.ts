type ObjectLike = Record<string, unknown> & {
  toObject?: () => Record<string, unknown>;
};

const toPlainObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as ObjectLike;
  return typeof candidate.toObject === "function" ? candidate.toObject() : { ...candidate };
};

export const removeSensitiveFields = <T>(value: T): T => {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    const arrayValue = value as unknown[];
    return arrayValue.map((item) => removeSensitiveFields(item)) as T;
  }

  const plain = toPlainObject(value);
  delete plain.password;
  delete plain.__v;
  delete plain.resetPasswordToken;
  delete plain.resetPasswordExpires;

  for (const [key, nested] of Object.entries(plain)) {
    if (nested && typeof nested === "object") {
      plain[key] = removeSensitiveFields(nested);
    }
  }

  return plain as T;
};
