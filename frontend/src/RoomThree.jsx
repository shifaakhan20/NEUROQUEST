
import { useState } from 'react';

const STAGES = [
  {
    title: 'STAGE 01 // SIGNAL INTERCEPT',
    description:
      'The intercepted transmission uses a Caesar cipher. Every letter was shifted FORWARD by 3 positions. Reverse the shift to decode the message.',
    encrypted: 'FRGH',
    hint: 'Move each letter 3 positions BACKWARD in the alphabet.',
    placeholder: 'Enter the decoded word',
    type: 'text',
  },
  {
    title: 'STAGE 02 // LOGIC FIREWALL',
    description:
      'Three servers—A, B and C—have different access codes: 4, 7 and 9. Each server has exactly one code.',
    encrypted: 'Find the code',
    hint: 'A = 4. B is greater than A. C is not 9.',
    placeholder: 'Enter the code for server B',
    type: 'number',
  },
  {
    title: 'STAGE 03 // CORE OVERRIDE',
    description:
      'Calculate the core key using the number of letters in the decoded word from Stage 1 multiplied by the server B code from Stage 2.',
    encrypted: 'CORE KEY = letters × server B code',
    hint: 'CODE has 4 letters. Multiply 4 by 9.',
    placeholder: 'Enter the core key',
    type: 'number',
  },
];

export default function RoomThree({ onHome, onComplete }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);

  const stage = STAGES[stageIndex];

  async function submitAnswer(event) {
    event.preventDefault();

    if (!answer.trim() || loading || finished) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(
        'http://localhost:8080/ServletApp/api/rooms/3/submit',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            stage: stageIndex + 1,
            answer: answer.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || 'Submission failed.');
        return;
      }

      if (!data.correct) {
        setMessage(
          'ACCESS DENIED // ' + (data.message || 'Try again.')
        );
        return;
      }

      if (stageIndex < STAGES.length - 1) {
        setMessage(
          'SECURITY LAYER BYPASSED // Next layer unlocked.'
        );
        setStageIndex((current) => current + 1);
        setAnswer('');
        setShowHint(false);
      } else if (data.completed) {
        setFinished(true);
        setMessage(
          'CORE OVERRIDE ACCEPTED // BREACH PROTOCOL COMPLETE.'
        );
      } else {
        setMessage(
          'Stage accepted, but final completion was not confirmed.'
        );
      }
    } catch (error) {
      console.error('Room 3 submission failed:', error);
      setMessage(
        'CONNECTION ERROR // Check that the Java server is running.'
      );
    } finally {
      setLoading(false);
    }
  }

  function playAgain() {
    setStageIndex(0);
    setAnswer('');
    setMessage('');
    setShowHint(false);
    setFinished(false);
  }

  return (
    <main className="room-screen breach-screen">
      <p className="breach-eyebrow">
        NEUROQUEST // RESTRICTED ACCESS
      </p>

      <h1>ROOM 03: THE BREACH PROTOCOL</h1>

      <p className="breach-subtitle">
        Three security layers stand between you and the central system.
        Break through all three to complete the mission.
      </p>

      <section className="breach-status">
        <span>SECURITY LEVEL</span>
        <strong>{finished ? 'OVERRIDDEN' : 'OMEGA'}</strong>
        <span>
          THREAT STATUS: {finished ? 'NEUTRALIZED' : 'ACTIVE'}
        </span>
      </section>

      <div
        className="breach-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={3}
        aria-valuenow={finished ? 3 : stageIndex}
        aria-label="Security stages completed"
      >
        <div
          className="breach-progress-fill"
          style={{
            width: `${(finished ? 3 : stageIndex) / 3 * 100}%`,
          }}
        />
      </div>

      <div className="breach-stage-labels">
        <span className={stageIndex >= 1 || finished ? 'stage-cleared' : ''}>
          01 SIGNAL
        </span>
        <span className={stageIndex >= 2 || finished ? 'stage-cleared' : ''}>
          02 LOGIC
        </span>
        <span className={finished ? 'stage-cleared' : ''}>
          03 CORE
        </span>
      </div>

      {!finished ? (
        <section className="breach-panel">
          <p className="breach-stage-count">
            SECURITY LAYER {String(stageIndex + 1).padStart(2, '0')} / 03
          </p>

          <h2>{stage.title}</h2>
          <p>{stage.description}</p>

          <div className="breach-puzzle-display">
            {stage.encrypted}
          </div>

          <form onSubmit={submitAnswer}>
            <label htmlFor="breach-answer">ACCESS KEY</label>

            <input
              id="breach-answer"
              type={stage.type}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder={stage.placeholder}
              autoComplete="off"
              required
              disabled={loading}
            />

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading ? 'VERIFYING...' : 'VERIFY ACCESS →'}
            </button>
          </form>

          <button
            type="button"
            className="breach-hint-button"
            onClick={() => setShowHint((current) => !current)}
          >
            {showHint ? 'HIDE HINT' : 'REQUEST HINT'}
          </button>

          {showHint && (
            <p className="breach-hint">
              HINT // {stage.hint}
            </p>
          )}
        </section>
      ) : (
        <section className="breach-success-screen">
          <div className="success-icon">✓</div>

          <p className="success-eyebrow">
            NEUROQUEST // MISSION REPORT
          </p>

          <h2>MISSION ACCOMPLISHED</h2>

          <p className="success-description">
            Central system breached. All security layers have been
            successfully overridden.
          </p>

          <div className="success-stats">
            <div className="success-stat">
              <span>STAGES CLEARED</span>
              <strong>03 / 03</strong>
            </div>

            <div className="success-stat">
              <span>MISSION STATUS</span>
              <strong>COMPLETE</strong>
            </div>

            <div className="success-stat">
              <span>FINAL CORE KEY</span>
              <strong>36</strong>
            </div>
          </div>

          <div className="success-message">
            <span>✓</span> SIGNAL INTERCEPT COMPLETE
            <br />
            <span>✓</span> LOGIC FIREWALL BYPASSED
            <br />
            <span>✓</span> CORE OVERRIDE ACCEPTED
          </div>

          <p className="success-footer">
            YOU HAVE COMPLETED THE BREACH PROTOCOL.
          </p>

          <div className="success-actions">
            <button
              type="button"
              className="primary-button"
              onClick={onHome}
            >
              RETURN TO DASHBOARD →
            </button>

            <button
              type="button"
              className="success-replay-button"
              onClick={playAgain}
            >
              ↻ PLAY AGAIN
            </button>
          </div>
        </section>
      )}

      <p className="breach-message" role="status" aria-live="polite">
        {message}
      </p>

      {!finished && (
        <button
          type="button"
          className="secondary-button"
          onClick={onHome}
        >
          ← BACK HOME
        </button>
      )}
    </main>
  );
}
