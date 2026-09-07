require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`ReelForge AI backend running on http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.log('[AI] OPENAI_API_KEY not set — using demo generation mode');
  }
  if (!process.env.ELEVENLABS_API_KEY) {
    console.log('[Voice] ELEVENLABS_API_KEY not set — voice is in demo mode');
  }
  if ((process.env.VIDEO_PROVIDER || 'demo') !== 'creatomate') {
    console.log('[Video] VIDEO_PROVIDER=demo — video rendering is simulated');
  } else {
    console.log('[Video] VIDEO_PROVIDER=creatomate — real video rendering enabled');
  }
});