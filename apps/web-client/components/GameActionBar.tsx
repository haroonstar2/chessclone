"use client";
export function GameActionBar() {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-3">
      <button
        className="flex-1 min-w-[80px] bg-red-50 text-red-700 font-medium py-2 px-3 rounded hover:bg-red-100 transition-colors border border-red-200"
        onClick={() => console.log("Resign")}
      >
        Resign
      </button>
      <button
        className="flex-1 min-w-[80px] bg-gray-50 text-gray-700 font-medium py-2 px-3 rounded hover:bg-gray-100 transition-colors border border-gray-300"
        onClick={() => console.log("Offer Draw")}
      >
        Offer Draw
      </button>
      <button
        className="flex-1 min-w-[80px] bg-gray-50 text-gray-400 font-medium py-2 px-3 rounded border border-gray-200 cursor-not-allowed opacity-60"
        disabled
        onClick={() => console.log("Takeback")}
      >
        Takeback
      </button>
    </div>
  );
}
