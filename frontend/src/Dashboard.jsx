import { useEffect, useState } from 'react';
import './App.css';

const API = 'http://localhost:8080/ServletApp/api';

export default function Dashboard({ user, onPlay, onHome }) {
  const [rooms, setRooms] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

useEffect(() => {
  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');

      const [roomsResponse, progressResponse] = await Promise.all([
        fetch(`${API}/rooms`, { credentials: 'include' }),
        fetch(`${API}/rooms/progress`, { credentials: 'include' })
      ]);

      if (!roomsResponse.ok || !progressResponse.ok) {
        throw new Error('Could not sync with the server.');
      }

      const roomsData = await roomsResponse.json();
      const progressData = await progressResponse.json();

      setRooms(Array.isArray(roomsData) ? roomsData : roomsData.rooms || []);
      setProgress(progressData.rooms || []);
    } catch (err) {
      console.error('Dashboard loading failed:', err);
      setError(err.message || 'Failed to load dashboard progress.');
    } finally {
      setLoading(false);
    }
  }

  loadDashboard();
}, []);

    
  const isComplete = (item) =>
    item.completed === true ||
    item.isCompleted === true ||
    item.completed === 1 ||
    item.status === 'completed' ||
    item.status === 'COMPLETED' ||
    Boolean(item.completedAt);

  const roomNumber = (item) =>
    Number(item.roomNumber ?? item.room_number ?? item.roomId ?? item.room_id);

  const completedNumbers = new Set(
    progress.filter(isComplete).map(roomNumber)
  );

  const completedCount = completedNumbers.size;
  const totalRooms = rooms.length || 3;
  const percentage = Math.min(
    100,
    Math.round((completedCount / totalRooms) * 100)
  );

  return (
    <section className="dashboard-screen">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">NEURO // PLAYER TERMINAL</p>
          <h1>WELCOME BACK, {user?.username || 'PLAYER'}.</h1>
          <p className="dashboard-subtitle">
            Your journey through the facility continues.
          </p>
        </div>

        <button className="secondary-button" onClick={onHome}>
          HOME
        </button>
      </div>

      <div className="dashboard-stats">
        <article className="dashboard-card">
          <span>ROOMS CLEARED</span>
          <strong>{completedCount} / {totalRooms}</strong>
        </article>

        <article className="dashboard-card">
          <span>OVERALL PROGRESS</span>
          <strong>{percentage}%</strong>
        </article>

        <article className="dashboard-card">
          <span>PLAYER STATUS</span>
          <strong className="online-label">ONLINE</strong>
        </article>
      </div>

      <div className="dashboard-progress-track">
        <div
          className="dashboard-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="dashboard-section-heading">
        <h2>YOUR CHALLENGES</h2>
        <span>3 ROOMS DETECTED</span>
      </div>

      {loading && <p className="dashboard-message">SYNCING WITH NEURO...</p>}

      {error && (
        <p className="dashboard-message dashboard-error">
          {error} Check that Tomcat is running and your session is active.
        </p>
      )}

      {!loading && !error && (
        <div className="dashboard-rooms">
          {[
            { number: 1, name: 'The First Signal', hint: 'LOGIC CHALLENGE' },
            { number: 2, name: 'The Queens Paradox', hint: 'CHESS & LOGIC' },
            { number: 3, name: 'The Final Sequence', hint: 'PATTERN RECOGNITION' },
          ].map((room) => {
            const complete = completedNumbers.has(room.number);

            return (
              <article className="dashboard-room" key={room.number}>
                <div className="dashboard-room-number">
                  0{room.number}
                </div>

                <div className="dashboard-room-info">
                  <span>{room.hint}</span>
                  <h3>{room.name}</h3>
                  <p>{complete ? 'ACCESS GRANTED' : 'AWAITING CLEARANCE'}</p>
                </div>

                <span className={complete ? 'room-status complete' : 'room-status'}>
                  {complete ? 'CLEARED' : 'PENDING'}
                </span>
              </article>
            );
          })}
        </div>
      )}

      <button className="primary-button dashboard-play" onClick={onPlay}>
        {completedCount === totalRooms ? 'REPLAY CHALLENGES' : 'CONTINUE MISSION'} →
      </button>
    </section>
  );
}
