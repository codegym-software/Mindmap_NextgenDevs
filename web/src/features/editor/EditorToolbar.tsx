import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Share2,
    Undo,
    Redo,
    Save,
    PanelRight,
    ZoomIn,
    ZoomOut,
    ChevronDown,
    AlignHorizontalJustifyCenter,
    AlignStartVertical,
    BoxSelect,
    Presentation,
    MessageSquare,
    Link as LinkIcon,
    Image as ImageIcon,
    Trash2,
    Download,
} from 'lucide-react';
import UserAvatarMenu from '../auth/UserAvatarMenu';
import { useEditorStore, NodeData } from '../../app/store/useEditorStore';
import { useMindmapsStore } from '../../app/store/useMindmapsStore';
import ExportButton from './ExportButton';
import { useAuth } from '../../hooks/useAuth';

import InsertDropdown from './InsertDropdown';
import HyperlinkModal from './modals/HyperlinkModal';
import ImageModal from './modals/ImageModal';
import { useChatStore } from '../../app/store/useChatStore';

type EditorToolbarProps = {
    onCommitName: () => void;
    onDashboard: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onShare: () => void;
    onTheme: () => void;
    onSave: () => void;
    isDirty: boolean;

    // NEW: cần biết trạng thái hiện tại để auto-close giống click PanelRight khi < lg
    isFormattingToolbarOpen: boolean;
    onToggleFormattingToolbar: () => void;

    presentationMode: boolean;
    onSetPresentationMode: (mode: boolean) => void;
    currentScale: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onSetZoom: (scale: number) => void;
    onFitToScreen: () => void;

    selectedNodeIds: string[];
    onAddChild: () => void;
    onAddSibling: () => void;
    onSetHyperlink?: () => void;
    onToggleBoundary: () => void;
    onAddRelationship: () => void;
    onAddSummary: () => void;
    onUpdateNode: (updates: Partial<NodeData>) => void;
    onRemoveImage?: () => void;
    stageRef?: any;

    readOnly?: boolean;
    pendingRequestsCount?: number;
    onShowRequests?: () => void;
    isOwner?: boolean;
};

type ToolbarButtonProps = {
    onClick: () => void;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
    className?: string;
};

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
                                                         onClick,
                                                         disabled,
                                                         title,
                                                         children,
                                                         className = '',
                                                     }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`p-2 rounded-md text-gray-700 ${className} ${
            disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-300/50'
        }`}
        title={title}
    >
        {children}
    </button>
);

const IconTileButton: React.FC<
    ToolbarButtonProps & {
    badge?: number;
    active?: boolean;
}
> = ({ onClick, disabled, title, children, className = '', badge, active }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`relative p-2 rounded-lg text-gray-700 ${
            active ? 'bg-gray-200 text-blue-600' : ''
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'} ${className}`}
    >
        {children}
        {typeof badge === 'number' && badge > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
        {badge}
      </span>
        )}
    </button>
);

const EditorToolbar: React.FC<EditorToolbarProps> = ({
                                                         onCommitName,
                                                         onDashboard,
                                                         onUndo,
                                                         onRedo,
                                                         onShare,
                                                         onTheme,
                                                         onSave,
                                                         isDirty,
                                                         isFormattingToolbarOpen,
                                                         onToggleFormattingToolbar,
                                                         presentationMode,
                                                         onSetPresentationMode,
                                                         currentScale,
                                                         onZoomIn,
                                                         onZoomOut,
                                                         onSetZoom,
                                                         onFitToScreen,
                                                         selectedNodeIds,
                                                         onAddChild,
                                                         onAddSibling,
                                                         onSetHyperlink,
                                                         onToggleBoundary,
                                                         onAddRelationship,
                                                         onAddSummary,
                                                         onUpdateNode,
                                                         onRemoveImage,
                                                         stageRef,
                                                         readOnly = false,
                                                         pendingRequestsCount = 0,
                                                         onShowRequests,
                                                         isOwner = false,
                                                     }) => {
    const setMindmapsItems = useMindmapsStore((s) => s.set);
    const mindmapItems = useMindmapsStore((s) => s.items);

    const name = useEditorStore((s) => s.currentMindmapName);
    const currentMindmapId = useEditorStore((s) => s.currentMindmapId);
    const { nodes } = useEditorStore();

    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    const { toggleChat, unreadCount, isOpen: isChatOpen } = useChatStore();

    const isGuest = !!currentMindmapId && currentMindmapId.startsWith('guest-');
    const { login } = useAuth();

    // More dropdown
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);

    // Detect small screen (<lg)
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 1023px)'); // <lg
        const sync = () => setIsSmallScreen(mq.matches);
        sync();
        mq.addEventListener?.('change', sync);
        return () => mq.removeEventListener?.('change', sync);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        function onDocMouseDown(e: MouseEvent) {
            if (!moreRef.current) return;
            if (!moreRef.current.contains(e.target as Node)) {
                setIsMoreOpen(false);
            }
        }
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, []);

    // Auto-close formatting toolbar when screen <lg (behave like clicking PanelRight once)
    useEffect(() => {
        if (isSmallScreen && !readOnly && isFormattingToolbarOpen) {
            onToggleFormattingToolbar();
        }
        // also close More if switching to large to avoid weird state
        if (!isSmallScreen) {
            setIsMoreOpen(false);
        }
    }, [isSmallScreen, readOnly, isFormattingToolbarOpen, onToggleFormattingToolbar]);

    const setName = (newName: string) =>
        useEditorStore.setState({
            currentMindmapName: newName,
            isDirty: true,
            hasManuallyRenamedMindmap: true,
        });

    const safeName = name ?? '';

    const handleCommitName = () => {
        if (readOnly) return;
        onCommitName();
        if (currentMindmapId) {
            const newItems = mindmapItems.map((item) =>
                item.id === currentMindmapId ? { ...item, name: safeName } : item
            );
            setMindmapsItems({ items: newItems });
        }
    };

    const zoomLevels = useMemo(() => {
        const z: number[] = [];
        for (let i = 50; i <= 400; i += 50) z.push(i);
        if (!z.includes(100)) {
            z.push(100);
            z.sort((a, b) => a - b);
        }
        return z;
    }, []);

    const currentZoomPercent = Math.round(currentScale * 100);

    const handleZoomSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'fit') {
            onFitToScreen();
        } else if (value === 'custom') {
            // no-op
        } else {
            onSetZoom(Number(value) / 100);
        }
    };

    const handleShareClick = () => {
        if (isGuest) {
            sessionStorage.setItem('returnTo', window.location.pathname);
            login('login' as any);
        } else {
            onShare();
        }
    };

    const isSingleNodeFocused = selectedNodeIds.length === 1;
    const isNotRootAndSingle = isSingleNodeFocused && selectedNodeIds[0] !== 'root';
    const selectedNode = isSingleNodeFocused
        ? nodes.find((n) => n.id === selectedNodeIds[0])
        : null;

    const handleConfirmLink = (url: string | undefined) => {
        onUpdateNode({ hyperlink: url });
    };

    const handleConfirmImage = (url: string | undefined) => {
        onUpdateNode({ imageUrl: url });
    };

    const handleRemoveImage = () => {
        if (!selectedNode?.imageUrl) return;
        onRemoveImage
            ? onRemoveImage()
            : onUpdateNode({ imageUrl: undefined, imageHeight: undefined, imageWidth: undefined });
    };

    React.useEffect(() => {
        if (presentationMode) {
            document.body.classList.add('presentation-mode');
        } else {
            document.body.classList.remove('presentation-mode');
        }
        return () => document.body.classList.remove('presentation-mode');
    }, [presentationMode]);

    return (
        <>
            {!presentationMode && (
                <div
                    className="fixed top-0 left-0 right-0 h-12 bg-[#F5F5F5] border-b border-gray-200 flex items-center px-4 z-40"
                    style={{ fontFamily: 'Arial' }}
                >
                    {/* LEFT: keep */}
                    <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: '300px' }}>
                        <a
                            href="/dashboard"
                            title="Về Dashboard"
                            className="flex items-center justify-center rounded-lg hover:bg-gray-300/60 transition-colors ml-9"
                        >
                            <img
                                src="/icons/logo.png"
                                alt="Logo"
                                className="w-8 h-8 rounded-md object-cover"
                            />
                        </a>
                        <div className="w-px h-6 bg-gray-300 mx-2" />
                        <input
                            value={safeName}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            onBlur={handleCommitName}
                            disabled={readOnly}
                            className={`px-3 py-1.5 rounded-md bg-transparent text-black outline-none transition-all w-64 ${
                                readOnly
                                    ? 'opacity-70 cursor-not-allowed'
                                    : 'ring-1 ring-transparent hover:bg-gray-300/50 focus:bg-white focus:ring-aurora-500'
                            }`}
                            placeholder={readOnly ? 'Mindmap (chỉ xem)' : 'Đặt tên mindmap…'}
                            title={readOnly ? 'Bạn đang ở chế độ chỉ xem' : 'Nhấn Enter để lưu tên'}
                        />
                    </div>

                    {/* LARGE (>=lg): show full center + right */}
                    <div className="hidden lg:flex flex-grow items-center justify-between">
                        {/* CENTER */}
                        {!readOnly && (
                            <div className="flex-grow flex items-center justify-center gap-2">
                                <ToolbarButton
                                    onClick={onAddChild}
                                    disabled={!isSingleNodeFocused}
                                    title="Thêm Node con (Tab)"
                                >
                                    <AlignHorizontalJustifyCenter size={20} />
                                </ToolbarButton>

                                <ToolbarButton
                                    onClick={onAddSibling}
                                    disabled={!isNotRootAndSingle}
                                    title="Thêm Node anh em (Enter)"
                                >
                                    <AlignStartVertical size={20} />
                                </ToolbarButton>

                                <div className="w-px h-6 bg-gray-300 mx-2" />

                                <ToolbarButton
                                    onClick={onToggleBoundary}
                                    disabled={!isSingleNodeFocused}
                                    title="Tạo hoặc xóa đường viền"
                                    className={selectedNode?.boundary ? 'bg-gray-300/80' : ''}
                                >
                                    <BoxSelect size={20} />
                                </ToolbarButton>

                                <div className="w-px h-6 bg-gray-300 mx-2" />

                                <InsertDropdown
                                    disabled={!isSingleNodeFocused}
                                    onInsertLink={() => setIsLinkModalOpen(true)}
                                    onInsertImage={() => setIsImageModalOpen(true)}
                                    onRemoveImage={selectedNode?.imageUrl ? handleRemoveImage : undefined}
                                    hasImage={!!selectedNode?.imageUrl}
                                />
                            </div>
                        )}

                        {readOnly && <div className="flex-grow" />}

                        {/* RIGHT */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={onUndo}
                                disabled={readOnly}
                                className={`p-2 rounded-md ${
                                    readOnly ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-300/50'
                                } text-gray-700`}
                                title={readOnly ? 'Bạn đang ở chế độ chỉ xem' : 'Hoàn tác (Ctrl+Z)'}
                            >
                                <Undo size={20} />
                            </button>

                            <button
                                onClick={onRedo}
                                disabled={readOnly}
                                className={`p-2 rounded-md ${
                                    readOnly ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-300/50'
                                } text-gray-700`}
                                title={readOnly ? 'Bạn đang ở chế độ chỉ xem' : 'Làm lại (Ctrl+Y)'}
                            >
                                <Redo size={20} />
                            </button>

                            <div className="w-px h-6 bg-gray-300 mx-2" />

                            <button
                                onClick={onZoomOut}
                                className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700"
                                title="Thu nhỏ (Ctrl + Scroll)"
                            >
                                <ZoomOut size={20} />
                            </button>

                            <div className="relative">
                                <select
                                    value={zoomLevels.includes(currentZoomPercent) ? currentZoomPercent : 'custom'}
                                    onChange={handleZoomSelect}
                                    className="appearance-none w-20 text-center px-4 py-1.5 rounded-md bg-transparent text-black outline-none ring-1 ring-transparent hover:bg-gray-300/50 focus:bg-white focus:ring-aurora-500 transition-all text-sm font-medium"
                                >
                                    <option value="fit">Vừa vặn</option>
                                    {zoomLevels.map((level) => (
                                        <option key={level} value={level}>
                                            {level}%
                                        </option>
                                    ))}
                                    {!zoomLevels.includes(currentZoomPercent) && (
                                        <option value="custom" disabled>
                                            {currentZoomPercent}%
                                        </option>
                                    )}
                                </select>
                                <ChevronDown
                                    size={16}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                                />
                            </div>

                            <button
                                onClick={onZoomIn}
                                className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700"
                                title="Phóng to (Ctrl + Scroll)"
                            >
                                <ZoomIn size={20} />
                            </button>

                            <div className="w-px h-6 bg-gray-300 mx-2" />

                            <button
                                onClick={onSave}
                                disabled={!isDirty || readOnly}
                                className={`p-2 rounded-md transition-all ${
                                    !isDirty || readOnly
                                        ? 'opacity-40 cursor-not-allowed'
                                        : 'hover:bg-gray-300/50 text-gray-700'
                                }`}
                                title={
                                    readOnly ? 'Bạn đang ở chế độ chỉ xem' : isDirty ? 'Lưu thay đổi (Ctrl+S)' : 'Đã lưu'
                                }
                            >
                                <Save size={20} />
                            </button>

                            <div className="w-px h-6 bg-gray-300 mx-2" />

                            {!isGuest && (
                                <button
                                    type="button"
                                    onClick={toggleChat}
                                    className={`relative p-2 rounded-md transition-colors ${
                                        isChatOpen
                                            ? 'bg-gray-200 text-blue-600'
                                            : 'text-gray-700 hover:bg-gray-300/50'
                                    }`}
                                    title="Chat thảo luận"
                                >
                                    <MessageSquare size={20} />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                      {unreadCount}
                    </span>
                                    )}
                                </button>
                            )}

                            <button
                                onClick={handleShareClick}
                                className={`relative p-2 rounded-md transition-colors ${
                                    pendingRequestsCount > 0
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'hover:bg-gray-300/50 text-gray-700'
                                }`}
                                title={isGuest ? 'Đăng nhập để chia sẻ' : 'Chia sẻ & Quản lý quyền'}
                            >
                                <Share2 size={20} />
                                {isOwner && pendingRequestsCount > 0 && (
                                    <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white ring-2 ring-white">
                    {pendingRequestsCount}
                  </span>
                                )}
                            </button>

                            <div className="w-px h-6 bg-gray-300 mx-2" />

                            <ExportButton
                                nodes={useEditorStore.getState().nodes}
                                edges={useEditorStore.getState().edges}
                                stageRef={stageRef}
                                mindmapName={name || 'mindmap'}
                                backgroundColor={useEditorStore.getState().backgroundColor}
                            />

                            <button
                                onClick={() => onSetPresentationMode(true)}
                                className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700"
                                title="Trình chiếu"
                            >
                                <Presentation size={20} />
                            </button>

                            {!readOnly && (
                                <button
                                    onClick={onToggleFormattingToolbar}
                                    className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700"
                                    title="Bật/tắt thanh định dạng"
                                >
                                    <PanelRight size={20} />
                                </button>
                            )}

                            <div className="w-px h-6 bg-gray-300 mx-2" />
                            <UserAvatarMenu />
                        </div>
                    </div>

                    {/* SMALL (<lg): collapse center+right into dropdown */}
                    <div className="flex lg:hidden flex-grow justify-end" ref={moreRef}>
                        <button
                            type="button"
                            onClick={() => setIsMoreOpen((v) => !v)}
                            className="p-2 rounded-md hover:bg-gray-300/50 text-gray-700"
                            title="Chức năng"
                        >
                            <ChevronDown size={20} />
                        </button>

                        {isMoreOpen && (
                            <div className="absolute top-12 right-4 mt-1 w-[312px] bg-white border border-gray-200 shadow-lg rounded-xl z-50 p-2">
                                <div className="grid grid-cols-6 gap-1">
                                    {!readOnly && (
                                        <>
                                            <IconTileButton
                                                onClick={() => {
                                                    setIsMoreOpen(false);
                                                    onAddChild();
                                                }}
                                                disabled={!isSingleNodeFocused}
                                                title="Thêm Node con (Tab)"
                                            >
                                                <AlignHorizontalJustifyCenter size={18} />
                                            </IconTileButton>

                                            <IconTileButton
                                                onClick={() => {
                                                    setIsMoreOpen(false);
                                                    onAddSibling();
                                                }}
                                                disabled={!isNotRootAndSingle}
                                                title="Thêm Node anh em (Enter)"
                                            >
                                                <AlignStartVertical size={18} />
                                            </IconTileButton>

                                            <IconTileButton
                                                onClick={() => {
                                                    setIsMoreOpen(false);
                                                    onToggleBoundary();
                                                }}
                                                disabled={!isSingleNodeFocused}
                                                title="Tạo hoặc xóa đường viền"
                                                active={!!selectedNode?.boundary}
                                            >
                                                <BoxSelect size={18} />
                                            </IconTileButton>

                                            <IconTileButton
                                                onClick={() => {
                                                    setIsMoreOpen(false);
                                                    setIsLinkModalOpen(true);
                                                }}
                                                disabled={!isSingleNodeFocused}
                                                title="Chèn link"
                                            >
                                                <LinkIcon size={18} />
                                            </IconTileButton>

                                            <IconTileButton
                                                onClick={() => {
                                                    setIsMoreOpen(false);
                                                    setIsImageModalOpen(true);
                                                }}
                                                disabled={!isSingleNodeFocused}
                                                title="Chèn ảnh"
                                            >
                                                <ImageIcon size={18} />
                                            </IconTileButton>

                                            <IconTileButton
                                                onClick={() => {
                                                    setIsMoreOpen(false);
                                                    handleRemoveImage();
                                                }}
                                                disabled={!selectedNode?.imageUrl}
                                                title="Xóa ảnh"
                                            >
                                                <Trash2 size={18} />
                                            </IconTileButton>
                                        </>
                                    )}

                                    <IconTileButton
                                        onClick={() => {
                                            setIsMoreOpen(false);
                                            onUndo();
                                        }}
                                        disabled={readOnly}
                                        title={readOnly ? 'Bạn đang ở chế độ chỉ xem' : 'Hoàn tác (Ctrl+Z)'}
                                    >
                                        <Undo size={18} />
                                    </IconTileButton>

                                    <IconTileButton
                                        onClick={() => {
                                            setIsMoreOpen(false);
                                            onRedo();
                                        }}
                                        disabled={readOnly}
                                        title={readOnly ? 'Bạn đang ở chế độ chỉ xem' : 'Làm lại (Ctrl+Y)'}
                                    >
                                        <Redo size={18} />
                                    </IconTileButton>

                                    <IconTileButton
                                        onClick={() => {
                                            setIsMoreOpen(false);
                                            onZoomOut();
                                        }}
                                        title="Thu nhỏ (Ctrl + Scroll)"
                                    >
                                        <ZoomOut size={18} />
                                    </IconTileButton>

                                    <IconTileButton
                                        onClick={() => {
                                            setIsMoreOpen(false);
                                            onZoomIn();
                                        }}
                                        title="Phóng to (Ctrl + Scroll)"
                                    >
                                        <ZoomIn size={18} />
                                    </IconTileButton>

                                    <IconTileButton
                                        onClick={() => {
                                            setIsMoreOpen(false);
                                            onSave();
                                        }}
                                        disabled={!isDirty || readOnly}
                                        title={
                                            readOnly ? 'Bạn đang ở chế độ chỉ xem' : isDirty ? 'Lưu thay đổi (Ctrl+S)' : 'Đã lưu'
                                        }
                                    >
                                        <Save size={18} />
                                    </IconTileButton>

                                    {!isGuest && (
                                        <IconTileButton
                                            onClick={() => {
                                                setIsMoreOpen(false);
                                                toggleChat();
                                            }}
                                            title="Chat thảo luận"
                                            badge={unreadCount}
                                            active={isChatOpen}
                                        >
                                            <MessageSquare size={18} />
                                        </IconTileButton>
                                    )}

                                    <IconTileButton
                                        onClick={() => {
                                            setIsMoreOpen(false);
                                            handleShareClick();
                                        }}
                                        title={isGuest ? 'Đăng nhập để chia sẻ' : 'Chia sẻ & Quản lý quyền'}
                                        badge={isOwner ? pendingRequestsCount : undefined}
                                        active={pendingRequestsCount > 0}
                                    >
                                        <Share2 size={18} />
                                    </IconTileButton>

                                    <IconTileButton
                                        onClick={() => {
                                            setIsMoreOpen(false);
                                            onSetPresentationMode(true);
                                        }}
                                        title="Trình chiếu"
                                    >
                                        <Presentation size={18} />
                                    </IconTileButton>

                                    {!readOnly && (
                                        <IconTileButton
                                            onClick={() => {
                                                setIsMoreOpen(false);
                                                onToggleFormattingToolbar();
                                            }}
                                            title="Bật/tắt thanh định dạng"
                                            active={isFormattingToolbarOpen}
                                        >
                                            <PanelRight size={18} />
                                        </IconTileButton>
                                    )}

                                    {/* Export placeholder: để làm export đúng 100% cần code ExportButton.
                      Nếu bạn gửi ExportButton.tsx mình sẽ bọc được vào dropdown. */}
                                    <IconTileButton
                                        onClick={() => {
                                            setIsMoreOpen(false);
                                            // TODO: integrate ExportButton behavior here
                                        }}
                                        title="Export"
                                    >
                                        <Download size={18} />
                                    </IconTileButton>

                                    {/* Zoom select full width row */}
                                    <div className="col-span-6 mt-1 px-1">
                                        <select
                                            value={zoomLevels.includes(currentZoomPercent) ? currentZoomPercent : 'custom'}
                                            onChange={(e) => handleZoomSelect(e)}
                                            className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm"
                                            title="Chọn mức zoom"
                                        >
                                            <option value="fit">Vừa vặn</option>
                                            {zoomLevels.map((level) => (
                                                <option key={level} value={level}>
                                                    {level}%
                                                </option>
                                            ))}
                                            {!zoomLevels.includes(currentZoomPercent) && (
                                                <option value="custom" disabled>
                                                    {currentZoomPercent}%
                                                </option>
                                            )}
                                        </select>
                                    </div>

                                    <div className="col-span-6 mt-2 flex justify-end">
                                        <UserAvatarMenu />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Presentation overlay */}
            {presentationMode && (
                <div className="fixed inset-0 pointer-events-none z-40">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-gray-100 text-gray-500 backdrop-blur-xl shadow-elevation-strong pointer-events-auto flex items-center gap-3">
                        <span className="text-sm font-semibold">Chế độ thuyết trình</span>
                        <button
                            onClick={() => onSetPresentationMode(false)}
                            className="px-3 py-1 rounded-full bg-blue-100 hover:bg-blue-200 text-gray-600 text-sm"
                        >
                            Thoát
                        </button>
                    </div>
                </div>
            )}

            <HyperlinkModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                currentUrl={selectedNode?.hyperlink}
                onConfirm={handleConfirmLink}
            />

            <ImageModal
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                currentImageUrl={selectedNode?.imageUrl}
                onConfirm={handleConfirmImage}
            />
        </>
    );
};

export default EditorToolbar;