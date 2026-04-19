/**
 * Seuils métier — source de vérité pour les valeurs limites du moteur.
 * Chaque constante documente : signification, règle consommatrice,
 * source normative si applicable.
 */
export const THRESHOLDS = {
  /** Hauteur déclenchant l'obligation d'anti-basculement (mm) — RT_001 */
  ANTI_TIP_HEIGHT_MM: 1500,

  /** Profondeur min pour penderie cintres standard (mm) — VAL_ROD_DEPTH */
  WARDROBE_ROD_MIN_DEPTH_MM: 550,

  /** Poids porte (kg) requérant charnières renforcées — VAL_DOOR_WEIGHT */
  DOOR_WEIGHT_REINFORCE_KG: 15,

  /** Charge max meuble suspendu sur placo avant warning (kg) — RT_006 */
  SUSPENDED_PLACO_WARN_KG: 25,

  /** Charge max absolue meuble suspendu (kg) — RT_006 */
  SUSPENDED_MAX_KG: 50,

  /** Charge cave à vin déclenchant un warning (kg) — RT_013 */
  WINE_RACK_WARN_KG: 30,

  /** Borne basse zone ergonomique active (mm) — ERGO_ZONE_ACTIVE */
  ERGO_ZONE_LOW_MM: 400,

  /** Borne haute zone ergonomique active (mm) — ERGO_ZONE_ACTIVE */
  ERGO_ZONE_HIGH_MM: 1400,

  /** Profondeur max meuble d'entrée sans warning circulation (mm) — RT_009 */
  ENTRY_MAX_DEPTH_MM: 400,
} as const;
