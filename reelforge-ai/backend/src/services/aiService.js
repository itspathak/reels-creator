const OpenAI = require('openai');

let client = null;

function getClient() {
  if (!client && process.env.OPENAI_API_KEY) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/**
 * Generate a complete reel concept from business information.
 * Returns structured JSON with hook, scenes, script, caption, hashtags, cta.
 */
async function generateReelConcept(business) {
  const openai = getClient();

  const {
    business_name,
    business_type,
    description,
    festival,
    location,
    offer,
    target_audience,
    language,
    style,
    goal,
  } = business;

  if (!openai) {
    return generateMockConcept(business);
  }

  const prompt = `You are a world-class Instagram Reels creative director and copywriter.

Generate a complete Instagram Reel concept for the following business. Return ONLY valid JSON matching this exact schema — no extra text, no markdown fences.

{
  "hook": "string — a punchy 3-5 word headline that stops the scroll",
  "concept": "string — 1-2 sentence description of the reel concept",
  "scenes": [
    {
      "scene": 1,
      "duration": 3,
      "visual": "string — description of what should appear on screen",
      "text": "string — text overlay for this scene (keep concise)",
      "voiceover": "string — the voiceover narration line for this scene"
    }
  ],
  "voiceover": "string — complete voiceover script concatenating all scene voiceovers (natural, conversational tone)",
  "caption": "string — Instagram caption with line breaks and emoji",
  "cta": "string — a strong call-to-action",
  "hashtags": ["string", "string"]
}

Business Details:
- Name: ${business_name}
- Type: ${business_type}
- Description: ${description || 'Not provided'}
- Festival/Occasion: ${festival || 'Not provided'}
- Location: ${location || 'Not provided'}
- Special Offer: ${offer || 'None'}
- Target Audience: ${target_audience || 'General audience'}
- Language: ${language}
- Reel Style: ${style}
- Goal: ${goal || 'Get more customers'}

Rules:
- Write the hook, caption, voiceover, and hashtags in ${language}.
- Generate exactly 5 scenes (15 seconds total reel).
- Each scene duration should be 2-4 seconds.
- Hashtags: generate 10-15 relevant Instagram hashtags (no # prefix).
- The tone must match the reel style ("Viral" = energetic, "Luxury" = elegant, "Funny" = playful, "Premium" = refined, "Minimal" = clean, "Promotional" = action-oriented, "Festive" = celebratory).
- Return ONLY the JSON object, no explanation.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 2000,
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error('AI returned empty response');

  const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('AI returned invalid JSON. Please try again.');
  }

  validateConcept(parsed);
  return parsed;
}

function validateConcept(data) {
  if (!data.hook || typeof data.hook !== 'string') throw new Error('Missing or invalid hook');
  if (!Array.isArray(data.scenes) || data.scenes.length === 0) throw new Error('Missing or empty scenes');
  if (!data.voiceover) throw new Error('Missing voiceover');
  if (!data.caption) throw new Error('Missing caption');
  if (!Array.isArray(data.hashtags)) throw new Error('Missing hashtags');
}

function generateMockConcept(business) {
  const { business_name, business_type, offer, style, location, target_audience, festival } = business;
  const hindi = ['Hindi', 'Hinglish', 'Gujarati'].includes(business.language);
  const cat = String(business_type || '').toLowerCase();
  const fes = String(festival || '').toLowerCase();

  const CATEGORY_COPY = {
    food: {
      visuals: ['Steaming food close-up', 'Signature dish showcase', 'Chef handcrafting food', 'Happy customers enjoying'],
      texts: ['TASTES LIKE LOVE', 'FRESH & HOT', 'MADE WITH HEART', 'JUST FOR YOU'],
      v: [
        'Fresh, hot and full of flavour — this is what happiness tastes like.',
        'Every bite is made with love and the freshest ingredients.',
        'One taste and you will know why everyone keeps coming back.',
        'Your cravings have found their home.',
      ],
    },
    fashion: {
      visuals: ['Stylish outfit showcases', 'New collection reveal', 'Trendy color palette', 'Star styling moment'],
      texts: ['TREND ALERT', 'NEW LOOK', 'STYLE ICON', 'SHOP THE VIBE'],
      v: [
        'Your style just got an upgrade — the new collection is here.',
        'Look stunning in every single frame with our latest designs.',
        'Fashion that speaks before you say a word.',
        'Walk in. Shine out. That is the new you.',
      ],
    },
    gym: {
      visuals: ['Intense workout moment', 'Energy and sweat', 'Transformation power', 'Push through the limit'],
      texts: ['NO PAIN NO GAIN', 'GET STRONGER', 'YOUR BEST SELF', 'SHOW UP EVERY DAY'],
      v: [
        'Sweat now. Shine later. This is where champions are made.',
        'Every rep brings you one step closer to your best self.',
        'Discipline beats motivation, every single time.',
        'Your body can handle it. Your mind just has to believe.',
      ],
    },
    beauty: {
      visuals: ['Glowing skin moment', 'Makeover transformation', 'Spa-like relaxation', 'Glow up reveal'],
      texts: ['GLOW UP', 'RADIANT YOU', 'FEEL AMAZING', 'BOOK YOUR SESSION'],
      v: [
        'Good skin is not an accident — it is a routine. And we have perfected it.',
        'Walk in tired. Walk out glowing. That is the transformation.',
        'A little self-care today, a glowing tomorrow.',
        'You deserve to feel this good. Every single day.',
      ],
    },
    tech: {
      visuals: ['Latest gadgets revealed', 'Sleek device showcase', 'Fast performance demo', 'Upgrade your setup'],
      texts: ['NEXT LEVEL TECH', 'FAST. SMART. NEW.', 'UPGRADE NOW', 'FUTURE IS HERE'],
      v: [
        'Meet the tech that will change the way you work and play.',
        'Speed, style and power — all in one stunning device.',
        'Stop settling. Upgrade to the experience you deserve.',
        'The future is here. Be the first to own it.',
      ],
    },
    travel: {
      visuals: ['Breathtaking mountain view', 'Golden sun peeking over hills', 'Misty valley morning', 'Winding hill roads'],
      texts: ['ESCAPE THE ORDINARY', 'NATURE CALLS', 'FIND YOUR PEACE', 'PACK YOUR BAGS'],
      v: [
        'Somewhere between the clouds and the mountains, peace is waiting.',
        'Wake up to fresh air, green valleys and views that steal your breath.',
        'The best views are always at the end of the hardest roads.',
        'Book your escape. The mountains are calling you home.',
      ],
    },
  };

  const FESTIVE_LINES = {
    diwali: {
      texts: ['SHUBH DIWALI', 'FESTIVAL OF LIGHTS', 'LIGHT UP YOUR DAY', 'DIVALI SPECIAL'],
      v: [
        'This Diwali, light up your home and your heart with joy.',
        'May the festival of lights bring you happiness and good fortune.',
        'Celebrate with family, sweets and memories that shine forever.',
        'Wishing you a Diwali that sparkles like a thousand diyas.',
      ],
    },
    navratri: {
      texts: ['NAVRATRI SPECIAL', 'DAK TO HASHTAG', 'GARBA NIGHTS', 'NAMBA SHIVAM IT'],
      v: [
        'Nine nights of dance, colors and pure energy — Navratri has arrived.',
        'Garba night vibes, festive colors and joy around every corner.',
        'Come alive with the rhythm of the dhol this Navratri.',
        'Celebrate the divine with us this Navratri, with open hearts.',
      ],
    },
  };

  const catKey = ['food', 'fashion', 'gym', 'beauty', 'tech'].find((k) => cat.includes(k)) || (/(travel|hill|nature|mountain|resort|tour|forest|lake|beach|trek)/.test(cat) ? 'travel' : 'general');
  const festKey = ['diwali', 'navratri'].find((k) => fes.includes(k)) || (/(holi|christmas|new.?year)/.test(fes) ? fes.replace(/[^a-z]/g, '').replace('newyear', 'diwali') : null);

  const cc = CATEGORY_COPY[catKey] || {
    visuals: ['Dynamic brand moment', 'Signature offering', 'Happy customers', 'Strong call to action'],
    texts: [String(business_name).toUpperCase(), 'BEST IN TOWN', 'YOU DESERVE THE BEST', String(offer ? offer.toUpperCase() : 'VISIT US TODAY')],
    v: [
      `Welcome to ${business_name} — where quality always comes first.`,
      `At ${business_name}, we put real care into everything we do.`,
      `Why settle for less when you can have the best?`,
      `Come and experience it yourself at ${business_name}.`,
    ],
  };
  const fl = festKey ? FESTIVE_LINES[festKey] : null;

  const sceneThemes = fl || cc;
  const quick = hindi ? 'Jaldi se aajaiye aur visit kijiye!' : 'Come quick — grab it before it is gone!';
  const offerLine = offer ? String(offer).trim().replace(/[.]+$/, '') : null;
  const v1 = fl ? fl.v[0] : cc.v[0];
  const v2 = fl ? fl.v[1] : cc.v[1];
  const v3 = fl ? fl.v[2] : cc.v[2];
  const v4 = hindi ? 'Abhi mauka mat chhodiye!' : 'Do not miss this chance!';
  const v5 = `${offerLine ? offerLine + '. ' : ''}${quick} Visit ${business_name}${location ? ' at ' + location : ''} today!`;

  const hook = fl
    ? `${fl.texts[0]} at ${business_name}!`
    : offerLine
      ? `${offerLine} at ${business_name}!`
      : `Why ${business_name} is the Best`;
  const visuals = fl ? cc.visuals : cc.visuals;

  return {
    hook,
    concept: `A ${style || 'viral'} style reel for ${business_name}${festKey ? ' celebrating ' + festKey : ''} — ${catKey}${location ? ' in ' + location : ''} — ${fl ? fl.texts[0] : offerLine || 'showcasing what makes them special'}.`,
    scenes: [
      {
        scene: 1,
        duration: 3,
        visual: (fl ? `${fl.texts[0]} celebration. ` : '') + visuals[0],
        text: fl ? fl.texts[0] : (offerLine ? offerLine.toUpperCase() : cc.texts[0]),
        voiceover: v1,
      },
      {
        scene: 2,
        duration: 3,
        visual: visuals[1],
        text: cc.texts[1],
        voiceover: v2,
      },
      {
        scene: 3,
        duration: 3,
        visual: visuals[2],
        text: fl ? fl.texts[2] : cc.texts[2],
        voiceover: v3,
      },
      {
        scene: 4,
        duration: 3,
        visual: visuals[3],
        text: 'Why wait?',
        voiceover: v4,
      },
      {
        scene: 5,
        duration: 3,
        visual: `Call to action screen with business name and${location ? ' ' + location : ''}.`,
        text: offerLine ? `${offerLine} — Come Quick!` : `Visit ${business_name} Today`,
        voiceover: v5,
      },
    ],
    voiceover: [v1, v2, v3, v4, v5].join(' '),
    caption: `${fl ? fl.texts[0] + ' ✨' : '✨ ' + hook}\n\n${offerLine ? '🎁 ' + offerLine + '\n\n' : ''}${festKey ? '#festivevibes\n\n' : ''}📍${location ? ' ' + location : ''} | 📲 Follow us for more\n\nDouble tap if you would visit! 👇`,
    cta: `${quick} ${offerLine ? offerLine + '. ' : ''}Visit ${business_name}${location ? ' at ' + location : ''}!`,
    hashtags: [
      business_name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      business_type ? business_type.toLowerCase().replace(/[^a-z0-9]/g, '') : 'business',
      festKey || 'reels',
      festKey ? `${festKey}special` : 'instagramreels',
      'ai',
      'smallbusiness',
      'localbusiness',
      'supportlocal',
      'viralreels',
      (style || 'viral').toLowerCase() + 'style',
      'marketing',
      'contentcreator',
      'branding',
      'followus',
      'reelstrending',
    ],
  };
}

module.exports = { generateReelConcept };
