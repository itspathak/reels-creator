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
- Shop number: ${business.shop_number || 'Not provided'}
- Full address: ${business.address || 'Not provided'}
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
- The call-to-action must drive the main goal: "Get More Customers" = invite people to visit, "Promote Offer" = push the offer/price, "Launch Product" = announce the new product, "Brand Awareness" = repeat the brand name, "Increase Engagement" = ask to like/comment/share.
- Every scene text overlay must include the shop number and full address when available (e.g. "Shop No. 12, MG Road, Jaipur"), and the voiceover must speak the full address out loud in the location scene.

OFFER RULES (strict — never invent offers):
- If "Special Offer" is provided: repeat that EXACT offer wording (no additions, no invented percentages/discounts) in the hook and in at least 2 more scene texts + their voiceovers.
- If "Special Offer" is None and no festival is provided: ABSOLUTELY DO NOT mention any offer, sale, discount, "limited time", "special price" or price — anywhere in hook, texts, voiceover, caption or cta. Instead the hook and scene 1 should promote the products/services and experience.
- If only a festival is provided (no offer): you MAY greet with the festival (e.g. "Happy Diwali at {brand}"), but DO NOT advertise any discount or sale.
- Scene 3: if an offer exists, show the offer; otherwise show the products/services highlight — never an invented offer.

CLARITY RULES (most important — the viewer must instantly understand the reel):
- Every scene must clearly identify the business: always include the business name and what the business sells/offers (business type + description, e.g. "jeans & shirts", "cafe", "sweet shop").
- Scene 1 (hook) must contain BOTH the brand name AND the offer (only if provided) or the festival occasion (only if provided) or the product line.
- Scene 4 (location scene) must show the exact location/address.
- Scene 5 (CTA) must repeat brand name + location.
- Repeat the brand name in every scene's text overlay.
- Never leave the text overlay generic (no "Big Sale" or "Visit us" without naming the brand, offer, location or product).
- The one exception to the no-offer rule: if this reel's business genuinely runs a plain "special offer" and the user did NOT provide one, still do not invent it.
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
    shop_number,
    address,
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
  const shopNo = String(shop_number || '').trim();
  const addr = String(address || '').trim();
  const rawOffer = String(offer || '').trim().replace(/[.]+$/, '');
  const festLabel = festLabelFor(fes);

  // --- what the business SELLS, derived from type + description ---
  const productLine = productLineFor(catLower);

  // --- concrete offer: ONLY the user's offer is used — never invented ---
  const hasOffer = !!rawOffer;
  const hasFest = !!festLabel;
  const offerLine = hasOffer ? rawOffer : '';
  // scene-3 "promise" keeps the reel alive without fabricating any offer
  const promise = hasOffer ? offerLine : (hasFest ? `${festLabel} special` : productLine);

  // --- full address line: shop number + street/area + location (city) ---
  const addrParts = [];
  if (shopNo) addrParts.push(shopNo);
  if (addr) addrParts.push(addr);
  if (loc) addrParts.push(loc);
  const fullAddr = addrParts.join(', ');
  const locLine = fullAddr || 'hamari dukaan par';

  // --- hook headline: offer / festival / product depending on what EXISTS ---
  const festHook = hasOffer ? 'SPECIAL OFFER' : (hasFest ? `${festLabel.toUpperCase()}` : `${productLine.toUpperCase()}`);

  // --- reel style shapes hook energy + tone ---
  const STYLE_TONE = {
    Luxury: { hookTail: 'IN STYLE', energy: 'Elegant aur first-class', vibe: 'Premium feeling, top quality' },
    Premium: { hookTail: 'PREMIUM PICK', energy: 'Refined aur polished', vibe: 'Quality jo har cheez ko best banaye' },
    Funny: { hookTail: 'NO JOKING!', energy: 'Full masti ke saath', vibe: 'Haso, aur deal le jao' },
    Minimal: { hookTail: 'SIMPLE. CLEAR. BEST.', energy: 'Clean aur direct', vibe: 'Seedha dil se best deal' },
    Promotional: { hookTail: 'GRAB IT NOW', energy: 'Zabardast offers ke saath', vibe: 'Action time — dekhte hi chalo' },
    Festive: { hookTail: 'FULL FESTIVAL', energy: 'Tyohaar ka josh', vibe: 'Rang, raunak aur offers sab kuch' },
    Viral: { hookTail: 'TOO GOOD!', energy: 'Full dhamaka', vibe: 'Trending, winding, catchy' },
  };
  const tone = STYLE_TONE[style] || STYLE_TONE.Viral;

  // --- main goal shapes the final call-to-action ---
  const GOAL_CTA = {
    'Get More Customers': hindi ? 'Aaj hi aaiye aur khud dekh lijiye' : 'Visit today and see for yourself',
    'Promote Offer': hindi ? 'Offer pakdo — aaj hi store pe aaiye' : 'Grab the offer — walk in today',
    'Launch Product': hindi ? 'Naya collection live hai — pehle aaiye' : 'Brand new line is live — be first',
    'Brand Awareness': hindi ? `${brand} ko yaad rakhiye — yahi hai dekhne wali jagah` : `Remember ${brand} — the place to be`,
    'Increase Engagement': hindi ? 'Like, comment aur share karo — sab ko batao' : 'Like, comment and share this deal',
  };
  const goalCTA = GOAL_CTA[goal] || GOAL_CTA['Get More Customers'];

  // --- voiceover lines (offer spoken ONLY when the user gave one) ---
  const vo = (hindi ? [
    `${hasFest ? `Haan, ${festLabel} ka mauka aa gaya! ` : hasOffer ? 'Rukna mat, deal aa gayi! ' : 'Kaun hai yahan ka number one? '}${hasOffer ? `${offerLine} — sirf ${brand} par` : `${brand} — ${productLine} ka best collection`}.`,
    `${brand} mein ${productLine} — ${tone.energy}! ${tone.vibe}.`,
    hasOffer ? `${offerLine}. ${hasFest ? 'Tyohaar ka maza ab double! ' : 'Budget mein hi full maza! '}Time limited hai — jaldi chalo!` : `${productLine} mein best quality — ${tone.vibe}. ${fullAddr ? 'Aankh bhar ke dekhne zaroor aaiye.' : 'Dekhne zaroor aaiye.'}`,
    fullAddr ? `Store chale jao — ${fullAddr}. ${brand} yahin hai, aur GPS pe naam search karo — pahunchna easy hai!` : `Store chale jao — ${brand} yahin hai!`,
    `Ek last reminder! ${hasOffer ? offerLine + '. ' : ''}${goalCTA}. ${fullAddr ? `Address: ${fullAddr} — ${brand}!` : `${brand}!`}`,
  ] : [
    `${hasFest ? `Hey, it's ${festLabel} time! ` : hasOffer ? 'Wait, the deal is here! ' : 'Stop scrolling — this place is special! '}${hasOffer ? `${offerLine} on ${productLine} — only at ${brand}.` : `The best ${productLine} — only at ${brand}.`}`,
    `${brand} serves up the finest ${productLine} — ${tone.energy.toLowerCase()} and totally on-point.`,
    hasOffer ? `${offerLine}! ${hasFest ? 'Make this festive season special. ' : 'Big on value, easy on budget. '}Limited time — hurry before it is gone!` : `Quality ${productLine}, done right — ${tone.vibe}. ${fullAddr ? 'Come see it for yourself.' : 'Come see it for yourself.'}`,
    fullAddr ? `Head over to ${fullAddr}. ${brand} is right here — punch the name in your GPS and you are minutes away!` : `Head over to the store — ${brand} is right here!`,
    `One last reminder! ${hasOffer ? offerLine + '. ' : ''}${goalCTA}. ${fullAddr ? `Find us at ${fullAddr}. Visit ${brand} today!` : `Visit ${brand} today!`}`,
  ]);

  const texts = (hindi ? [
    `${festHook} @ ${brand.toUpperCase()}`,
    `${productLine.toUpperCase()}!!`,
    hasOffer ? `${offerLine.toUpperCase()}` : (hasFest ? `${festLabel.toUpperCase()} SPECIAL` : `${productLine.toUpperCase()} @ ${brand.toUpperCase()}`),
    fullAddr ? `${fullAddr.toUpperCase()} — ${brand.toUpperCase()}` : `${brand.toUpperCase()} — YAHIN HAI`,
    hasOffer ? `${offerLine.toUpperCase()}! ${fullAddr ? fullAddr.toUpperCase() + ' — ' : ''}${goalCTA.toUpperCase()} @ ${brand.toUpperCase()}` : `${goalCTA.toUpperCase()} — ${fullAddr ? fullAddr.toUpperCase() + ' — ' : ''}${brand.toUpperCase()}`,
  ] : [
    `${festHook} @ ${brand.toUpperCase()}`,
    `${productLine.toUpperCase()}!!`,
    hasOffer ? `${offerLine.toUpperCase()}` : (hasFest ? `${festLabel.toUpperCase()} SPECIAL` : `${productLine.toUpperCase()} @ ${brand.toUpperCase()}`),
    fullAddr ? `${fullAddr.toUpperCase()} — ${brand.toUpperCase()}` : `${brand.toUpperCase()}'S HERE`,
    hasOffer ? `${offerLine.toUpperCase()}! ${goalCTA.toUpperCase()} — FIND US: ${fullAddr.toUpperCase()}` : `${goalCTA.toUpperCase()} — FIND US: ${fullAddr.toUpperCase()} @ ${brand.toUpperCase()}`,
  ]);

  const visuals = [
    hasOffer ? `${offerLine} opening in slow-mo with confetti, brand name ${brand} and the deal on screen.` : (hasFest ? `${festLabel} celebration vibe, ${brand} at the centre with ${productLine} on display.` : `Premium showcase opening: ${productLine} flying across a glowing studio, ${brand} in the spotlight.`),
    `Fast cuts showing ${productLine} flying across frame with dynamic camera moves at ${brand}.`,
    hasOffer ? `Explosive ${offerLine} reveal with sparks and countdown urgency, ${brand} logo bounces in.` : `${productLine} close-up reveal with clean studio lights, ${brand} styled card slides in.`,
    fullAddr ? `Zoom into the storefront of ${brand} with big address text on screen: ${fullAddr}.` : `Zoom into the stylish storefront of ${brand}.`,
    `Final call-to-action card: ${brand} — ${hasOffer ? offerLine + ', ' : ''}${productLine}, ${fullAddr ? 'address: ' + fullAddr : 'visit us today'}.`,
  ];

  const hook = `${festHook} @ ${brand} — ${tone.hookTail}!`;
  const caption = [
    hasOffer ? 'SPECIAL OFFER 🔥' : (hasFest ? `${festLabel.toUpperCase()} SPECIAL 🎉` : `${productLine.toUpperCase()} 🛍️`) + ` · ${style || 'Viral'} VIBE`,
    '',
    `🏬 ${brand} — ${productLine}`,
    rawOffer ? `🎁 Offer: ${rawOffer}` : '',
    `📍 ${locLine}`,
    '',
    hasOffer ? `⏰ Limited time offer — hurry before it's gone!` : (hasFest ? `✨ ${festLabel} celebrations at ${brand}!` : `✨ Come visit ${brand} today!`),
    hasOffer ? `💬 ${goalCTA}! ${hindi ? 'सबसे best deals के लिए follow करें + save करें!' : 'Follow + save for the best deals in town!'}` : `💬 ${goalCTA}! ${hindi ? 'Follow + save karna na bhoolen!' : 'Follow + save for more!'}`,
    '',
    ...buildHashtags({ brand, business_type, festival: festLabel, location: locLine, style }),
  ].filter((l) => l !== '').join('\n');

  return {
    hook,
    concept: `A ${style || 'viral'} reel for ${brand} (${business_type}) — ${hasOffer ? `offering ${offerLine}` : `showcasing ${productLine}`}, ${hasFest ? `${festLabel} themed, ` : ''}located at ${locLine}. Clear ${hasOffer ? 'offer,' : 'business,'} location and CTA.`,

    scenes: [
      { scene: 1, duration: 3, visual: visuals[0], text: texts[0], voiceover: vo[0] },
      { scene: 2, duration: 3, visual: visuals[1], text: texts[1], voiceover: vo[1] },
      { scene: 3, duration: 3, visual: visuals[2], text: texts[2], voiceover: vo[2] },
      { scene: 4, duration: 3, visual: visuals[3], text: texts[3], voiceover: vo[3] },
      { scene: 5, duration: 3, visual: visuals[4], text: texts[4], voiceover: vo[4] },
    ],
    voiceover: vo.join(' '),
    caption,
    cta: `${hasOffer ? offerLine + '. ' : ''}${locLine}. ${goalCTA}. Visit ${brand} today!`,
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
