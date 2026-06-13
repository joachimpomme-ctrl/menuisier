import type { Body2D, Facade2DModel, VisualHint, Zone2D } from '../../lib/engine/facade2d';

export interface Facade2DViewProps {
  model: Facade2DModel;
}

export const SVG_W = 600;
export const M = 40;

const ZONE_COLORS: Record<VisualHint['type'], string> = {
  shelves: '#dbeafe',
  drawers: '#FFF4D6',
  hanging_rod: '#f3e8ff',
  tv_niche: '#e0e7ff',
  wine_rack: '#fce7f3',
  shoe_rack: '#d1fae5',
  bench: '#e5e7eb',
  generic: '#FFFCF7',
};

export function computeFacadeScale(
  model: Facade2DModel,
  svgWidth = SVG_W,
  margin = M,
): number {
  return Math.min((svgWidth - margin * 2) / Math.max(model.totalWidth_mm, 1), 400 / Math.max(model.totalHeight_mm, 1));
}

export function computeFacadeSvgHeight(
  model: Facade2DModel,
  scale: number,
  margin = M,
): number {
  return margin * 2 + model.totalHeight_mm * scale;
}

export function facadeYToSvg(
  y_mm: number,
  scale: number,
  svgHeight: number,
  margin = M,
): number {
  return svgHeight - margin - y_mm * scale;
}

export function getFacadeBodyX(body: Body2D, scale: number, margin = M): number {
  return body.x_mm * scale + margin;
}

export function getOrderedZones(body: Body2D): Zone2D[] {
  return [...body.zones].sort((a, b) => a.y_mm - b.y_mm);
}

export function hasFacadeWarnings(model: Facade2DModel): boolean {
  return model.warnings.length > 0;
}

function DimLine({
  x1,
  y1,
  x2,
  y2,
  label,
  offset = 14,
  color = '#9A968F',
  fontSize = 7,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  offset?: number;
  color?: string;
  fontSize?: number;
}) {
  const isH = Math.abs(y1 - y2) < 1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const arrowSize = 3;

  if (isH) {
    const oy = y1 + offset;
    return (
      <g>
        <line x1={x1} y1={y1} x2={x1} y2={oy + 2} stroke={color} strokeWidth="0.3" strokeDasharray="1,1" />
        <line x1={x2} y1={y2} x2={x2} y2={oy + 2} stroke={color} strokeWidth="0.3" strokeDasharray="1,1" />
        <line x1={x1} y1={oy} x2={x2} y2={oy} stroke={color} strokeWidth="0.5" />
        <polygon points={`${x1},${oy} ${x1 + arrowSize},${oy - arrowSize / 2} ${x1 + arrowSize},${oy + arrowSize / 2}`} fill={color} />
        <polygon points={`${x2},${oy} ${x2 - arrowSize},${oy - arrowSize / 2} ${x2 - arrowSize},${oy + arrowSize / 2}`} fill={color} />
        <text x={mx} y={oy - 2} textAnchor="middle" fill={color} fontSize={fontSize} fontFamily="system-ui" fontWeight="500">
          {label}
        </text>
      </g>
    );
  }

  const ox = x1 + offset;
  return (
    <g>
      <line x1={x1} y1={y1} x2={ox + 2} y2={y1} stroke={color} strokeWidth="0.3" strokeDasharray="1,1" />
      <line x1={x2} y1={y2} x2={ox + 2} y2={y2} stroke={color} strokeWidth="0.3" strokeDasharray="1,1" />
      <line x1={ox} y1={y1} x2={ox} y2={y2} stroke={color} strokeWidth="0.5" />
      <polygon points={`${ox},${y1} ${ox - arrowSize / 2},${y1 + arrowSize} ${ox + arrowSize / 2},${y1 + arrowSize}`} fill={color} />
      <polygon points={`${ox},${y2} ${ox - arrowSize / 2},${y2 - arrowSize} ${ox + arrowSize / 2},${y2 - arrowSize}`} fill={color} />
      <text
        x={ox + 3}
        y={my + 3}
        textAnchor="start"
        fill={color}
        fontSize={fontSize}
        fontFamily="system-ui"
        fontWeight="500"
        transform={`rotate(-90,${ox + 3},${my + 3})`}
      >
        {label}
      </text>
    </g>
  );
}

function renderZoneHint(
  zone: Zone2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const color = ZONE_COLORS[zone.visualHint.type];
  const elements: React.JSX.Element[] = [
    <rect
      key="bg"
      x={x}
      y={y}
      width={width}
      height={height}
      fill={color}
      stroke="#9A968F"
      strokeWidth="0.4"
      opacity={zone.visualHint.type === 'bench' ? 0.85 : 0.75}
      rx="1"
    />,
  ];

  switch (zone.visualHint.type) {
    case 'shelves': {
      const count = Math.max(1, zone.visualHint.count);
      for (let i = 1; i <= count; i += 1) {
        const lineY = y + (height * i) / (count + 1);
        elements.push(
          <line
            key={`shelf-${i}`}
            x1={x + 4}
            y1={lineY}
            x2={x + width - 4}
            y2={lineY}
            stroke="#2563eb"
            strokeWidth="0.8"
            strokeDasharray="4,3"
          />,
        );
      }
      break;
    }
    case 'drawers': {
      const count = Math.max(1, zone.visualHint.count);
      for (let i = 0; i < count; i += 1) {
        const top = y + (height * i) / count;
        const drawerH = height / count;
        elements.push(
          <rect key={`drawer-${i}`} x={x} y={top} width={width} height={drawerH} fill="none" stroke="#A52E16" strokeWidth="0.8" />,
        );
        elements.push(
          <rect
            key={`handle-${i}`}
            x={x + width / 2 - 5}
            y={top + drawerH / 2 - 1}
            width={10}
            height={2}
            fill="#1E3FCC"
            rx="1"
          />,
        );
      }
      break;
    }
    case 'hanging_rod': {
      const rodY = y + height * 0.32;
      elements.push(<line key="rod" x1={x + 8} y1={rodY} x2={x + width - 8} y2={rodY} stroke="#7c3aed" strokeWidth="1.5" />);
      elements.push(<circle key="hanger" cx={x + width / 2} cy={rodY + 12} r="5" fill="none" stroke="#7c3aed" strokeWidth="1" />);
      break;
    }
    case 'tv_niche': {
      elements.push(
        <rect
          key="niche"
          x={x + 3}
          y={y + 3}
          width={width - 6}
          height={height - 6}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="1"
          strokeDasharray="5,3"
        />,
      );
      break;
    }
    case 'wine_rack': {
      const cols = Math.max(1, zone.visualHint.columns);
      const rows = Math.max(1, zone.visualHint.rows);
      for (let cx = 0; cx < cols; cx += 1) {
        for (let ry = 0; ry < rows; ry += 1) {
          elements.push(
            <circle
              key={`wine-${cx}-${ry}`}
              cx={x + ((cx + 0.5) * width) / cols}
              cy={y + ((ry + 0.5) * height) / rows}
              r={Math.min(width / cols, height / rows) * 0.18}
              fill="none"
              stroke="#be185d"
              strokeWidth="0.8"
            />,
          );
        }
      }
      break;
    }
    case 'shoe_rack': {
      const tiers = Math.max(1, zone.visualHint.tiers);
      for (let i = 0; i < tiers; i += 1) {
        const top = y + (height * i) / tiers;
        const bottom = y + (height * (i + 1)) / tiers;
        elements.push(
          <line
            key={`shoe-${i}`}
            x1={x + 6}
            y1={bottom - 5}
            x2={x + width - 6}
            y2={top + 5}
            stroke="#047857"
            strokeWidth="1"
          />,
        );
      }
      break;
    }
    case 'bench': {
      elements.push(
        <rect
          key="bench-seat"
          x={x + 4}
          y={y + height * 0.55}
          width={width - 8}
          height={height * 0.3}
          fill="#9ca3af"
          opacity="0.55"
          rx="1"
        />,
      );
      break;
    }
    case 'generic': {
      elements.push(
        <text
          key="label"
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#54514E"
          fontSize="8"
          fontFamily="system-ui"
          fontWeight="600"
        >
          {zone.visualHint.label}
        </text>,
      );
      break;
    }
  }

  return elements;
}

export default function Facade2DView({ model }: Facade2DViewProps) {
  const scale = computeFacadeScale(model);
  const svgH = computeFacadeSvgHeight(model, scale);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <svg width="100%" viewBox={`0 0 ${SVG_W} ${svgH}`} preserveAspectRatio="xMidYMid meet" className="rounded-lg bg-[#FFFCF7]">
          <rect width={SVG_W} height={svgH} fill="#FFFCF7" rx="8" />

          {model.bodies.map((body) => {
            const bodyX = getFacadeBodyX(body, scale);
            const bodyY = facadeYToSvg(body.height_mm, scale, svgH);
            const bodyW = body.width_mm * scale;
            const bodyH = body.height_mm * scale;
            const bodyRight = bodyX + bodyW;
            const doorHeightMm = body.doors?.height_mm ?? body.height_mm;
            const doorY = facadeYToSvg(doorHeightMm, scale, svgH);
            const doorH = doorHeightMm * scale;
            const doorMidY = doorY + doorH / 2;

            return (
              <g key={body.bodyId}>
                <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} fill="none" stroke="#9A968F" strokeWidth="1" />

                {model.plinthHeight_mm > 0 && (
                  <rect
                    x={bodyX}
                    y={facadeYToSvg(model.plinthHeight_mm, scale, svgH)}
                    width={bodyW}
                    height={model.plinthHeight_mm * scale}
                    fill="#EFE8DD"
                    stroke="#9A968F"
                    strokeWidth="0.5"
                  />
                )}

                {getOrderedZones(body).flatMap((zone) => {
                  const zoneX = bodyX;
                  const zoneY = facadeYToSvg(zone.y_mm + zone.height_mm, scale, svgH);
                  const zoneW = bodyW;
                  const zoneH = zone.height_mm * scale;
                  return renderZoneHint(zone, zoneX, zoneY, zoneW, zoneH);
                })}

                {body.fixedShelves.map((shelf, index) => {
                  const shelfY = facadeYToSvg(shelf.y_mm, scale, svgH);
                  return (
                    <line
                      key={`shelf-${index}`}
                      x1={bodyX}
                      x2={bodyRight}
                      y1={shelfY}
                      y2={shelfY}
                      stroke="#1E3FCC"
                      strokeWidth="1.5"
                    />
                  );
                })}

                {body.doors && body.doors.count === 1 && (
                  <g>
                    <rect
                      x={bodyX + 1}
                      y={doorY + 1}
                      width={bodyW - 2}
                      height={doorH - 2}
                      fill="rgba(180,180,180,0.15)"
                      stroke="#9A968F"
                      strokeWidth="0.5"
                    />
                    <circle cx={bodyX + bodyW - 10} cy={doorMidY} r="2.3" fill="#9A968F" />
                  </g>
                )}

                {body.doors && body.doors.count === 2 && (
                  <g>
                    <rect
                      x={bodyX + 1}
                      y={doorY + 1}
                      width={bodyW / 2 - 2}
                      height={doorH - 2}
                      fill="rgba(180,180,180,0.15)"
                      stroke="#9A968F"
                      strokeWidth="0.5"
                    />
                    <rect
                      x={bodyX + bodyW / 2 + 1}
                      y={doorY + 1}
                      width={bodyW / 2 - 2}
                      height={doorH - 2}
                      fill="rgba(180,180,180,0.15)"
                      stroke="#9A968F"
                      strokeWidth="0.5"
                    />
                    <circle cx={bodyX + bodyW / 2 - 8} cy={doorMidY} r="2.3" fill="#9A968F" />
                    <circle cx={bodyX + bodyW / 2 + 8} cy={doorMidY} r="2.3" fill="#9A968F" />
                  </g>
                )}
              </g>
            );
          })}

          {model.wallMounting && (() => {
            const wmY = facadeYToSvg(model.wallMounting.positionY_mm, scale, svgH);
            const wmLabel =
              model.wallMounting.type === 'rail'
                ? 'Rail de suspension'
                : 'Fixation anti-bascule';
            return (
              <g>
                <line
                  x1={M}
                  x2={M + model.totalWidth_mm * scale}
                  y1={wmY}
                  y2={wmY}
                  stroke="#3B5FFF"
                  strokeWidth="0.5"
                  strokeDasharray="4,2"
                />
                <polygon
                  points={`${M + 6},${wmY - 5} ${M + 14},${wmY} ${M + 6},${wmY + 5}`}
                  fill="#3B5FFF"
                  opacity="0.8"
                />
                <text
                  x={M + model.totalWidth_mm * scale - 2}
                  y={wmY - 3}
                  textAnchor="end"
                  fill="#3B5FFF"
                  fontSize="8"
                  fontWeight="600"
                  fontFamily="ui-monospace, monospace"
                >
                  {wmLabel} — H={model.wallMounting.positionY_mm} mm
                </text>
              </g>
            );
          })()}

          <DimLine
            x1={M}
            y1={facadeYToSvg(0, scale, svgH)}
            x2={M + model.totalWidth_mm * scale}
            y2={facadeYToSvg(0, scale, svgH)}
            label={`${model.totalWidth_mm} mm`}
            offset={22}
          />
          <DimLine
            x1={M + model.totalWidth_mm * scale}
            y1={facadeYToSvg(0, scale, svgH)}
            x2={M + model.totalWidth_mm * scale}
            y2={facadeYToSvg(model.totalHeight_mm, scale, svgH)}
            label={`${model.totalHeight_mm} mm`}
            offset={22}
          />

          {model.bodies.length > 1 && model.bodies.map((body) => {
            const bodyX = getFacadeBodyX(body, scale);
            return (
              <DimLine
                key={`dim-${body.bodyId}`}
                x1={bodyX}
                y1={M}
                x2={bodyX + body.width_mm * scale}
                y2={M}
                label={`${body.width_mm} mm`}
                offset={-14}
              />
            );
          })}
        </svg>
      </div>

      {hasFacadeWarnings(model) && (
        <div className="mt-3 space-y-1">
          {model.warnings.map((warning, index) => (
            <p key={index} className="text-xs text-[#3B5FFF] bg-[#E5EAFF] rounded px-2 py-1">
              ⚠ {warning}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
