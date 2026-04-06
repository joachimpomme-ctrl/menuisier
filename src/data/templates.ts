import type { AppState, MaterialKey } from '../types';
import { MATERIALS } from './materials';
import { uid } from '../lib/helpers';

export interface ProjectTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Short hint for the AI when generating from description */
  aiHint: string;
  /** Factory to create a full AppState */
  create: (mk?: MaterialKey) => AppState;
}

function mat(mk: MaterialKey = 'cp_bouleau') {
  const m = MATERIALS[mk];
  const p = m.panels[0];
  return { mk, m, p, th: m.defaultThickness / 10 };
}

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'bibliotheque',
    name: 'Bibliothèque',
    icon: '📚',
    description: 'Bibliothèque murale classique, avec tablettes fixes et réglables.',
    aiHint: 'bibliothèque murale avec tablettes pour livres',
    create: (mk = 'cp_bouleau') => {
      const { p, th } = mat(mk);
      const innerW = +(80 - 2 * th).toFixed(1);
      return {
        materialKey: mk,
        project: { name: 'Bibliothèque', wallWidth: 200, wallDepth: 35, ceilingHeight: 250, plinthHeight: 10, plinthDepth: 2 },
        panel: { width: p.w, height: p.h, thickness: th },
        kerf: 0.3,
        costConfig: { panelPrice: p.defaultPrice },
        bodies: [{
          id: uid(), name: 'Corps central', width: 80, depth: 28,
          pieces: [
            { id: uid(), name: 'Joue gauche', length: 240, width: 28, qty: 1, type: 'joue' },
            { id: uid(), name: 'Joue droite', length: 240, width: 28, qty: 1, type: 'joue' },
            { id: uid(), name: 'Tablette fixe haut', length: innerW, width: 28, qty: 1, type: 'tablette-fixe' },
            { id: uid(), name: 'Tablette fixe bas', length: innerW, width: 28, qty: 1, type: 'tablette-fixe' },
            { id: uid(), name: 'Tablette réglable', length: innerW, width: 28, qty: 4, type: 'tablette-reglable' },
          ],
        }],
      };
    },
  },
  {
    id: 'etagere',
    name: 'Étagère murale',
    icon: '🪵',
    description: 'Étagère ouverte légère, fixée au mur. 3-5 niveaux.',
    aiHint: 'étagère murale ouverte, légère, 3 à 5 niveaux',
    create: (mk = 'cp_bouleau') => {
      const { p, th } = mat(mk);
      const innerW = +(60 - 2 * th).toFixed(1);
      return {
        materialKey: mk,
        project: { name: 'Étagère murale', wallWidth: 150, wallDepth: 30, ceilingHeight: 250, plinthHeight: 0, plinthDepth: 0 },
        panel: { width: p.w, height: p.h, thickness: th },
        kerf: 0.3,
        costConfig: { panelPrice: p.defaultPrice },
        bodies: [{
          id: uid(), name: 'Étagère', width: 60, depth: 22,
          pieces: [
            { id: uid(), name: 'Joue gauche', length: 120, width: 22, qty: 1, type: 'joue' },
            { id: uid(), name: 'Joue droite', length: 120, width: 22, qty: 1, type: 'joue' },
            { id: uid(), name: 'Tablette fixe', length: innerW, width: 22, qty: 4, type: 'tablette-fixe' },
          ],
        }],
      };
    },
  },
  {
    id: 'meuble-tv',
    name: 'Meuble TV',
    icon: '📺',
    description: 'Meuble bas pour téléviseur, avec niches et portes.',
    aiHint: 'meuble TV bas, longueur 150-180cm, hauteur 50cm, avec niches',
    create: (mk = 'melamine') => {
      const { p, th } = mat(mk);
      const innerW = +(60 - 2 * th).toFixed(1);
      return {
        materialKey: mk,
        project: { name: 'Meuble TV', wallWidth: 300, wallDepth: 50, ceilingHeight: 250, plinthHeight: 0, plinthDepth: 0 },
        panel: { width: p.w, height: p.h, thickness: th },
        kerf: 0.3,
        costConfig: { panelPrice: p.defaultPrice },
        bodies: [
          {
            id: uid(), name: 'Caisson gauche', width: 60, depth: 45,
            pieces: [
              { id: uid(), name: 'Joue gauche', length: 50, width: 45, qty: 1, type: 'joue' },
              { id: uid(), name: 'Joue droite', length: 50, width: 45, qty: 1, type: 'joue' },
              { id: uid(), name: 'Tablette haut', length: innerW, width: 45, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette bas', length: innerW, width: 45, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette milieu', length: innerW, width: 45, qty: 1, type: 'tablette-fixe' },
            ],
          },
          {
            id: uid(), name: 'Caisson central', width: 60, depth: 45,
            pieces: [
              { id: uid(), name: 'Joue gauche', length: 50, width: 45, qty: 1, type: 'joue' },
              { id: uid(), name: 'Joue droite', length: 50, width: 45, qty: 1, type: 'joue' },
              { id: uid(), name: 'Tablette haut', length: innerW, width: 45, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette bas', length: innerW, width: 45, qty: 1, type: 'tablette-fixe' },
            ],
          },
          {
            id: uid(), name: 'Caisson droit', width: 60, depth: 45,
            pieces: [
              { id: uid(), name: 'Joue gauche', length: 50, width: 45, qty: 1, type: 'joue' },
              { id: uid(), name: 'Joue droite', length: 50, width: 45, qty: 1, type: 'joue' },
              { id: uid(), name: 'Tablette haut', length: innerW, width: 45, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette bas', length: innerW, width: 45, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette milieu', length: innerW, width: 45, qty: 1, type: 'tablette-fixe' },
            ],
          },
        ],
      };
    },
  },
  {
    id: 'armoire',
    name: 'Armoire / Dressing',
    icon: '👔',
    description: 'Armoire ou dressing avec penderie et étagères.',
    aiHint: 'armoire ou dressing, penderie + étagères, hauteur 200-240cm',
    create: (mk = 'melamine') => {
      const { p, th } = mat(mk);
      const innerW = +(90 - 2 * th).toFixed(1);
      return {
        materialKey: mk,
        project: { name: 'Armoire', wallWidth: 200, wallDepth: 65, ceilingHeight: 250, plinthHeight: 8, plinthDepth: 2 },
        panel: { width: p.w, height: p.h, thickness: th },
        kerf: 0.3,
        costConfig: { panelPrice: p.defaultPrice },
        bodies: [
          {
            id: uid(), name: 'Penderie', width: 90, depth: 55,
            pieces: [
              { id: uid(), name: 'Joue gauche', length: 230, width: 55, qty: 1, type: 'joue' },
              { id: uid(), name: 'Joue droite', length: 230, width: 55, qty: 1, type: 'joue' },
              { id: uid(), name: 'Tablette haut', length: innerW, width: 55, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette bas', length: innerW, width: 55, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette chaussures', length: innerW, width: 55, qty: 1, type: 'tablette-fixe' },
            ],
          },
          {
            id: uid(), name: 'Étagères', width: 60, depth: 55,
            pieces: [
              { id: uid(), name: 'Joue gauche', length: 230, width: 55, qty: 1, type: 'joue' },
              { id: uid(), name: 'Joue droite', length: 230, width: 55, qty: 1, type: 'joue' },
              { id: uid(), name: 'Tablette fixe haut', length: +(60 - 2 * th).toFixed(1), width: 55, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette fixe bas', length: +(60 - 2 * th).toFixed(1), width: 55, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette réglable', length: +(60 - 2 * th).toFixed(1), width: 55, qty: 5, type: 'tablette-reglable' },
            ],
          },
        ],
      };
    },
  },
  {
    id: 'buffet',
    name: 'Buffet / Bahut',
    icon: '🍽',
    description: 'Meuble de rangement bas avec portes et/ou tiroirs.',
    aiHint: 'buffet bas, hauteur 80-90cm, largeur 120-180cm, avec portes',
    create: (mk = 'cp_bouleau') => {
      const { p, th } = mat(mk);
      const innerW = +(60 - 2 * th).toFixed(1);
      return {
        materialKey: mk,
        project: { name: 'Buffet', wallWidth: 250, wallDepth: 50, ceilingHeight: 250, plinthHeight: 0, plinthDepth: 0 },
        panel: { width: p.w, height: p.h, thickness: th },
        kerf: 0.3,
        costConfig: { panelPrice: p.defaultPrice },
        bodies: [
          {
            id: uid(), name: 'Caisson gauche', width: 60, depth: 40,
            pieces: [
              { id: uid(), name: 'Joue gauche', length: 80, width: 40, qty: 1, type: 'joue' },
              { id: uid(), name: 'Joue droite', length: 80, width: 40, qty: 1, type: 'joue' },
              { id: uid(), name: 'Tablette haut', length: innerW, width: 40, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette bas', length: innerW, width: 40, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette milieu', length: innerW, width: 40, qty: 1, type: 'tablette-reglable' },
            ],
          },
          {
            id: uid(), name: 'Caisson droit', width: 60, depth: 40,
            pieces: [
              { id: uid(), name: 'Joue gauche', length: 80, width: 40, qty: 1, type: 'joue' },
              { id: uid(), name: 'Joue droite', length: 80, width: 40, qty: 1, type: 'joue' },
              { id: uid(), name: 'Tablette haut', length: innerW, width: 40, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette bas', length: innerW, width: 40, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette milieu', length: innerW, width: 40, qty: 1, type: 'tablette-reglable' },
            ],
          },
        ],
      };
    },
  },
  {
    id: 'bureau',
    name: 'Bureau',
    icon: '🖥',
    description: 'Bureau avec plateau, caisson de rangement et passe-câbles.',
    aiHint: 'bureau de travail, plateau 120-160cm, caisson tiroirs',
    create: (mk = 'cp_bouleau') => {
      const { p, th } = mat(mk);
      return {
        materialKey: mk,
        project: { name: 'Bureau', wallWidth: 200, wallDepth: 70, ceilingHeight: 250, plinthHeight: 0, plinthDepth: 0 },
        panel: { width: p.w, height: p.h, thickness: th },
        kerf: 0.3,
        costConfig: { panelPrice: p.defaultPrice },
        bodies: [
          {
            id: uid(), name: 'Plateau + pieds', width: 140, depth: 65,
            pieces: [
              { id: uid(), name: 'Plateau', length: 140, width: 65, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Pied gauche', length: 73, width: 65, qty: 1, type: 'joue' },
              { id: uid(), name: 'Pied droit', length: 73, width: 65, qty: 1, type: 'joue' },
              { id: uid(), name: 'Traverse arrière', length: +(140 - 2 * th).toFixed(1), width: 10, qty: 1, type: 'autre' },
            ],
          },
          {
            id: uid(), name: 'Caisson tiroirs', width: 40, depth: 55,
            pieces: [
              { id: uid(), name: 'Joue gauche', length: 60, width: 55, qty: 1, type: 'joue' },
              { id: uid(), name: 'Joue droite', length: 60, width: 55, qty: 1, type: 'joue' },
              { id: uid(), name: 'Tablette haut', length: +(40 - 2 * th).toFixed(1), width: 55, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette bas', length: +(40 - 2 * th).toFixed(1), width: 55, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Séparation tiroirs', length: +(40 - 2 * th).toFixed(1), width: 55, qty: 2, type: 'tablette-fixe' },
            ],
          },
        ],
      };
    },
  },
  {
    id: 'cuisine',
    name: 'Caisson cuisine',
    icon: '🍳',
    description: 'Caisson de cuisine standard (haut ou bas), adaptable.',
    aiHint: 'caisson cuisine, norme 32mm, profondeur 56-58cm bas ou 32cm haut',
    create: (mk = 'melamine') => {
      const { p, th } = mat(mk);
      const innerW = +(60 - 2 * th).toFixed(1);
      return {
        materialKey: mk,
        project: { name: 'Caisson cuisine', wallWidth: 300, wallDepth: 65, ceilingHeight: 250, plinthHeight: 15, plinthDepth: 2 },
        panel: { width: p.w, height: p.h, thickness: th },
        kerf: 0.3,
        costConfig: { panelPrice: p.defaultPrice },
        bodies: [
          {
            id: uid(), name: 'Bas (sous plan)', width: 60, depth: 56,
            pieces: [
              { id: uid(), name: 'Joue gauche', length: 70, width: 56, qty: 1, type: 'joue' },
              { id: uid(), name: 'Joue droite', length: 70, width: 56, qty: 1, type: 'joue' },
              { id: uid(), name: 'Tablette haut', length: innerW, width: 56, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette bas', length: innerW, width: 56, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette réglable', length: innerW, width: 56, qty: 1, type: 'tablette-reglable' },
            ],
          },
          {
            id: uid(), name: 'Haut', width: 60, depth: 32,
            pieces: [
              { id: uid(), name: 'Joue gauche', length: 70, width: 32, qty: 1, type: 'joue' },
              { id: uid(), name: 'Joue droite', length: 70, width: 32, qty: 1, type: 'joue' },
              { id: uid(), name: 'Tablette haut', length: innerW, width: 32, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette bas', length: innerW, width: 32, qty: 1, type: 'tablette-fixe' },
              { id: uid(), name: 'Tablette réglable', length: innerW, width: 32, qty: 1, type: 'tablette-reglable' },
            ],
          },
        ],
      };
    },
  },
  {
    id: 'sdb',
    name: 'Meuble salle de bain',
    icon: '🚿',
    description: 'Meuble vasque avec rangement, adapté à l\'humidité.',
    aiHint: 'meuble vasque salle de bain, résistant humidité, 60-120cm',
    create: (mk = 'cp_okoume') => {
      const { p, th } = mat(mk);
      const innerW = +(80 - 2 * th).toFixed(1);
      return {
        materialKey: mk,
        project: { name: 'Meuble SdB', wallWidth: 150, wallDepth: 50, ceilingHeight: 250, plinthHeight: 0, plinthDepth: 0 },
        panel: { width: p.w, height: p.h, thickness: th },
        kerf: 0.3,
        costConfig: { panelPrice: p.defaultPrice },
        bodies: [{
          id: uid(), name: 'Meuble vasque', width: 80, depth: 45,
          pieces: [
            { id: uid(), name: 'Joue gauche', length: 60, width: 45, qty: 1, type: 'joue' },
            { id: uid(), name: 'Joue droite', length: 60, width: 45, qty: 1, type: 'joue' },
            { id: uid(), name: 'Plateau', length: innerW, width: 45, qty: 1, type: 'tablette-fixe' },
            { id: uid(), name: 'Fond', length: innerW, width: 45, qty: 1, type: 'tablette-fixe' },
            { id: uid(), name: 'Tablette intermédiaire', length: innerW, width: 45, qty: 1, type: 'tablette-reglable' },
          ],
        }],
      };
    },
  },
  {
    id: 'placard',
    name: 'Placard mural',
    icon: '🚪',
    description: 'Placard encastré avec portes, du sol au plafond.',
    aiHint: 'placard mural encastré, sol au plafond, portes coulissantes ou battantes',
    create: (mk = 'melamine') => {
      const { p, th } = mat(mk);
      const innerW = +(80 - 2 * th).toFixed(1);
      return {
        materialKey: mk,
        project: { name: 'Placard mural', wallWidth: 160, wallDepth: 60, ceilingHeight: 250, plinthHeight: 8, plinthDepth: 2 },
        panel: { width: p.w, height: p.h, thickness: th },
        kerf: 0.3,
        costConfig: { panelPrice: p.defaultPrice },
        bodies: [{
          id: uid(), name: 'Caisson principal', width: 80, depth: 60,
          pieces: [
            { id: uid(), name: 'Joue gauche', length: 240, width: 60, qty: 1, type: 'joue' },
            { id: uid(), name: 'Joue droite', length: 240, width: 60, qty: 1, type: 'joue' },
            { id: uid(), name: 'Tablette fixe haut', length: innerW, width: 60, qty: 1, type: 'tablette-fixe' },
            { id: uid(), name: 'Tablette fixe bas', length: innerW, width: 60, qty: 1, type: 'tablette-fixe' },
            { id: uid(), name: 'Tablette réglable', length: innerW, width: 60, qty: 6, type: 'tablette-reglable' },
            { id: uid(), name: 'Bandeau haut', length: 80, width: 10, qty: 1, type: 'bandeau' },
          ],
        }],
      };
    },
  },
];
