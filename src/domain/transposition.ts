/**
 * Transposition clarinette Sib.
 *
 * Le micro capte le son réel (concert). La partition, les doigtés et
 * l’accordeur parlent en notes écrites, un ton au-dessus.
 * Exemple : sol à vide (G4 écrit) sonne un fa (F4 concert).
 */
export const BB_CLARINET_TRANSPOSITION_SEMITONES = 2

/** Fréquence écrite = un ton au-dessus du son réel. */
export function concert_to_written_hz(concert_hz: number): number {
  return concert_hz * 2 ** (BB_CLARINET_TRANSPOSITION_SEMITONES / 12)
}
