export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header Profile Section */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center md:items-start">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-300 rounded-lg overflow-hidden shrink-0 shadow-md">
            {/* Avatar placeholder */}
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">chessmaster99</h1>
              <div className="w-6 h-4 bg-gray-300 rounded" title="Country Flag Placeholder"></div>
            </div>

            <p className="text-gray-600 mb-4 max-w-lg">
              Bio placeholder: Passionate chess player from New York. Always looking for a good game. e4 best by test!
            </p>

            <div className="text-sm text-gray-500 font-medium">
              Joined: <span className="text-gray-700">January 2023</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 md:p-8 mt-4 flex flex-col gap-8">

        {/* Rating Statistics Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col items-center">
              <h3 className="text-gray-500 font-semibold mb-2">Bullet</h3>
              <div className="text-3xl font-bold text-gray-900 mb-4">1350</div>
              <div className="w-full flex justify-between text-sm">
                <span className="text-green-600 font-medium">45W</span>
                <span className="text-gray-500 font-medium">10D</span>
                <span className="text-red-600 font-medium">32L</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col items-center">
              <h3 className="text-gray-500 font-semibold mb-2">Blitz</h3>
              <div className="text-3xl font-bold text-gray-900 mb-4">1500</div>
              <div className="w-full flex justify-between text-sm">
                <span className="text-green-600 font-medium">120W</span>
                <span className="text-gray-500 font-medium">45D</span>
                <span className="text-red-600 font-medium">110L</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col items-center">
              <h3 className="text-gray-500 font-semibold mb-2">Rapid</h3>
              <div className="text-3xl font-bold text-gray-900 mb-4">1620</div>
              <div className="w-full flex justify-between text-sm">
                <span className="text-green-600 font-medium">80W</span>
                <span className="text-gray-500 font-medium">30D</span>
                <span className="text-red-600 font-medium">55L</span>
              </div>
            </div>

          </div>
        </section>

        {/* Match History Table */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Match History</h2>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Opponent</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Result</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Rating +/-</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Type</th>
                    <th className="px-6 py-4 font-semibold text-gray-600 text-sm text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">grandmaster123</div>
                      <div className="text-sm text-gray-500">1600</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Won
                      </span>
                    </td>
                    <td className="px-6 py-4 text-green-600 font-medium">+8</td>
                    <td className="px-6 py-4 text-gray-600">10 min Rapid</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Inspect Game</button>
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">noobslayer</div>
                      <div className="text-sm text-gray-500">1450</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Lost
                      </span>
                    </td>
                    <td className="px-6 py-4 text-red-600 font-medium">-7</td>
                    <td className="px-6 py-4 text-gray-600">3 min Blitz</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Inspect Game</button>
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">chessbot_alpha</div>
                      <div className="text-sm text-gray-500">1520</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Draw
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">+1</td>
                    <td className="px-6 py-4 text-gray-600">5 min Blitz</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Inspect Game</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Pagination placeholder */}
            <div className="bg-gray-50 px-6 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">Showing 1 to 3 of 42 matches</div>
              <div className="flex gap-2">
                <button className="px-3 py-1 border rounded bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium" disabled>Previous</button>
                <button className="px-3 py-1 border rounded bg-white text-gray-600 hover:bg-gray-50 text-sm font-medium">Next</button>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
