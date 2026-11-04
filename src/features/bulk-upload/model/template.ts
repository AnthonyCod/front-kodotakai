import { BULK_COLUMNS } from './bulk-columns'

/** Plantilla .xlsx: hoja "Envíos" (solo encabezados) y hoja "Instrucciones" con un ejemplo por columna. */
export async function downloadTemplate() {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const bold = (value: string) => ({ value, fontWeight: 'bold' as const })

  await writeXlsxFile([
    {
      sheet: 'Envíos',
      data: [BULK_COLUMNS.map((column) => bold(column.header))],
      columns: BULK_COLUMNS.map((column) => ({ width: column.width })),
      stickyRowsCount: 1,
    },
    {
      sheet: 'Instrucciones',
      data: [
        [bold('Columna'), bold('Qué escribir'), bold('Ejemplo')],
        ...BULK_COLUMNS.map((column) => [column.header, column.hint, column.example]),
        [],
        ['Una fila por envío. No cambies los nombres de las columnas.'],
      ],
      columns: [{ width: 28 }, { width: 40 }, { width: 18 }],
    },
  ]).toFile('plantilla-carga-masiva-translogix.xlsx')
}
