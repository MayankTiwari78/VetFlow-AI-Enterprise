export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'

export interface PasswordRequirement {
  key: 'length' | 'uppercase' | 'lowercase' | 'number' | 'special';
  label: string;
  met: boolean;
}

export interface PasswordStrength {
  label: '' | 'Weak' | 'Medium' | 'Strong';
  metCount: number;
  level: 'empty' | 'weak' | 'medium' | 'strong';
}

const hasLowercase = (value: string): boolean => /[a-z]/.test(value);
const hasUppercase = (value: string): boolean => /[A-Z]/.test(value);
const hasNumber = (value: string): boolean => /\d/.test(value);
const hasSpecialCharacter = (value: string): boolean => /[^A-Za-z0-9]/.test(value);

export const getPasswordRequirements = (password: string = ''): PasswordRequirement[] => {
  const value = String(password || '');
  return [
    { key: 'length', label: '8+ characters', met: value.length >= 8 },
    { key: 'uppercase', label: 'Uppercase letter', met: hasUppercase(value) },
    { key: 'lowercase', label: 'Lowercase letter', met: hasLowercase(value) },
    { key: 'number', label: 'Number', met: hasNumber(value) },
    { key: 'special', label: 'Special character', met: hasSpecialCharacter(value) },
  ];
};

export const validatePassword = (password: string = ''): string | null => {
  const requirements = getPasswordRequirements(password);
  if (requirements.every((item) => item.met)) return null;
  return PASSWORD_POLICY_MESSAGE;
};

export const getPasswordStrength = (password: string = ''): PasswordStrength => {
  const value = String(password || '');
  if (!value) return { label: '', metCount: 0, level: 'empty' };
  const metCount = getPasswordRequirements(value).filter((item) => item.met).length;
  if (metCount <= 2 || value.length < 8) return { label: 'Weak', metCount, level: 'weak' };
  if (metCount === 5) return { label: 'Strong', metCount, level: 'strong' };
  return { label: 'Medium', metCount, level: 'medium' };
};

