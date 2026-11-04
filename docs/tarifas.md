# Tarifas por trayecto — para el backend

Propuesta para reemplazar los valores de `formula_version = provisional-v1` de `POST /api/v1/cotizar`
con datos de mercado. **No cambia el contrato**: usa los mismos campos de `CalculoFlete` y la misma
regla del flete mínimo (DEC-Q2). El front ya muestra estos valores en `/info/tarifas`.

- Matriz lista para cargar: **`docs/tarifas-trayectos.csv`** (38 × 38 = 1.444 trayectos).
- Código del front: `src/features/tariffs/model/tariffs.ts` y `routes.ts`. Un test
  (`routes.test.ts`) comprueba que el CSV y el front dan los mismos valores.

## 1. CSV de trayectos

```
codigo_trayecto,origen,destino,tipo,distancia_km,cop_por_kg,flete_minimo_cop,tiempo_entrega_horas
TLX-BOG-MED-001,Bogotá D.C.,Medellín,nacional,360,3400,18200,48
```

| Columna                | Uso en `/cotizar`                                                         |
| ---------------------- | ------------------------------------------------------------------------- |
| `codigo_trayecto`      | `ruta.codigo_trayecto` (mismo formato TLX-BOG-MED-001)                    |
| `origen`, `destino`    | `ruta.origen`, `ruta.destino` (nombres de la lista de ciudades del front) |
| `cop_por_kg`           | `calculo.tarifa_aplicada.cop_por_kg`                                      |
| `flete_minimo_cop`     | `calculo.flete_minimo_cop`                                                |
| `tiempo_entrega_horas` | `tiempo_entrega_horas`                                                    |
| `tipo`, `distancia_km` | informativos (urbano, nacional, especial)                                 |

## 2. Cálculo (igual al actual)

```
peso_volumetrico_kg   = alto_cm × ancho_cm × largo_cm ÷ 2500            # 400 kg/m³
peso_facturable_kg    = max(peso_real_kg, peso_volumetrico_kg)
tarifa_aplicada.tipo  = REAL si peso_real_kg ≥ peso_volumetrico_kg, si no VOLUMETRICO
flete_base_cop        = max(flete_minimo_cop, round(peso_facturable_kg × cop_por_kg))
flete_minimo_aplicado = peso_facturable_kg × cop_por_kg < flete_minimo_cop
seguro_cop            = max(550, round(valor_declarado_cop × 0,02))
recargos              = CADENA_FRIO: 40 % de flete_base_cop · MERCANCIA_PELIGROSA: 50 % de flete_base_cop
flete_total_cop       = flete_base_cop + seguro_cop + Σ recargos
```

Ejemplo Bogotá → Medellín, 10 kg reales, caja pequeña, valor declarado $500.000:
`flete_base = max(18.200, 10 × 3.400) = 34.000` · `seguro = 10.000` · `total = 44.000`.

## 3. De dónde salen los valores

No hay un tarifario oficial público 2026 ciudad a ciudad. La base real es el tarifario de
**Aviaexpress (Grupo Aviatur)**, vigente desde el 1 de febrero de 2025, con origen Bogotá. Seguro del
2 % del valor declarado (mínimo $550) y cobro por el mayor entre peso real y volumétrico.

| Servicio Aviaexpress       | Kg adicional | Flete mínimo | En el CSV                               |
| -------------------------- | ------------ | ------------ | --------------------------------------- |
| Paquete urbano             | 2.357        | 10.320       | `urbano`: igual                         |
| Paquete nacional terrestre | 3.631        | 19.556       | `nacional`: Bogotá–Cali 3.700 y 19.800  |
| Trayecto especial          | 12.676       | 56.884       | `especial` (Leticia, San Andrés): igual |

Entre ciudades la tarifa crece con la distancia por carretera (línea recta × 1,5):

```
cop_por_kg           = redondear_100(2.600 + km × 2,3)
flete_minimo_cop     = redondear_100(8.000 + km × 9,5) + 2 × cop_por_kg   # equivale a 3 kg
tiempo_entrega_horas = ≤ 350 km: 24 · ≤ 800 km: 48 · más: 72 · especial: 192
```

| Desde Bogotá a | Km   | `cop_por_kg` | `flete_minimo_cop` | El mínimo cubre hasta | Horas |
| -------------- | ---- | ------------ | ------------------ | --------------------- | ----- |
| Bogotá         | 0    | 2.357        | 10.320             | 4 kg                  | 24    |
| Tunja          | 180  | 3.000        | 15.700             | 5 kg                  | 24    |
| Medellín       | 360  | 3.400        | 18.200             | 5 kg                  | 48    |
| Cali           | 460  | 3.700        | 19.800             | 5 kg                  | 48    |
| Barranquilla   | 1050 | 5.000        | 28.000             | 5,5 kg                | 72    |
| Leticia        | 1640 | 12.676       | 56.884             | 4 kg                  | 192   |

## 4. Diferencia con `provisional-v1`

En la captura real del backend (Bogotá → Medellín, 45,5 kg) el flete total fue $190.975 con seguro
de $125.000, o sea un flete base de $65.975 = **1.450 COP/kg**. Con esta propuesta ese envío daría
45,5 × 3.400 = **$154.700** de flete base. La paquetería cobra entre 2.300 y 3.700 COP por kg
adicional; 1.450 está más cerca de carga masiva. Si el negocio es carga pesada, conviene bajar
`cop_por_kg` por tramos de peso; eso lo decide negocio.

## 5. Servicios adicionales

| Código                | Precio                          | Reglas                                                                                    |
| --------------------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| `CADENA_FRIO`         | +40 % del flete base            | Ya existe en `RecargoCodigo`. Res. 2505/2004 y 2674/2013. No en trayecto especial.        |
| `MERCANCIA_PELIGROSA` | +50 % del flete base            | Ya existe en `RecargoCodigo`. Decreto 1609/2002. Prohibidas clases 1 y 7. No en especial. |
| `CONTRA_ENTREGA`      | 3 % de lo recaudado, mín. 3.000 | Código nuevo; requiere `valor_recaudo_cop` en la solicitud.                               |
| `DEVOLUCION`          | Flete del trayecto de regreso   | Código nuevo; tras dos intentos de entrega fallidos.                                      |

Los porcentajes de frío y mercancía peligrosa no tienen referencia pública: los define negocio.

## 6. Validaciones (`advertencias` o 422)

- Valor declarado máximo: 4 SMMLV = 7.003.620 COP (SMMLV 2026: 1.750.905, Decreto 1469 de 2025).
- `requiere_cadena_frio` o `mercancia_peligrosa` en trayecto especial → rechazar.
- Origen o destino fuera del CSV → 422 con la lista de ciudades válidas.
- Indemnización por pérdida, saqueo o avería: 5 veces la tarifa pagada más el valor asegurado
  (Ley 1369 de 2009, art. 25).
- IVA: por confirmar con contabilidad.

## 7. Endpoint opcional para la página de tarifas

`GET /api/v1/tarifas?origen=Bogotá D.C.` → filas del CSV con ese origen, para que el front deje de
usar su copia local:

```json
{
  "formula_version": "2026.1",
  "origen": "Bogotá D.C.",
  "trayectos": [
    {
      "codigo_trayecto": "TLX-BOG-MED-001",
      "destino": "Medellín",
      "tipo": "nacional",
      "distancia_km": 360,
      "cop_por_kg": 3400,
      "flete_minimo_cop": 18200,
      "tiempo_entrega_horas": 48
    }
  ]
}
```
