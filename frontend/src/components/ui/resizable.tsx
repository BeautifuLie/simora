import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { PanelGroupProps, PanelProps, PanelResizeHandleProps } from 'react-resizable-panels';
import { cn } from '@/lib/utils';

export function ResizablePanelGroup({ className, ...props }: PanelGroupProps) {
    return (
        <PanelGroup
            className={cn(
                'flex h-full w-full',
                props.direction === 'vertical' ? 'flex-col' : 'flex-row',
                className
            )}
            {...props}
        />
    );
}

export function ResizablePanel({ className, ...props }: PanelProps) {
    return <Panel className={cn('overflow-hidden', className)} {...props} />;
}

export function ResizableHandle({ className, ...props }: PanelResizeHandleProps) {
    return (
        <PanelResizeHandle
            className={cn(
                'group relative flex items-center justify-center shrink-0',
                'data-[panel-group-direction=horizontal]:w-[5px] data-[panel-group-direction=horizontal]:cursor-col-resize',
                'data-[panel-group-direction=vertical]:h-[5px] data-[panel-group-direction=vertical]:cursor-row-resize',
                'transition-colors duration-150',
                'bg-[var(--border-0)] hover:bg-[var(--border-1)]',
                'data-[resize-handle-active]:bg-[var(--accent)] data-[resize-handle-active]:opacity-70',
                className
            )}
            {...props}
        >
            {/* Grip dots */}
            <div
                className={cn(
                    'flex items-center justify-center rounded-sm z-10',
                    'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                    'data-[panel-group-direction=horizontal]:flex-col',
                    'bg-[var(--bg-2)] border border-[var(--border-1)]'
                )}
                style={{ width: 8, height: 24, gap: 3, padding: '4px 0' }}
            >
                <div className="w-[2px] h-[2px] rounded-full bg-[var(--text-2)]" />
                <div className="w-[2px] h-[2px] rounded-full bg-[var(--text-2)]" />
                <div className="w-[2px] h-[2px] rounded-full bg-[var(--text-2)]" />
            </div>
        </PanelResizeHandle>
    );
}
