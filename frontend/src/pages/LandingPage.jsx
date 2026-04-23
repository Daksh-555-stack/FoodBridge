import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ChoppingScene from '../components/landing/ChoppingScene'
import AuthSection from '../components/landing/AuthSection'
import '../styles/landing.css'

gsap.registerPlugin(ScrollTrigger)

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   LandingPage — Full-screen scroll-driven animation
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function LandingPage() {
  const navigate = useNavigate()
  const sceneRef = useRef(null)
  const scrollRef = useRef(null)
  const stat1 = useRef(null)
  const stat2 = useRef(null)
  const stat3 = useRef(null)

  /* ── Detect mobile / reduced-motion ── */
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const reduced = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /* ── Count-up on scroll-into-view ── */
  useEffect(() => {
    const entries = [
      { ref: stat1, target: '144,000', suffix: '' },
      { ref: stat2, target: '200',     suffix: '+' },
      { ref: stat3, target: '40',      suffix: '' },
    ]
    const observers = entries.map(({ ref, target, suffix }) => {
      const el = ref.current
      if (!el) return null
      const end = parseInt(target.replace(/,/g, ''))
      const obs = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return
        let cur = 0
        const inc = end / 120
        const tick = () => {
          cur += inc
          if (cur >= end) { el.textContent = target + suffix; return }
          el.textContent = Math.floor(cur).toLocaleString() + suffix
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
        obs.disconnect()
      }, { threshold: 0.4 })
      obs.observe(el)
      return obs
    })
    return () => observers.forEach(o => o?.disconnect())
  }, [])

  /* ── GSAP Scroll-Driven Timeline ── */
  useEffect(() => {
    if (isMobile || reduced) return

    const scene = sceneRef.current
    if (!scene || !scrollRef.current) return

    const board       = scene.querySelector('[data-anim="board-group"]')
    const boardSurf   = scene.querySelector('[data-anim="board"]')
    const knife       = scene.querySelector('[data-anim="knife"]')
    const veggies     = scene.querySelectorAll('[data-anim="veggie"]')
    const pan         = scene.querySelector('[data-anim="pan"]')
    const panGlow     = scene.querySelector('[data-anim="pan-glow"]')
    const panVeggies  = scene.querySelectorAll('[data-anim="pan-veggie"]')
    const steamParts  = scene.querySelectorAll('[data-anim="steam"]')
    const sizzleDots  = scene.querySelectorAll('[data-anim="sizzle"]')
    const authWrap    = document.querySelector('.scroll-auth-wrap')
    const heroWrap    = document.querySelector('.hero-content-wrap')

    /* Master timeline pinned to scroll */
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.5,
        pin: '.scroll-scene',
      }
    })

    /* ─── PHASE 1 (0 → 0.30): Knife chops vegetables ─── */

    // Fade hero text as animation begins
    tl.to(heroWrap, { opacity: 0, x: -60, duration: 0.06, ease: 'power2.in' }, 0.02)

    // Move board to center
    tl.to(board, {
      right: 'auto',
      left: '50%',
      xPercent: -50,
      scale: 1.05,
      duration: 0.08,
      ease: 'power2.out',
    }, 0.02)

    // Knife oscillation — 6 passes, one per veggie
    veggies.forEach((v, i) => {
      const t = 0.08 + i * (0.22 / 6)         // spread across 0.08 → 0.30
      const dir = i % 2 === 0 ? 40 : -40

      // Knife swings
      tl.to(knife, {
        x: dir,
        rotation: dir > 0 ? 3 : -3,
        duration: 0.018,
        ease: 'power1.inOut',
      }, t)

      // Slice — clip left half
      tl.to(v.querySelector('[data-anim="veggie-left"]'), {
        clipPath: 'inset(0 50% 0 0)',
        x: -6,
        duration: 0.012,
        ease: 'power2.out',
      }, t + 0.012)

      // Slice — clip right half
      tl.to(v.querySelector('[data-anim="veggie-right"]'), {
        clipPath: 'inset(0 0 0 50%)',
        x: 6,
        duration: 0.012,
        ease: 'power2.out',
      }, t + 0.012)
    })

    // Reset knife to center after last chop
    tl.to(knife, { x: 0, rotation: 0, duration: 0.01 }, 0.295)

    /* ─── PHASE 2 (0.30 → 0.60): Board tilts, veggies fall ─── */

    // Board tilts like pouring
    tl.to(board, {
      rotateX: 30,
      rotateZ: -12,
      duration: 0.12,
      ease: 'power2.out',
    }, 0.30)

    // Knife slides off
    tl.to(knife, {
      y: -120,
      opacity: 0,
      rotation: -20,
      duration: 0.08,
      ease: 'power2.in',
    }, 0.32)

    // Each veggie piece falls
    veggies.forEach((v, i) => {
      const delay = 0.34 + i * 0.025
      tl.to(v, {
        y: 500 + Math.random() * 150,
        x: (Math.random() - 0.5) * 120,
        rotation: (Math.random() - 0.5) * 360,
        opacity: 0,
        duration: 0.16,
        ease: 'power2.in',
      }, delay)
    })

    // Board fades out
    tl.to(board, {
      opacity: 0,
      y: -80,
      scale: 0.6,
      duration: 0.1,
      ease: 'power2.in',
    }, 0.52)

    /* ─── PHASE 3 (0.55 → 0.80): Pan appears, veggies land ─── */

    // Pan rises into view
    tl.to(pan, {
      opacity: 1,
      bottom: '25%',
      scale: 1,
      duration: 0.15,
      ease: 'power3.out',
    }, 0.55)

    // Pan veggies appear (bounce in)
    panVeggies.forEach((pv, i) => {
      tl.to(pv, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.06,
        ease: 'elastic.out(1, 0.5)',
      }, 0.67 + i * 0.015)
    })

    // Sizzle dots burst
    sizzleDots.forEach((dot, i) => {
      tl.to(dot, {
        opacity: 1,
        x: (Math.random() - 0.5) * 60,
        y: (Math.random() - 0.5) * 60,
        duration: 0.04,
        ease: 'power2.out',
      }, 0.70 + i * 0.008)
      tl.to(dot, {
        opacity: 0,
        duration: 0.04,
      }, 0.74 + i * 0.008)
    })

    // Pan glow pulse
    tl.to(panGlow, {
      opacity: 1,
      duration: 0.08,
      ease: 'sine.inOut',
    }, 0.72)

    // Steam floats up
    steamParts.forEach((p, i) => {
      tl.to(p, {
        opacity: 0.5,
        y: -(30 + Math.random() * 50),
        x: (Math.random() - 0.5) * 20,
        scale: 1.3,
        duration: 0.1,
        ease: 'none',
      }, 0.74 + i * 0.004)
      tl.to(p, {
        opacity: 0,
        y: -(80 + Math.random() * 40),
        scale: 0.3,
        duration: 0.08,
      }, 0.82 + i * 0.004)
    })

    /* ─── PHASE 4 (0.80 → 1.0): Auth card slides in ─── */

    // Pan moves left
    tl.to(pan, {
      left: '28%',
      xPercent: -50,
      scale: 0.75,
      duration: 0.15,
      ease: 'power2.inOut',
    }, 0.80)

    // Auth card slides in from right
    if (authWrap) {
      tl.to(authWrap, {
        opacity: 1,
        x: 0,
        duration: 0.15,
        ease: 'power2.out',
      }, 0.84)
    }

    return () => {
      tl.kill()
      ScrollTrigger.getAll().forEach(st => st.kill())
    }
  }, [isMobile, reduced])

  /* ── Smooth-scroll to auth ── */
  const scrollToAuth = () => {
    if (isMobile || reduced) {
      const el = document.querySelector('.scroll-auth-wrap')
      el?.scrollIntoView({ behavior: 'smooth' })
    } else {
      // Scroll to 85% of scroll container to reveal auth
      const container = scrollRef.current
      if (container) {
        const target = container.offsetTop + container.scrollHeight * 0.85
        window.scrollTo({ top: target, behavior: 'smooth' })
      }
    }
  }

  return (
    <div className="landing-page font-inter">
      {/* ━━ Navbar ━━ */}
      <nav className="landing-nav" id="landing-navbar">
        <span className="logo font-playfair">FoodBridge AI</span>
        <div className="nav-links">
          <button
            className="sign-in-link font-space"
            onClick={scrollToAuth}
            id="nav-signin"
          >
            Sign In
          </button>
          <button
            className="join-btn font-space"
            onClick={scrollToAuth}
            id="nav-join"
          >
            Join Free
          </button>
        </div>
      </nav>

      {/* ━━ Scroll Container ━━ */}
      <div ref={scrollRef} className="scroll-container">
        <div className="scroll-scene">
          {/* Hero text block — left side */}
          <div className="hero-content-wrap">
            <p className="hero-label font-space">SAVING FOOD. SAVING LIVES.</p>
            <h1 className="hero-headline font-playfair">
              Every meal<br/>
              deserves a<br/>
              second chance.
            </h1>
            <p className="hero-subtext font-space">
              AI-powered food rescue connecting Bhopal's
              restaurants to shelters in real time.
            </p>
            <div className="hero-buttons">
              <button
                className="hero-btn-primary"
                onClick={() => navigate('/dashboard')}
                id="hero-donate"
              >
                Donate Food →
              </button>
              <button
                className="hero-btn-secondary"
                onClick={scrollToAuth}
                id="hero-find"
              >
                Find Food
              </button>
            </div>
          </div>

          {/* Chopping scene canvas */}
          <ChoppingScene ref={sceneRef} />

          {/* Auth card — animated in during Phase 4 */}
          <div className="scroll-auth-wrap">
            <AuthSection />
          </div>
        </div>
      </div>

      {/* ━━ How It Works ━━ */}
      <section className="how-it-works" id="how-it-works">
        <h2 className="section-title font-playfair">How It Works</h2>
        <div className="steps-grid">
          {[
            {
              num: 1,
              title: 'List Surplus Food',
              body: 'Restaurant lists surplus food with quantity, expiry time, and pickup location.',
            },
            {
              num: 2,
              title: 'Shelter Claims',
              body: 'Nearby shelter claims the listing and enters a delivery location for fulfillment.',
            },
            {
              num: 3,
              title: 'Driver Delivers',
              body: 'Driver picks up and delivers with real-time GPS navigation, ensuring freshness.',
            },
          ].map(s => (
            <div key={s.num} className="step-card" id={`step-${s.num}`}>
              <div className="step-number">{s.num}</div>
              <h3 className="step-title font-inter">{s.title}</h3>
              <p className="step-body font-space">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ━━ Impact Numbers ━━ */}
      <section className="impact-section" id="impact">
        <h2 className="section-title font-playfair">Our Impact</h2>
        <div className="impact-grid">
          <div className="impact-stat">
            <div className="impact-number font-playfair" ref={stat1}>0</div>
            <div className="impact-label font-space">kg food rescued potential</div>
          </div>
          <div className="impact-stat">
            <div className="impact-number font-playfair" ref={stat2}>0</div>
            <div className="impact-label font-space">restaurants in Bhopal</div>
          </div>
          <div className="impact-stat">
            <div className="impact-number font-playfair" ref={stat3}>0</div>
            <div className="impact-label font-space">children fed per night</div>
          </div>
        </div>
      </section>

      {/* ━━ Footer ━━ */}
      <footer className="landing-footer" id="landing-footer">
        <span className="footer-logo font-playfair">FoodBridge AI</span>
        <div className="footer-links">
          <a href="#about">About</a>
          <a href="#how-it-works">How it works</a>
          <a href="#join">Join as Driver</a>
          <a href="#contact">Contact</a>
        </div>
        <div className="footer-copy">
          © {new Date().getFullYear()} FoodBridge AI. Saving food, saving lives.
        </div>
      </footer>
    </div>
  )
}
