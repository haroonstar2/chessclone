export default function DashboardPage() {
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <button className="bg-white border rounded-lg p-4 text-center hover:bg-gray-50 shadow-sm transition-colors">
                <div className="font-semibold text-lg">1 min</div>
                <div className="text-sm text-gray-500">Bullet</div>
              </button>
              <button className="bg-white border rounded-lg p-4 text-center hover:bg-gray-50 shadow-sm transition-colors">
                <div className="font-semibold text-lg">3 min</div>
                <div className="text-sm text-gray-500">Blitz</div>
              </button>
              <button className="bg-white border rounded-lg p-4 text-center hover:bg-gray-50 shadow-sm transition-colors">
                <div className="font-semibold text-lg">5 min</div>
                <div className="text-sm text-gray-500">Blitz</div>
              </button>
              <button className="bg-white border rounded-lg p-4 text-center hover:bg-gray-50 shadow-sm transition-colors">
                <div className="font-semibold text-lg">10 min</div>
                <div className="text-sm text-gray-500">Rapid</div>
              </button>
              <button className="bg-white border rounded-lg p-4 text-center hover:bg-gray-50 shadow-sm transition-colors col-span-2 sm:col-span-1">
                <div className="font-semibold text-lg">Custom</div>
                <div className="text-sm text-gray-500">Challenge</div>
              </button>
            </div>
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
