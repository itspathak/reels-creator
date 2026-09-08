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

CLARITY RULES (most important — the viewer must instantly understand the reel):
- Every scene must clearly identify the business: always include the business name and what the business sells/offers (business type + description, e.g. "jeans & shirts", "cafe", "sweet shop").
- Scene 1 (hook) must contain BOTH the brand name AND the offer (if provided) or festival occasion (if provided), e.g. "Diwali Sale at Star Fashion".
- Scene 3 (offer scene) must repeat the exact offer or a festival occasion if the offer is missing.
- Scene 4 (location scene) must show the exact location/address.
- Scene 5 (CTA) must repeat brand name + location.
- Repeat the offer in at least 2 different scenes, and the brand name in every scene's text overlay.
- Never leave the text overlay generic (no "Big Sale" or "Visit us" without naming the brand, offer, or location).
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

  const brand = String(business_name || '').trim() || 'Our Store';
  const hindi = ['Hindi', 'Hinglish', 'Gujarati', 'Marathi'].includes(String(language || '').trim());
  const cat = String(business_type || '') + ' ' + String(description || '');
  const catLower = cat.toLowerCase();
  const fes = String(festival || '').toLowerCase();
  const loc = String(location || '').trim();
  const rawOffer = String(offer || '').trim().replace(/[.]+$/, '');
  const festLabel = festLabelFor(fes);

  // --- what the business SELLS, derived from type + description ---
  const productLine = productLineFor(catLower);

  // --- concrete offer: user offer, else festive fallback, else generic ---
  let offerLine;
  if (rawOffer) {
    offerLine = rawOffer;
  } else if (festLabel) {
    offerLine = `${festLabel} Sale — khaas offers abhi`;
  } else {
    offerLine = `Special Offers`;
  }

  // --- location line for the CTA ---
  const locLine = loc ? loc : 'hamari dukaan par';

  // --- festival greeting for the hook ---
  const festHook = festLabel ? `${festLabel.toUpperCase()} SALE` : 'SPECIAL SALE';

  // --- voiceover lines (specific, energetic, data-driven) ---
  const vo = (hindi ? [
    `${festLabel ? `Haan, ${festLabel} ka mauka aa gaya! ` : 'Rukna mat, deal aa gayi! '}${offerLine} — sirf ${brand} par, aur khaas ${productLine} ke saath.`,
    `${brand} mein ${productLine} ka dhamaka! Quality, style aur shaandaar offers — sab kuch ek hi jagah.`,
    `${offerLine}. ${festLabel ? 'Tyohaar ka maza ab double! ' : 'Budget mein hi full maza! '}Time limited hai — jitni der me dhyan se dekho, deal puri ho jayegi!`,
    loc ? `Store chale jao — ${loc}. ${brand} yahin hai, aur offer paas mein hi!` : `Store chale jao — ${brand} yahin hai, aur offer paas mein hi!`,
    `Ek last reminder! ${offerLine}, ${locLine}. ${hindi ? 'Aaj hi aaiye' : 'Visit us today'} — ${brand}!`,
  ] : [
    `${festLabel ? `Hey, it's ${festLabel} time! ` : 'Wait, the deal is here! '}${offerLine} on ${productLine} — only at ${brand}.`,
    `${brand} is serving up the best ${productLine} with style, quality and crazy-good offers.`,
    `${offerLine}! ${festLabel ? 'Make this festive season special. ' : 'Big on value, easy on budget. '}Limited time — hurry before it is gone!`,
    loc ? `Head over to ${loc}. ${brand} is right here, deals are waiting!` : `Head over to the store — ${brand} is right here, deals are waiting!`,
    `One last reminder! ${offerLine}, ${locLine}. Visit ${brand} today!`,
  ]);

  const texts = (hindi ? [
    `${festHook} @ ${brand.toUpperCase()}`,
    `${productLine.toUpperCase()}!!`,
    `${offerLine.toUpperCase()}`,
    loc ? `MILTE HAIN: ${loc.toUpperCase()} — ${brand.toUpperCase()}` : `${brand.toUpperCase()} — YAHIN HAI`,
    `${offerLine.toUpperCase()} — VISIT ${brand.toUpperCase()}!`,
  ] : [
    `${festHook} @ ${brand.toUpperCase()}`,
    `${productLine.toUpperCase()}!!`,
    `${offerLine.toUpperCase()}`,
    loc ? `${loc.toUpperCase()} — ${brand.toUpperCase()}` : `${brand.toUpperCase()}'S HERE`,
    `${offerLine.toUpperCase()}! HURRY — VISIT ${brand.toUpperCase()}`,
  ]);

  const visuals = (hindi ? [
    `${festLabel || 'Special'} sale opening in slow-mo with confetti, brand name ${brand} and ${offerLine} on screen.`,
    `Fast cuts showing ${productLine} flying across frame with dynamic camera moves at ${brand}.`,
    `Explosive ${offerLine} reveal with sparks and countdown urgency, ${brand} logo bounces in.`,
    loc ? `Zoom into a stylish storefront of ${brand} with big address text: ${loc}.` : `Zoom into the stylish storefront of ${brand}.`,
    `Final mega call-to-action card: ${brand} — ${offerLine}, ${locLine}, with fire emojis.`,
  ] : [
    `${festLabel || 'Special'} sale opening in slow-mo with confetti, brand name ${brand} and ${offerLine} on screen.`,
    `Fast cuts showing ${productLine} flying across frame with dynamic camera moves at ${brand}.`,
    `Explosive ${offerLine} reveal with sparks and countdown urgency, ${brand} logo bounces in.`,
    loc ? `Zoom into a stylish storefront of ${brand} with big address text: ${loc}.` : `Zoom into the stylish storefront of ${brand}.`,
    `Final mega call-to-action card: ${brand} — ${offerLine}, ${locLine}, with fire emojis.`,
  ]);

  const hook = `${festHook} @ ${brand}!`;
  const caption = [
    `${festLabel ? `${festLabel.toUpperCase()} SALE 🔥` : 'SPECIAL OFFER 🔥'}`,
    '',
    `🏬 ${brand} — ${productLine}`,
    rawOffer ? `🎁 Offer: ${rawOffer}` : '',
    loc ? `📍 ${loc}` : '',
    '',
    `⏰ Limited time offer — hurry before it's gone!`,
    `🔥 Double tap if this deal is TOO GOOD to miss!`,
    hindi ? 'सबसे best deals के लिए follow करें + save करें!' : 'Follow + save for the best deals in town!',
    '',
    ...buildHashtags({ brand, business_type, festival: festLabel, location: loc, style }),
  ].filter((l) => l !== '').join('\n');

  return {
    hook,
    concept: `A ${style || 'viral'} Diwali/festive reel for ${brand} (${business_type}) — selling ${productLine}, offering ${offerLine}, located at ${locLine}. Clear hook, offer, location and CTA.`,
    scenes: [
      { scene: 1, duration: 3, visual: visuals[0], text: texts[0], voiceover: vo[0] },
      { scene: 2, duration: 3, visual: visuals[1], text: texts[1], voiceover: vo[1] },
      { scene: 3, duration: 3, visual: visuals[2], text: texts[2], voiceover: vo[2] },
      { scene: 4, duration: 3, visual: visuals[3], text: texts[3], voiceover: vo[3] },
      { scene: 5, duration: 3, visual: visuals[4], text: texts[4], voiceover: vo[4] },
    ],
    voiceover: vo.join(' '),
    caption,
    cta: `${offerLine}. ${locLine}. Visit ${brand} today!`,
    hashtags: buildHashtags({ brand, business_type, festival: festLabel, location: loc, style }),
  };
}

function festLabelFor(fes) {
  if (!fes) return null;
  if (/diwali|divali|deepavali/.test(fes)) return 'Diwali';
  if (/navratri/.test(fes)) return 'Navratri';
  if (/holi/.test(fes)) return 'Holi';
  if (/christmas|xmas/.test(fes)) return 'Christmas';
  if (/new.?year/.test(fes)) return 'New Year';
  if (/eid|ramzan/.test(fes)) return 'Eid';
  return fes.charAt(0).toUpperCase() + fes.slice(1);
}

function productLineFor(catLower) {
  const RULES = [
    [/jean|denim|cloth|garment|outlet|wear|shirt|kurta|saree|fashion|boutique|stitch/i, 'jeans, shirts, kurtas aur kurtis'],
    [/restaurant|cafe|hotel|food|dhaba|thali|kitchen|chef/i, 'khaas thalis aur signature dishes'],
    [/sweet|mithai|cake|bakery|chocolate/i, 'fresh mithai aur bakery treats'],
    [/gym|fitness|yoga|workout|health club/i, 'premium fitness plans aur workout gear'],
    [/beauty|salon|spa|make|skin|parlour/i, 'glow-up makeovers aur skin care'],
    [/jewellery|jewelry|gold|kundan|ornament|silver/i, 'shining jewellery collections'],
    [/electronic|mobile|phone|laptop|gadget|tv|led/i, 'latest gadgets aur electronics'],
    [/gift|decor|home|furniture|lamp|lighting/i, 'stylish decor aur gift ideas'],
    [/grocery|supermarket|kirana|fresh mart/i, 'fresh groceries aur daily essentials'],
    [/travel|tour|hotel|resort|booking/i, 'unforgettable travel packages'],
    [/stationery|books|school|office/i, 'stationery aur office essentials'],
    [/pharmacy|medical|ayurved|medicine/i, 'trusted health aur wellness products'],
  ];
  for (const [re, line] of RULES) {
    if (re.test(catLower)) return line;
  }
  return 'premium quality products';
}

function buildHashtags({ brand, business_type, festival, location, style }) {
  const tags = new Set();
  const add = (t) => {
    const clean = String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean) tags.add(clean);
  };
  add(brand);
  add(business_type);
  add(festival);
  add(`${festival}${festival ? 'sale' : ''}`);
  add('diwalisale');
  add(festival && festival.toLowerCase() === 'diwali' ? 'happy diwali' : 'festiveoffers');
  add(location ? String(location).split(/[\s,]+/)[0] : '');
  add(style);
  add('reels');
  add('viralreels');
  add('instareels');
  add('smallbusiness');
  add('supportlocal');
  add('bestdeals');
  add('offers');
  ['reelitfeelit', 'explorepage', 'trendingreels', 'shopping', 'freshstart'].forEach(add);
  return [...tags].slice(0, 15);
}

module.exports = { generateReelConcept };
