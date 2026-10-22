import { useEffect, useState } from 'react';
import './App.css';
import RoomOne from './RoomOne';
import RoomTwo from './RoomTwo';
import RoomThree from './RoomThree';
import Dashboard from './Dashboard';
import labImage from './assets/alien_room.jpg';
import roomOneImage from './assets/room1_neuro.jpg';
import dashboardImage from './assets/dashboard_bg.jpg';
import roomTwoImage from './assets/room3_bg.jpg';

const NEURO_LINES = [
  "Welcome, Player. I've been waiting for you.",
  'The lab has been sealed for a long time. Something in here is still awake.',
];

/* ---------- typewriter ---------- */

function useTypewriter(text, speed = 34, delay = 600) {
  const [output, setOutput] = useState('');

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reduceMotion) {
      setOutput(text);
      return;
    }

    setOutput('');
    let index = 0;
    let timer;

    const start = setTimeout(() => {
      timer = setInterval(() => {
        index += 1;
        setOutput(text.slice(0, index));
        if (index >= text.length) clearInterval(timer);
      }, speed);
    }, delay);

    return () => {
      clearTimeout(start);
      clearInterval(timer);
    };
  }, [text, speed, delay]);

  return output;
}

/* ---------- tiny pixel-art sprites (drawn from text grids) ---------- */

// Eye: only the top-left quarter is written, the rest is mirrored.
const EYE_HALF = [
  '.......kkkk',
  '.....kkwwww',
  '...kkwwwkkk',
  '..kwwwkvvvv',
  '.kwwwwkvvkk',
  'kwwwwwkvvkk',
];

function mirrorSprite(half) {
  const mirrorRow = (r) => r + r.slice(0, -1).split('').reverse().join('');
  const rows = half.map(mirrorRow);
  return [...rows, ...rows.slice(0, -1).reverse()];
}

const EYE = mirrorSprite(EYE_HALF);
const EYE_PALETTE = { k: '#08040f', w: '#ffe3f3', v: '#7a2dc6' };

const HEART = [
  '.kk.kk.',
  'kppkppk',
  'kpppppk',
  '.kpppk.',
  '..kpk..',
  '...k...',
];
const HEART_EMPTY = HEART.map((row) => row.replace(/p/g, 'e'));
const HEART_PALETTE = { k: '#08040f', p: '#ff3d9a', e: '#3a1058' };

function PixelSprite({ rows, palette, size = 8, className }) {
  const h = rows.length;
  const w = rows[0].length;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      width={w * size}
      height={h * size}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rows.flatMap((row, y) =>
        [...row].map((cell, x) =>
          palette[cell] ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="1"
              height="1"
              fill={palette[cell]}
            />
          ) : null
        )
      )}
    </svg>
  );
}

function WindowControls() {
  return (
    <span className="win-controls" aria-hidden="true">
      <i></i>
      <i></i>
      <i>x</i>
    </span>
  );
}

/* ---------- app ---------- */

function App() {
  const [backendMessage, setBackendMessage] = useState('Connecting to Neuro...');
  const [screen, setScreen] = useState('home');
  const [currentRoom, setCurrentRoom] = useState(1);
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  async function testBackend() {
    try {
      const response = await fetch(
        'http://localhost:8080/ServletApp/api/status'
      );

      if (!response.ok) {
        throw new Error('Backend request failed');
      }

      const data = await response.json();
      setBackendMessage(data.neuro);
    } catch (error) {
      setBackendMessage('Connection failed. Is Tomcat running?');
      console.error(error);
    }
  }

  const typedLine = useTypewriter(NEURO_LINES[0]);
  let bgImage = labImage;
  if (screen === 'dashboard') {
    bgImage = dashboardImage;
  } else if (screen === 'game') {
    bgImage = currentRoom === 2 ? roomTwoImage : roomOneImage;
  }

  const appClass = [
    'app',
    screen === 'game' ? 'in-room' : '',
    screen === 'game' && currentRoom === 2 ? 'room-two' : '',
    screen === 'dashboard' ? 'on-dashboard' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const goHome = (event) => {
    event.preventDefault();
    setScreen('home');
  };
  const API_BASE = 'http://localhost:8080/ServletApp/api';

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.loggedIn) {
            setLoggedInUser({
              username: data.username,
              playerId: data.playerId,
            });
          }
        }
      } catch (error) {
        console.error('Could not restore login session:', error);
      }
    }

    checkSession();
  }, []);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthMessage('');
    setAuthLoading(true);

    try {
      const endpoint =
        authMode === 'register' ? 'register' : 'login';

      const response = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthMessage(data.message || 'Authentication failed.');
        return;
      }

      if (authMode === 'register') {
        setAuthMessage('Account created! Please log in.');
        setAuthMode('login');
        setPassword('');
        return;
      }

      setLoggedInUser({
        username: data.username,
        playerId: data.playerId,
      });

      setPassword('');
      setAuthMessage('');
      setScreen('dashboard');
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthMessage(
        'Could not connect to the server. Check that Tomcat is running.'
      );
    } finally {
      setAuthLoading(false);
    }
  }


  async function handleLogout() {
    console.log('LOGOUT BUTTON CLICKED');

    try {
      const response = await fetch(
        'http://localhost:8080/ServletApp/api/auth/logout',
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      console.log('Logout response status:', response.status);

      if (!response.ok) {
        const message = await response.text();
        console.error('Logout failed:', message);
        alert(`Logout failed: HTTP ${response.status}`);
        return;
      }

      setLoggedInUser(null);
      setUsername('');
      setPassword('');
      setAuthMessage('');
      setScreen('home');

      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Could not contact the Java server. Check Tomcat.');
    }
  }

  return (
    <main className={appClass} style={{ '--bg-image': `url(${bgImage})` }}>
      <nav className="navbar">
        <a className="logo" href="#" onClick={goHome}>
          <span className="logo-icon">N</span>
          NEUROQUEST
        </a>

        <div className="nav-status">
          <span className="status-dot"></span>
          {loggedInUser
            ? `PLAYER: ${loggedInUser.username}`
            : 'SYSTEM ONLINE'}
        </div>


        {loggedInUser && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => setScreen('dashboard')}
          >
            DASHBOARD
          </button>
        )}


        {loggedInUser && (
          <button
            type="button"
            className="secondary-button"
            onClick={handleLogout}
          >
            LOGOUT
          </button>

        )}
      </nav>


      {screen === 'home' ? (
        /* ---------- HOME ---------- */
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">AN INTERACTIVE ESCAPE EXPERIENCE</div>

            <button className="primary-button" onClick={() => {
              if (loggedInUser) {
                setScreen('game');
              } else {
                setAuthMode('login');
                setAuthMessage('');
                setScreen('auth');
              }
            }}>
              PLAY
            </button>

            <h1>
              YOUR MIND IS
              <br />
              <span className="h1-second">THE KEY.</span>
            </h1>

            <p className="tagline">THINK BEYOND. SOLVE WITHIN.</p>

            <p className="description dialog">
              Three sealed rooms. Hidden clues. One intelligence that has been
              watching since the lights went out. Solve the puzzles and find
              out what the facility was built to keep underwater.
            </p>

            <div className="buttons">
              <button
                className="primary-button"
                onClick={() => {
                  if (loggedInUser) {
                    setScreen('game');
                  } else {
                    setAuthMode('login');
                    setAuthMessage('');
                    setScreen('auth');
                  }
                }}
              >
                START GAME <span>&gt;</span>
              </button>

              <button
                className="secondary-button"
                onClick={() => setScreen('about')}
              >
                ABOUT THE GAME
              </button>
            </div>

            <div className="game-meta">
              <span>3 CHALLENGES</span>
              <span>LOGIC &amp; MYSTERY</span>
              <span>EXPLORE AT YOUR PACE</span>
            </div>
          </div>

          <div className="window neuro-panel">
            <div className="window-title">
              <span>NEURO // AI INTERFACE</span>
              <WindowControls />
            </div>

            <div className="neuro-stage">
              <div className="stage-top">
                <div className="hearts" aria-hidden="true">
                  {[1, 1, 1, 1, 0].map((on, i) => (
                    <PixelSprite
                      key={i}
                      rows={on ? HEART : HEART_EMPTY}
                      palette={HEART_PALETTE}
                      size={4}
                    />
                  ))}
                </div>
                <span className="live-label">ACTIVE</span>
              </div>

              <PixelSprite
                className="pixel-eye"
                rows={EYE}
                palette={EYE_PALETTE}
                size={8}
              />

              <div className="neuro-label">NEURO</div>
              <div className="neuro-subtitle">VIRTUAL SYSTEM GUIDE</div>
            </div>

            <div className="terminal-message dialog" aria-live="polite">
              <span className="terminal-prefix">NEURO&gt; </span>
              {typedLine}
              <span className="terminal-cursor" aria-hidden="true"></span>
              <br />
              <br />
              <span className="terminal-muted">
                {NEURO_LINES[1]} Begin when you're ready.
              </span>
            </div>

            <div className="panel-footer">
              <span>CONNECTION ESTABLISHED</span>
              <span>v1.0.0</span>
            </div>
          </div>
          <div className="backend-test">
            <p>NEURO // BACKEND STATUS</p>

            <button onClick={testBackend}>
              TEST JAVA CONNECTION
            </button>

            <p>{backendMessage}</p>
          </div>
        </section>
      ) : screen === 'auth' ? (
        <section className="message-screen">
          <div className="window auth-window">
            <div className="window-title">
              <span>
                NEURO // PLAYER {authMode === 'register' ? 'REGISTRATION' : 'LOGIN'}
              </span>
              <WindowControls />
            </div>

            <div className="window-body">
              <h2>
                {authMode === 'register'
                  ? 'CREATE YOUR ACCOUNT.'
                  : 'IDENTIFY YOURSELF.'}
              </h2>

              <p className="dialog">
                {authMode === 'register'
                  ? 'Create your player account to begin your journey.'
                  : 'Log in to continue into the facility.'}
              </p>

              <form className="auth-form" onSubmit={handleAuthSubmit}>
                <label htmlFor="username">PLAYER USERNAME</label>
                <input
                  id="username"
                  className="auth-input"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  minLength={3}
                  maxLength={30}
                  pattern="[A-Za-z0-9_]{3,30}"
                  autoComplete="username"
                  required
                />

                <label htmlFor="password">PASSWORD</label>
                <input
                  id="password"
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  maxLength={72}
                  autoComplete={
                    authMode === 'register'
                      ? 'new-password'
                      : 'current-password'
                  }
                  required
                />

                {authMessage && (
                  <p className="auth-message" role="status">
                    {authMessage}
                  </p>
                )}

                <button
                  className="primary-button"
                  type="submit"
                  disabled={authLoading}
                >
                  {authLoading
                    ? 'PLEASE WAIT...'
                    : authMode === 'register'
                      ? 'CREATE ACCOUNT'
                      : 'LOGIN & ENTER'}
                </button>
              </form>

              <p className="auth-switch">
                {authMode === 'register'
                  ? 'Already registered?'
                  : 'New player?'}
                {' '}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => {
                    setAuthMode(
                      authMode === 'register' ? 'login' : 'register'
                    );
                    setAuthMessage('');
                  }}
                >
                  {authMode === 'register' ? 'Log in' : 'Create account'}
                </button>
              </p>

              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setAuthMessage('');
                  setScreen('home');
                }}
              >
                &lt; BACK HOME
              </button>
            </div>
          </div>
        </section>
      ) : screen === 'dashboard' ? (
        <Dashboard
          user={loggedInUser}
          onHome={() => setScreen('home')}
          onPlay={() => {
            setCurrentRoom(1);
            setScreen('game');
          }}
        />

      ) : screen === 'game' ? (
        currentRoom === 1 ? (
          <RoomOne
            onHome={() => setScreen('home')}
            onNext={() => setCurrentRoom(2)}
          />
        ) : currentRoom === 2 ? (
          <RoomTwo
            onHome={() => setScreen('home')}
            onComplete={() => setCurrentRoom(3)}
          />
        ) : (
          <RoomThree
            onHome={() => setScreen('home')}
            onComplete={() => console.log('All rooms completed!')}
          />
        )
      ) : (
        <section className="message-screen">
          <div className="window">
            <div className="window-title">
              <span>NEURO // SYSTEM MESSAGE</span>
              <WindowControls />
            </div>
            <div className="window-body">
              <h2>ENTER THE UNKNOWN.</h2>
              <p className="dialog">
                Explore mysterious rooms, solve logical puzzles, collect clues,
                and uncover the secrets of the facility.
              </p>
              <button
                className="primary-button"
                onClick={() => setScreen('home')}
              >
                &lt; BACK HOME
              </button>
            </div>
          </div>
        </section>
      )}


      <footer className="footer">
        <span>NEUROQUEST © 2026</span>
        <span>THINK BEYOND. SOLVE WITHIN.</span>
        <span>BUILT FOR THE CURIOUS.</span>
      </footer>

      <div className="crt" aria-hidden="true"></div>
    </main>
  );
}

export default App;








