'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

type MatchmakingState = 'idle' | 'searching';

const TIME_CONTROLS = [
  { label: '1 min', sub: 'Bullet', value: '1m' },
  { label: '3 min', sub: 'Blitz', value: '3m' },
  { label: '5 min', sub: 'Blitz', value: '5m' },
  { label: '10 min', sub: 'Rapid', value: '10m' },
  { label: 'Custom', sub: 'Challenge', value: 'custom' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<MatchmakingState>('idle');
  const [activeTimeControl, setActiveTimeControl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/matchmaking/status', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'MATCHED' && data.gameId) {
          stopPolling();
          setState('idle');
          router.push(`/game/${data.gameId}`);
        }
      } catch {
        // ignore polling errors
      }
    }, 2000);
  }, [router, stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleJoin = async (timeControl: string) => {
    try {
      const res = await fetch('/matchmaking/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ timeControl }),
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.status === 'MATCHED' && data.gameId) {
        router.push(`/game/${data.gameId}`);
      } else {
        setActiveTimeControl(timeControl);
        setState('searching');
        startPolling();
      }
    } catch {
      // ignore
    }
  };

  const handleCancel = async () => {
    stopPolling();
    setState('idle');
    if (activeTimeControl) {
      try {
        await fetch(
          `/matchmaking/leave?timeControl=${encodeURIComponent(activeTimeControl)}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          },
        );
      } catch {
        // ignore
      }
    }
    setActiveTimeControl(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <header className="w-full bg-white shadow-sm border-b p-4 flex justify-between items-center max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
          <div>
            <div className="font-semibold text-gray-800">chessmaster99</div>
            <div className="text-sm text-gray-500">Rating: 1500</div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl p-4 md:p-8 flex flex-col md:flex-row gap-8">
        <div className="flex-1 flex flex-col gap-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">Quick Play</h2>

            {state === 'searching' ? (
              <div className="bg-white border rounded-lg p-6 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-700 font-medium">
                    Searching for opponent...
                  </span>
                </div>
                <button
                  onClick={handleCancel}
                  className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {TIME_CONTROLS.map((tc) => (
                  <button
                    key={tc.value}
                    onClick={() => handleJoin(tc.value)}
                    className="bg-white border rounded-lg p-4 text-center hover:bg-gray-50 shadow-sm transition-colors"
                  >
                    <div className="font-semibold text-lg">{tc.label}</div>
                    <div className="text-sm text-gray-500">{tc.sub}</div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Recent Matches</h2>
            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-4 font-semibold text-gray-700">Opponent</th>
                    <th className="p-4 font-semibold text-gray-700">Result</th>
                    <th className="p-4 font-semibold text-gray-700 hidden sm:table-cell">Time Control</th>
                    <th className="p-4 font-semibold text-gray-700 hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium">grandmaster123</div>
                      <div className="text-sm text-gray-500">1600</div>
                    </td>
                    <td className="p-4 text-green-600 font-semibold">Win</td>
                    <td className="p-4 hidden sm:table-cell">10 min Rapid</td>
                    <td className="p-4 hidden sm:table-cell text-gray-500">Oct 24, 2023</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium">noobslayer</div>
                      <div className="text-sm text-gray-500">1450</div>
                    </td>
                    <td className="p-4 text-red-600 font-semibold">Loss</td>
                    <td className="p-4 hidden sm:table-cell">3 min Blitz</td>
                    <td className="p-4 hidden sm:table-cell text-gray-500">Oct 23, 2023</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium">chessbot_alpha</div>
                      <div className="text-sm text-gray-500">1520</div>
                    </td>
                    <td className="p-4 text-gray-600 font-semibold">Draw</td>
                    <td className="p-4 hidden sm:table-cell">5 min Blitz</td>
                    <td className="p-4 hidden sm:table-cell text-gray-500">Oct 21, 2023</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="w-full md:w-80">
          <section className="bg-white border rounded-lg shadow-sm p-4 sticky top-4">
            <h2 className="text-xl font-bold mb-4">Top Players</h2>
            <ul className="space-y-4">
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-400">1</span>
                  <div className="font-medium">MagnusCarlsen</div>
                </div>
                <div className="font-bold">2882</div>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-400">2</span>
                  <div className="font-medium">HikaruNakamura</div>
                </div>
                <div className="font-bold">2800</div>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-400">3</span>
                  <div className="font-medium">FabianoCaruana</div>
                </div>
                <div className="font-bold">2795</div>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
