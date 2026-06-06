import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StarIcon, CopyIcon, ImageIcon, ChevronRightIcon, ChevronDownIcon, GripVerticalIcon } from 'lucide-react';
import type { Prompt } from '@prompthub/shared/types';
import type { SortBy, SortOrder } from '../../stores/prompt.store';

interface PromptListViewProps {
  prompts: Prompt[];
  selectedId: string | null;
  selectedIds: string[];
  onSelect: (prompt: Prompt, event: React.MouseEvent) => void;
  onToggleFavorite: (id: string) => void;
  onCopy: (prompt: Prompt) => void;
  onContextMenu: (e: React.MouseEvent, prompt: Prompt) => void;
  onMovePrompt: (promptId: string, newParentId: string | null, newOrder: number) => void;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
}

interface PromptTreeNode {
  prompt: Prompt;
  children: PromptTreeNode[];
}

export function PromptListView({
  prompts,
  selectedId,
  selectedIds,
  onSelect,
  onToggleFavorite,
  onCopy,
  onContextMenu,
  onMovePrompt,
  sortBy = 'updatedAt',
  sortOrder = 'desc',
}: PromptListViewProps) {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);
  const selectedIdSet = new Set(selectedIds);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, promptId: string) => {
    setDraggingId(promptId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', promptId);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTargetId(null);
    setDropPosition(null);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drag enter
  const handleDragEnter = useCallback((e: React.DragEvent, promptId: string) => {
    e.preventDefault();
    if (draggingId !== promptId) {
      setDropTargetId(promptId);
      // Determine drop position based on mouse position
      // Use e.currentTarget to get the list item element, not the child element (e.target)
      // 使用 e.currentTarget 获取列表项元素，而不是子元素 (e.target)
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      
      if (y < height / 3) {
        setDropPosition('before');
      } else if (y > height * 2 / 3) {
        setDropPosition('after');
      } else {
        setDropPosition('inside');
      }
    }
  }, [draggingId]);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent, promptId: string) => {
    // 检查鼠标是否只是在当前元素的子元素之间移动
    // Check if mouse is just moving between child elements of the current element
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentElement = e.currentTarget as HTMLElement;
    
    // 如果 relatedTarget 是 currentElement 的子元素或 currentElement 本身，则不清空状态
    // If relatedTarget is a child of currentElement or currentElement itself, don't clear state
    if (relatedTarget && currentElement.contains(relatedTarget)) {
      return;
    }
    
    // 只有当鼠标真正离开当前元素时，才清空对应的状态
    // Only clear state when mouse actually leaves the current element
    setDropTargetId(null);
    setDropPosition(null);
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, targetPromptId: string) => {
    e.preventDefault();
    if (draggingId && draggingId !== targetPromptId) {
      const targetPrompt = prompts.find(p => p.id === targetPromptId);
      const draggingPrompt = prompts.find(p => p.id === draggingId);
      
      if (targetPrompt && draggingPrompt) {
        if (dropPosition === 'inside') {
          // Move as child of target
          onMovePrompt(draggingId, targetPromptId, 0);
        } else {
          // Move as sibling (before or after target)
          const newParentId = targetPrompt.parentId;
          let targetOrder = targetPrompt.order || 0;
          
          if (dropPosition === 'after') {
            targetOrder += 1;
          }
          
          // Adjust order if moving within the same parent
          if (draggingPrompt.parentId === newParentId && draggingPrompt.order < targetOrder) {
            targetOrder -= 1;
          }
          
          onMovePrompt(draggingId, newParentId, targetOrder);
        }
      }
    }
    setDraggingId(null);
    setDropTargetId(null);
    setDropPosition(null);
  }, [draggingId, dropPosition, prompts, onMovePrompt]);

  // Sort nodes based on user selection
  const sortNodes = (nodes: PromptTreeNode[]): void => {
    nodes.sort((a, b) => {
      if (a.prompt.isPinned && !b.prompt.isPinned) return -1;
      if (!a.prompt.isPinned && b.prompt.isPinned) return 1;

      let comparison = 0;
      switch (sortBy) {
        case "updatedAt":
          comparison =
            new Date(a.prompt.updatedAt).getTime() - new Date(b.prompt.updatedAt).getTime();
          break;
        case "createdAt":
          comparison =
            new Date(a.prompt.createdAt).getTime() - new Date(b.prompt.createdAt).getTime();
          break;
        case "title":
          comparison = a.prompt.title.localeCompare(b.prompt.title);
          break;
        case "usageCount":
          comparison = (a.prompt.usageCount || 0) - (b.prompt.usageCount || 0);
          break;
        default:
          comparison = (a.prompt.order || 0) - (b.prompt.order || 0);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    // Recursively sort children
    nodes.forEach((node) => sortNodes(node.children));
  };

  // Build tree structure
  const rootNodes = useMemo(() => {
    const promptMap = new Map<string, PromptTreeNode>();
    const rootNodes: PromptTreeNode[] = [];

    // First pass: create nodes for all prompts
    prompts.forEach((prompt) => {
      promptMap.set(prompt.id, { prompt, children: [] });
    });

    // Second pass: build parent-child relationships
    prompts.forEach((prompt) => {
      const node = promptMap.get(prompt.id)!;
      if (prompt.parentId && promptMap.has(prompt.parentId)) {
        promptMap.get(prompt.parentId)!.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    // Sort nodes based on user selection
    sortNodes(rootNodes);

    return rootNodes;
  }, [prompts, sortBy, sortOrder]);

  // Format date
  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return t('common.yesterday') || '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}${t('common.daysAgo') || '天前'}`;
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isExpanded = (id: string) => expandedIds.has(id);

  // Recursive render function for hierarchical prompts
  // 递归渲染层级提示词的函数
  const renderTreeNode = (node: PromptTreeNode, depth: number) => {
    const { prompt, children } = node;
    const hasChildren = children.length > 0;
    const isNodeExpanded = isExpanded(prompt.id);
    const isSelected = selectedIdSet.has(prompt.id);
    const isDragging = draggingId === prompt.id;
    const isDropTarget = dropTargetId === prompt.id;

    return (
      <div key={prompt.id}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, prompt.id)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, prompt.id)}
          onDragLeave={(e) => handleDragLeave(e, prompt.id)}
          onDrop={(e) => handleDrop(e, prompt.id)}
          onClick={(e) => onSelect(prompt, e)}
          onContextMenu={(e) => onContextMenu(e, prompt)}
          className={`
            flex items-center gap-3 px-3 py-2.5 border-b border-border/50 cursor-pointer
            transition-colors duration-quick relative
            ${isSelected
              ? 'bg-primary/10 border-l-2 border-l-primary'
              : isDropTarget && dropPosition === 'inside'
                ? 'bg-primary/20 border-l-2 border-l-primary'
                : 'hover:bg-accent/50'
            }
            ${isDragging ? 'opacity-50' : ''}
            ${isDropTarget && dropPosition === 'inside' ? 'ring-2 ring-primary/50 ring-inset' : ''}
            ${isDropTarget && dropPosition === 'before' ? 'border-t-2 border-t-primary' : ''}
            ${isDropTarget && dropPosition === 'after' ? 'border-b-2 border-b-primary' : ''}
          `}
          style={{ paddingLeft: `${3 + depth * 12}px` }}
        >
          {/* Drag handle */}
          {/* 拖拽手柄 */}
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing"
            title={t('prompt.dragToMove') || '拖拽移动'}
          >
            <GripVerticalIcon className="w-3.5 h-3.5" />
          </button>

          {/* Expand/Collapse icon */}
          {/* 展开/折叠图标 */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(prompt.id);
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
            >
              {isNodeExpanded ? (
                <ChevronDownIcon className="w-3.5 h-3.5" />
              ) : (
                <ChevronRightIcon className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5 flex-shrink-0" />}

          {/* Title and description */}
          {/* 标题和描述 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={`font-medium text-sm leading-snug break-words line-clamp-2 ${
                  isSelected ? 'text-primary' : 'text-foreground'
                }`}
                title={prompt.title}
              >
                {prompt.title}
              </h3>
              {prompt.isFavorite && (
                <StarIcon className="w-3 h-3 flex-shrink-0 fill-yellow-400 text-yellow-400" />
              )}
            </div>
            {prompt.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 break-words mt-0.5">
                {prompt.description}
              </p>
            )}
            {prompt.images && prompt.images.length > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <ImageIcon className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{prompt.images.length}</span>
              </div>
            )}
          </div>

          {/* Usage count */}
          {/* 使用次数 */}
          <div className="flex-shrink-0 w-12 text-center">
            <span className="text-xs text-muted-foreground">
              {prompt.usageCount || 0}
            </span>
          </div>

          {/* Update time */}
          {/* 更新时间 */}
          <div className="flex-shrink-0 w-16 text-right">
            <span className="text-xs text-muted-foreground">
              {formatDate(prompt.updatedAt)}
            </span>
          </div>

          {/* Action buttons */}
          {/* 操作按钮 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy(prompt);
              }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={t('prompt.copy')}
            >
              <CopyIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(prompt.id);
              }}
              className={`p-1.5 rounded-md transition-colors ${prompt.isFavorite
                ? 'text-yellow-500 hover:bg-yellow-500/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              title={prompt.isFavorite ? t('nav.favorites') : t('prompt.addToFavorites') || '添加收藏'}
            >
              <StarIcon className={`w-3.5 h-3.5 ${prompt.isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Render children if expanded */}
        {/* 如果展开则渲染子节点 */}
        {hasChildren && isNodeExpanded && (
          <div>
            {children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {rootNodes.map((node) => renderTreeNode(node, 0))}
    </div>
  );
}