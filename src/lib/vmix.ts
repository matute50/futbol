// ============================================================
// vMix API 27 — Módulo de control
// URL base : http://127.0.0.1:8088/api/
// Input    : 1  (número de input directo en vMix)
//
// Campos confirmados por mapeo en marcador.gtzip:
//   NOMBRE%20LOCAL  · NOMBRE%20VISITA
//   GOLES%20LOCAL   · GOLES%20VISITA
//   FONDO%20LOCAL   (SetColor)
//   RELOJ
//
// REGLAS:
//  - Espacios en SelectedName : %20  (hardcodeado en FIELDS)
//  - Valores de texto         : encodeURIComponent()
//  - Colores                  : %23RRGGBB
//  - Todas las peticiones     : mode: 'no-cors'
// ============================================================

const VMIX_URL = 'http://127.0.0.1:8088/api/';
const INPUT    = '1';

// ── Campos pre-codificados (SelectedName exactos de vMix) ──────────────────────
const F = {
  NOMBRE_LOCAL:  'NOMBRE%20LOCAL',
  NOMBRE_VISITA: 'NOMBRE%20VISITA',
  GOLES_LOCAL:   'GOLES%20LOCAL',
  GOLES_VISITA:  'GOLES%20VISITA',
  FONDO_LOCAL:   'FONDO%20LOCAL',
  FONDO_VISITA:  'FONDO%20VISITA',  // incluido — omitir si no existe en el proyecto
  ZONA:          'ZONA',
  PERIODO:       'PERIODO',
  RELOJ:         'RELOJ',
} as const;

// ── Construcción manual de URL ────────────────────────────────────────────────
// Los SelectedName ya vienen con %20; los Value se codifican con encodeURIComponent.
// NO se usa URLSearchParams para evitar transformaciones no deseadas.
function buildUrl(fn: string, selectedName: string, value?: string): string {
  let url = `${VMIX_URL}?Function=${fn}&Input=${INPUT}&SelectedName=${selectedName}`;
  if (value !== undefined) url += `&Value=${value}`;
  return url;
}

// ── Petición a vMix ─────────────────────────────────────────────────────────────
async function callVmix(url: string): Promise<void> {
  console.debug('[vMix] →', url);
  try {
    await fetch(url, { method: 'GET', mode: 'no-cors' });
  } catch (err) {
    console.warn('[vMix] Sin respuesta (no-cors):', err);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNCIONES PÚBLICAS
// ══════════════════════════════════════════════════════════════════════════════

/** SetText — texto libre (nombres, goles, zona, periodo, reloj) */
async function setText(field: string, value: string): Promise<void> {
  await callVmix(buildUrl('SetText', field, encodeURIComponent(value)));
}

/** SetColor — color hex para fondos. Envía %23RRGGBB */
async function setColor(field: string, hex: string): Promise<void> {
  const encoded = '%23' + hex.replace('#', '').toUpperCase();
  await callVmix(buildUrl('SetColor', field, encoded));
}

// ── Funciones de reloj ────────────────────────────────────────────────────────

export async function startCountdown(): Promise<void> {
  await callVmix(buildUrl('StartCountdown', F.RELOJ));
}

export async function stopCountdown(): Promise<void> {
  await callVmix(buildUrl('StopCountdown', F.RELOJ));
}

// ── Goles ────────────────────────────────────────────────────────────────────

export async function setGoalLocal(goles: number): Promise<void> {
  await setText(F.GOLES_LOCAL, String(goles));
}

export async function setGoalVisita(goles: number): Promise<void> {
  await setText(F.GOLES_VISITA, String(goles));
}

// ── Colores de fondo ─────────────────────────────────────────────────────────

export async function setColorLocal(hex: string): Promise<void> {
  await setColor(F.FONDO_LOCAL, hex);
}

export async function setColorVisita(hex: string): Promise<void> {
  await setColor(F.FONDO_VISITA, hex);
}

// ══════════════════════════════════════════════════════════════════════════════
// PRECARGAR PARTIDO
// Secuencial (await uno por uno) para no saturar vMix.
// ══════════════════════════════════════════════════════════════════════════════

export interface PartidoVmix {
  nombreLocal:   string;
  nombreVisita:  string;
  zona:          string;
  colorLocal?:   string;
  colorVisita?:  string;
}

export async function precargarPartido(data: PartidoVmix): Promise<void> {
  await setText(F.NOMBRE_LOCAL,  data.nombreLocal);
  await setText(F.NOMBRE_VISITA, data.nombreVisita);
  await setText(F.ZONA,          data.zona);
  await setText(F.GOLES_LOCAL,   '0');
  await setText(F.GOLES_VISITA,  '0');
  await setText(F.RELOJ,         '00:00');
  await setText(F.PERIODO,       'PRIMER TIEMPO');
  if (data.colorLocal)  await setColor(F.FONDO_LOCAL,  data.colorLocal);
  if (data.colorVisita) await setColor(F.FONDO_VISITA, data.colorVisita);
}

// ══════════════════════════════════════════════════════════════════════════════
// CICLO DEL PARTIDO
//  estado 0 → Inicio 1° Tiempo  : RELOJ=00:00 · PRIMER TIEMPO  · StartCountdown
//  estado 1 → Fin 1° / Entretiempo: StopCountdown · RELOJ=00:00 · ENTRETIEMPO
//  estado 2 → Inicio 2° Tiempo  : RELOJ=00:00 · SEGUNDO TIEMPO · StartCountdown
//  estado 3 → Final             : StopCountdown · FINAL
// ══════════════════════════════════════════════════════════════════════════════

export async function ejecutarCiclo(estado: 0 | 1 | 2 | 3): Promise<void> {
  switch (estado) {
    case 0:
      await setText(F.RELOJ,   '00:00');
      await setText(F.PERIODO, 'PRIMER TIEMPO');
      await startCountdown();
      break;
    case 1:
      await stopCountdown();
      await setText(F.RELOJ,   '00:00');
      await setText(F.PERIODO, 'ENTRETIEMPO');
      break;
    case 2:
      await setText(F.RELOJ,   '00:00');
      await setText(F.PERIODO, 'SEGUNDO TIEMPO');
      await startCountdown();
      break;
    case 3:
      await stopCountdown();
      await setText(F.PERIODO, 'FINAL');
      break;
  }
}
