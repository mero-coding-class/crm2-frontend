const PHONE_CHARACTERS = /^\+?[\d\s().-]+$/;

function phoneDigitCount(value) {
  const input = String(value || "").trim();
  if (!input || !PHONE_CHARACTERS.test(input)) return 0;

  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("977") && digits.length === 13) {
    digits = digits.slice(3);
  }
  return digits.length;
}

export function isValidPhoneNumber(value) {
  return phoneDigitCount(value) === 10;
}

// Nepal landlines commonly contain fewer than ten local digits.
export function isValidLandlineNumber(value) {
  const count = phoneDigitCount(value);
  return count >= 7 && count <= 10;
}

export function isValidEmail(value) {
  const email = String(value || "").trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+$/.test(email);
}

export function isValidPrice(value) {
  const price = String(value || "").trim();
  if (!price) return true;
  return /^(?:(?:NPR|\$)\s*)?\d+(?:,\d{3})*(?:\.\d{1,2})?$/.test(price);
}

