/**
 * Requires a full email domain (e.g. name@gmail.com), not just "user@" or "user@x".
 */
export const isValidEmailFormat = (email) => {
  const trimmed = (email || '').trim().toLowerCase();
  if (!trimmed) return false;

  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@')) return false;

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  if (!local.length || !domain.length) return false;
  if (!domain.includes('.')) return false;

  const labels = domain.split('.').filter(Boolean);
  if (labels.length < 2) return false;

  const tld = labels[labels.length - 1];
  if (tld.length < 2 || !/^[a-z]+$/.test(tld)) return false;

  const domainName = labels[0];
  if (!domainName.length || !/^[a-z0-9-]+$/.test(domainName)) return false;

  return /^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(trimmed);
};

export const getEmailFormatError = () =>
  'Enter a complete email with a domain (e.g. name@gmail.com).';
