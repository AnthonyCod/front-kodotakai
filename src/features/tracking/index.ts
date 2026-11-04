// API pública de la feature tracking (M2). Fuera de la feature solo se importa desde aquí.
export {
  GUIA_PATTERN,
  trackingCardBlockSchema,
  type TrackingCardBlock,
} from './api/tracking-card-block'
export { trackingCardBlock, TrackingCard } from './components/blocks/tracking-card'
export { TrackingLookup } from './components/tracking-lookup'
export { buildTimeline, type TrackingTimeline } from './model/tracking-timeline'
export { getTracking, type TrackingResponse } from './api/tracking-api'
