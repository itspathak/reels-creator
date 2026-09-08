/**
 * Video Rendering Service
 *
 * Providers:
 *  1. LOCAL FFmpeg renderer (default) — renders a REAL 1080x1920 9:16 MP4 on your
 *     own machine. No API key needed. Used when VIDEO_PROVIDER is unset or "ffmpeg".
 *  2. Creatomate (cloud) — used when VIDEO_PROVIDER=creatomate and CREATOMATE_API_KEY is set.
 *
 * Change provider in backend/.env:
 *   VIDEO_PROVIDER=ffmpeg        (default, local rendering, always works)
 *   VIDEO_PROVIDER=creatomate    (requires CREATOMATE_API_KEY)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const FFMPEG_CANDIDATES = [
  'C:/Users/ADMIN/AppData/Local/Temp/opencode/ffmpeg-extract/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe',
  path.join(__dirname, '../../vendor/ffmpeg/ffmpeg.exe'),
  path.join(__dirname, '../../vendor/ffmpeg/bin/ffmpeg.exe'),
  '/usr/bin/ffmpeg',
  '/usr/local/bin/ffmpeg',
];

function npmModulePath(fn) {
  try {
    const p = fn();
    return p ? String(p) : null;
  } catch {
    return null;
  }
}

function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  for (const c of FFMPEG_CANDIDATES) {
    if (fs.existsSync(c)) return c;
  }
  const staticPath = npmModulePath(() => (typeof require === 'function' ? require('ffmpeg-static') : null));
  if (staticPath && fs.existsSync(staticPath)) return staticPath;
  return 'ffmpeg';
}

function resolveFfprobe() {
  const ff = resolveFfmpeg();
  const probe = process.env.FFPROBE_PATH;
  if (probe && fs.existsSync(probe)) return probe;
  const dir = path.dirname(ff);
  const guess = path.join(dir, 'ffprobe.exe');
  if (fs.existsSync(guess)) return guess;
  const linuxGuess = path.join(dir, 'ffprobe');
  if (fs.existsSync(linuxGuess)) return linuxGuess;
  const installerPath = npmModulePath(() => (typeof require === 'function' ? require('@ffprobe-installer/ffprobe').path : null));
  if (installerPath && fs.existsSync(installerPath)) return installerPath;
  return null;
}

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true, cwd });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (e) => reject(e));
    child.on('close', (code) => {
      if (code === 0) resolve();
      else {
        const errors = stderr
          .split('\n')
          .filter((l) => /error/i.test(l))
          .slice(-4)
          .join('\n');
        reject(new Error(`ffmpeg exited with code ${code}\n${errors || stderr.slice(-400)}`));
      }
    });
  });
}

async function probeDuration(file) {
  const probe = resolveFfprobe();
  if (!probe || !fs.existsSync(file)) return 0;
  return new Promise((resolve) => {
    const child = spawn(
      probe,
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file],
      { windowsHide: true }
    );
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.on('close', () => resolve(parseFloat(out) || 0));
  });
}

const BUSINESS_MOODS = {
  food: {
    tempo: 128, accent: '#FFD54F',
    palette: ['#FF512F', '#DD2476', '#F09819'],
    sound: 'energetic',
    tags: ['food', 'pizza', 'restaurant', 'cafe', 'coffee', 'hotel', 'biryani', 'chaat', 'sweet', 'bakery', 'cater', 'dhaba', 'juice', 'fast food', 'burger', 'momo', 'samosa', 'tiffin', 'kitchen'],
  },
  fashion: {
    tempo: 126, accent: '#FF6EC7',
    palette: ['#FF0844', '#FFB199', '#7F00FF'],
    sound: 'glam',
    tags: ['fashion', 'clothing', 'dress', 'saree', 'clothes', 'fabric', 'wear', 'garment', 'showroom', 'lehenga', 'kurta', 'ethnic', 'boutique', 'stitch'],
  },
  gym: {
    tempo: 132, accent: '#7DF9FF',
    palette: ['#0F2027', '#203A43', '#2C5364'],
    sound: 'beast',
    tags: ['gym', 'fitness', 'workout', 'yoga', 'trainer', 'zumba', 'nutrition', 'protein', 'body', 'strength'],
  },
  beauty: {
    tempo: 116, accent: '#FFD1DC',
    palette: ['#FF9A9E', '#FAD0C4', '#FBC2EB'],
    sound: 'soft',
    tags: ['salon', 'beauty', 'spa', 'nail', 'hair', 'makeup', 'parlour', 'wax', 'skin', 'glow'],
  },
  tech: {
    tempo: 124, accent: '#B9F6CA',
    palette: ['#00C9FF', '#92FE9D', '#4D6AE1'],
    sound: 'future',
    tags: ['mobile', 'phone', 'electronics', 'gadget', 'computer', 'repair', 'accessories', 'camera', 'laptop', 'tech'],
  },
  general: {
    tempo: 128, accent: '#FFD54F',
    palette: ['#6C5CE7', '#00CEA7', '#8B5CF6'],
    sound: 'pop',
    tags: [],
  },
};

function detectMood(business) {
  const hay = [
    (business && business.business_type) || '',
    (business && business.business_name) || '',
    (business && business.description) || '',
    (business && business.festival) || '',
  ].join(' ').toLowerCase();
  for (const key of ['food', 'fashion', 'gym', 'beauty', 'tech']) {
    const m = BUSINESS_MOODS[key];
    if (m.tags.some((t) => hay.includes(t))) return m;
  }
  // nature / travel / hill-station category
  if (/(travel|hill|nature|mountain|resort|tour|forest|lake|beach|trek|valley|hotel)/.test(hay)) {
    return {
      tempo: 112, accent: '#A7F3D0',
      palette: ['#0F2027', '#2C5364', '#203A43'],
      sound: 'soft',
      tags: [],
    };
  }
  return BUSINESS_MOODS.general;
}

// Reel style → color/motion/music personality (category mood refined by style)
const STYLE_MOODS = {
  Luxury: { tempo: 104, accent: '#FFE082', palette: ['#1A1A2E', '#6C5CE7', '#4A3F6B'], sound: 'soft' },
  Premium: { tempo: 110, accent: '#FFD54F', palette: ['#0F3443', '#34E89E', '#1C5D52'], sound: 'soft' },
  Funny: { tempo: 132, accent: '#FFE156', palette: ['#FF5F6D', '#FFC371', '#FCE38A'], sound: 'fun' },
  Minimal: { tempo: 112, accent: '#FFFFFF', palette: ['#ECEFF1', '#90A4AE', '#B0BEC5'], sound: 'soft' },
  Promotional: { tempo: 130, accent: '#FF3D71', palette: ['#FF512F', '#DD2476', '#7F00FF'], sound: 'energetic' },
  Festive: { tempo: 124, accent: '#FFD54F', palette: ['#FF851B', '#7F00FF', '#00CEA7'], sound: 'energetic' },
  Viral: { tempo: 130, accent: '#6C5CE7', palette: ['#6C5CE7', '#00CEA7', '#8B5CF6'], sound: 'pop' },
};

const FESTIVAL_THEMES = {
  diwali: {
    palette: ['#FF512F', '#FFD54F', '#DD2476'],
    accent: '#FFD54F',
    sound: 'energetic',
    greet: { en: 'Happy Diwali', hi: 'Shubh Diwali' },
    tags: ['diwali', 'deepawali', 'festival of lights'],
  },
  navratri: {
    palette: ['#FF0844', '#FFB199', '#7F00FF'],
    accent: '#FFB199',
    sound: 'glam',
    greet: { en: 'Happy Navratri', hi: 'Navratri Mubarak' },
    tags: ['navratri', 'garba', 'dandiya', 'maata', 'durga'],
  },
  holi: {
    palette: ['#FF0080', '#7928CA', '#00CEA7'],
    accent: '#FFFFFF',
    sound: 'energetic',
    greet: { en: 'Happy Holi', hi: 'Holi Mubarak' },
    tags: ['holi', 'rang', 'dhol'],
  },
  christmas: {
    palette: ['#B24592', '#F15F79', '#27A856'],
    accent: '#FFFFFF',
    sound: 'pop',
    greet: { en: 'Merry Christmas', hi: 'Bade Din Mubarak' },
    tags: ['christmas', 'xmas', 'new year', 'bade din'],
  },
  newyear: {
    palette: ['#00C9FF', '#92FE9D', '#FF5F6D'],
    accent: '#FFD54F',
    sound: 'future',
    greet: { en: 'Happy New Year', hi: 'Naya Saal Mubarak' },
    tags: ['new year', 'newyear', 'nye', 'naya saal', 'january'],
  },
  none: null,
};

function detectFestival(business) {
  const hay = [
    (business && business.festival) || '',
    (business && business.description) || '',
  ].join(' ').toLowerCase();
  for (const key of Object.keys(FESTIVAL_THEMES)) {
    const t = FESTIVAL_THEMES[key];
    if (t && t.tags.some((tg) => hay.includes(tg))) return key;
  }
  return 'none';
}

function saveGeneratedScenes(renderDir, category, festivalKey, palette, accent, n, useIndic, description) {
  const py = process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)
    ? process.env.PYTHON_PATH
    : 'C:/Users/ADMIN/AppData/Local/Temp/opencode/py/dist/python.exe';
  const script = path.join(__dirname, 'scenes.py');
  if (!fs.existsSync(py) || !fs.existsSync(script)) return false;
  return new Promise((resolve) => {
    const args = [script, renderDir, category, festivalKey, JSON.stringify(palette.slice(0, 3)), accent, String(n), useIndic ? '1' : '0', description || ''];
    const c = spawn(py, args, { windowsHide: true });
    let log = '';
    c.stdout.on('data', (dd) => (log += dd.toString()));
    c.stderr.on('data', (dd) => (log += dd.toString()));
    c.on('error', (e) => { console.warn('[scenes]', e.message); resolve(false); });
    c.on('close', (code) => {
      try {
        const line = log.trim().split('\n').pop();
        const files = JSON.parse(line);
        resolve(Array.isArray(files) && files.every((f) => fs.existsSync(path.join(renderDir, f))));
      } catch (e) {
        console.warn('[scenes]', e.message, log.slice(-200));
        resolve(false);
      }
    });
  });
}

const FONT_CANDIDATES = [
  'C:/Windows/Fonts/impact.ttf',   // trending-style bold headline (Latin)
  'C:/Windows/Fonts/Nirmala.ttf',  // Devanagari + Gujarati support
  'C:/Windows/Fonts/arialbd.ttf',
  path.join(__dirname, '../../vendor/fonts/impact.ttf'),
  path.join(__dirname, '../../vendor/fonts/Nirmala.ttf'),
  '/usr/share/fonts/truetype/msttcorefonts/Impact.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/noto/NotoSansDevanagari-Bold.ttf',
  '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf',
];

function resolveFont(useIndic) {
  if (useIndic) {
    for (const f of FONT_CANDIDATES.slice(1)) if (fs.existsSync(f)) return f; // Nirmala first for Indic
  }
  for (const f of FONT_CANDIDATES) if (fs.existsSync(f)) return f; // Impact first for Latin
  return null;
}

function stripExt(name) {
  const ext = path.extname(name);
  return ext ? name.slice(0, -ext.length) : name;
}

// split a caption into balanced lines so it fits on a 1080-wide reel
function wrapText(text, maxChars) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    let word = w;
    while (word.length > maxChars) {
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(word.slice(0, maxChars));
      word = word.slice(maxChars);
    }
    if (!cur) cur = word;
    else if ((cur + ' ' + word).length <= maxChars) cur += ' ' + word;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines.join('\n');
}

// generate splash PNG stickers once per reel using a portable Python + Pillow
async function generateStickers(renderDir, accent, useIndic) {
  const py = process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)
    ? process.env.PYTHON_PATH
    : 'C:/Users/ADMIN/AppData/Local/Temp/opencode/py/dist/python.exe';
  const script = path.join(__dirname, 'stickers.py');
  if (!fs.existsSync(py) || !fs.existsSync(script)) return [];
  try {
    const out = await new Promise((resolve, reject) => {
      const c = spawn(py, [script, renderDir, accent, useIndic ? 'nirmala' : 'impact'], { windowsHide: true });
      let log = '';
      c.stdout.on('data', (d) => (log += d.toString()));
      c.stderr.on('data', (d) => (log += d.toString()));
      c.on('error', reject);
      c.on('close', (code) => (code === 0 ? resolve(log) : reject(new Error(log.slice(-400)))));
    });
    const line = out.trim().split('\n').pop();
    const files = JSON.parse(line);
    return Array.isArray(files) ? files.filter((f) => fs.existsSync(path.join(renderDir, f))) : [];
  } catch (err) {
    console.warn('[stickers]', err.message);
    return [];
  }
}

/**
 * Renders a real vertical 1080x1920 Reel locally with ffmpeg.
 * opts: { template, scenes, media, voiceUrl, brandKit }
 */
async function renderWithFfmpeg({ template, scenes, media, voiceUrl, brandKit }) {
  const ffmpeg = resolveFfmpeg();
  if (!fs.existsSync(ffmpeg) && !process.env.FFMPEG_PATH) {
    throw new Error('FFmpeg was not found. Set FFMPEG_PATH in backend/.env to your ffmpeg.exe location.');
  }

  const scenesList = Array.isArray(scenes) && scenes.length ? scenes : fallbackScenes();
  const reelId = template?.id || template?.name || Date.now();
  const offer = (template?.offer || '').toString().trim();
  const renderDir = path.join(UPLOADS_DIR, 'render', String(reelId));
  fs.mkdirSync(renderDir, { recursive: true });

  // ---- prep: font, per-scene text files, backgrounds, images ----
  const language = template?.language || 'English';
  const useIndic = ['Hindi', 'Gujarati'].includes(language);
  let mood = detectMood(template);
  // reel style drives the color/motion vibe (category mood first, style refines it)
  const styleMood = STYLE_MOODS[String(template?.style || '').trim()];
  if (styleMood) mood = { ...mood, ...styleMood };
  const festivalKey = detectFestival(template);
  if (festivalKey !== 'none') {
    const ft = FESTIVAL_THEMES[festivalKey];
    mood = { ...mood, palette: ft.palette, accent: ft.accent, sound: ft.sound };
  }
  const accent = (mood && mood.accent) || '#FFD54F';
  const beatHz = ((mood && mood.tempo) || 128) / 60;
  const fontSrc = resolveFont(useIndic);
  if (!fontSrc) throw new Error('No usable Windows font found for text rendering.');
  const fontName = 'font.ttf';
  fs.copyFileSync(fontSrc, path.join(renderDir, fontName));

  // brand colors
  const c0 = brandKit?.primary_color || '#6C5CE7';
  const c1 = brandKit?.secondary_color || '#00CEA7';

  // available imagery (skip logos)
  const images = (media || [])
    .filter((m) => m.file_type === 'image')
    .map((m) => {
      const abs = path.join(UPLOADS_DIR, path.basename(m.file_url || ''));
      return { abs, exists: fs.existsSync(abs) };
    })
    .filter((m) => m.exists);

  // copy an image into render dir with clean name
  const copyClean = (srcAbs, name) => {
    if (!fs.existsSync(srcAbs)) return null;
    const dest = path.join(renderDir, name);
    fs.copyFileSync(srcAbs, dest);
    return name;
  };

  const imageNames = [];
  for (let i = 0; i < images.length; i++) {
    const name = `img${i}${path.extname(images[i].abs) || '.jpg'}`;
    copyClean(images[i].abs, name);
    imageNames.push(name);
  }

  // logo
  let logoName = null;
  const logoSource = (media || []).find((m) => m.file_type === 'logo');
  if (logoSource) {
    logoName = copyClean(path.join(UPLOADS_DIR, path.basename(logoSource.file_url || '')), 'logo.png') || null;
  }
  if (!logoName && brandKit?.logo_url) {
    logoName = copyClean(path.join(UPLOADS_DIR, path.basename(brandKit.logo_url)), 'logo.png') || null;
  }

  // narrations + scene text files
  const titleMax = useIndic ? 22 : 14; // impact is very wide
  scenesList.forEach((s, i) => {
    const title = wrapText((s.text || `Scene ${i + 1}`).trim(), titleMax);
    const sub = wrapText((s.voiceover || '').trim(), 30);
    fs.writeFileSync(path.join(renderDir, `t${i}.txt`), title, 'utf8');
    fs.writeFileSync(path.join(renderDir, `s${i}.txt`), sub, 'utf8');
  });

  // brand name file (global overlay)
  const brandName = (brandKit?.business_name || template?.business_name || 'ReelForge AI').trim();
  fs.writeFileSync(path.join(renderDir, 'brand.txt'), brandName, 'utf8');
  fs.writeFileSync(path.join(renderDir, 'hook.txt'), (scenesList[0]?.text || '').trim(), 'utf8');
  if (offer) {
    fs.writeFileSync(path.join(renderDir, 'offer.txt'), offer, 'utf8');
  }

  // ---- voiceover duration to decide timeline ----
  let voiceDur = 0;
  let voiceAbs = null;
  if (voiceUrl) {
    voiceAbs = path.join(UPLOADS_DIR, path.basename(voiceUrl));
    if (fs.existsSync(voiceAbs)) {
      voiceDur = await probeDuration(voiceAbs);
      const ext = path.extname(voiceAbs) || '.wav';
      const copied = copyClean(voiceAbs, `voice${ext}`);
      voiceAbs = copied ? path.join(renderDir, copied) : null;
    } else {
      voiceAbs = null;
    }
  }

  // ---- timeline with proportional extension so the full narration fits ----
  const OVERLAP = 0.4;
  let durations = scenesList.map((s) => Math.max(2, Math.min(4, s.duration || 3)));
  const baseTotal = durations.reduce((a, b) => a + b, 0) - OVERLAP * (durations.length - 1);
  if (voiceDur > baseTotal) {
    const scale = voiceDur / Math.max(baseTotal, 1);
    durations = durations.map((d) => Math.round(d * scale * 25) / 25);
  }
  const total = durations.reduce((a, b) => a + b, 0) - OVERLAP * (durations.length - 1);
  const offsets = [];
  let acc = 0;
  for (let i = 0; i < durations.length - 1; i++) {
    acc += durations[i];
    offsets.push(Math.round((acc - OVERLAP * (i + 1)) * 100) / 100);
  }

  // ---- scene visibility windows (for stickers / overlays) ----
  const sceneStart = [0];
  for (let i = 1; i < durations.length; i++) sceneStart.push(offsets[i - 1]);
  const sceneEnd = [];
  for (let i = 0; i < durations.length; i++) sceneEnd.push(i === durations.length - 1 ? total : offsets[i]);
  const winExpr = (idxList) => idxList.map((i) => `gte(t,${sceneStart[i].toFixed(2)})*lt(t,${sceneEnd[i].toFixed(2)})`).join('+') || '0';

  // ---- Pass A: render each scene ----
  const imgPool = imageNames.length ? imageNames : null;
  let genBgs = false;
  if (!imgPool) {
    genBgs = await saveGeneratedScenes(renderDir, (template.business_type || 'general'), festivalKey, mood.palette, accent, scenesList.length, useIndic, template.description);
  }
  const bigSize = useIndic ? 88 : 100;
  for (let i = 0; i < scenesList.length; i++) {
    let bgImage = imgPool ? imgPool[i % imgPool.length] : null;
    const zoomIn = i % 2 === 0;
    if (!bgImage) {
      if (genBgs) {
        bgImage = `bg${i}.png`;
      } else {
        const pal = mood.palette;
        await run(
          ffmpeg,
          ['-y', '-f', 'lavfi', '-i', `gradients=s=1080x1920:c0=${pal[0]}:c1=${pal[1]}:c2=${pal[2] || pal[1]}:x0=0:y0=0:x1=1080:y1=1920:duration=${total.toFixed(1)}:speed=0.03`, '-frames:v', '1', `bg${i}.png`],
          renderDir
        );
        bgImage = `bg${i}.png`;
      }
    }

    const frames = Math.round(durations[i] * 25);
    const zoomExpr = zoomIn
      ? `z='min(1.0+0.0016*on,1.24)'`
      : `z='max(1.24-0.0016*on,1.02)'`;
    const panExpr = i % 3 === 0 ? `x='iw/2-(iw/zoom/2)+30*sin(on/36)'` : `x='iw/2-(iw/zoom/2)'`;
    const mirror = imgPool && i % 2 === 1 ? ',hflip' : '';

    const filter = [
      `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920${mirror},zoompan=${zoomExpr}:${panExpr}:y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=25[zi]`,
      `[1:v]scale=1080:1920,format=rgba,colorchannelmixer=aa=0.30[wash]`,
      `[zi][wash]overlay=0:0[bgw]`,
      `[bgw]drawbox=x=0:y=ih*0.855:w=iw:h=ih*0.145:color=black@0.38:t=fill[bgd]`,
      `[bgd]drawtext=fontfile=${fontName}:textfile=t${i}.txt:expansion=none:fontcolor=white:fontsize=${bigSize}:line_spacing=8:borderw=9:bordercolor=black@0.8:shadowx=0:shadowy=9:shadowcolor=black@0.55:alpha='if(lt(t,0.35),t/0.35,1)':x=(w-text_w)/2:y='h*0.285+13*sin(2*PI*t*${beatHz.toFixed(3)})'[td]`,
      `[td]drawtext=fontfile=${fontName}:textfile=s${i}.txt:expansion=none:fontcolor=white@0.96:fontsize=38:shadowx=0:shadowy=5:shadowcolor=black@0.6:alpha='if(lt(t,0.6),(t-0.2)/0.35,1)':x=(w-text_w)/2:y=h*0.895`,
    ].join(';');

    await run(
      ffmpeg,
      [
        '-y', '-loop', '1', '-i', bgImage,
        '-f', 'lavfi', '-i', `gradients=s=1080x1920:c0=${mood.palette[0]}:c1=${mood.palette[1]}:c2=${mood.palette[2] || mood.palette[1]}:x0=0:y0=0:x1=1080:y1=1920:duration=${total.toFixed(1)}:speed=0.02`,
        '-filter_complex', filter,
        '-t', String(durations[i]), '-an',
        '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
        `sc${i}.mp4`,
      ],
      renderDir
    );
  }

  // ---- stickers (Pillow-generated splash assets) ----
  const stickers = await generateStickers(renderDir, accent, useIndic);

  // ---- Pass B: xfade transitions + global overlays + grade ----
  const args = ['-y'];
  for (let i = 0; i < durations.length; i++) args.push('-i', `sc${i}.mp4`);
  for (const s of stickers) args.push('-loop', '1', '-i', s);

  const trsSets = {
    food: ['circleopen', 'smoothleft', 'fade', 'smoothup', 'circleclose'],
    fashion: ['slideleft', 'fade', 'smoothleft', 'fadeblack', 'wipeleft'],
    gym: ['smoothup', 'fadeblack', 'slideleft', 'fade', 'smoothleft'],
    beauty: ['fade', 'smoothup', 'fadeblack', 'smoothleft', 'fade'],
    tech: ['slideleft', 'fade', 'circleopen', 'smoothup', 'fadeblack'],
    general: ['fadeblack', 'slideleft', 'fade', 'smoothup', 'wipeleft'],
  };
  const trs = trsSets[mood.sound] || trsSets.general;

  let chain = '';
  for (let i = 0; i < durations.length - 1; i++) {
    const inA = i === 0 ? '[0:v]' : `[x${i - 1}]`;
    const inB = `[${i + 1}:v]`;
    const out = i === durations.length - 2 ? '[xv]' : `[x${i}]`;
    chain += `${inA}${inB}xfade=transition=${trs[i % trs.length]}:duration=${OVERLAP}:offset=${offsets[i]}${out};`;
  }

  // brand + offer
  chain += `[xv]drawtext=fontfile=${fontName}:textfile=brand.txt:expansion=none:fontcolor=white:fontsize=54:borderw=6:bordercolor=black@0.75:shadowx=0:shadowy=6:shadowcolor=black@0.5:alpha='if(lt(t,0.8),t/0.8,1)':x=(w-text_w)/2:y=130[g0]`;
  let base = 'g0';
  if (offer) {
    base = 'g1';
    chain += `;[g0]drawtext=fontfile=${fontName}:textfile=offer.txt:expansion=none:fontcolor=${accent}:fontsize=66:borderw=7:bordercolor=black@0.8:shadowx=0:shadowy=7:shadowcolor=black@0.55:alpha='if(lt(t,1.1),t/1.1,1)':x=(w-text_w)/2:y='h*0.085+34*sin(2*PI*t*${beatHz.toFixed(3)})'[g1]`;
  }

  const nextOverlay = (stickerName, x, y, windows) => {
    const k = stickers.indexOf(stickerName);
    if (k < 0 || !windows) return;
    const inIdx = durations.length + k;
    const lbl = `ol${inIdx}`;
    chain += `;[${base}][${inIdx}:v]overlay=x=${x}:y=${y}:enable='${windows}'[${lbl}]`;
    base = lbl;
  };

  // burst behind headline (all scenes)
  nextOverlay('burst.png', 96, 206, winExpr([...Array(durations.length).keys()]));
  // sparkles
  nextOverlay('spark1.png', 872, 432, winExpr([0, 2]));
  nextOverlay('spark2.png', 430, 70, winExpr([1, 3]));
  // hot badge near offer
  nextOverlay('hot.png', 660, 226, winExpr([0, 1]));
  // arrow toward offer
  nextOverlay('arrow.png', 150, 168, winExpr([2, 3]));
  // visit CTA pill (last scene)
  nextOverlay('visit.png', 230, 1560, winExpr([durations.length - 1]));

  // logo top-left (always)
  if (logoName) {
    const logoInputIdx = durations.length + stickers.length;
    args.push('-loop', '1', '-i', 'logo.png');
    const lbl = `ol${logoInputIdx}`;
    chain += `;[${base}][${logoInputIdx}:v]overlay=x=28:y=56:enable='gte(t,0.4)*lt(t,${total.toFixed(2)})'[${lbl}]`;
    base = lbl;
  }

  chain += `;[${base}]eq=contrast=1.09:brightness=0.012:saturation=1.25:gamma=0.98,unsharp=5:5:0.5:5:5:0,vignette=angle=PI/6,noise=alls=2:allf=t+u,format=yuv420p[vout]`;
  args.push('-filter_complex', chain, '-map', '[vout]', '-t', String(total), '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', 'noaudio.mp4');
  await run(ffmpeg, args, renderDir);

  // ---- audio: narration (if any) + energetic beat ----
  synthMusicWav(path.join(renderDir, 'music.wav'), total, mood);
  await run(ffmpeg, ['-y', '-i', 'music.wav', '-c:a', 'aac', '-b:a', '96k', 'music.m4a'], renderDir);

  let audioArgs;
  if (voiceAbs && fs.existsSync(voiceAbs)) {
    const voiceFile = path.basename(voiceAbs);
    await run(
      ffmpeg,
      ['-y', '-i', voiceFile, '-filter_complex', `[0:a]volume=1.0,atrim=0:${total.toFixed(2)}[v]`, '-map', '[v]', '-c:a', 'aac', '-b:a', '128k', 'voice.m4a'],
      renderDir
    );
    audioArgs = ['-y', '-i', 'noaudio.mp4', '-i', 'voice.m4a', '-i', 'music.m4a',
      '-filter_complex', '[1:a]volume=1.0[voi];[2:a]volume=0.28[mus];[voi][mus]amix=inputs=2:duration=longest:normalize=0:dropout_transition=0,alimiter=limit=0.95[aout]',
      '-map', '0:v', '-map', '[aout]',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-t', total.toFixed(2), '-movflags', '+faststart', 'reel.mp4'];
  } else {
    audioArgs = ['-y', '-i', 'noaudio.mp4', '-i', 'music.m4a',
      '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-t', total.toFixed(2), '-movflags', '+faststart', 'reel.mp4'];
  }
  await run(ffmpeg, audioArgs, renderDir);

  // ---- final: move reel into uploads, cleanup intermediates ----
  const finalName = `reel-${Date.now()}-${String(reelId).replace(/[^\w-]/g, '')}.mp4`;
  const finalPath = path.join(UPLOADS_DIR, finalName);
  fs.copyFileSync(path.join(renderDir, 'reel.mp4'), finalPath);

  try {
    const names = fs.readdirSync(renderDir);
    names.forEach((n) => {
      if (n.endsWith('.mp4') || n.endsWith('.m4a') || n.endsWith('.png') || n.endsWith('.txt') || n.endsWith('.ttf') || n.endsWith('.wav') || n.endsWith('.mp3') || n.endsWith('.jpg') || n.startsWith('img') || n.startsWith('voice') || n.startsWith('logo')) {
        try { fs.unlinkSync(path.join(renderDir, n)); } catch {}
      }
    });
  } catch {}

  return {
    url: `/uploads/${finalName}`,
    demo: false,
    message: 'Video rendered locally with FFmpeg.',
  };
}

// ---------------------------------------------------------------------------
// Music engine v2: layered, mood-matched stereo track with intro/build/fade.
// ---------------------------------------------------------------------------
const SINE = (() => {
  const S = new Float32Array(8192);
  for (let i = 0; i < 8192; i++) S[i] = Math.sin((i / 8192) * Math.PI * 2);
  return S;
})();
const SAW = (() => {
  const S = new Float32Array(8192);
  for (let i = 0; i < 8192; i++) S[i] = i < 4096 ? (i / 4096) * 2 - 1 : (i - 8192) / 4096 * 2 + 1;
  return S;
})();
const NOISE = (() => {
  const N = new Float32Array(32768);
  for (let i = 0; i < 32768; i++) N[i] = Math.random() * 2 - 1;
  return N;
})();

const SOUND_CFG = {
  energetic: { kick: [0, 1, 2, 3], kickG: 1.0, snare: [1, 3], snareG: 0.5, hatDense: 0, hatG: 0.16, bassPat: [1, 1, 1, 1, 1, 1, 1, 1], bassG: 0.5, arp16: true, arpG: 0.16, padG: 0.16, leadG: 0.22, saw: false },
  glam:     { kick: [0, 2],     kickG: 0.9, snare: [1, 3], snareG: 0.32, hatDense: 0, hatG: 0.10, bassPat: [1, 0, 0.6, 1, 0.7, 0, 1, 0.6], bassG: 0.42, arp16: false, arpG: 0.18, padG: 0.2, leadG: 0.2, saw: true },
  beast:    { kick: [0, 1, 2, 3], kickG: 1.1, snare: [1, 3], snareG: 0.62, hatDense: 1, hatG: 0.2, bassPat: [1, 1, 1, 1, 1, 1, 1, 1], bassG: 0.6, arp16: true, arpG: 0.2, padG: 0.12, leadG: 0.26, saw: true },
  soft:     { kick: [0, 2],     kickG: 0.7, snare: [1],     snareG: 0.2, hatDense: 0, hatG: 0.06, bassPat: [1, 0, 0, 0.7, 0, 0.5, 0, 0], bassG: 0.34, arp16: false, arpG: 0.22, padG: 0.26, leadG: 0.16, saw: false },
  future:   { kick: [0, 2],     kickG: 0.9, snare: [1, 3], snareG: 0.4, hatDense: 1, hatG: 0.13, bassPat: [1, 0, 0.8, 0.4, 1, 0, 0.7, 0.4], bassG: 0.5, arp16: true, arpG: 0.26, padG: 0.2, leadG: 0.2, saw: false },
  pop:      { kick: [0, 2, 3],  kickG: 1.0, snare: [1, 3], snareG: 0.45, hatDense: 0, hatG: 0.15, bassPat: [1, 1, 1, 1, 1, 1, 1, 1], bassG: 0.5, arp16: true, arpG: 0.2, padG: 0.18, leadG: 0.22, saw: false },
};

function synthMusicWav(filePath, totalSeconds, mood) {
  const fsx = require('fs');
  const sr = 44100;
  const tempo = (mood && mood.tempo) || 128;
  const cfg = SOUND_CFG[(mood && mood.sound) || 'pop'] || SOUND_CFG.pop;
  const n = Math.floor(totalSeconds * sr);

  const beatS = Math.round(sr * (60 / tempo));
  const barS = beatS * 4;
  const eighthS = beatS >> 1;
  const sixteenthS = beatS >> 2;

  const roots = [110.0, 87.31, 130.81, 98.0]; // A2 F2 C2 G2
  const chords = [
    [220.0, 261.63, 329.63], // Am
    [174.61, 220.0, 261.63], // F
    [196.0, 261.63, 329.63], // C
    [196.0, 246.94, 293.66], // G
  ];
  const arpVals = [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 0, 1, 2, 0, 2]; // chord indices
  const arpPan = [1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1];
  const hatVel = [1, 0.5, 0.8, 0.6, 0.9, 0.5, 0.7, 1];

  // envelopes (precomputed, no exp in hot loop)
  const kickEnv = new Float32Array(beatS);
  const kickFq = new Float32Array(beatS);
  for (let k = 0; k < beatS; k++) {
    kickEnv[k] = Math.exp(-11 * (k / sr));
    kickFq[k] = 48 + 76 * Math.exp(-15 * (k / sr));
  }
  const snareEnv = new Float32Array(Math.floor(beatS * 0.5));
  for (let k = 0; k < snareEnv.length; k++) snareEnv[k] = Math.exp(-20 * (k / sr));
  const hatEnv = new Float32Array(Math.floor(beatS * 0.5));
  const openEnv = new Float32Array(beatS);
  for (let k = 0; k < hatEnv.length; k++) hatEnv[k] = Math.exp(-70 * (k / sr));
  for (let k = 0; k < openEnv.length; k++) openEnv[k] = Math.exp(-30 * (k / sr));
  const bassEnv = new Float32Array(eighthS);
  for (let k = 0; k < eighthS; k++) bassEnv[k] = Math.exp(-7 * (k / sr));
  const arpEnv = new Float32Array(sixteenthS);
  for (let k = 0; k < sixteenthS; k++) arpEnv[k] = Math.exp(-9 * (k / sr));
  const leadEnv = new Float32Array(eighthS);
  for (let k = 0; k < eighthS; k++) leadEnv[k] = Math.exp(-8 * (k / sr));

  const out = Buffer.alloc(44 + n * 4);
  out.write('RIFF', 0); out.writeUInt32LE(36 + n * 4, 4); out.write('WAVE', 8);
  out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
  out.writeUInt32LE(sr, 24); out.writeUInt32LE(sr * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
  out.write('data', 36); out.writeUInt32LE(n * 4, 40);

  let pb = 0;   // bass/pad/arp/lead shared phase (wavetable)
  let offset = 0;

  for (let i = 0; i < n; i++) {
    const beatNo = Math.floor(i / beatS);
    const beatInBar = beatNo % 4;
    const barNo = Math.floor(beatNo / 4);
    const inBeat = (i - beatNo * beatS);          // sample index within beat
    const inBar = (i - barNo * barS);             // sample index within bar

    let kick = 0, sna = 0, hat = 0, bass = 0, arp = 0, pad = 0, lead = 0;

    // kick
    if (cfg.kick.includes(beatInBar) && inBeat < kickEnv.length) {
      const kf = kickFq[inBeat];
      kick = cfg.kickG * kickEnv[inBeat] * Math.sin(2 * Math.PI * kf * (inBeat / sr));
    }
    // snare / clap
    if (cfg.snare.includes(beatInBar) && inBeat < snareEnv.length) {
      sna = cfg.snareG * snareEnv[inBeat] * NOISE[(i * 3) & 32767];
    }
    // hats
    const ei = Math.floor(i / eighthS);
    const inEighth = i - ei * eighthS;
    const step8 = ei % 8;
    if (inEighth < hatEnv.length) {
      const vel = hatVel[step8];
      if (vel > 0) hat += cfg.hatG * vel * hatEnv[inEighth] * NOISE[i & 32767];
    }
    if (cfg.hatDense === 1) {
      const si = Math.floor(i / sixteenthS);
      const in16 = i - si * sixteenthS;
      if ((si % 2 === 1) && in16 < hatEnv.length && step8 !== 7) {
        hat += cfg.hatG * 0.6 * hatEnv[in16] * NOISE[(i * 5) & 32767];
      }
    }

    // bass
    const eiB = Math.floor(i / eighthS);
    const inBE = i - eiB * eighthS;
    const bassV = cfg.bassPat[eiB % 8];
    if (bassV > 0 && inBE < bassEnv.length) {
      const ch = chords[barNo % 4];
      const oct = (eiB % 2) === 0 ? 1 : 2;
      pb += (ch[0] * oct / sr);
      if (pb >= 1) pb -= 1;
      bass += cfg.bassG * bassV * bassEnv[inBE] * SINE[(pb * 8192) & 8191];
    } else if (bassV === 0) pb = 0;

    // arp
    const sj = Math.floor(i / sixteenthS);
    const in16j = i - sj * sixteenthS;
    const chA = chords[barNo % 4];
    if (cfg.arp16 || sj % 2 === 0) {
      const step16 = sj % 16;
      const note = chA[arpVals[step16]] * (step16 < 8 ? 1 : 2);
      const ph = (i * note / sr) % 1;
      const pluck = cfg.arpG * arpEnv[in16j] * SINE[(ph * 8192) & 8191];
      arp += arpPan[step16] * pluck * 0.6 + pluck * 0.4;
    }

    // pad (sustained chord, slow attack per bar)
    const padAtt = Math.min(1, (inBar / sr) * 3);
    if (cfg.padG > 0) {
      const ph1 = (i * chA[0] / sr) % 1;
      const ph2 = (i * chA[1] / sr) % 1;
      const ph3 = (i * chA[2] / sr) % 1;
      pad = cfg.padG * padAtt * ((SINE[(ph1 * 8192) & 8191] + SINE[(ph2 * 8192) & 8191] + SINE[(ph3 * 8192) & 8191]) / 3);
    }

    // lead stab (after intro, accent rhythm)
    if (barNo >= 2 && inBE < leadEnv.length) {
      const pat = [1, 0, 1, 0, 0, 1, 0, 1];
      if (pat[eiB % 8] === 1) {
        const f = chA[0] * (eiB % 2 === 0 ? 2 : 3);
        const phL = (i * f / sr) % 1;
        lead = cfg.leadG * leadEnv[inBE] * (cfg.saw ? SAW[(phL * 8192) & 8191] : SINE[(phL * 8192) & 8191]);
      }
    }

    const l = kick + sna * 0.7 + hat * 0.7 + bass + arp + pad + lead;
    const r = kick + sna * 1.0 + hat * 1.1 + bass + arp + pad + lead;
    const t = i / sr;
    const fadeIn = Math.min(1, t / 0.9);
    const fadeOut = Math.min(1, Math.max(0, (totalSeconds - t) / 0.7));
    const m = fadeIn * fadeOut;
    const drive = Math.tanh(l * 0.85) * m;
    const driveR = Math.tanh(r * 0.85) * m;
    out.writeInt16LE(Math.max(-1, Math.min(1, drive)) * 32767, 44 + i * 4);
    out.writeInt16LE(Math.max(-1, Math.min(1, driveR)) * 32767, 44 + i * 4 + 2);
  }
  fsx.writeFileSync(filePath, out);
}

function fallbackScenes() {
  return [
    { scene: 1, duration: 3, text: 'Welcome', visual: 'Brand intro', voiceover: 'Welcome to our business!' },
    { scene: 2, duration: 3, text: 'Our Specialty', visual: 'Showcase', voiceover: 'Here is what makes us special.' },
    { scene: 3, duration: 3, text: 'Visit Us Today', visual: 'CTA', voiceover: 'Visit us today. Follow for more.' },
  ];
}

/**
 * Public entry point.
 */
async function createReelVideo(opts) {
  const provider = process.env.VIDEO_PROVIDER || 'ffmpeg';

  if (provider === 'creatomate' && process.env.CREATOMATE_API_KEY) {
    return createCreatomateVideo(opts);
  }

  return renderWithFfmpeg(opts);
}

async function createCreatomateVideo({ template, scenes, media, voiceUrl, brandKit }) {
  const apiKey = process.env.CREATOMATE_API_KEY;
  const creatomateElements = (media || [])
    .filter((m) => m.file_type !== 'logo')
    .map((m, i) => ({
      type: 'video',
      src: `http://localhost:3000${m.file_url}`,
      x: 0, y: 0, width: 1080, height: 1920,
      duration: scenes[i]?.duration || 3,
    }));

  const textElements = (scenes || []).map((scene) => ({
    type: 'text',
    text: scene.text,
    x: 80, y: 1500, width: 920, fontSize: 64, position: 'top', align: 'center',
    fillColor: '#FFFFFF', strokeColor: '#000000', strokeWidth: 3,
  }));

  const logoElement = (media || []).find((m) => m.file_type === 'logo');
  const logo = logoElement
    ? [{ type: 'image', src: `http://localhost:3000${logoElement.file_url}`, x: 30, y: 30, width: 150, height: 150 }]
    : [];

  const response = await fetch('https://rest.creatomate.com/v1/renders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template: {
        format: 'instagram-reels', width: 1080, height: 1920, fps: 30,
        duration: (scenes || []).reduce((sum, s) => sum + (s.duration || 3), 0),
        elements: [
          ...creatomateElements,
          ...textElements,
          ...logo,
          ...(voiceUrl ? [{ type: 'audio', src: `http://localhost:3000${voiceUrl}` }] : []),
          { type: 'text', text: brandKit?.default_cta || 'Visit us today', x: 80, y: 1750, width: 920, fontSize: 50, align: 'center', fillColor: brandKit?.primary_color || '#6C5CE7' },
        ],
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Creatomate API error: ${errText}`);
  }

  const render = await response.json();
  const renderId = render[0]?.id;
  if (!renderId) throw new Error('Creatomate did not return a render id');
  const url = await pollCreatomateRender(renderId, apiKey);
  return { url, demo: false };
}

async function pollCreatomateRender(renderId, apiKey) {
  for (let i = 0; i < 60; i++) {
    const res = await fetch(`https://rest.creatomate.com/v1/renders/${renderId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const render = await res.json();
    if (render.status === 'completed' || render.status === 'succeeded') return render.url;
    if (render.status === 'failed' || render.status === 'cancelled') {
      throw new Error(`Creatomate render failed: ${render.error || 'Unknown error'}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('Creatomate render timed out.');
}

module.exports = { createReelVideo };

void stripExt;