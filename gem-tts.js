// Tests Gemini's native text-to-speech model for Hindi output.
// Uses the generateContent API (stable) with responseModalities: ['AUDIO'].
// Gemini TTS auto-detects the spoken language from the input text itself —
// there's no separate "language" param. It supports 24 languages including
// Hindi, so this is worth A/B-ing directly against Aura-2 and Google Cloud
// TTS for your Cloudvyn interview pipeline.
//
// NOTE: Gemini TTS is tuned for controllable, scripted narration (podcasts,
// audiobooks, single-shot lines) — not the same product as the Live API
// you're already using for the conversational interview loop. If Cloudvyn's
// bot needs to speak dynamically generated turns in real time, keep using
// Live API for the loop and only reach for this if you need a separate,
// precisely-controlled TTS pass (e.g. pre-recorded intros, IRS feedback
// summaries read aloud, etc).
//
// Output is raw 24kHz 16-bit mono PCM — this script wraps it in a WAV
// header so it plays directly.
//
// Requires: npm install @google/genai
// Run: node test-tts-gemini.js "आपका टेक्स्ट यहाँ" [voiceName]
// Example: node test-tts-gemini.js "नमस्ते, आपका इंटरव्यू शुरू होने वाला है।" Kore

const dotenv = require('dotenv');
dotenv.config();
const { writeFile } = require('fs/promises');
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('Missing GEMINI_API_KEY in .env');
    process.exit(1);
}

const text =
    process.argv[2] ||
    'नमस्ते, आपका इंटरव्यू शुरू होने वाला है। कृपया अपना परिचय दें।';

// 30 built-in voices are available (Kore, Puck, Charon, Zephyr, Fenrir, etc).
// Gemini doesn't ship "Hindi-specific" voice names — the same voice roster
// is used across all 24 supported languages; the model reads whatever
// script/language the input text is in.
const voiceName = process.argv[3] || 'Kore';

const MODEL_ID = 'gemini-3.1-flash-tts-preview';

const ai = new GoogleGenAI({ apiKey });

// Minimal WAV header writer for 24kHz/16-bit/mono PCM (Gemini TTS output spec)
function pcmToWav(pcmBuffer, sampleRate = 24000, channels = 1, bitDepth = 16) {
    const byteRate = (sampleRate * channels * bitDepth) / 8;
    const blockAlign = (channels * bitDepth) / 8;
    const dataSize = pcmBuffer.length;
    const header = Buffer.alloc(44);

    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitDepth, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmBuffer]);
}

console.log(`Model: ${MODEL_ID}`);
console.log(`Text: "${text}"`);
console.log(`Voice: ${voiceName}\n`);

async function run() {
    try {
        const response = await ai.models.generateContent({
            model: MODEL_ID,
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        });

        const data =
            response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!data) {
            console.log('⚠️ No audio returned. Full response:');
            console.log(JSON.stringify(response, null, 2));
            process.exit(1);
        }

        const pcmBuffer = Buffer.from(data, 'base64');
        const wavBuffer = pcmToWav(pcmBuffer);
        const outFile = 'output-gemini.wav';
        await writeFile(outFile, wavBuffer);
        console.log(`✅ Audio saved to ${outFile} (${wavBuffer.length} bytes)`);
    } catch (err) {
        console.error('❌ Request error:', err.message);
        process.exit(1);
    }
}

run();