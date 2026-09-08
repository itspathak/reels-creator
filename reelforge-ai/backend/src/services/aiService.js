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

Generate a complete Instagram Reel concept for the following business. Return ONLY valid JSON matching this exact schema â€” no extra text, no markdown fences.

{
  "hook": "string â€” a punchy 3-5 word headline that stops the scroll",
  "concept": "string â€” 1-2 sentence description of the reel concept",
  "scenes": [
    {
      "scene": 1,
      "duration": 3,
      "visual": "string â€” description of what should appear on screen",
      "text": "string â€” text overlay for this scene (keep concise)",
      "voiceover": "string â€” the voiceover narration line for this scene"
    }
  ],
  "voiceover": "string â€” complete voiceover script concatenating all scene voiceovers (natural, conversational tone)",
  "caption": "string â€” Instagram caption with line breaks and emoji",
  "cta": "string â€” a strong call-to-action",
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

OFFER RULES (strict â€” never invent offers):
- If "Special Offer" is provided: repeat that EXACT offer wording (no additions, no invented percentages/discounts) in the hook and in at least 2 more scene texts + their voiceovers.
- If "Special Offer" is None and no festival is provided: ABSOLUTELY DO NOT mention any offer, sale, discount, "limited time", "special price" or price â€” anywhere in hook, texts, voiceover, caption or cta. Instead the hook and scene 1 should promote the products/services and experience.
- If only a festival is provided (no offer): you MAY greet with the festival (e.g. "Happy Diwali at {brand}"), but DO NOT advertise any discount or sale.
- Scene 3: if an offer exists, show the offer; otherwise show the products/services highlight â€” never an invented offer.

CLARITY RULES (most important â€” the viewer must instantly understand the reel):
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
  const productLine = productLineFor(catLower, hindi);

  // --- concrete offer: ONLY the user's offer is used â€” never invented ---
  const hasOffer = !!rawOffer;
  const hasFest = !!festLabel;
  const offerLine = hasOffer ? rawOffer : '';
  // scene-3 "promise" keeps the reel alive without fabricating any offer
  const promise = hasOffer ? offerLine : (hasFest ? `${festLabel} special` : productLine);

// --- full address line: shop number + street/area + location (city) as long as not duplicated ---
  const addrParts = [];
  if (shopNo) addrParts.push(shopNo);
  if (addr) addrParts.push(addr);
  if (loc && !addr?.toLowerCase().includes(loc.toLowerCase())) addrParts.push(loc);
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
    Promotional: { hookTail: 'GRAB IT NOW', energy: 'Zabardast offers ke saath', vibe: 'Action time â€” dekhte hi chalo' },
    Festive: { hookTail: 'FULL FESTIVAL', energy: 'Tyohaar ka josh', vibe: 'Rang, raunak aur offers sab kuch' },
    Viral: { hookTail: 'TOO GOOD!', energy: 'Full dhamaka', vibe: 'Trending, winding, catchy' },
  };
  const tone = STYLE_TONE[style] || STYLE_TONE.Viral;

  // --- main goal shapes the final call-to-action ---
  const GOAL_CTA = {
    'Get More Customers': hindi ? 'Aaj hi aaiye aur khud dekh lijiye' : 'Visit today and see for yourself',
    'Promote Offer': hindi ? 'Offer pakdo â€” aaj hi store pe aaiye' : 'Grab the offer â€” walk in today',
    'Launch Product': hindi ? 'Naya collection live hai â€” pehle aaiye' : 'Brand new line is live â€” be first',
    'Brand Awareness': hindi ? `${brand} ko yaad rakhiye â€” yahi hai dekhne wali jagah` : `Remember ${brand} â€” the place to be`,
    'Increase Engagement': hindi ? 'Like, comment aur share karo â€” sab ko batao' : 'Like, comment and share this deal',
  };
  const goalCTA = GOAL_CTA[goal] || GOAL_CTA['Get More Customers'];

  // --- voiceover lines (offer spoken ONLY when the user gave one) ---
  const vo = (hindi ? [
    `${hasFest ? `Haan, ${festLabel} ka mauka aa gaya! ` : hasOffer ? 'Rukna mat, deal aa gayi! ' : 'Kaun hai yahan ka number one? '}${hasOffer ? `${offerLine} â€” sirf ${brand} par` : `${brand} â€” ${productLine} ka best collection`}.`,
    `${brand} mein ${productLine} â€” ${tone.energy}! ${tone.vibe}.`,
    hasOffer ? `${offerLine}. ${hasFest ? 'Tyohaar ka maza ab double! ' : 'Budget mein hi full maza! '}Time limited hai â€” jaldi chalo!` : `${productLine} mein best quality â€” ${tone.vibe}. ${fullAddr ? 'Aankh bhar ke dekhne zaroor aaiye.' : 'Dekhne zaroor aaiye.'}`,
    fullAddr ? `Store chale jao â€” ${fullAddr}. ${brand} yahin hai, aur GPS pe naam search karo â€” pahunchna easy hai!` : `Store chale jao â€” ${brand} yahin hai!`,
    `Ek last reminder! ${hasOffer ? offerLine + '. ' : ''}${goalCTA}. ${fullAddr ? `Address: ${fullAddr} â€” ${brand}!` : `${brand}!`}`,
  ] : [
    `${hasFest ? `Hey, it's ${festLabel} time! ` : hasOffer ? 'Wait, the deal is here! ' : 'Stop scrolling â€” this place is special! '}${hasOffer ? `${offerLine} on ${productLine} â€” only at ${brand}.` : `The best ${productLine} â€” only at ${brand}.`}`,
    `${brand} serves up the finest ${productLine} â€” ${tone.energy.toLowerCase()} and totally on-point.`,
    hasOffer ? `${offerLine}! ${hasFest ? 'Make this festive season special. ' : 'Big on value, easy on budget. '}Limited time â€” hurry before it is gone!` : `Quality ${productLine}, done right â€” ${tone.vibe}. ${fullAddr ? 'Come see it for yourself.' : 'Come see it for yourself.'}`,
    fullAddr ? `Head over to ${fullAddr}. ${brand} is right here â€” punch the name in your GPS and you are minutes away!` : `Head over to the store â€” ${brand} is right here!`,
    `One last reminder! ${hasOffer ? offerLine + '. ' : ''}${goalCTA}. ${fullAddr ? `Find us at ${fullAddr}. Visit ${brand} today!` : `Visit ${brand} today!`}`,
  ]);

  const texts = (hindi ? [
    `${festHook} @ ${brand.toUpperCase()}`,
    `${productLine.toUpperCase()}!!`,
    hasOffer ? `${offerLine.toUpperCase()}` : (hasFest ? `${festLabel.toUpperCase()} SPECIAL` : `${productLine.toUpperCase()} @ ${brand.toUpperCase()}`),
    fullAddr ? `${fullAddr.toUpperCase()} â€” ${brand.toUpperCase()}` : `${brand.toUpperCase()} â€” YAHIN HAI`,
    hasOffer ? `${offerLine.toUpperCase()}! ${fullAddr ? fullAddr.toUpperCase() + ' â€” ' : ''}${goalCTA.toUpperCase()} @ ${brand.toUpperCase()}` : `${goalCTA.toUpperCase()} â€” ${fullAddr ? fullAddr.toUpperCase() + ' â€” ' : ''}${brand.toUpperCase()}`,
  ] : [
    `${festHook} @ ${brand.toUpperCase()}`,
    `${productLine.toUpperCase()}!!`,
    hasOffer ? `${offerLine.toUpperCase()}` : (hasFest ? `${festLabel.toUpperCase()} SPECIAL` : `${productLine.toUpperCase()} @ ${brand.toUpperCase()}`),
    fullAddr ? `${fullAddr.toUpperCase()} â€” ${brand.toUpperCase()}` : `${brand.toUpperCase()}'S HERE`,
    hasOffer ? `${offerLine.toUpperCase()}! ${goalCTA.toUpperCase()} â€” FIND US: ${fullAddr.toUpperCase()}` : `${goalCTA.toUpperCase()} â€” FIND US: ${fullAddr.toUpperCase()} @ ${brand.toUpperCase()}`,
  ]);

  const visuals = [
    hasOffer ? `${offerLine} opening in slow-mo with confetti, brand name ${brand} and the deal on screen.` : (hasFest ? `${festLabel} celebration vibe, ${brand} at the centre with ${productLine} on display.` : `Premium showcase opening: ${productLine} flying across a glowing studio, ${brand} in the spotlight.`),
    `Fast cuts showing ${productLine} flying across frame with dynamic camera moves at ${brand}.`,
    hasOffer ? `Explosive ${offerLine} reveal with sparks and countdown urgency, ${brand} logo bounces in.` : `${productLine} close-up reveal with clean studio lights, ${brand} styled card slides in.`,
    fullAddr ? `Zoom into the storefront of ${brand} with big address text on screen: ${fullAddr}.` : `Zoom into the stylish storefront of ${brand}.`,
    `Final call-to-action card: ${brand} â€” ${hasOffer ? offerLine + ', ' : ''}${productLine}, ${fullAddr ? 'address: ' + fullAddr : 'visit us today'}.`,
  ];

  const hook = `${festHook} @ ${brand} â€” ${tone.hookTail}!`;
  const caption = [
    hasOffer ? 'SPECIAL OFFER ðŸ”¥' : (hasFest ? `${festLabel.toUpperCase()} SPECIAL ðŸŽ‰` : `${productLine.toUpperCase()} ðŸ›ï¸`) + ` Â· ${style || 'Viral'} VIBE`,
    '',
    `ðŸ¬ ${brand} â€” ${productLine}`,
    rawOffer ? `ðŸŽ Offer: ${rawOffer}` : '',
    `ðŸ“ ${locLine}`,
    '',
    hasOffer ? `â° Limited time offer â€” hurry before it's gone!` : (hasFest ? `âœ¨ ${festLabel} celebrations at ${brand}!` : `âœ¨ Come visit ${brand} today!`),
    hasOffer ? `ðŸ’¬ ${goalCTA}! ${hindi ? 'à¤¸à¤¬à¤¸à¥‡ best deals à¤•à¥‡ à¤²à¤¿à¤ follow à¤•à¤°à¥‡à¤‚ + save à¤•à¤°à¥‡à¤‚!' : 'Follow + save for the best deals in town!'}` : `ðŸ’¬ ${goalCTA}! ${hindi ? 'Follow + save karna na bhoolen!' : 'Follow + save for more!'}`,
    '',
    ...buildHashtags({ brand, business_type, festival: festLabel, location: locLine, style, hasOffer }),
  ].filter((l) => l !== '').join('\n');

  return {
    hook,
    concept: `A ${style || 'viral'} reel for ${brand} (${business_type}) â€” ${hasOffer ? `offering ${offerLine}` : `showcasing ${productLine}`}, ${hasFest ? `${festLabel} themed, ` : ''}located at ${locLine}. Clear ${hasOffer ? 'offer,' : 'business,'} location and CTA.`,

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
    hashtags: buildHashtags({ brand, business_type, festival: festLabel, location: loc, style, hasOffer }),
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

function hayHas(hay, kw) {
  if (kw.length < 5) {
    const r = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return r.test(hay);
  }
  return hay.includes(kw.toLowerCase());
}

function productLineFor(catLower, hindi) {
  const RULES = [
    [['jeans', 'denim', 'cloth', 'garment', 'outlet', 'wear', 'shirt', 'kurta', 'saree', 'fashion', 'boutique', 'stitch', 'lehenga', 'trouser', 'dupatta', 't-shirt', 'tshirt', 'kurti'], 'fashion wear & styling', 'jeans, shirts, kurtas aur kurtis'],
    [['restaurant', 'cafe', 'hotel', 'food', 'dhaba', 'thali', 'kitchen', 'chef', 'pizza', 'burger', 'bakery', 'biryani', 'cater', 'snack', 'chai', 'coffee', 'juice'], 'food & signature dishes', 'khaas thalis aur signature dishes'],
    [['sweet', 'mithai', 'cake', 'chocolate', 'ice cream', 'namkeen'], 'fresh sweets & bakery treats', 'fresh mithai aur bakery treats'],
    [['gym', 'fitness', 'yoga', 'workout', 'health club', 'zumba', 'trainer'], 'premium fitness plans & workout gear', 'premium fitness plans aur workout gear'],
    [['beauty', 'salon', 'spa', 'skin', 'parlour', 'facial', 'massage', 'makeup', 'mehndi', 'mehendi', 'nail art', 'wax', 'threading', 'haircut'], 'glow-up makeovers & skin care', 'glow-up makeovers aur skin care'],
    [['jewellery', 'jewelry', 'gold', 'kundan', 'ornament', 'silver', 'chain', 'bangle', 'earring', 'necklace', 'ring'], 'shining jewellery collections', 'shining jewellery collections'],
    [['car', 'bike', 'automobile', 'auto', 'servicing', 'tyre', 'showroom', 'garage', 'spare', 'workshop', 'wheel', 'wash', 'oil', 'mechanic'], 'top-class car & bike servicing', 'car aur bike servicing'],
    [['mobile', 'phone', 'electronics', 'laptop', 'gadget', 'tv', 'led', 'computer', 'accessories', 'camera', 'speaker', 'appliance', 'repair'], 'latest gadgets & electronics', 'latest gadgets aur electronics'],
    [['flower', 'florist', 'bouquet', 'plant', 'nursery', 'gardening'], 'fresh flowers & plants', 'fresh flowers aur plants'],
    [['photograph', 'photo', 'videography', 'studio', 'wedding shoot', 'video shoot'], 'professional photography & videography', 'professional photography aur videography'],
    [['estate', 'property', 'flat', 'builder', 'villa', 'plot', 'construction', 'architecture', 'interior'], 'premium homes & property options', 'premium homes aur property options'],
    [['travel', 'tour', 'resort', 'booking', 'holiday', 'taxi', 'carnival'], 'unforgettable travel packages', 'unforgettable travel packages'],
    [['gift', 'decor', 'home', 'furniture', 'lamp', 'lighting'], 'stylish decor & gift ideas', 'stylish decor aur gift ideas'],
    [['grocery', 'supermarket', 'kirana', 'fresh mart'], 'fresh groceries & daily essentials', 'fresh groceries aur daily essentials'],
    [['stationery', 'books', 'school', 'office'], 'stationery & office essentials', 'stationery aur office essentials'],
    [['pharmacy', 'medical', 'ayurved', 'medicine', 'clinic', 'doctor'], 'trusted health & wellness products', 'trusted health aur wellness products'],
  ];
  for (const [kws, en, hi] of RULES) {
    if (kws.some((kw) => hayHas(catLower, kw))) return hindi ? hi : en;
  }
  return hindi ? 'premium quality products' : 'premium quality products';
}

function buildHashtags({ brand, business_type, festival, location, style, hasOffer }) {
  const tags = new Set();
  const add = (t) => {
    const clean = String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean && clean !== 'null') tags.add(clean);
  };
  add(brand);
  add(business_type);
  if (festival) add(festival);
  if (festival) add(`${festival}special`);
  if (hasOffer) add('offers');
  if (hasOffer) add('bestdeals');
  add(location ? String(location).split(/[\s,]+/)[0] : '');
  add(style);
  add('reels');
  add('viralreels');
  add('instareels');
  add('smallbusiness');
  add('supportlocal');
  ['reelitfeelit', 'explorepage', 'trendingreels', 'shopping', 'localshop'].forEach(add);
  return [...tags].slice(0, 15);
}

module.exports = { generateReelConcept };

