import { useTranslation } from 'react-i18next';
import { XIcon, StarIcon, HashIcon, ClockIcon, CopyIcon, CheckIcon, GlobeIcon, BracesIcon, PlayIcon } from 'lucide-react';
import { LocalImage } from '../ui/LocalImage';
import type { Prompt } from '@prompthub/shared/types';
import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { defaultSchema } from 'hast-util-sanitize';
import { resolveLocalVideoSrc } from '../../utils/media-url';

interface FileDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: Prompt | null;
  onEdit?: (prompt: Prompt) => void;
  onTest?: (prompt: Prompt) => void;
}

export function FileDetailPanel({
  isOpen,
  onClose,
  prompt,
  onEdit,
  onTest,
}: FileDetailPanelProps) {
  const { t, i18n } = useTranslation();
  const [copiedSystem, setCopiedSystem] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);

  const preferEnglish = useMemo(() => {
    const lang = (i18n.language || '').toLowerCase();
    return !(lang.startsWith('zh'));
  }, [i18n.language]);

  // 根据界面语言自动选择 Prompt 语言
  useEffect(() => {
    if (!prompt) return;
    const hasEnglish = !!(prompt.systemPromptEn || prompt.userPromptEn);
    if (!hasEnglish) {
      setShowEnglish(false);
      return;
    }
    setShowEnglish(preferEnglish);
  }, [prompt?.id, prompt?.systemPromptEn, prompt?.userPromptEn, preferEnglish]);

  const sanitizeSchema: any = useMemo(() => {
    const schema = { ...defaultSchema, attributes: { ...defaultSchema.attributes } };
    schema.attributes.code = [...(schema.attributes.code || []), ['className']];
    schema.attributes.span = [...(schema.attributes.span || []), ['className']];
    schema.attributes.pre = [...(schema.attributes.pre || []), ['className']];
    return schema;
  }, []);

  const rehypePlugins = useMemo(
    () => [
      [rehypeHighlight, { ignoreMissing: true }] as any,
      [rehypeSanitize, sanitizeSchema] as any,
    ],
    [sanitizeSchema],
  );

  const markdownComponents = useMemo(() => ({
    h1: (props: any) => <h1 className="text-lg font-bold mb-2 text-foreground" {...props} />,
    h2: (props: any) => <h2 className="text-base font-semibold mb-1.5 mt-3 text-foreground" {...props} />,
    h3: (props: any) => <h3 className="text-sm font-semibold mb-1.5 mt-2 text-foreground" {...props} />,
    p: (props: any) => <p className="mb-1.5 leading-relaxed text-foreground/90 text-sm" {...props} />,
    ul: (props: any) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5" {...props} />,
    ol: (props: any) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5" {...props} />,
    li: (props: any) => <li className="leading-relaxed text-sm" {...props} />,
    code: (props: any) => <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]" {...props} />,
    pre: (props: any) => (
      <pre className="p-2 rounded-lg bg-muted overflow-x-auto text-[11px] leading-relaxed my-2" {...props} />
    ),
    blockquote: (props: any) => (
      <blockquote className="border-l-3 border-border pl-2.5 text-muted-foreground italic mb-2 text-sm" {...props} />
    ),
    a: (props: any) => <a className="text-primary hover:underline" {...props} target="_blank" rel="noreferrer" />,
  }), []);

  const renderPromptContent = (content?: string) => {
    if (!content) {
      return <span className="text-muted-foreground text-xs">-</span>;
    }
    return (
      <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs leading-relaxed markdown-content space-y-1.5 break-words max-h-[200px] overflow-y-auto">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={rehypePlugins}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  // 提取变量
  const extractVariables = (text: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    return matches;
  };

  if (!isOpen || !prompt) return null;

  const allVariables = [
    ...extractVariables(prompt.systemPrompt || ''),
    ...extractVariables(prompt.userPrompt),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const handleCopySystem = async () => {
    if (prompt.systemPrompt) {
      await navigator.clipboard.writeText(prompt.systemPrompt);
      setCopiedSystem(true);
      setTimeout(() => setCopiedSystem(false), 2000);
    }
  };

  const handleCopyUser = async () => {
    await navigator.clipboard.writeText(prompt.userPrompt);
    setCopiedUser(true);
    setTimeout(() => setCopiedUser(false), 2000);
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-background border-l border-border shadow-xl z-50 flex flex-col animate-slide-in-right">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-medium text-sm">{t('prompt.detail', '文件详情')}</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 标题 */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-2 line-clamp-2">{prompt.title}</h2>
          
          {/* 基本信息 */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {prompt.isFavorite && (
              <span className="flex items-center gap-1">
                <StarIcon className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                {t('nav.favorites')}
              </span>
            )}
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" />
              {formatDate(prompt.updatedAt)}
            </span>
          </div>
        </div>

        {/* 描述 */}
        {prompt.description && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1.5">{t('prompt.description')}</h4>
            <p className="text-xs bg-muted/30 rounded-lg p-2.5 line-clamp-3">{prompt.description}</p>
          </div>
        )}

        {/* 来源 */}
        {prompt.source && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <GlobeIcon className="w-3 h-3" />
              {t('prompt.source')}
            </h4>
            <div className="text-xs bg-muted/30 rounded-lg p-2.5 break-all">
              {prompt.source.startsWith('http') ? (
                <a href={prompt.source} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  <span className="truncate max-w-full">{prompt.source}</span>
                </a>
              ) : (
                <span className="text-foreground/90">{prompt.source}</span>
              )}
            </div>
          </div>
        )}

        {/* 备注 */}
        {prompt.notes && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1.5">{t('prompt.notes')}</h4>
            <div className="text-xs bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-2.5 text-foreground/80 italic line-clamp-3">
              {prompt.notes}
            </div>
          </div>
        )}

        {/* 图片 */}
        {prompt.images && prompt.images.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1.5">{t('prompt.referenceImages')}</h4>
            <div className="space-y-2">
              {prompt.images.slice(0, 3).map((img, index) => (
                <div key={index} className="rounded-lg overflow-hidden border border-border">
                  <LocalImage
                    src={img}
                    alt={`image-${index}`}
                    className="w-full h-24 object-cover"
                    fallbackClassName="w-full h-24"
                  />
                </div>
              ))}
              {prompt.images.length > 3 && (
                <span className="text-xs text-muted-foreground">{t('prompt.moreImages', '+{{count}} 更多')}</span>
              )}
            </div>
          </div>
        )}

        {/* 视频 */}
        {prompt.videos && prompt.videos.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1.5">{t('prompt.previewVideos', '预览视频')}</h4>
            <div className="space-y-2">
              {prompt.videos.slice(0, 2).map((video, index) => (
                <div key={index} className="rounded-lg overflow-hidden border border-border bg-muted">
                  <video
                    src={resolveLocalVideoSrc(video)}
                    className="w-full h-20 object-cover"
                    controls
                    preload="metadata"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 标签 */}
        {prompt.tags && prompt.tags.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1.5">{t('prompt.tags')}</h4>
            <div className="flex flex-wrap gap-1.5">
              {prompt.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]"
                >
                  <HashIcon className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 变量 */}
        {allVariables.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <BracesIcon className="w-3 h-3" />
              {t('prompt.variables')} ({allVariables.length})
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {allVariables.map((variable) => (
                <span
                  key={variable}
                  className="px-1.5 py-0.5 rounded bg-accent text-[10px] font-mono"
                >
                  {`{{${variable}}}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 使用次数 */}
        <div className="text-xs text-muted-foreground">
          {t('prompt.usageCount')}: {prompt.usageCount || 0}
        </div>

        {/* 语言切换按钮 */}
        {(prompt.systemPromptEn || prompt.userPromptEn) && !i18n.language.startsWith('en') && (
          <button
            onClick={() => setShowEnglish(!showEnglish)}
            className={`
              w-full flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all
              ${showEnglish 
                ? 'bg-primary text-white' 
                : 'bg-muted hover:bg-accent text-foreground'
              }
            `}
          >
            <GlobeIcon className="w-3 h-3" />
            {showEnglish ? 'EN' : t('prompt.showLocalized', '显示当前语言')}
          </button>
        )}

        {/* System Prompt */}
        {(showEnglish ? prompt.systemPromptEn : prompt.systemPrompt) && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-medium text-muted-foreground">
                {t('prompt.systemPrompt')}
                {showEnglish && <span className="ml-1 px-1 py-0.5 rounded bg-primary/10 text-primary text-[9px]">EN</span>}
              </h4>
              <button
                onClick={handleCopySystem}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                {copiedSystem ? <CheckIcon className="w-3 h-3" /> : <CopyIcon className="w-3 h-3" />}
              </button>
            </div>
            {renderPromptContent(showEnglish ? (prompt.systemPromptEn || '') : (prompt.systemPrompt || ''))}
          </div>
        )}

        {/* User Prompt */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-xs font-medium text-muted-foreground">
              {t('prompt.userPrompt')}
              {showEnglish && <span className="ml-1 px-1 py-0.5 rounded bg-primary/10 text-primary text-[9px]">EN</span>}
            </h4>
            <button
              onClick={handleCopyUser}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {copiedUser ? <CheckIcon className="w-3 h-3" /> : <CopyIcon className="w-3 h-3" />}
            </button>
          </div>
          {renderPromptContent(showEnglish ? (prompt.userPromptEn || prompt.userPrompt) : prompt.userPrompt)}
        </div>
      </div>

      {/* 底部操作按钮 */}
      <div className="px-4 py-3 border-t border-border space-y-2">
        {onTest && (
          <button
            onClick={() => onTest(prompt)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <PlayIcon className="w-4 h-4" />
            {t('prompt.test', '测试')}
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => {
              onClose();
              setTimeout(() => onEdit(prompt), 150);
            }}
            className="w-full px-4 py-2 rounded-lg bg-muted hover:bg-accent transition-colors text-sm font-medium"
          >
            {t('prompt.edit', '编辑')}
          </button>
        )}
      </div>
    </div>
  );
}