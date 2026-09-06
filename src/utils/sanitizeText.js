export default function sanitizeText(text) {
  return text.slice(-2000); // context window safety
}
