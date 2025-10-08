export default function DisplaySwitcher({ onPick }: { onPick: (mode: "tree"|"lr"|"radial") => void }) {
  return (
    <div className="fixed bottom-3 inset-x-0 flex items-center justify-center z-40">
      <div className="bg-gray-900/80 backdrop-blur-md rounded-full p-2">
        <button onClick={() => onPick("tree")} className="px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-white mx-1">Tree</button>
        <button onClick={() => onPick("lr")} className="px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-white mx-1">Trái-Phải</button>
        <button onClick={() => onPick("radial")} className="px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-white mx-1">Tỏa đều</button>
      </div>
    </div>
  );
}
