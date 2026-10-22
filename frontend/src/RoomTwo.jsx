import { useState } from 'react';

const SIZE = 5;

export default function RoomTwo({ onHome, onComplete }) {
  const [queens, setQueens] = useState(Array(SIZE).fill(null));
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function toggleSquare(row, col) {
    setQueens(previous => {
      const next = [...previous];
      next[row] = next[row] === col ? null : col;
      return next;
    });
    setMessage('');
  }

  async function submitPuzzle() {
    if (queens.some(col => col === null)) {
      setMessage('PLACE ALL 5 QUEENS BEFORE SUBMITTING.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(
        'http://localhost:8080/ServletApp/api/rooms/2/submit',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            queens: queens.map((col, row) => ({ row, col }))
          })
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        setMessage('SESSION EXPIRED. PLEASE LOG IN AGAIN.');
      } else if (!response.ok) {
        setMessage(data.message || 'SUBMISSION FAILED.');
      } else if (data.correct) {
        setMessage('ACCESS GRANTED. ROOM 2 COMPLETE!');
        if (onComplete) onComplete();
      } else {
        setMessage('ACCESS DENIED. RECONFIGURE THE BOARD.');
      }
    } catch (error) {
      console.error(error);
      setMessage('CONNECTION ERROR. CHECK THE JAVA SERVER.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="room-screen">
      <h1>ROOM 02: THE QUEEN'S PARADOX</h1>
      <p>Place 5 queens. No two queens may attack each other.</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          width: 'min(90vw, 400px)',
          margin: '24px auto',
          border: '2px solid #e879f9'
        }}
      >
        {Array.from({ length: 25 }, (_, index) => {
          const row = Math.floor(index / SIZE);
          const col = index % SIZE;
          const selected = queens[row] === col;

          return (
            <button
              key={index}
              onClick={() => toggleSquare(row, col)}
              aria-label={`Row ${row + 1}, column ${col + 1}${selected ? ', queen placed' : ''}`}
              style={{
                aspectRatio: '1',
                padding: 0,
                border: '1px solid #a855f7',
                background: (row + col) % 2 === 0
                  ? '#211333' : '#58316e',
                color: '#f0abfc',
                fontSize: 'clamp(24px, 7vw, 42px)',
                cursor: 'pointer'
              }}
            >
              {selected ? '♛' : ''}
            </button>
          );
        })}
      </div>

      <p>QUEENS PLACED: {queens.filter(c => c !== null).length}/5</p>

      <button onClick={submitPuzzle} disabled={loading}>
        {loading ? 'CHECKING...' : 'SUBMIT SOLUTION'}
      </button>

      <p role="status" aria-live="polite">{message}</p>

      <button onClick={onHome}>BACK</button>
    </main>
  );
}
