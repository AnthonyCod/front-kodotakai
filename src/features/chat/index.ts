// API pública de la feature chat (M1). Fuera de la feature solo se importa desde aquí.
export { ChatGatewayProvider, httpChatGateway, type ChatGateway } from './api/chat-gateway'
export type {
  AttachmentRef,
  Channel,
  ChatMessageRequest,
  ConversationReply,
  ConversationStatus,
  Intent,
  SessionHistory,
} from './api/chat-contract'
export { useChatStore, type ChatMessage, type FailedSend } from './model/chat-store'
export { getClientId } from './model/client-id'
export { MAX_MESSAGE_LENGTH, useSendMessage } from './model/use-send-message'
export { resolveQuickReply, type QuickReplyAction } from './model/quick-replies'
export { ChatBlockActionsProvider } from './model/chat-block-actions'
export {
  quickRepliesBlockSchema,
  textBlockSchema,
  type QuickRepliesBlock,
  type TextBlock,
} from './api/chat-blocks'
export { quickRepliesBlock, textBlock } from './components/blocks/chat-blocks'
export { ChatView } from './components/chat-view'
