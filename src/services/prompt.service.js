export function buildPrompt(text) {
  return `
Continue the text naturally.
Do not repeat existing text.
Do not add explanations.

Text:
${text}
`;
}
