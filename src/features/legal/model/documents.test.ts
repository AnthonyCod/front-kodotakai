import { describe, expect, it } from 'vitest'
import { findLegalDocument, LEGAL_DOCUMENTS } from './documents'
import { formatLegalDate } from './format-legal-date'

describe('documentos legales', () => {
  it('cada documento tiene resumen y secciones con id único', () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(doc.summary.length).toBeGreaterThan(0)
      const ids = doc.sections.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('busca por slug', () => {
    expect(findLegalDocument('uso-de-logi')?.title).toBe('Uso de Logi (IA)')
    expect(findLegalDocument('no-existe')).toBeUndefined()
  })

  it('muestra la fecha sin correrse un día por la zona horaria', () => {
    expect(formatLegalDate('2026-11-04')).toBe('4 de noviembre de 2026')
  })
})
