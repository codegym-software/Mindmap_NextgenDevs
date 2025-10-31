// ... (imports)
import { Sun, Moon, Share2, Undo, Redo, Save, PanelRight, Home, Settings, LogOut, LogIn, UserPlus, User as UserIcon, Download } from 'lucide-react'; // Thêm Download

// ... (UserAvatarMenu)

// --- Editor Toolbar Props ---
interface EditorToolbarProps {
    initialName: string;
    onSaveName: (newName: string) => void;
    onShare: () => void;
    onSaveMindmap: () => void;
    onExport: () => void; // Thêm callback export
    onToggleStylePanel: () => void;
}

// --- Editor Toolbar Component ---
const EditorToolbar: React.FC<EditorToolbarProps> = ({
    initialName, onSaveName, onShare, onSaveMindmap, onExport, onToggleStylePanel
}) => {
    // ... (state, effects, handlers không đổi)
    
    // ... (canUndo, canRedo)

    return (
        <div className="fixed top-0 left-0 right-0 h-14 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50 flex items-center px-4 gap-2 z-40">
            {/* ... (Home button, Name input, Spacer) ... */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                title="Về Dashboard"
                aria-label="Go to Dashboard"
            >
                <Home size={20} />
            </Button>
            <div className="w-px h-6 bg-gray-700/50 mx-1" />
            <input
                type="text"
                value={currentName}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="px-3 py-1.5 rounded-md bg-transparent text-white placeholder-gray-400 outline-none ring-1 ring-transparent hover:bg-gray-700/50 focus:bg-gray-700 focus:ring-blue-500 transition-all min-w-[150px] flex-grow md:flex-grow-0 md:w-64 text-sm font-medium"
                placeholder="Mindmap không tên..."
                aria-label="Mindmap Name"
            />
            <div className="flex-grow" />

            {/* Action Buttons */}
            <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} title="Hoàn tác (Ctrl+Z)">
                    <Undo size={18} />
                </Button>
                <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} title="Làm lại (Ctrl+Y)">
                    <Redo size={18} />
                </Button>

                <div className="w-px h-6 bg-gray-700/50 mx-1.5" />

                <Button
                    variant="gradient"
                    size="sm"
                    onClick={onSaveMindmap}
                    className="!py-1.5"
                    title="Lưu (Ctrl+S)"
                >
                    <Save size={16} className="mr-1.5" /> Lưu
                </Button>

                <Button variant="outline" size="sm" onClick={onExport} className="!py-1.5 !border-gray-700" title="Xuất file (User Story #35)">
                    <Download size={16} className="mr-1.5" /> Xuất
                </Button>


                <div className="w-px h-6 bg-gray-700/50 mx-1.5" />

                <Button variant="ghost" size="icon" onClick={onShare} title="Chia sẻ (User Story #18)">
                    <Share2 size={18} />
                </Button>
                <Button variant="ghost" size="icon" onClick={toggleTheme} title={theme === 'dark' ? 'Chế độ Sáng' : 'Chế độ Tối'}>
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </Button>
                <Button variant="ghost" size="icon" onClick={onToggleStylePanel} title="Bảng định dạng (Ctrl+M)">
                    <PanelRight size={18} />
                </Button>

                <div className="w-px h-6 bg-gray-700/50 mx-1.5" />

                <UserAvatarMenu />
            </div>
        </div>
    );
};

export default EditorToolbar;
