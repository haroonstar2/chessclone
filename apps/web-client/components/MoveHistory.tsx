interface MoveHistoryProps {
  moves: Array<{ white: string; black?: string }>;
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  return (
    <div data-testid="move-history" className="overflow-y-auto flex-1 p-0">
      <table className="w-full text-sm text-left">
        <tbody className="divide-y divide-gray-100">
          {moves.map((move, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="w-12 py-2 px-4 text-gray-400 font-medium text-right border-r border-gray-100 bg-gray-50/50">
                {index + 1}.
              </td>
              <td className="w-1/2 py-2 px-4 font-medium text-gray-800 hover:bg-gray-200 cursor-pointer">
                {move.white}
              </td>
              <td className="w-1/2 py-2 px-4 font-medium text-gray-800 hover:bg-gray-200 cursor-pointer">
                {move.black || ""}
              </td>
            </tr>
          ))}
          {/* Fill empty space if few moves */}
          {moves.length < 15 && Array.from({ length: 15 - moves.length }).map((_, i) => (
            <tr key={`empty-${i}`} className={(moves.length + i) % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="w-12 py-2 px-4 border-r border-gray-100 bg-gray-50/50">&nbsp;</td>
              <td className="w-1/2 py-2 px-4">&nbsp;</td>
              <td className="w-1/2 py-2 px-4">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
