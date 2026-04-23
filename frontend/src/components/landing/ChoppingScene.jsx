import { forwardRef } from 'react'

/* ── SVG Vegetable Definitions ── */
const CarrotSVG = () => (
  <svg width="70" height="30" viewBox="0 0 70 30">
    <defs>
      <linearGradient id="carrotG" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#e67e22"/>
        <stop offset="100%" stopColor="#d35400"/>
      </linearGradient>
    </defs>
    <ellipse cx="40" cy="17" rx="26" ry="10" fill="url(#carrotG)"/>
    <path d="M 10 14 Q 4 10 7 5 M 10 17 Q 3 17 6 12 M 12 14 Q 8 8 11 4" stroke="#27ae60" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <line x1="25" y1="11" x2="25" y2="23" stroke="#c0692e" strokeWidth="0.5" opacity="0.4"/>
    <line x1="40" y1="10" x2="40" y2="24" stroke="#c0692e" strokeWidth="0.5" opacity="0.4"/>
    <line x1="55" y1="12" x2="55" y2="22" stroke="#c0692e" strokeWidth="0.5" opacity="0.4"/>
  </svg>
)

const BroccoliSVG = () => (
  <svg width="55" height="58" viewBox="0 0 55 58">
    <rect x="23" y="38" width="8" height="16" rx="3" fill="#6d8b3a"/>
    <circle cx="27" cy="28" r="14" fill="#27ae60"/>
    <circle cx="17" cy="22" r="10" fill="#2ecc71"/>
    <circle cx="37" cy="22" r="10" fill="#2ecc71"/>
    <circle cx="21" cy="15" r="7" fill="#27ae60"/>
    <circle cx="33" cy="15" r="7" fill="#27ae60"/>
    <circle cx="27" cy="12" r="6" fill="#2ecc71" opacity="0.8"/>
  </svg>
)

const CapsicumSVG = () => (
  <svg width="48" height="52" viewBox="0 0 48 52">
    <rect x="6" y="14" width="36" height="32" rx="14" fill="#e74c3c"/>
    <rect x="8" y="16" width="32" height="28" rx="12" fill="#c0392b" opacity="0.5"/>
    <path d="M 18 14 Q 20 6 24 4 Q 28 6 30 14" fill="#27ae60"/>
    <path d="M 24 10 L 24 4 Q 22 1 24 0" stroke="#229954" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <ellipse cx="17" cy="26" rx="5" ry="8" fill="rgba(255,255,255,0.08)"/>
  </svg>
)

const MushroomSVG = () => (
  <svg width="50" height="52" viewBox="0 0 50 52">
    <rect x="19" y="30" width="12" height="18" rx="5" fill="#f5e6d3"/>
    <ellipse cx="25" cy="30" rx="22" ry="16" fill="#a0782c"/>
    <ellipse cx="25" cy="28" rx="20" ry="13" fill="#c49a3c" opacity="0.3"/>
    <circle cx="17" cy="24" r="3" fill="#8B6914" opacity="0.45"/>
    <circle cx="30" cy="26" r="2.5" fill="#8B6914" opacity="0.45"/>
    <circle cx="24" cy="20" r="2" fill="#8B6914" opacity="0.3"/>
  </svg>
)

const SpringOnionSVG = () => (
  <svg width="40" height="68" viewBox="0 0 40 68">
    <line x1="14" y1="32" x2="10" y2="5" stroke="#27ae60" strokeWidth="3.5" strokeLinecap="round"/>
    <line x1="20" y1="32" x2="22" y2="2" stroke="#2ecc71" strokeWidth="3" strokeLinecap="round"/>
    <line x1="26" y1="32" x2="30" y2="8" stroke="#27ae60" strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="20" cy="40" rx="11" ry="8" fill="#f0f0f0"/>
    <path d="M 9 44 Q 12 58 20 62 Q 28 58 31 44" fill="#eaeaea" stroke="#ddd" strokeWidth="0.5"/>
  </svg>
)

const TomatoSVG = () => (
  <svg width="48" height="50" viewBox="0 0 48 50">
    <defs>
      <radialGradient id="tomG" cx="0.38" cy="0.35">
        <stop offset="0%" stopColor="#ff6b6b"/>
        <stop offset="100%" stopColor="#c0392b"/>
      </radialGradient>
    </defs>
    <circle cx="24" cy="28" r="19" fill="url(#tomG)"/>
    <path d="M 17 11 Q 20 5 24 4 Q 28 5 31 11" fill="#27ae60"/>
    <path d="M 24 10 L 24 4 Q 22 0 24 -1" stroke="#229954" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <ellipse cx="17" cy="24" rx="5" ry="7" fill="rgba(255,255,255,0.1)"/>
  </svg>
)

/* ── Veggie Half Wrapper — renders two copies for slicing effect ── */
function VeggieItem({ children, style, name }) {
  return (
    <div className="veggie" data-anim="veggie" data-veggie={name} style={{ ...style, width: 'fit-content', height: 'fit-content' }}>
      <div className="veggie-left" data-anim="veggie-left">
        {children}
      </div>
      <div className="veggie-right" data-anim="veggie-right">
        {children}
      </div>
    </div>
  )
}

/* ── Small pan veggie representations ── */
const panVeggieColors = ['#e67e22', '#27ae60', '#e74c3c', '#a0782c', '#f0f0f0', '#ff6b6b']

/* ── Main Component ── */
const ChoppingScene = forwardRef(function ChoppingScene(_props, ref) {
  const grainPositions = [10, 20, 32, 42, 52, 62, 72, 82, 90]

  return (
    <div ref={ref} className="chopping-scene">
      {/* ── Board Group (board + knife + veggies) ── */}
      <div className="board-group" data-anim="board-group">
        {/* Chopping Board */}
        <div className="chopping-board" data-anim="board">
          {grainPositions.map((t, i) => (
            <div key={i} className="board-grain" style={{ top: `${t}%` }} />
          ))}
        </div>

        {/* Knife */}
        <svg className="knife-svg" data-anim="knife" viewBox="0 0 220 70" fill="none">
          {/* Blade */}
          <path d="M 8 38 L 140 12 L 145 24 L 12 44 Z" fill="#d0d0d0"/>
          <path d="M 8 38 L 140 12 L 142 18 L 10 41 Z" fill="#e8e8e8"/>
          <line x1="12" y1="41" x2="138" y2="15" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
          {/* Edge */}
          <line x1="8" y1="38" x2="12" y2="44" stroke="#aaa" strokeWidth="0.5"/>
          {/* Handle */}
          <path d="M 140 12 L 145 24 L 210 32 Q 216 33 216 30 Q 216 27 210 26 L 142 14 Z" fill="#3d2b1f"/>
          <path d="M 155 18 L 155 28" stroke="#5c4033" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M 170 20 L 170 30" stroke="#5c4033" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M 185 22 L 185 31" stroke="#5c4033" strokeWidth="1.5" strokeLinecap="round"/>
          {/* Rivet dots */}
          <circle cx="160" cy="23" r="1.5" fill="#888"/>
          <circle cx="180" cy="25" r="1.5" fill="#888"/>
          <circle cx="200" cy="28" r="1.5" fill="#888"/>
        </svg>

        {/* Vegetables positioned on the board */}
        <VeggieItem name="carrot" style={{ left: '8%', top: '18%' }}>
          <CarrotSVG />
        </VeggieItem>

        <VeggieItem name="broccoli" style={{ left: '62%', top: '12%' }}>
          <BroccoliSVG />
        </VeggieItem>

        <VeggieItem name="capsicum" style={{ left: '30%', top: '62%' }}>
          <CapsicumSVG />
        </VeggieItem>

        <VeggieItem name="mushroom" style={{ left: '70%', top: '55%' }}>
          <MushroomSVG />
        </VeggieItem>

        <VeggieItem name="spring-onion" style={{ left: '42%', top: '22%' }}>
          <SpringOnionSVG />
        </VeggieItem>

        <VeggieItem name="tomato" style={{ left: '15%', top: '55%' }}>
          <TomatoSVG />
        </VeggieItem>
      </div>

      {/* ── Frying Pan ── */}
      <div className="frying-pan" data-anim="pan">
        <div className="pan-body">
          <div className="pan-inner">
            {/* Small veggie pieces that appear when they "land" */}
            {panVeggieColors.map((c, i) => (
              <div
                key={i}
                className="pan-veggie"
                data-anim="pan-veggie"
                style={{
                  left: `${25 + (i % 3) * 25}%`,
                  top: `${25 + Math.floor(i / 3) * 30}%`,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <rect x="2" y="2" width="16" height="16" rx="4" fill={c} opacity="0.85"/>
                </svg>
              </div>
            ))}
          </div>
          <div className="pan-glow" data-anim="pan-glow"></div>
        </div>
        <div className="pan-handle"></div>

        {/* Steam particles */}
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="steam-particle"
            data-anim="steam"
            style={{
              left: `${60 + Math.random() * 180}px`,
              top: `${40 + Math.random() * 140}px`,
            }}
          />
        ))}

        {/* Sizzle dots */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="sizzle-dot"
            data-anim="sizzle"
            style={{
              left: `${80 + Math.random() * 150}px`,
              top: `${80 + Math.random() * 120}px`,
            }}
          />
        ))}
      </div>
    </div>
  )
})

export default ChoppingScene
