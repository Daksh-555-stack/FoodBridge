import { useNavigate } from 'react-router-dom'
import TruckScene from '../components/landing/TruckScene'
import AuthSection from '../components/landing/AuthSection'

export default function LandingPage() {
  const navigate = useNavigate()
  const scrollToAuth = () => {
    document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div
      className="landing-page"
      style={{
        background: '#1c1c1c',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <style>
        {`
          @keyframes bounce {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(8px); }
          }
        `}
      </style>

      <div
        className="scroll-container"
        style={{
          position: 'relative',
          height: '500vh',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <TruckScene />

          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <nav
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 40px',
                pointerEvents: 'auto',
              }}
            >
              <div
                style={{
                  color: '#10b981',
                  fontSize: '22px',
                  fontWeight: '700',
                  letterSpacing: '-0.02em',
                }}
              >
                FoodBridge AI
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  onClick={() => navigate('/login')}
                  style={{
                    background: 'transparent',
                    border: '1px solid #555',
                    color: '#ccc',
                    padding: '8px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Sign In
                </button>
                <button
                  onClick={scrollToAuth}
                  style={{
                    background: '#10b981',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                >
                  Join Free
                </button>
              </div>
            </nav>

            <div
              id="hero-text"
              style={{
                position: 'absolute',
                left: '5%',
                top: '50%',
                transform: 'translateY(-50%)',
                maxWidth: '420px',
              }}
            >
              <p
                style={{
                  color: '#10b981',
                  fontSize: '11px',
                  letterSpacing: '0.3em',
                  fontFamily: 'monospace',
                  marginBottom: '16px',
                }}
              >
                BHOPAL&apos;S FOOD RESCUE NETWORK
              </p>
              <h1
                style={{
                  color: '#ffffff',
                  fontSize: '52px',
                  fontWeight: '700',
                  lineHeight: '1.1',
                  marginBottom: '20px',
                  letterSpacing: '-0.03em',
                }}
              >
                Every meal
                <br />
                <span style={{ color: '#10b981', fontStyle: 'italic' }}>
                  deserves a
                </span>
                <br />
                second chance.
              </h1>
              <p
                style={{
                  color: '#888',
                  fontSize: '14px',
                  lineHeight: '1.7',
                  marginBottom: '28px',
                }}
              >
                AI-powered logistics connecting surplus food from restaurants to
                shelters - before it expires.
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  pointerEvents: 'auto',
                }}
              >
                <button
                  onClick={scrollToAuth}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 28px',
                    fontSize: '14px',
                    fontWeight: '600',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Donate Food →
                </button>
                <button
                  onClick={scrollToAuth}
                  style={{
                    background: 'transparent',
                    color: '#fff',
                    border: '1px solid #444',
                    padding: '12px 28px',
                    fontSize: '14px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Find Food
                </button>
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#555',
                fontSize: '12px',
                fontFamily: 'monospace',
                letterSpacing: '0.1em',
                animation: 'bounce 2s infinite',
              }}
            >
              SCROLL TO WATCH THE TRUCK DRIVE ↓
            </div>
          </div>
        </div>
      </div>

      <div
        id="auth-section"
        style={{
          background: '#161616',
          padding: '80px 40px',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <h2
          style={{
            color: '#fff',
            fontSize: '36px',
            fontWeight: '700',
            marginBottom: '12px',
            textAlign: 'center',
          }}
        >
          Join the Mission
        </h2>
        <p
          style={{
            color: '#888',
            fontSize: '14px',
            marginBottom: '48px',
            textAlign: 'center',
          }}
        >
          Register as a restaurant, shelter, or driver.
        </p>

        <AuthSection />
      </div>

      <div
        style={{
          background: '#1c1c1c',
          padding: '80px 40px',
        }}
      >
        <h2
          style={{
            color: '#fff',
            textAlign: 'center',
            fontSize: '32px',
            fontWeight: '700',
            marginBottom: '60px',
          }}
        >
          How It Works
        </h2>
        <div
          style={{
            display: 'flex',
            gap: '40px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            maxWidth: '900px',
            margin: '0 auto',
          }}
        >
          {[
            {
              step: '01',
              title: 'Restaurant lists food',
              desc: 'Add surplus food with expiry time and pickup location',
            },
            {
              step: '02',
              title: 'Shelter claims it',
              desc: 'Shelters see available food and claim with their location',
            },
            {
              step: '03',
              title: 'Driver delivers',
              desc: 'Driver gets GPS navigation to pick up and deliver',
            },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                background: '#242424',
                border: '1px solid #2e2e2e',
                borderRadius: '8px',
                padding: '32px 28px',
                flex: '1',
                minWidth: '240px',
                maxWidth: '280px',
              }}
            >
              <div
                style={{
                  color: '#10b981',
                  fontSize: '36px',
                  fontWeight: '700',
                  fontFamily: 'monospace',
                  marginBottom: '12px',
                }}
              >
                {item.step}
              </div>
              <h3
                style={{
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '8px',
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  color: '#888',
                  fontSize: '13px',
                  lineHeight: '1.6',
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
