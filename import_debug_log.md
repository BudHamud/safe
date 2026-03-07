# Historial de Mantenimiento de Importación Excel

## Intento 1: Mapeo Inicial
- **Fallo:** El sistema intentaba leer la primera fila de datos, pero el archivo real tenía los metadatos de cuenta en las filas 1 y 2.

## Intento 2 y 3: Detector Inteligente de Cabeceras
- **Fallo:** El texto `Account transactions` (fila 1) engañó al escáner.
- **Solución:** Lo ajusté para escanear celdas exactas y logró detectar con éxito la Fila 3. A pesar de lograr hallar la cabecera correcta, la subida **falló** reportando datos nulos.

## Intento 4: Normalización de espacios
- **Análisis de Fallo:** Examinando nuevamente los procesos internos, descubrí cuál podría ser el verdadero saboteador: **los espacios ocultos en los títulos de columnas**. A veces los Excel (especialmente cuando son exportados por entidades bancarias) incluyen espacios al inicio o al final del nombre (ej: `"Date "` o `"Transaction "`). El código encargado de extraer los valores era altamente estricto y fallaba si la limpieza no eliminaba el espacio de los títulos.
- **Acción a Tomar:** Aplicar `.trim()` al limpiador de nombres `pickField` en `movements.utils.ts` para que elimine cualquier rastro de espacio extra en las cabeceras. Adicionalmente, permitiremos palabras cortadas como `"Transactio" ` o `"Referenc" ` (causadas por la flechita del filtro) como un extra de seguridad.

---

## Intento 5 (Actual): Modal de mapeo de columnas

### Cambios implementados
Ante la imposibilidad de hacer que el sistema adivine las columnas de cualquier banco/formato, se eliminó la dependencia del auto-detect y se reemplazó por un flujo en dos pasos:

1. **`handleImport` (paso 1 — solo lectura):** Lee el archivo, detecta la fila de cabeceras buscando la primera fila con ≥2 celdas que parezcan etiquetas (no números ni fechas), extrae los nombres de columna y los guarda en un estado `importDraft`. No llama a la API.

2. **Modal `ColumnMapModal` (paso 2 — configuración):** Muestra las columnas detectadas como chips y presenta 6 selectores que el usuario completa:
   - **Fecha** *(requerido)*
   - Descripción
   - **Monto (egreso)** *(requerido si no hay ingreso)*
   - **Monto (ingreso)** *(requerido si no hay egreso)*
   - Detalles
   - Categoría

   Los selectores se pre-cargan con auto-detect heurístico pero el usuario puede corregirlos libremente. El botón "Importar" solo se habilita cuando hay Fecha + al menos un campo de monto.

3. **`handleConfirmImport` (paso 3 — import real):** Recibe el mapeo confirmado por el usuario y usa `parseExcelRowMapped()` que lee cada fila usando la clave exacta de la columna. Cero normalización de strings, cero ambigüedad.

4. **`parseExcelRowMapped()` en `movements.utils.ts`:** Nueva función paralela a `parseExcelRow` que acepta un `ColumnMapping` y hace `row[key]` directamente, sin buscar por candidatos.

### Nuevo problema detectado — Totales incorrectos
A pesar del nuevo flujo, los totales importados **no coinciden** con los valores reales del archivo:

| Concepto | Esperado | Mostrado |
|---|---|---|
| Ingresos | **₪ 183,296.67** | ₪ 10,307.37 |
| Egresos | **₪ 158,842.36** | ₪ 31,576.55 |

**Hipótesis:** El problema no está en el mapeo de columnas sino en que solo se está leyendo/subiendo una fracción de las filas. Posibles causas:
- La detección de cabeceras todavía apunta a una fila incorrecta, cortando el dataset.
- El guard `if (amount === 0 && !desc) continue` está descartando filas válidas que tienen monto pero descripción vacía (el banco exporta la descripción en una columna con nombre diferente al seleccionado).
- Las celdas de monto tienen formato de texto con comas como separador de miles (ej: `"1,234.56"`) que el limpiador interpreta mal.
- Algunos valores de crédito/débito están en la misma columna con signo, siendo ignorados por el parseo separado de `debitCol`/`creditCol`.
