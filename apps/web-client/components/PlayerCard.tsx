interface PlayerCardProps {
  username: string;
  rating: number;
  timeRemaining: string;
  isActive: boolean;
  avatarUrl?: string;
}

export function PlayerCard({ username, rating, timeRemaining, isActive, avatarUrl }: PlayerCardProps) {
  return (
    <div data-testid="player-card" className={`bg-white p-3 md:p-4 rounded-lg shadow-sm border flex items-center justify-between ${isActive ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex items-center gap-3 md:gap-4">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-300 rounded-lg overflow-hidden shrink-0">
          {avatarUrl ? (
             <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
               </svg>
            </div>
          )}
        </div>
        <div>
          <div className="font-semibold text-gray-900 truncate max-w-[120px] md:max-w-[200px]">{username}</div>
          <div className="text-sm text-gray-500">({rating})</div>
        </div>
      </div>

      <div className={`font-mono text-xl md:text-2xl font-bold px-3 py-1 rounded ${isActive ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-700'}`}>
        {timeRemaining}
      </div>
    </div>
  );
}
