/**
 * Voice Generation Service
 * Abstraction layer for text-to-speech providers.
 * Currently supports: ElevenLabs (when configured), Mock (demo mode).
 *
 * voiceSettings.voice = 'male' | 'female' | 'child' | 'auto'
 */

const EDGE_VOICES = {
  English: { auto: 'en-US-JennyNeural', male: 'en-US-GuyNeural', female: 'en-US-JennyNeural', child: 'en-US-MichelleNeural' },
  Hindi: { auto: 'hi-IN-SwaraNeural', male: 'hi-IN-MadhurNeural', female: 'hi-IN-SwaraNeural', child: 'hi-IN-SwaraNeural' },
  Gujarati: { auto: 'gu-IN-DhwaniNeural', male: 'gu-IN-NiranjanNeural', female: 'gu-IN-DhwaniNeural', child: 'gu-IN-DhwaniNeural' },
  Hinglish: { auto: 'hi-IN-SwaraNeural', male: 'hi-IN-MadhurNeural', female: 'hi-IN-SwaraNeural', child: 'hi-IN-SwaraNeural' },
};

function pickEdgeVoice(language, voicePref) {
  const map = EDGE_VOICES[language] || EDGE_VOICES.English;
  const pref = ['male', 'female', 'child'].includes(String(voicePref || '').toLowerCase())
    ? String(voicePref).toLowerCase()
    : 'auto';
  return map[pref] || map.auto;
}

async function generateVoice(text, language, voiceSettings = {}) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return generateLocalVoice(text, language, voiceSettings);
  }

  return generateElevenLabsVoice(text, language, voiceSettings);
}

async function generateElevenLabsVoice(text, language, voiceSettings) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  const voiceMap = {
    English: { auto: 'Rachel', male: 'Adam', female: 'Rachel', child: 'Rachel' },
    Hindi: { auto: 'Rachel', male: 'Adam', female: 'Rachel', child: 'Rachel' },
    Gujarati: { auto: 'Rachel', male: 'Adam', female: 'Rachel', child: 'Rachel' },
    Hinglish: { auto: 'Rachel', male: 'Adam', female: 'Rachel', child: 'Rachel' },
  };

  const pref = ['male', 'female', 'child'].includes(String(voiceSettings.voice || '').toLowerCase())
    ? String(voiceSettings.voice).toLowerCase()
    : 'auto';
  const candidate = voiceSettings.voiceName || (voiceMap[language] || voiceMap.English)[pref] || 'Rachel';
  const voiceName = candidate;

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

function generateLocalVoice(text, language, voiceSettings = {}) {
  const { spawnSync } = require('child_process');
  const fs = require('fs');
  const path = require('path');

  if (!text || !String(text).trim()) return { url: null, filename: null, demo: true };

  const pref = ['male', 'female', 'child'].includes(String(voiceSettings.voice || '').toLowerCase())
    ? String(voiceSettings.voice).toLowerCase()
    : 'auto';
  const voice = pickEdgeVoice(language, pref);

  const rates = { auto: '+8%', male: '+5%', female: '+8%', child: '+12%' };
  const pitches = { auto: '+8Hz', male: '-6Hz', female: '+8Hz', child: '+38Hz' };

  const rate = rates[pref] || rates.auto;
  const pitch = pitches[pref] || pitches.auto;
  const stamp = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const outMp3 = path.join(__dirname, '../../uploads', `voice-${stamp}.mp3`);
  const outWav = path.join(__dirname, '../../uploads', `voice-${stamp}.wav`);
  const cleanText = String(text).replace(/[\r\n]+/g, ' ');

  const edge = (() => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = spawnSync(
        PYTHON_BIN,
        ['-m', 'edge_tts', '--voice', voice, '--rate=' + rate, '--pitch=' + pitch, '--text', cleanText, '--write-media', outMp3],
        { timeout: 90000, encoding: 'utf8' }
      );
      if (res.status === 0 && fs.existsSync(outMp3) && fs.statSync(outMp3).size > 2000) {
        return res;
      }
      if (attempt < 3) {
        console.warn(`[VoiceService] edge-tts attempt ${attempt} failed (${res.error?.message || 'silent'}), retrying…`);
        try { if (fs.existsSync(outMp3)) fs.unlinkSync(outMp3); } catch {}
      }
    }
    return { status: -1, error: new Error('edge-tts failed after 3 attempts') };
  })();

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
