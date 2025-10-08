import Button from "../common/Button";

export default function BigStartButton() {
  return (
    <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center">
      <Button size="lg" className="text-2xl px-12 py-6 rounded-xl animate-pulse" onClick={() => window.dispatchEvent(new CustomEvent("mm:create"))}>
        <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14"/></svg>
        Bắt đầu tạo Mindmap ngay
      </Button>
    </div>
  );
}
