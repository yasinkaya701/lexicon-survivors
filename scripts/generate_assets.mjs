import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const OUTPUT_DIR = path.resolve('public/assets');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 26 High-Resolution Digital/Vector SVG Definitions
 * All SVGs are 512x512 with transparent background (no background fill)
 * Thick dark outlines (8-16px), vibrant cel-shaded gradients, radiant highlights
 */
const ASSETS = {
  // 1. Potato Scholar
  player_potato_scholar: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="potatoGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#fef3c7"/>
      <stop offset="45%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </radialGradient>
    <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#312e81"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b91c1c"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Potato Scholar Body -->
  <path d="M 256 90 C 370 90 410 180 410 300 C 410 420 350 460 256 460 C 160 460 102 420 102 300 C 102 180 140 90 256 90 Z"
        fill="url(#potatoGrad)" stroke="#451a03" stroke-width="14" stroke-linejoin="round"/>

  <!-- Body Highlights (Cel-shading) -->
  <path d="M 170 140 C 230 110 320 120 350 160 C 310 140 220 140 170 180 Z" fill="#ffffff" opacity="0.45"/>
  <ellipse cx="160" cy="270" rx="28" ry="14" fill="#fca5a5" opacity="0.6"/>
  <ellipse cx="352" cy="270" rx="28" ry="14" fill="#fca5a5" opacity="0.6"/>

  <!-- Large Reading Glasses -->
  <!-- Left Lens -->
  <circle cx="195" cy="225" r="46" fill="#e0f2fe" opacity="0.85" stroke="#0f172a" stroke-width="12"/>
  <path d="M 175 195 A 35 35 0 0 1 225 205" stroke="#ffffff" stroke-width="7" stroke-linecap="round" fill="none"/>
  <!-- Right Lens -->
  <circle cx="317" cy="225" r="46" fill="#e0f2fe" opacity="0.85" stroke="#0f172a" stroke-width="12"/>
  <path d="M 297 195 A 35 35 0 0 1 347 205" stroke="#ffffff" stroke-width="7" stroke-linecap="round" fill="none"/>
  <!-- Bridge -->
  <path d="M 241 220 Q 256 210 271 220" stroke="#0f172a" stroke-width="12" stroke-linecap="round" fill="none"/>

  <!-- Pupil Eyes -->
  <circle cx="205" cy="225" r="18" fill="#0f172a"/>
  <circle cx="200" cy="220" r="6" fill="#ffffff"/>
  <circle cx="327" cy="225" r="18" fill="#0f172a"/>
  <circle cx="322" cy="220" r="6" fill="#ffffff"/>

  <!-- Cheerful Mouth -->
  <path d="M 232 290 Q 256 320 280 290" stroke="#451a03" stroke-width="9" stroke-linecap="round" fill="#b91c1c"/>

  <!-- Open Academic Book in Hands -->
  <g transform="translate(166, 340)">
    <path d="M 10 30 Q 90 10 90 70 Q 10 50 10 30 Z" fill="#fef3c7" stroke="#451a03" stroke-width="8"/>
    <path d="M 170 30 Q 90 10 90 70 Q 170 50 170 30 Z" fill="#fef3c7" stroke="#451a03" stroke-width="8"/>
    <path d="M 0 32 L 90 75 L 180 32 L 180 40 L 90 85 L 0 40 Z" fill="url(#bookGrad)" stroke="#451a03" stroke-width="8"/>
    <path d="M 90 70 L 90 100" stroke="#fbbf24" stroke-width="6" stroke-linecap="round"/>
    <!-- Hands holding book -->
    <circle cx="10" cy="45" r="18" fill="#f59e0b" stroke="#451a03" stroke-width="7"/>
    <circle cx="170" cy="45" r="18" fill="#f59e0b" stroke="#451a03" stroke-width="7"/>
  </g>

  <!-- Scholar Mortarboard Cap -->
  <g transform="translate(256, 95)">
    <!-- Skull Cap base -->
    <path d="M -70 10 Q 0 -5 70 10 L 60 45 Q 0 35 -60 45 Z" fill="#1e1b4b" stroke="#0f172a" stroke-width="10"/>
    <!-- Diamond Top -->
    <polygon points="0,-48 160,-2 0,44 -160,-2" fill="url(#capGrad)" stroke="#0f172a" stroke-width="12" stroke-linejoin="round"/>
    <polygon points="0,-42 145,-2 0,38 -145,-2" fill="#4338ca" opacity="0.35"/>
    <!-- Button -->
    <circle cx="0" cy="-2" r="10" fill="#fbbf24" stroke="#78350f" stroke-width="4"/>
    <!-- Golden Tassel -->
    <path d="M 0 -2 Q 90 5 110 50" stroke="#fbbf24" stroke-width="6" fill="none" stroke-linecap="round"/>
    <polygon points="104,46 116,50 112,85 100,85" fill="#f59e0b" stroke="#78350f" stroke-width="4"/>
  </g>
</svg>`,

  // 2. BUEPT Student
  player_buept_student: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bueptGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#fed7aa"/>
      <stop offset="50%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#c2410c"/>
    </radialGradient>
    <linearGradient id="hoodieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="60%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
  </defs>

  <!-- Potato Base Body -->
  <path d="M 256 80 C 370 80 410 170 410 290 C 410 420 350 460 256 460 C 160 460 102 420 102 290 C 102 170 140 80 256 80 Z"
        fill="url(#bueptGrad)" stroke="#7c2d12" stroke-width="14" stroke-linejoin="round"/>

  <!-- Royal Blue Boğaziçi Hoodie -->
  <path d="M 115 280 C 120 440 392 440 397 280 C 400 370 380 460 256 460 C 132 460 112 370 115 280 Z"
        fill="url(#hoodieGrad)" stroke="#0f172a" stroke-width="14"/>
  <path d="M 220 340 L 256 410 L 292 340" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <!-- White drawstrings -->
  <path d="M 235 340 L 230 400" stroke="#f8fafc" stroke-width="5" stroke-linecap="round"/>
  <path d="M 277 340 L 282 400" stroke="#f8fafc" stroke-width="5" stroke-linecap="round"/>
  <!-- BUEPT Eagle Crest Emblem -->
  <circle cx="256" cy="415" r="16" fill="#fbbf24" stroke="#0f172a" stroke-width="4"/>
  <path d="M 250 415 L 256 409 L 262 415 L 256 421 Z" fill="#1e3a8a"/>

  <!-- Determined Expressive Eyes -->
  <ellipse cx="190" cy="205" rx="22" ry="26" fill="#0f172a"/>
  <circle cx="184" cy="198" r="8" fill="#ffffff"/>
  <ellipse cx="322" cy="205" rx="22" ry="26" fill="#0f172a"/>
  <circle cx="316" cy="198" r="8" fill="#ffffff"/>

  <!-- Confident Eyebrows -->
  <path d="M 160 170 Q 195 160 220 175" stroke="#7c2d12" stroke-width="9" stroke-linecap="round" fill="none"/>
  <path d="M 352 170 Q 317 160 292 175" stroke="#7c2d12" stroke-width="9" stroke-linecap="round" fill="none"/>

  <!-- Energetic Grin -->
  <path d="M 225 255 Q 256 280 287 255" stroke="#7c2d12" stroke-width="8" stroke-linecap="round" fill="#991b1b"/>

  <!-- Cyberpunk Campus DJ Headphones -->
  <path d="M 120 220 C 120 100 392 100 392 220" stroke="#0f172a" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M 140 200 C 140 120 372 120 372 200" stroke="#06b6d4" stroke-width="6" fill="none" stroke-linecap="round"/>
  <!-- Left Ear Cup -->
  <rect x="90" y="180" width="46" height="80" rx="22" fill="#06b6d4" stroke="#0f172a" stroke-width="10"/>
  <rect x="96" y="194" width="34" height="52" rx="14" fill="#0891b2"/>
  <!-- Right Ear Cup -->
  <rect x="376" y="180" width="46" height="80" rx="22" fill="#06b6d4" stroke="#0f172a" stroke-width="10"/>
  <rect x="382" y="194" width="34" height="52" rx="14" fill="#0891b2"/>
</svg>`,

  // 3. Potato Engineer
  player_engineer: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="engGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#854d0e"/>
    </radialGradient>
    <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>

  <!-- Potato Body -->
  <path d="M 256 100 C 370 100 410 180 410 300 C 410 420 350 460 256 460 C 160 460 102 420 102 300 C 102 180 140 100 256 100 Z"
        fill="url(#engGrad)" stroke="#451a03" stroke-width="14" stroke-linejoin="round"/>

  <!-- Leather Work Harness / Overalls -->
  <path d="M 125 310 C 130 450 382 450 387 310 L 370 450 C 330 465 182 465 142 450 Z"
        fill="#78350f" stroke="#0f172a" stroke-width="12"/>
  <!-- Tool Belt Pockets -->
  <rect x="180" y="370" width="60" height="50" rx="8" fill="#451a03" stroke="#0f172a" stroke-width="6"/>
  <rect x="272" y="370" width="60" height="50" rx="8" fill="#451a03" stroke="#0f172a" stroke-width="6"/>
  <line x1="200" y1="355" x2="200" y2="390" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"/>
  <line x1="312" y1="355" x2="312" y2="390" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"/>

  <!-- High-Tech Neon Welding Goggles -->
  <g transform="translate(0, 10)">
    <rect x="140" y="180" width="105" height="65" rx="20" fill="#0f172a" stroke="#334155" stroke-width="8"/>
    <circle cx="192" cy="212" r="24" fill="#06b6d4" stroke="#22d3ee" stroke-width="4"/>
    <circle cx="192" cy="212" r="14" fill="#a5f3fc"/>
    <rect x="267" y="180" width="105" height="65" rx="20" fill="#0f172a" stroke="#334155" stroke-width="8"/>
    <circle cx="320" cy="212" r="24" fill="#06b6d4" stroke="#22d3ee" stroke-width="4"/>
    <circle cx="320" cy="212" r="14" fill="#a5f3fc"/>
    <!-- Goggle Strap -->
    <path d="M 140 212 L 102 212" stroke="#0f172a" stroke-width="12"/>
    <path d="M 372 212 L 410 212" stroke="#0f172a" stroke-width="12"/>
    <rect x="238" y="206" width="36" height="14" fill="#0f172a"/>
  </g>

  <!-- Technical Grin with Tooth Glint -->
  <path d="M 225 285 Q 256 310 287 285" stroke="#451a03" stroke-width="8" stroke-linecap="round" fill="#b91c1c"/>
  <rect x="245" y="285" width="12" height="10" fill="#ffffff" rx="2"/>

  <!-- Yellow Industrial Hardhat -->
  <g transform="translate(256, 100)">
    <!-- Helmet Dome -->
    <path d="M -150 25 C -150 -70 150 -70 150 25 L 170 35 L -170 35 Z" fill="#facc15" stroke="#713f12" stroke-width="12" stroke-linejoin="round"/>
    <!-- Crest Ridge -->
    <path d="M -22 -65 C -22 -75 22 -75 22 -65 L 25 25 L -25 25 Z" fill="#eab308" stroke="#713f12" stroke-width="6"/>
    <!-- Reflective Silver Stripe -->
    <rect x="-135" y="5" width="270" height="14" fill="#f8fafc" opacity="0.9" rx="4"/>
  </g>
</svg>`,

  // 4. Mutant Tank Potato
  player_tank_mutant: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="tankBodyGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#84cc16"/>
      <stop offset="50%" stop-color="#4d7c0f"/>
      <stop offset="100%" stop-color="#14532d"/>
    </radialGradient>
    <linearGradient id="ironPlate" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="50%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>

  <!-- Massive Armored Mutant Body -->
  <path d="M 256 70 C 400 70 440 160 440 300 C 440 430 380 470 256 470 C 132 470 72 430 72 300 C 72 160 112 70 256 70 Z"
        fill="url(#tankBodyGrad)" stroke="#052e16" stroke-width="16" stroke-linejoin="round"/>

  <!-- Spiked Iron Shoulder Armor Pads -->
  <!-- Left Pauldron -->
  <g transform="translate(60, 180)">
    <polygon points="10,-20 80,-40 90,50 0,60" fill="url(#ironPlate)" stroke="#020617" stroke-width="10"/>
    <polygon points="10,-20 20,-70 50,-35" fill="#e2e8f0" stroke="#020617" stroke-width="6"/>
    <circle cx="45" cy="15" r="8" fill="#e2e8f0" stroke="#020617" stroke-width="4"/>
  </g>
  <!-- Right Pauldron -->
  <g transform="translate(362, 180)">
    <polygon points="10,-40 80,-20 90,60 0,50" fill="url(#ironPlate)" stroke="#020617" stroke-width="10"/>
    <polygon points="70,-20 60,-70 30,-35" fill="#e2e8f0" stroke="#020617" stroke-width="6"/>
    <circle cx="45" cy="15" r="8" fill="#e2e8f0" stroke="#020617" stroke-width="4"/>
  </g>

  <!-- Glowing Bio-luminescent Veins -->
  <path d="M 170 280 Q 210 320 200 400" stroke="#a3e635" stroke-width="8" stroke-linecap="round" fill="none"/>
  <path d="M 342 280 Q 302 320 312 400" stroke="#a3e635" stroke-width="8" stroke-linecap="round" fill="none"/>
  <path d="M 256 310 L 256 420" stroke="#a3e635" stroke-width="6" stroke-linecap="round"/>

  <!-- Heavy Steel Chestplate Slab -->
  <polygon points="180,290 332,290 312,430 200,430" fill="url(#ironPlate)" stroke="#020617" stroke-width="12"/>
  <circle cx="210" cy="315" r="6" fill="#94a3b8"/>
  <circle cx="302" cy="315" r="6" fill="#94a3b8"/>
  <circle cx="220" cy="410" r="6" fill="#94a3b8"/>
  <circle cx="292" cy="410" r="6" fill="#94a3b8"/>

  <!-- Menacing Red Glowing Cybernetic Visor -->
  <polygon points="170,180 342,180 322,230 190,230" fill="#0f172a" stroke="#020617" stroke-width="10"/>
  <rect x="195" y="195" width="122" height="20" rx="6" fill="#ef4444" stroke="#f87171" stroke-width="4"/>
  <rect x="235" y="199" width="42" height="12" rx="3" fill="#ffffff"/>

  <!-- Heavy Respirator Steel Grille -->
  <polygon points="215,245 297,245 285,285 227,285" fill="#334155" stroke="#020617" stroke-width="8"/>
  <line x1="235" y1="250" x2="235" y2="280" stroke="#0f172a" stroke-width="5"/>
  <line x1="256" y1="250" x2="256" y2="280" stroke="#0f172a" stroke-width="5"/>
  <line x1="277" y1="250" x2="277" y2="280" stroke="#0f172a" stroke-width="5"/>
</svg>`,

  // 5. Enemy Swarmer
  enemy_swarmer: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="swarmerGrad" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#fdba74"/>
      <stop offset="50%" stop-color="#ea580c"/>
      <stop offset="100%" stop-color="#7c2d12"/>
    </radialGradient>
    <linearGradient id="wingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a5f3fc" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.4"/>
    </linearGradient>
  </defs>

  <!-- Glowing Translucent Insectoid Wings -->
  <!-- Left Upper Wing -->
  <path d="M 220 220 C 140 100 40 110 30 180 C 20 240 130 270 220 230 Z" fill="url(#wingGrad)" stroke="#0891b2" stroke-width="8"/>
  <path d="M 60 160 C 120 180 180 200 220 225" stroke="#ffffff" stroke-width="5" opacity="0.8"/>
  <!-- Right Upper Wing -->
  <path d="M 292 220 C 372 100 472 110 482 180 C 492 240 382 270 292 230 Z" fill="url(#wingGrad)" stroke="#0891b2" stroke-width="8"/>
  <path d="M 452 160 C 392 180 332 200 292 225" stroke="#ffffff" stroke-width="5" opacity="0.8"/>

  <!-- Lower Left Wing -->
  <path d="M 220 260 C 140 300 80 380 120 420 C 160 450 200 360 230 280 Z" fill="url(#wingGrad)" stroke="#0891b2" stroke-width="6"/>
  <!-- Lower Right Wing -->
  <path d="M 292 260 C 372 300 432 380 392 420 C 352 450 312 360 282 280 Z" fill="url(#wingGrad)" stroke="#0891b2" stroke-width="6"/>

  <!-- Swarmer Chitin Body -->
  <ellipse cx="256" cy="270" rx="90" ry="110" fill="url(#swarmerGrad)" stroke="#431407" stroke-width="14"/>
  <!-- Segmented Plates -->
  <path d="M 180 230 Q 256 260 332 230" stroke="#431407" stroke-width="10" fill="none"/>
  <path d="M 175 285 Q 256 315 337 285" stroke="#431407" stroke-width="10" fill="none"/>
  <path d="M 185 340 Q 256 370 327 340" stroke="#431407" stroke-width="10" fill="none"/>

  <!-- Head & Mandibles -->
  <circle cx="256" cy="150" r="60" fill="#c2410c" stroke="#431407" stroke-width="12"/>
  <!-- Glowing Compound Eyes -->
  <ellipse cx="215" cy="140" rx="24" ry="32" fill="#facc15" stroke="#431407" stroke-width="8"/>
  <circle cx="215" cy="135" r="10" fill="#ffffff"/>
  <ellipse cx="297" cy="140" rx="24" ry="32" fill="#facc15" stroke="#431407" stroke-width="8"/>
  <circle cx="297" cy="135" r="10" fill="#ffffff"/>

  <!-- Sharp Mandibles -->
  <path d="M 215 185 Q 225 240 250 215" stroke="#431407" stroke-width="10" fill="#f97316"/>
  <path d="M 297 185 Q 287 240 262 215" stroke="#431407" stroke-width="10" fill="#f97316"/>

  <!-- Stinger -->
  <polygon points="256,430 240,370 272,370" fill="#facc15" stroke="#431407" stroke-width="8"/>
</svg>`,

  // 6. Enemy Rusher
  enemy_rusher: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="rusherGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#f472b6"/>
      <stop offset="50%" stop-color="#db2777"/>
      <stop offset="100%" stop-color="#831843"/>
    </radialGradient>
    <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#eab308"/>
    </linearGradient>
  </defs>

  <!-- Speed Motion Trails Behind -->
  <path d="M 70 200 L 140 220 L 70 240 Z" fill="#f43f5e" opacity="0.6"/>
  <path d="M 50 250 L 120 270 L 50 290 Z" fill="#f43f5e" opacity="0.6"/>

  <!-- Aerodynamic Rusher Hound Body -->
  <path d="M 120 260 C 140 160 260 140 380 200 C 460 240 450 320 380 340 C 260 380 140 360 120 260 Z"
        fill="url(#rusherGrad)" stroke="#500724" stroke-width="14" stroke-linejoin="round"/>

  <!-- Aerodynamic Forward Crest / Horns -->
  <polygon points="320,160 480,120 380,200" fill="url(#bladeGrad)" stroke="#500724" stroke-width="10"/>
  <polygon points="340,240 490,260 390,290" fill="url(#bladeGrad)" stroke="#500724" stroke-width="10"/>

  <!-- Glowing Yellow Speed Visor / Eyes -->
  <polygon points="310,210 400,215 360,245 290,235" fill="#facc15" stroke="#500724" stroke-width="8"/>
  <line x1="330" y1="222" x2="385" y2="225" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>

  <!-- Sharp Feral Cyber Fangs -->
  <polygon points="350,285 370,320 380,285" fill="#ffffff" stroke="#500724" stroke-width="6"/>
  <polygon points="315,290 330,325 340,290" fill="#ffffff" stroke="#500724" stroke-width="6"/>

  <!-- Barbed Cyber Spine Spikes -->
  <polygon points="180,175 195,110 225,165" fill="#f43f5e" stroke="#500724" stroke-width="8"/>
  <polygon points="240,165 260,105 285,160" fill="#f43f5e" stroke="#500724" stroke-width="8"/>
  <polygon points="135,210 140,150 170,200" fill="#f43f5e" stroke="#500724" stroke-width="8"/>
</svg>`,

  // 7. Enemy Tank (Titan Golem)
  enemy_tank: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="golemGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="50%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </radialGradient>
    <linearGradient id="magmaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="30%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
  </defs>

  <!-- Heavy Basalt Golem Body -->
  <polygon points="256,60 410,140 440,350 330,460 182,460 72,350 102,140"
           fill="url(#golemGrad)" stroke="#020617" stroke-width="16" stroke-linejoin="round"/>

  <!-- Heavy Iron Edge Plates -->
  <polygon points="256,80 390,150 320,170 256,120 192,170 122,150" fill="#334155" stroke="#020617" stroke-width="10"/>

  <!-- Molten Magma Fissures (Glowing Cracks) -->
  <path d="M 160 180 L 210 240 L 180 320 L 230 380" stroke="url(#magmaGrad)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M 352 180 L 302 240 L 332 320 L 282 380" stroke="url(#magmaGrad)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M 256 180 L 256 310" stroke="url(#magmaGrad)" stroke-width="12" stroke-linecap="round"/>

  <!-- Monolithic Glowing Molten Core Eye -->
  <polygon points="215,220 297,220 276,270 236,270" fill="#020617" stroke="#334155" stroke-width="8"/>
  <rect x="230" y="235" width="52" height="18" rx="4" fill="#ef4444" stroke="#fef08a" stroke-width="4"/>
  <circle cx="256" cy="244" r="6" fill="#ffffff"/>

  <!-- Massive Reinforced Boulders / Shoulders -->
  <rect x="60" y="210" width="60" height="90" rx="14" fill="#334155" stroke="#020617" stroke-width="10"/>
  <rect x="392" y="210" width="60" height="90" rx="14" fill="#334155" stroke="#020617" stroke-width="10"/>
</svg>`,

  // 8. Enemy Ranged Shooter (Bio-Drone Spitter)
  enemy_ranged_shooter: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="acidSacGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#bef264"/>
      <stop offset="50%" stop-color="#65a30d"/>
      <stop offset="100%" stop-color="#365314"/>
    </radialGradient>
    <radialGradient id="droneCore" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#67e8f9"/>
      <stop offset="60%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#082f49"/>
    </radialGradient>
  </defs>

  <!-- Stabilizer Tentacles Beneath -->
  <path d="M 180 320 Q 150 420 110 460" stroke="#064e3b" stroke-width="16" stroke-linecap="round" fill="none"/>
  <path d="M 256 340 Q 256 430 256 470" stroke="#064e3b" stroke-width="18" stroke-linecap="round" fill="none"/>
  <path d="M 332 320 Q 362 420 402 460" stroke="#064e3b" stroke-width="16" stroke-linecap="round" fill="none"/>

  <!-- Bulbous Glowing Acid Reservoir Sac -->
  <ellipse cx="256" cy="180" rx="140" ry="110" fill="url(#acidSacGrad)" stroke="#064e3b" stroke-width="16"/>
  <!-- Bubbles inside sac -->
  <circle cx="210" cy="150" r="22" fill="#d9f99d" opacity="0.8"/>
  <circle cx="280" cy="140" r="16" fill="#d9f99d" opacity="0.8"/>
  <circle cx="240" cy="190" r="28" fill="#d9f99d" opacity="0.7"/>

  <!-- Armored Bio-Cannon Muzzle Head -->
  <rect x="186" y="230" width="140" height="90" rx="24" fill="#0f172a" stroke="#022c22" stroke-width="12"/>
  <!-- Cyclopean Targeting Eye / Laser Aperture -->
  <circle cx="256" cy="275" r="30" fill="#dc2626" stroke="#f87171" stroke-width="8"/>
  <circle cx="256" cy="275" r="14" fill="#fef08a"/>
  <circle cx="256" cy="275" r="5" fill="#ffffff"/>

  <!-- Bio-Spikes -->
  <polygon points="120,130 90,70 150,110" fill="#84cc16" stroke="#064e3b" stroke-width="8"/>
  <polygon points="392,130 422,70 362,110" fill="#84cc16" stroke="#064e3b" stroke-width="8"/>
</svg>`,

  // 9. Enemy Elite Boss (Archon Void Terror)
  enemy_elite_boss: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="voidGrad" cx="40%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#c084fc"/>
      <stop offset="45%" stop-color="#7e22ce"/>
      <stop offset="100%" stop-color="#3b0764"/>
    </radialGradient>
    <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#a16207"/>
    </linearGradient>
  </defs>

  <!-- Pulsing Void Aura Fins -->
  <polygon points="100,240 20,180 80,310" fill="#a855f7" opacity="0.7" stroke="#3b0764" stroke-width="8"/>
  <polygon points="412,240 492,180 432,310" fill="#a855f7" opacity="0.7" stroke="#3b0764" stroke-width="8"/>

  <!-- Colossal Void Overlord Body -->
  <path d="M 256 80 C 400 80 450 180 440 330 C 430 450 360 480 256 480 C 152 480 82 450 72 330 C 62 180 112 80 256 80 Z"
        fill="url(#voidGrad)" stroke="#1e1b4b" stroke-width="16" stroke-linejoin="round"/>

  <!-- Ornate Golden Demonic Crown -->
  <g transform="translate(256, 110)">
    <polygon points="-150,20 -120,-80 -60,-20 0,-110 60,-20 120,-80 150,20"
             fill="url(#crownGrad)" stroke="#451a03" stroke-width="12" stroke-linejoin="round"/>
    <circle cx="0" cy="-30" r="14" fill="#dc2626" stroke="#451a03" stroke-width="5"/>
    <circle cx="-75" cy="0" r="10" fill="#38bdf8" stroke="#451a03" stroke-width="4"/>
    <circle cx="75" cy="0" r="10" fill="#38bdf8" stroke="#451a03" stroke-width="4"/>
  </g>

  <!-- Menacing Triple Demon Eyes -->
  <polygon points="160,240 230,250 200,285" fill="#facc15" stroke="#1e1b4b" stroke-width="8"/>
  <circle cx="195" cy="255" r="8" fill="#dc2626"/>
  <polygon points="352,240 282,250 312,285" fill="#facc15" stroke="#1e1b4b" stroke-width="8"/>
  <circle cx="317" cy="255" r="8" fill="#dc2626"/>
  <!-- Central Crown Eye -->
  <ellipse cx="256" cy="210" rx="28" ry="18" fill="#facc15" stroke="#1e1b4b" stroke-width="8"/>
  <circle cx="256" cy="210" r="8" fill="#dc2626"/>

  <!-- Void Rune Core Portal -->
  <circle cx="256" cy="370" r="44" fill="#09090b" stroke="#f43f5e" stroke-width="10"/>
  <polygon points="256,335 285,385 227,385" fill="#f43f5e"/>
  <circle cx="256" cy="370" r="12" fill="#ffffff"/>
</svg>`,

  // 10. Weapon: Pistol
  weapon_pistol: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="slideGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="50%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="gripGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>

  <!-- Pistol Body & Grip -->
  <g transform="translate(60, 110)">
    <!-- Lower Grip Frame -->
    <path d="M 120 150 L 170 330 C 175 350 145 365 110 355 L 70 230 L 70 150 Z"
          fill="url(#gripGrad)" stroke="#020617" stroke-width="14" stroke-linejoin="round"/>
    <!-- Grip Texture Ribs -->
    <line x1="90" y1="210" x2="135" y2="300" stroke="#475569" stroke-width="6"/>
    <line x1="105" y1="200" x2="150" y2="290" stroke="#475569" stroke-width="6"/>

    <!-- Trigger & Guard -->
    <path d="M 120 190 C 160 190 160 250 120 250" stroke="#020617" stroke-width="10" fill="none"/>
    <path d="M 135 205 Q 145 225 125 235" stroke="#94a3b8" stroke-width="8" stroke-linecap="round" fill="none"/>

    <!-- Steel Slide Upper Receiver -->
    <rect x="40" y="80" width="310" height="85" rx="14" fill="url(#slideGrad)" stroke="#020617" stroke-width="14"/>
    <!-- Front Muzzle Extension -->
    <rect x="350" y="100" width="30" height="50" rx="6" fill="#1e293b" stroke="#020617" stroke-width="10"/>

    <!-- Slide Cocking Serrations -->
    <line x1="65" y1="95" x2="65" y2="150" stroke="#1e293b" stroke-width="8"/>
    <line x1="85" y1="95" x2="85" y2="150" stroke="#1e293b" stroke-width="8"/>
    <line x1="105" y1="95" x2="105" y2="150" stroke="#1e293b" stroke-width="8"/>

    <!-- Ejection Port -->
    <rect x="180" y="85" width="60" height="25" rx="4" fill="#020617"/>
    <rect x="185" y="88" width="40" height="15" fill="#f59e0b"/>

    <!-- Under-Barrel Tactical Rail & Laser Emitter -->
    <rect x="220" y="165" width="100" height="30" rx="6" fill="#0f172a" stroke="#020617" stroke-width="8"/>
    <circle cx="310" cy="180" r="6" fill="#ef4444"/>

    <!-- Iron Sights -->
    <rect x="55" y="65" width="16" height="18" fill="#020617"/>
    <rect x="325" y="65" width="16" height="18" fill="#020617"/>
    <circle cx="333" cy="74" r="3" fill="#22c55e"/>
  </g>
</svg>`,

  // 11. Weapon: Shotgun
  weapon_shotgun: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="barrelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="50%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="woodStock" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9a3412"/>
      <stop offset="100%" stop-color="#431407"/>
    </linearGradient>
  </defs>

  <g transform="translate(30, 150) rotate(-12, 256, 120)">
    <!-- Wooden Stock / Grip -->
    <path d="M 20 100 C 40 70 90 75 140 85 L 140 145 C 90 155 50 180 20 140 Z"
          fill="url(#woodStock)" stroke="#020617" stroke-width="12" stroke-linejoin="round"/>

    <!-- Heavy Steel Receiver -->
    <rect x="135" y="80" width="120" height="70" rx="10" fill="#334155" stroke="#020617" stroke-width="12"/>
    <!-- Ejection Port with Red Shell -->
    <rect x="160" y="90" width="45" height="22" rx="4" fill="#020617"/>
    <circle cx="170" cy="101" r="7" fill="#dc2626"/>
    <circle cx="170" cy="101" r="4" fill="#fbbf24"/>

    <!-- Double Steel Barrels -->
    <rect x="250" y="82" width="210" height="28" rx="6" fill="url(#barrelGrad)" stroke="#020617" stroke-width="10"/>
    <rect x="250" y="112" width="200" height="26" rx="6" fill="url(#barrelGrad)" stroke="#020617" stroke-width="10"/>

    <!-- Ribbed Pump Slide Forend -->
    <rect x="280" y="105" width="85" height="42" rx="8" fill="#1e293b" stroke="#020617" stroke-width="8"/>
    <line x1="298" y1="108" x2="298" y2="144" stroke="#64748b" stroke-width="5"/>
    <line x1="315" y1="108" x2="315" y2="144" stroke="#64748b" stroke-width="5"/>
    <line x1="332" y1="108" x2="332" y2="144" stroke="#64748b" stroke-width="5"/>

    <!-- Front Sight Bead -->
    <circle cx="450" cy="76" r="6" fill="#facc15" stroke="#020617" stroke-width="3"/>
  </g>
</svg>`,

  // 12. Weapon: SMG
  weapon_smg: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="smgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="60%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>

  <g transform="translate(60, 120)">
    <!-- Main Receiver Chassis -->
    <rect x="50" y="90" width="270" height="80" rx="12" fill="url(#smgGrad)" stroke="#020617" stroke-width="14"/>

    <!-- Perforated Barrel Shroud -->
    <rect x="315" y="105" width="70" height="45" rx="6" fill="#334155" stroke="#020617" stroke-width="10"/>
    <circle cx="335" cy="127" r="6" fill="#020617"/>
    <circle cx="360" cy="127" r="6" fill="#020617"/>

    <!-- Slotted Flash Suppressor Muzzle -->
    <rect x="385" y="112" width="22" height="32" rx="4" fill="#0f172a" stroke="#020617" stroke-width="8"/>

    <!-- Extended Curved Stick Magazine -->
    <path d="M 210 165 L 240 330 C 242 342 225 350 210 345 L 180 165 Z"
          fill="#0f172a" stroke="#020617" stroke-width="12"/>
    <!-- Ammo Witness Window -->
    <line x1="205" y1="200" x2="225" y2="310" stroke="#f59e0b" stroke-width="6"/>

    <!-- Tactical Pistol Grip -->
    <path d="M 90 165 L 115 300 C 118 315 95 325 80 320 L 55 165 Z"
          fill="#1e293b" stroke="#020617" stroke-width="12"/>

    <!-- Top Picatinny Rail & Holographic Sight -->
    <rect x="80" y="72" width="200" height="20" rx="4" fill="#020617"/>
    <!-- Holo Sight Optic -->
    <rect x="140" y="38" width="80" height="36" rx="8" fill="#1e293b" stroke="#020617" stroke-width="8"/>
    <circle cx="180" cy="56" r="8" fill="#06b6d4" opacity="0.9"/>
    <circle cx="180" cy="56" r="3" fill="#ef4444"/>

    <!-- Cyan Accent Status LED Strip -->
    <rect x="80" y="105" width="40" height="8" rx="4" fill="#06b6d4"/>
  </g>
</svg>`,

  // 13. Weapon: Wand
  weapon_wand: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wandShaft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#78350f"/>
      <stop offset="50%" stop-color="#451a03"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <radialGradient id="crystalOrb" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#38bdf8"/>
      <stop offset="80%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#312e81"/>
    </radialGradient>
  </defs>

  <g transform="translate(40, 40)">
    <!-- Swirling Mana Rings -->
    <ellipse cx="340" cy="100" rx="75" ry="32" fill="none" stroke="#38bdf8" stroke-width="8" opacity="0.8" transform="rotate(-30, 340, 100)"/>
    <ellipse cx="340" cy="100" rx="32" ry="75" fill="none" stroke="#c084fc" stroke-width="6" opacity="0.8" transform="rotate(-30, 340, 100)"/>

    <!-- Enchanted Wand Shaft -->
    <path d="M 80 400 L 320 120" stroke="url(#wandShaft)" stroke-width="26" stroke-linecap="round"/>
    <path d="M 80 400 L 320 120" stroke="#020617" stroke-width="6" fill="none"/>

    <!-- Golden Spiral Filigree Wrapping -->
    <path d="M 120 355 Q 145 345 155 320" stroke="#facc15" stroke-width="8" stroke-linecap="round" fill="none"/>
    <path d="M 175 295 Q 200 285 210 260" stroke="#facc15" stroke-width="8" stroke-linecap="round" fill="none"/>
    <path d="M 230 235 Q 255 225 265 200" stroke="#facc15" stroke-width="8" stroke-linecap="round" fill="none"/>

    <!-- Crystal Prongs Base -->
    <path d="M 295 145 L 340 100 L 320 70" stroke="#facc15" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M 330 165 L 365 110 L 350 80" stroke="#facc15" stroke-width="10" stroke-linecap="round" fill="none"/>

    <!-- Radiant Floating Sapphire Crystal Orb -->
    <circle cx="340" cy="100" r="46" fill="url(#crystalOrb)" stroke="#ffffff" stroke-width="8"/>
    <!-- Inner Sparkles -->
    <polygon points="340,75 345,95 365,100 345,105 340,125 335,105 315,100 335,95" fill="#ffffff"/>
  </g>
</svg>`,

  // 14. Weapon: Knife
  weapon_knife: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bladeSteel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="50%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>

  <g transform="translate(60, 60) rotate(25, 200, 200)">
    <!-- Carbon Fiber Tactical Handle -->
    <path d="M 70 320 L 150 240 C 160 230 180 240 170 260 L 100 350 C 85 365 60 340 70 320 Z"
          fill="#0f172a" stroke="#020617" stroke-width="14" stroke-linejoin="round"/>
    <!-- Lanyard Ring Pommel -->
    <circle cx="75" cy="340" r="14" fill="none" stroke="#64748b" stroke-width="8"/>

    <!-- Steel Crossguard Stop -->
    <rect x="140" y="215" width="55" height="24" rx="6" fill="#334155" stroke="#020617" stroke-width="10" transform="rotate(-45, 167, 227)"/>

    <!-- Curved Tanto / Karambit Razor Blade -->
    <path d="M 160 230 L 330 70 C 370 60 380 90 350 130 L 210 270 Z"
          fill="url(#bladeSteel)" stroke="#020617" stroke-width="14" stroke-linejoin="round"/>

    <!-- Serrated Spine Teeth -->
    <polygon points="200,190 220,180 215,200" fill="#020617"/>
    <polygon points="230,160 250,150 245,170" fill="#020617"/>
    <polygon points="260,130 280,120 275,140" fill="#020617"/>

    <!-- Razor Edge Highlight Bevel -->
    <path d="M 205 265 L 345 125" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>
  </g>
</svg>`,

  // 15. Weapon: Sword
  weapon_sword: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="swordBlade" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e2e8f0"/>
      <stop offset="45%" stop-color="#ffffff"/>
      <stop offset="55%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
    <linearGradient id="goldGuard" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#854d0e"/>
    </linearGradient>
  </defs>

  <g transform="translate(256, 256) rotate(45) translate(-256, -256)">
    <!-- Gleaming Double-Edged Blade -->
    <polygon points="240,320 230,80 256,25 282,80 272,320"
             fill="url(#swordBlade)" stroke="#0f172a" stroke-width="14" stroke-linejoin="round"/>
    <!-- Glowing Cyan Runic Fuller Channel -->
    <line x1="256" y1="70" x2="256" y2="300" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>

    <!-- Winged Crossguard -->
    <path d="M 170 320 Q 256 345 342 320 L 330 350 Q 256 365 182 350 Z"
          fill="url(#goldGuard)" stroke="#451a03" stroke-width="12" stroke-linejoin="round"/>
    <!-- Guard Center Azure Gem -->
    <polygon points="256,330 268,342 256,354 244,342" fill="#0284c7" stroke="#ffffff" stroke-width="3"/>

    <!-- Wrapped Grip Handle -->
    <rect x="246" y="355" width="20" height="75" rx="6" fill="#1e293b" stroke="#020617" stroke-width="8"/>
    <line x1="246" y1="375" x2="266" y2="370" stroke="#f59e0b" stroke-width="4"/>
    <line x1="246" y1="395" x2="266" y2="390" stroke="#f59e0b" stroke-width="4"/>
    <line x1="246" y1="415" x2="266" y2="410" stroke="#f59e0b" stroke-width="4"/>

    <!-- Polished Steel Pommel Stone -->
    <circle cx="256" cy="445" r="22" fill="url(#goldGuard)" stroke="#451a03" stroke-width="8"/>
  </g>
</svg>`,

  // 16. Weapon: Wrench
  weapon_wrench: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="jawSteel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="50%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>

  <g transform="translate(256, 256) rotate(-40) translate(-256, -256)">
    <!-- Heavy Industrial Handle with Hazard Stripes -->
    <rect x="232" y="160" width="48" height="260" rx="14" fill="#f59e0b" stroke="#020617" stroke-width="14"/>
    <!-- Black Hazard Stripes -->
    <polygon points="234,180 278,210 278,240 234,210" fill="#0f172a"/>
    <polygon points="234,250 278,280 278,310 234,280" fill="#0f172a"/>
    <polygon points="234,320 278,350 278,380 234,350" fill="#0f172a"/>
    <circle cx="256" cy="395" r="10" fill="#020617"/>

    <!-- Heavy Drop-Forged Steel Head / Fixed Jaw -->
    <path d="M 215 170 L 215 90 C 215 65 240 50 270 50 L 320 50 C 330 50 335 60 325 70 L 280 110 L 280 170 Z"
          fill="url(#jawSteel)" stroke="#020617" stroke-width="14" stroke-linejoin="round"/>
    <!-- Hardened Gripping Teeth -->
    <line x1="220" y1="95" x2="245" y2="95" stroke="#020617" stroke-width="6"/>
    <line x1="220" y1="115" x2="245" y2="115" stroke="#020617" stroke-width="6"/>
    <line x1="220" y1="135" x2="245" y2="135" stroke="#020617" stroke-width="6"/>

    <!-- Knurled Brass Thumb Adjustment Screw -->
    <rect x="228" y="145" width="56" height="26" rx="6" fill="#fbbf24" stroke="#78350f" stroke-width="6"/>
    <line x1="242" y1="147" x2="242" y2="169" stroke="#78350f" stroke-width="4"/>
    <line x1="256" y1="147" x2="256" y2="169" stroke="#78350f" stroke-width="4"/>
    <line x1="270" y1="147" x2="270" y2="169" stroke="#78350f" stroke-width="4"/>
  </g>
</svg>`,

  // 17. Projectile: Bullet
  proj_bullet: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tracerGrad" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0"/>
      <stop offset="40%" stop-color="#f97316" stop-opacity="0.8"/>
      <stop offset="80%" stop-color="#fef08a" stop-opacity="1"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
    <linearGradient id="bulletCopper" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fed7aa"/>
      <stop offset="40%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#9a3412"/>
    </linearGradient>
  </defs>

  <!-- Kinetic Tracer Flame Trail -->
  <polygon points="50,256 260,195 240,256 260,317" fill="url(#tracerGrad)"/>
  <ellipse cx="230" cy="256" rx="80" ry="24" fill="#fbbf24" opacity="0.6"/>

  <!-- Solid Copper Bullet Head -->
  <path d="M 240 205 L 360 205 C 430 205 460 256 460 256 C 460 256 430 307 360 307 L 240 307 Z"
        fill="url(#bulletCopper)" stroke="#431407" stroke-width="14" stroke-linejoin="round"/>
  <!-- Specular Reflection Streak -->
  <line x1="260" y1="225" x2="380" y2="225" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
</svg>`,

  // 18. Projectile: Enemy Spit (Toxic Globule)
  proj_enemy_spit: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="acidDrop" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#facc15"/>
      <stop offset="45%" stop-color="#84cc16"/>
      <stop offset="85%" stop-color="#15803d"/>
      <stop offset="100%" stop-color="#052e16"/>
    </radialGradient>
  </defs>

  <!-- Corrosive Droplet Trail -->
  <circle cx="110" cy="256" r="24" fill="#84cc16" opacity="0.6"/>
  <circle cx="170" cy="220" r="32" fill="#84cc16" opacity="0.8"/>
  <circle cx="170" cy="290" r="28" fill="#84cc16" opacity="0.8"/>

  <!-- Main Acid Bolt Teardrop -->
  <path d="M 180 256 C 240 160 380 140 430 256 C 380 372 240 352 180 256 Z"
        fill="url(#acidDrop)" stroke="#052e16" stroke-width="16" stroke-linejoin="round"/>

  <!-- Bubbling Droplets Inside -->
  <circle cx="340" cy="220" r="24" fill="#fef08a" opacity="0.9"/>
  <circle cx="370" cy="275" r="18" fill="#fef08a" opacity="0.9"/>
  <circle cx="280" cy="260" r="16" fill="#bef264" opacity="0.8"/>
</svg>`,

  // 19. Projectile: Magic Orb
  proj_magic_orb: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="magicPlasma" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="25%" stop-color="#67e8f9"/>
      <stop offset="65%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#4c1d95"/>
    </radialGradient>
  </defs>

  <!-- Orbital Energy Rings -->
  <circle cx="256" cy="256" r="190" fill="none" stroke="#38bdf8" stroke-width="8" stroke-dasharray="24 16" opacity="0.6"/>
  <circle cx="256" cy="256" r="160" fill="none" stroke="#c084fc" stroke-width="6" opacity="0.8"/>

  <!-- Plasma Core Orb -->
  <circle cx="256" cy="256" r="120" fill="url(#magicPlasma)" stroke="#ffffff" stroke-width="12"/>

  <!-- Arcane Energy Cross -->
  <polygon points="256,90 270,240 420,256 270,272 256,422 242,272 92,256 242,240" fill="#ffffff" opacity="0.9"/>
</svg>`,

  // 20. VFX: Slash Arc
  vfx_slash_arc: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="arcCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="35%" stop-color="#67e8f9" stop-opacity="0.95"/>
      <stop offset="70%" stop-color="#0284c7" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#0369a1" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- High-Velocity Crescent Slash Arc -->
  <path d="M 60 420 C 120 220 260 90 450 60 C 330 160 240 280 180 430 C 130 450 80 440 60 420 Z"
        fill="url(#arcCyan)" stroke="#38bdf8" stroke-width="8" stroke-linejoin="round"/>
  <!-- Bright Core Cutting Spine -->
  <path d="M 90 390 C 150 230 280 120 435 80" stroke="#ffffff" stroke-width="12" stroke-linecap="round" fill="none"/>
</svg>`,

  // 21. VFX: Nova Ring
  vfx_nova_ring: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="novaGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="40%" stop-color="#fbbf24" stop-opacity="0.8"/>
      <stop offset="80%" stop-color="#f97316" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Expanding Shockwave Flare -->
  <circle cx="256" cy="256" r="220" fill="url(#novaGrad)"/>
  <!-- Crisp Shockwave Ring Edge -->
  <circle cx="256" cy="256" r="185" fill="none" stroke="#fbbf24" stroke-width="18" stroke-linecap="round"/>
  <circle cx="256" cy="256" r="170" fill="none" stroke="#ffffff" stroke-width="8"/>

  <!-- Radial Blast Spikes -->
  <line x1="256" y1="30" x2="256" y2="80" stroke="#fef08a" stroke-width="10" stroke-linecap="round"/>
  <line x1="256" y1="432" x2="256" y2="482" stroke="#fef08a" stroke-width="10" stroke-linecap="round"/>
  <line x1="30" y1="256" x2="80" y2="256" stroke="#fef08a" stroke-width="10" stroke-linecap="round"/>
  <line x1="432" y1="256" x2="482" y2="256" stroke="#fef08a" stroke-width="10" stroke-linecap="round"/>
</svg>`,

  // 22. Pickup: Material Crystal
  pickup_material_crystal: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gemTop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a5f3fc"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <linearGradient id="gemMid" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <linearGradient id="gemBot" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#075985"/>
      <stop offset="100%" stop-color="#082f49"/>
    </linearGradient>
  </defs>

  <!-- Glowing Outer Aura -->
  <polygon points="256,35 415,145 355,425 256,475 157,425 97,145" fill="#38bdf8" opacity="0.3"/>

  <!-- Multi-Faceted Gemstone -->
  <!-- Top Table -->
  <polygon points="190,90 322,90 390,170 256,190 122,170" fill="url(#gemTop)" stroke="#0c4a6e" stroke-width="12" stroke-linejoin="round"/>
  <!-- Front Left Facet -->
  <polygon points="122,170 256,190 256,440 160,390" fill="url(#gemMid)" stroke="#0c4a6e" stroke-width="12" stroke-linejoin="round"/>
  <!-- Front Right Facet -->
  <polygon points="390,170 256,190 256,440 352,390" fill="url(#gemBot)" stroke="#0c4a6e" stroke-width="12" stroke-linejoin="round"/>

  <!-- Specular Reflection Star -->
  <polygon points="220,130 226,144 240,150 226,156 220,170 214,156 200,150 214,144" fill="#ffffff"/>
  <circle cx="220" cy="150" r="4" fill="#ffffff"/>
</svg>`,

  // 23. Pickup: Health Fruit
  pickup_health_fruit: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="fruitGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#fca5a5"/>
      <stop offset="35%" stop-color="#ef4444"/>
      <stop offset="85%" stop-color="#b91c1c"/>
      <stop offset="100%" stop-color="#450a0a"/>
    </radialGradient>
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#86efac"/>
      <stop offset="100%" stop-color="#15803d"/>
    </linearGradient>
  </defs>

  <!-- Vitality Fruit Body (Apple / Heart Berry) -->
  <path d="M 256 160 C 200 90 90 110 90 230 C 90 350 210 420 256 460 C 302 420 422 350 422 230 C 422 110 312 90 256 160 Z"
        fill="url(#fruitGrad)" stroke="#450a0a" stroke-width="16" stroke-linejoin="round"/>

  <!-- Glossy White Specular Sheen -->
  <path d="M 150 170 C 180 150 220 155 235 180 C 215 190 170 195 150 170 Z" fill="#ffffff" opacity="0.6"/>
  <circle cx="160" cy="225" r="14" fill="#ffffff" opacity="0.5"/>

  <!-- Dainty Wood Stem -->
  <path d="M 256 160 Q 265 100 295 70" stroke="#78350f" stroke-width="14" stroke-linecap="round" fill="none"/>

  <!-- Vibrant Emerald Leaf -->
  <path d="M 285 95 C 360 70 380 120 340 140 C 300 160 280 120 285 95 Z"
        fill="url(#leafGrad)" stroke="#14532d" stroke-width="8" stroke-linejoin="round"/>
  <line x1="285" y1="95" x2="340" y2="140" stroke="#f0fdf4" stroke-width="4"/>
</svg>`,

  // 24. Pickup: Mystery Chest
  pickup_mystery_chest: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="chestWood" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#9a3412"/>
      <stop offset="50%" stop-color="#7c2d12"/>
      <stop offset="100%" stop-color="#431407"/>
    </linearGradient>
    <linearGradient id="goldBrace" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#854d0e"/>
    </linearGradient>
  </defs>

  <!-- Glowing Golden Interior Light Beams -->
  <polygon points="256,190 90,90 422,90" fill="#fef08a" opacity="0.5"/>

  <!-- Lower Chest Basin -->
  <rect x="90" y="220" width="332" height="190" rx="18" fill="url(#chestWood)" stroke="#1c1917" stroke-width="16"/>

  <!-- Upper Chest Lid -->
  <path d="M 80 220 C 80 140 432 140 432 220 Z" fill="url(#chestWood)" stroke="#1c1917" stroke-width="16"/>

  <!-- Reinforced Gold Corner Braces & Rivets -->
  <path d="M 90 220 L 150 220 L 150 410 L 90 410 Z" fill="url(#goldBrace)" stroke="#451a03" stroke-width="10"/>
  <path d="M 362 220 L 422 220 L 422 410 L 362 410 Z" fill="url(#goldBrace)" stroke="#451a03" stroke-width="10"/>
  <circle cx="120" cy="250" r="7" fill="#451a03"/>
  <circle cx="120" cy="380" r="7" fill="#451a03"/>
  <circle cx="392" cy="250" r="7" fill="#451a03"/>
  <circle cx="392" cy="380" r="7" fill="#451a03"/>

  <!-- Glowing Cyan Holographic Lock Clasp -->
  <rect x="226" y="200" width="60" height="70" rx="12" fill="url(#goldBrace)" stroke="#451a03" stroke-width="10"/>
  <!-- Keyhole -->
  <circle cx="256" cy="230" r="10" fill="#0284c7" stroke="#38bdf8" stroke-width="4"/>
  <polygon points="252,230 260,230 264,255 248,255" fill="#0284c7"/>
</svg>`,

  // 25. Arena Floor Tile (Seamless 512x512)
  arena_tile_floor: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="panelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>

  <!-- Dark Slate Alloy Grid Tile -->
  <rect x="0" y="0" width="512" height="512" fill="#0b0f19"/>

  <!-- 4 Sub-Panels with Beveled Inset -->
  <rect x="16" y="16" width="224" height="224" rx="12" fill="url(#panelGrad)" stroke="#334155" stroke-width="6"/>
  <rect x="272" y="16" width="224" height="224" rx="12" fill="url(#panelGrad)" stroke="#334155" stroke-width="6"/>
  <rect x="16" y="272" width="224" height="224" rx="12" fill="url(#panelGrad)" stroke="#334155" stroke-width="6"/>
  <rect x="272" y="272" width="224" height="224" rx="12" fill="url(#panelGrad)" stroke="#334155" stroke-width="6"/>

  <!-- Subtle Glowing Cyan Circuit Grid Lines -->
  <path d="M 256 0 L 256 512 M 0 256 L 512 256" stroke="#0284c7" stroke-width="4" opacity="0.6"/>
  <circle cx="256" cy="256" r="28" fill="#0f172a" stroke="#06b6d4" stroke-width="6"/>
  <circle cx="256" cy="256" r="10" fill="#38bdf8"/>

  <!-- Corner Rivet Details -->
  <circle cx="36" cy="36" r="5" fill="#64748b"/>
  <circle cx="220" cy="36" r="5" fill="#64748b"/>
  <circle cx="36" cy="220" r="5" fill="#64748b"/>
  <circle cx="220" cy="220" r="5" fill="#64748b"/>

  <circle cx="292" cy="36" r="5" fill="#64748b"/>
  <circle cx="476" cy="36" r="5" fill="#64748b"/>
  <circle cx="292" cy="220" r="5" fill="#64748b"/>
  <circle cx="476" cy="220" r="5" fill="#64748b"/>

  <circle cx="36" cy="292" r="5" fill="#64748b"/>
  <circle cx="220" cy="292" r="5" fill="#64748b"/>
  <circle cx="36" cy="476" r="5" fill="#64748b"/>
  <circle cx="220" cy="476" r="5" fill="#64748b"/>

  <circle cx="292" cy="292" r="5" fill="#64748b"/>
  <circle cx="476" cy="292" r="5" fill="#64748b"/>
  <circle cx="292" cy="476" r="5" fill="#64748b"/>
  <circle cx="476" cy="476" r="5" fill="#64748b"/>
</svg>`,

  // 26. Arena Border Wall Tile (512x512)
  arena_border_wall: `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wallSteel" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>

  <!-- Heavy Reinforced Barrier Frame -->
  <rect x="0" y="0" width="512" height="512" fill="#020617"/>
  <rect x="16" y="16" width="480" height="480" rx="18" fill="url(#wallSteel)" stroke="#64748b" stroke-width="12"/>

  <!-- High-Contrast Amber / Black Hazard Chevrons -->
  <g transform="translate(36, 156)">
    <rect x="0" y="0" width="440" height="200" fill="#f59e0b" stroke="#020617" stroke-width="8"/>
    <!-- Diagonal Black Bars -->
    <polygon points="0,0 60,0 0,60" fill="#0f172a"/>
    <polygon points="40,0 160,0 0,160 0,40" fill="#0f172a"/>
    <polygon points="140,0 260,0 60,200 0,200" fill="#0f172a"/>
    <polygon points="240,0 360,0 160,200 40,200" fill="#0f172a"/>
    <polygon points="340,0 440,0 440,40 240,200 140,200" fill="#0f172a"/>
    <polygon points="440,40 440,140 340,200 240,200" fill="#0f172a"/>
    <polygon points="440,140 440,200 340,200" fill="#0f172a"/>
  </g>

  <!-- Heavy Hex Bolt Rivets -->
  <circle cx="60" cy="60" r="14" fill="#94a3b8" stroke="#020617" stroke-width="6"/>
  <circle cx="256" cy="60" r="14" fill="#94a3b8" stroke="#020617" stroke-width="6"/>
  <circle cx="452" cy="60" r="14" fill="#94a3b8" stroke="#020617" stroke-width="6"/>

  <circle cx="60" cy="452" r="14" fill="#94a3b8" stroke="#020617" stroke-width="6"/>
  <circle cx="256" cy="452" r="14" fill="#94a3b8" stroke="#020617" stroke-width="6"/>
  <circle cx="452" cy="452" r="14" fill="#94a3b8" stroke="#020617" stroke-width="6"/>
</svg>`,
};

async function generateAll() {
  const keys = Object.keys(ASSETS);
  console.log(`Rendering ${keys.length} high-resolution 512x512 RGBA PNG sprites via sharp...`);

  for (const key of keys) {
    const svgStr = ASSETS[key].trim();
    const destPath = path.join(OUTPUT_DIR, `${key}.png`);

    const pngBuffer = await sharp(Buffer.from(svgStr))
      .resize(512, 512)
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        force: true,
      })
      .toBuffer();

    fs.writeFileSync(destPath, pngBuffer);
    console.log(`  ✓ Rendered: ${key}.png (512x512, 32-bit RGBA)`);
  }

  console.log('All 26 assets generated successfully!');
}

generateAll().catch(err => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
