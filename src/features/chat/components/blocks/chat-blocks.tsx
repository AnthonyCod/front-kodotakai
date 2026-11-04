import { defineBlock, useBlockActions } from '@/shared/blocks'
import { Sparkles } from '@/shared/components/animate-ui/icons/hugeicons/sparkles'
import {
  quickRepliesBlockSchema,
  textBlockSchema,
  type QuickRepliesBlock,
  type TextBlock,
} from '../../api/chat-blocks'
import { useChatStore } from '../../model/chat-store'
import { resolveQuickReply } from '../../model/quick-replies'
import { toPlainText } from '@/shared/lib/plain-text'
import { GLASS } from '@/shared/ui/glass'
import { SplitText, useReveal } from '@/shared/ui/split-text'

// Texto plano siempre: puede traer Markdown/LaTeX y nunca se interpreta como HTML.
function TextBubble({ text }: TextBlock) {
  const reveal = useReveal()
  return (
    <SplitText
      as="p"
      data-block="text"
      text={toPlainText(text)}
      animate={reveal}
      className="break-words whitespace-pre-wrap"
    />
  )
}

function QuickReplies({ options }: QuickRepliesBlock) {
  const { sendMessage, disabled } = useBlockActions()
  const setComposerHint = useChatStore((s) => s.setComposerHint)

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          disabled={disabled}
          className={`${GLASS} inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm`}
          onClick={() => {
            const action = resolveQuickReply(option)
            if (action.kind === 'send') sendMessage(action.text)
            else setComposerHint(action.placeholder)
          }}
        >
          <Sparkles size={14} className="shrink-0 text-primary" aria-hidden />
          {option.title}
        </button>
      ))}
    </div>
  )
}

export const textBlock = defineBlock({
  type: 'TEXT',
  schema: textBlockSchema,
  Component: ({ block }) => <TextBubble {...block} />,
})
export const quickRepliesBlock = defineBlock({
  type: 'QUICK_REPLIES',
  schema: quickRepliesBlockSchema,
  Component: ({ block }) => <QuickReplies {...block} />,
})
