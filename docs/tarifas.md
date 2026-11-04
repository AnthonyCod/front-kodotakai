# Tarifas

La matriz de tarifas vive en el backend (tabla `tariff_routes`, CR-002). El front no calcula precios:
`/info/tarifas` muestra `GET /api/v1/tarifas` y `/admin/tarifas` la edita con
`GET|POST /admin/tarifas` y `PATCH /admin/tarifas/{codigo_trayecto}` (rol ADMIN). `POST /cotizar` cotiza
con las rutas activas desde el momento en que se guardan.

## Campos (los del CSV del reto)

| Campo                                    | Uso                                                       |
| ---------------------------------------- | --------------------------------------------------------- |
| `codigo_trayecto`                        | `TLX-BOG-MED-001`. No se edita: se crea otra ruta.        |
| `origen`, `destino` (+ depto.)           | Ciudad a ciudad. No se editan.                            |
| `tipo_cobertura`                         | Urbana Principal, Frontera, Zona ZOMAC, Trayecto Especial |
| `tarifa_kg_real_cop`                     | COP por kg cuando pesa más el peso real                   |
| `tarifa_kg_volumetrico_cop`              | COP por kg cuando pesa más el volumen                     |
| `divisor_volumetrico`                    | cm³ por kg volumétrico (4000)                             |
| `flete_minimo_cop`                       | Piso del flete base                                       |
| `porcentaje_seguro`, `seguro_minimo_cop` | Seguro sobre el valor declarado, con mínimo               |
| `recargo_cadena_frio_pct`                | % sobre el flete base                                     |
| `recargo_mercancia_peligrosa_cop`        | Valor fijo por envío                                      |
| `tiempo_entrega_horas`                   | Promesa de entrega                                        |
| `activo`                                 | `false` la saca de las cotizaciones                       |

## Fórmula (`provisional-v1` del backend)

1. Peso volumétrico = alto × ancho × largo (cm) ÷ divisor.
2. Peso facturable = máx(real, volumétrico); tarifa por kg real o volumétrica según cuál gane.
3. Flete base = máx(flete mínimo, peso facturable × tarifa por kg). El mínimo cubre hasta
   `flete_minimo ÷ tarifa_kg` kg (lo que la ficha muestra como "hasta N kg").
4. Total = flete base + seguro + recargos.

## Precios sembrados

La migración `0002` siembra `data/config/matriz_tarifas_mercado.csv`: los 25 trayectos del reto con
la tarifa por kg y el flete mínimo a precio de mercado. Modelo por distancia por carretera (línea recta
× 1,5) anclado en la tarifa pública de Aviaexpress (feb. 2025):

- kg = 2.600 + 2,3 × km; mínimo = 8.000 + 9,5 × km + 2 kg; ambos redondeados a centenas.
- Factor por cobertura: Frontera 1,10 · Zona ZOMAC 1,25 · Trayecto Especial 1,15.
- Kg volumétrico = kg real × 1,10.

Seguro, recargos, divisor y tiempos son los del CSV oficial. Ejemplos: Bogotá → Medellín $3.400/kg y
mínimo $18.200 (oficial: $1.450 y $18.500); Bogotá → Riohacha $6.100/kg y mínimo $34.000.
