import Button from "../../components/common/Button";

export default function BigStartButton() {
  return (
    <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center">
      <Button size="lg" className="text-3xl px-10 py-5 rounded-xl animate-pulse" onClick={() => window.dispatchEvent(new CustomEvent("mm:create"))}>
        <svg className="w-12 h-12 mr-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14"/></svg>
        Tạo Mindmap ngay
      </Button>
    </div>
  );
}
