/**
 * Voice Generation Service
 * Abstraction layer for text-to-speech providers.
 * Currently supports: ElevenLabs (when configured), Mock (demo mode).
 *
 * To switch providers, change the implementation inside generateVoice().
 */

async function generateVoice(text, language, voiceSettings = {}) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return generateLocalVoice(text, language);
  }

  return generateElevenLabsVoice(text, language, voiceSettings);
}

async function generateElevenLabsVoice(text, language, voiceSettings) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  const voiceMap = {
    English: 'Rachel',
    Hindi: 'Rachel',
    Gujarati: 'Rachel',
    Hinglish: 'Rachel',
  };

  const voiceName = voiceSettings.voiceName || voiceMap[language] || 'Rachel';

  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceName, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: voiceSettings.stability || 0.5,
        similarity_boost: voiceSettings.similarityBoost || 0.75,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${error}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const fs = require('fs');
  const path = require('path');

  const filename = `voice-${Date.now()}-${Math.round(Math.random() * 1e6)}.mp3`;
  const filePath = path.join(__dirname, '../../uploads', filename);

  fs.writeFileSync(filePath, Buffer.from(audioBuffer));

  return {
    url: `/uploads/${filename}`,
    filename,
  };
}

function generateMockVoice(text, language) {
  console.log(`[VoiceService] Demo mode — generating mock voice for language: ${language}`);
  console.log(`[VoiceService] Text length: ${text.length} characters`);

  return {
    url: null,
    filename: null,
    demo: true,
    message: 'Voice generation is in demo mode. Connect ElevenLabs API key to enable real voice.',
  };
}

/**
 * Local neural TTS via Microsoft Edge's online voices (edge-tts).
 * Generates a real human-sounding .mp3 narration with no API keys.
 * Falls back to Windows SAPI .wav when edge-tts is unavailable.
 */
const PYTHON_BIN = process.env.PYTHON_PATH || 'C:/Users/ADMIN/AppData/Local/Temp/opencode/py/dist/python.exe';

const EDGE_VOICES = {
  English: 'en-US-JennyNeural',
  Hindi: 'hi-IN-SwaraNeural',
  Gujarati: 'gu-IN-DhwaniNeural',
  Hinglish: 'hi-IN-MadhurNeural',
};

function generateLocalVoice(text, language) {
  const { spawnSync } = require('child_process');
  const fs = require('fs');
  const path = require('path');

  if (!text || !String(text).trim()) return { url: null, filename: null, demo: true };

  const stamp = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const outMp3 = path.join(__dirname, '../../uploads', `voice-${stamp}.mp3`);
  const outWav = path.join(__dirname, '../../uploads', `voice-${stamp}.wav`);
  const voice = EDGE_VOICES[language] || EDGE_VOICES.English;
  const cleanText = String(text).replace(/[\r\n]+/g, ' ');

  const edge = spawnSync(
    PYTHON_BIN,
    ['-m', 'edge_tts', '--voice', voice, '--rate=+8%', '--pitch=+10Hz', '--text', cleanText, '--write-media', outMp3],
    { timeout: 90000, encoding: 'utf8' }
  );

  if (edge.status === 0 && fs.existsSync(outMp3) && fs.statSync(outMp3).size > 2000) {
    console.log(`[VoiceService] Edge neural narration (${voice}): ${path.basename(outMp3)}`);
    return { url: `/uploads/${path.basename(outMp3)}`, filename: path.basename(outMp3), demo: false, provider: 'edge-neural' };
  }

  console.warn('[VoiceService] edge-tts failed, falling back to Windows SAPI:', edge.stderr || edge.error?.message || 'unknown');

  // Windows SAPI fallback (robotic but reliable)
  const safeText = cleanText.replace(/[%]/g, 'percent').replace(/'/g, "''");
  const ps = [
    `$out = '${outWav}'`,
    `$text = '${safeText}'`,
    '$stream = New-Object -ComObject SAPI.SpFileStream',
    '$stream.Open($out, 3)',
    '$voicex = New-Object -ComObject SAPI.SpVoice',
    'try { $voicex.Select("") } catch {}',
    '$voicex.Rate = 0',
    '$voicex.Volume = 100',
    '$voicex.AudioOutputStream = $stream',
    '$voicex.Speak($text)',
    '$stream.Close()',
    'if (Test-Path $out) { "OK" } else { "FAILED" }',
  ].join('; ');

  const sapi = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
    timeout: 60000,
    encoding: 'utf8',
  });

  if (sapi.status === 0 && fs.existsSync(outWav)) {
    console.log(`[VoiceService] Windows SAPI narration (${language}): ${path.basename(outWav)}`);
    return { url: `/uploads/${path.basename(outWav)}`, filename: path.basename(outWav), demo: false, provider: 'windows-sapi' };
  }

  console.error('[VoiceService] All local TTS options failed');
  return { url: null, filename: null, demo: false, message: 'TTS unavailable' };
}

module.exports = { generateVoice };
