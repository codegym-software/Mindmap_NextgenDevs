import Button from "../../components/common/Button";
import { Plus, Brain, FileText, Network } from "lucide-react";

export default function BigStartButton() {
  return (
    <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="max-w-4xl w-full text-center">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Bắt đầu tạo Mindmap
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Biến ý tưởng thành hành động với sơ đồ tư duy trực quan
          </p>
          
          {/* Main CTA */}
          <Button 
            size="lg" 
            className="text-lg px-8 py-4 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            onClick={() => window.dispatchEvent(new CustomEvent("mm:create"))}
          >
            <Plus className="w-6 h-6 mr-2" />
            Tạo Mindmap mới
          </Button>
        </div>

        {/* Templates/Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="pro-panel p-6 hover:shadow-xl transition-all duration-200 cursor-pointer group">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors flex items-center justify-center">
              <Brain className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Brainstorming</h3>
            <p className="text-sm text-gray-600">Thu thập và tổ chức ý tưởng sáng tạo</p>
          </div>

          <div className="pro-panel p-6 hover:shadow-xl transition-all duration-200 cursor-pointer group">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-green-50 group-hover:bg-green-100 transition-colors flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Kế hoạch dự án</h3>
            <p className="text-sm text-gray-600">Lập kế hoạch và theo dõi tiến độ</p>
          </div>

          <div className="pro-panel p-6 hover:shadow-xl transition-all duration-200 cursor-pointer group">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-purple-50 group-hover:bg-purple-100 transition-colors flex items-center justify-center">
              <Network className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Sơ đồ tổ chức</h3>
            <p className="text-sm text-gray-600">Xây dựng cấu trúc và phân cấp</p>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-12 text-sm text-gray-500">
          💡 <span className="font-medium">Mẹo:</span> Nhấn <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-xs font-mono">Tab</kbd> để thêm node con, 
          <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-xs font-mono ml-1">Enter</kbd> để thêm node anh em
        </div>
      </div>
    </div>
  );
}