import { useState } from 'react';

function RoomOne({ onHome, onNext }) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [hintLevel, setHintLevel] = useState(0);
  const [solved, setSolved] = useState(false);


  const checkAnswer = async (event) => {
    event.preventDefault();
    setFeedback('');

    try {
      const response = await fetch(
        'http://localhost:8080/ServletApp/api/rooms/1/submit',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ answer }),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        setFeedback('SESSION EXPIRED. Please log in again.');
        return;
      }

      if (!response.ok) {
        setFeedback(data.message || 'Could not save your answer.');
        return;
      }

      if (data.correct) {
        setSolved(true);
        setFeedback(
          'ACCESS GRANTED. The experiment chamber is unlocked.'
        );
      } else {
        setFeedback(
          'ACCESS DENIED. That sequence does not match. Try again.'
        );
      }
    } catch (error) {
      console.error('Puzzle submission failed:', error);
      setFeedback(
        'CONNECTION ERROR. Check that the Java server is running.'
      );
    }
  };

  const showHint = () => {
    if (hintLevel === 0) {
      setFeedback(
        'NEURO: Observe how the difference changes between each number.'
      );
      setHintLevel(1);
    } else {
      setFeedback(
        'NEURO: The differences are +4, +6, +8. What comes after +8?'
      );
      setHintLevel(2);
    }
  };

  const resetRoom = () => {
    setAnswer('');
    setFeedback('');
    setHintLevel(0);
    setSolved(false);
  };

  return (
    <section className="room-screen">
      <div className="room-topbar">
        <button className="room-back" onClick={onHome}>
          ← MAIN MENU
        </button>
        <span className="room-status">
          ● EXPERIMENT 01 // ACTIVE
        </span>
      </div>

      <div className="room-heading">
        <p className="room-eyebrow">
          NEUROQUEST // RESEARCH FACILITY
        </p>

        <h1 className="room-title">
          ROOM 01:
          <br />
          <span>THE AWAKENING</span>
        </h1>

        <p className="room-description">
          The facility has lost contact with the outside world.
          The exit is locked, and the security terminal demands
          a sequence to restore access.
        </p>
      </div>

      <div className="room-layout">
        <div className="puzzle-panel">
          <div className="room-panel-heading">
            <span>SECURITY TERMINAL</span>
            <span>LOCKED</span>
          </div>

          {!solved ? (
            <>
              <p className="puzzle-instruction">
                Find the missing number in this sequence:
              </p>

              <div className="number-sequence">
                <span>2</span>
                <span>6</span>
                <span>12</span>
                <span>20</span>
                <span className="missing-number">?</span>
              </div>

              <p className="puzzle-note">
                Every number follows the same hidden rule.
                Find the next number to unlock the terminal.
              </p>

              <form onSubmit={checkAnswer} className="answer-form">
                <label htmlFor="puzzle-answer">
                  ENTER ACCESS CODE
                </label>

                <input
                  id="puzzle-answer"
                  type="number"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Enter your answer..."
                  autoComplete="off"
                  required
                />

                <button className="room-primary-button" type="submit">
                  SUBMIT CODE →
                </button>
              </form>

              <button className="room-hint-button" onClick={showHint}>
                ? REQUEST A HINT FROM NEURO
              </button>
            </>
          ) : (
            <div className="success-panel">
              <div className="success-symbol">✓</div>
              <h2>ACCESS GRANTED</h2>
              <p>
                The terminal flashes green. The security lock
                disengages, and the next door begins to open.
              </p>
              <p className="room-score">ROOM 01 COMPLETE</p>

              {onNext && (
                <button
                  className="primary-button"
                  onClick={onNext}
                >
                  CONTINUE TO ROOM 2 &gt;
                </button>
              )}

              <button
                className="room-primary-button"
                onClick={onHome}
              >
                RETURN TO MAIN MENU
              </button>

              <button className="room-hint-button" onClick={resetRoom}>
                REPLAY ROOM 01
              </button>
            </div>
          )}

          {feedback && (
            <div
              className={`room-feedback ${solved ? 'feedback-success' : ''}`}
              role="status"
              aria-live="polite"
            >
              <span>NEURO &gt;</span> {feedback}
            </div>
          )}
        </div>

        <aside className="room-neuro-panel">
          <div className="room-panel-heading">
            <span>NEURO // GUIDE</span>
            <span>ONLINE</span>
          </div>

          <div className="room-neuro-orb">N</div>

          <h2>NEURO</h2>
          <p className="room-neuro-role">VIRTUAL SYSTEM GUIDE</p>

          <div className="room-dialogue">
            <span>NEURO &gt;</span>
            "Interesting. The terminal is testing your ability to
            recognise patterns. Think carefully, Player."
          </div>

          <p className="room-small-note">
            HINTS USED: {hintLevel} / 2
          </p>
        </aside>
      </div>
    </section>
  );
}

export default RoomOne;
