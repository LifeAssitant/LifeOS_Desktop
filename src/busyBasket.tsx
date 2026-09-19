import { useCallback, useLayoutEffect, useRef, useState } from "react";

export const BUSY_LEVELS = [
  { label: "Empty basket", note: "Drop something in to tell us", color: "var(--muted)" },
  { label: "Cruising", note: "There is room in most days", color: "var(--mint)" },
  { label: "Steady", note: "A few fixed things, plenty of slack", color: "var(--sky)" },
  { label: "Full", note: "Most days are properly booked", color: "var(--butter)" },
  { label: "Stacked", note: "Back to back, not much air", color: "var(--peach)" },
  { label: "Overflowing", note: "More than fits, honestly", color: "var(--danger)" },
];

type Piece = { id: string; tone: string; spot: { x: number; y: number } };

/** Loose pieces start scattered around the basket, as fractions of the yard. */
const PIECES: Piece[] = [
  { id: "book", tone: "var(--peach)", spot: { x: 0.05, y: 0.04 } },
  { id: "mug", tone: "var(--sky)", spot: { x: 0.31, y: 0.0 } },
  { id: "apple", tone: "var(--mint)", spot: { x: 0.58, y: 0.05 } },
  { id: "clock", tone: "var(--lilac)", spot: { x: 0.81, y: 0.26 } },
  { id: "ball", tone: "var(--butter)", spot: { x: 0.02, y: 0.38 } },
];

const PIECE_SIZE = 52;

function PieceArt({ id }: { id: string }) {
  switch (id) {
    case "book":
      return (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden>
          <rect x="4" y="5" width="16" height="14" rx="2.5" fill="currentColor" opacity="0.35" />
          <path d="M12 6v12M6 9h4M14 9h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "mug":
      return (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden>
          <rect x="5" y="8" width="11" height="10" rx="3" fill="currentColor" opacity="0.35" />
          <path d="M16 11h2.5a2.5 2.5 0 0 1 0 5H16" stroke="currentColor" strokeWidth="2" />
          <path d="M8 5.5v1.5M12 5v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "apple":
      return (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden>
          <circle cx="12" cy="14" r="6.5" fill="currentColor" opacity="0.35" />
          <path d="M12 7.5V5M12 5c2 0 3.5-1 4-2.2C14.4 2.4 12.6 3.2 12 5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="7" fill="currentColor" opacity="0.35" />
          <path d="M12 8.5V12l2.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="7" fill="currentColor" opacity="0.35" />
          <path d="M5.5 10.5c4 2 9 2 13 0M12 5v14" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
  }
}

/** Where a packed piece sits inside the basket — a loose pile, not a grid. */
function pileSpot(index: number) {
  const row = Math.floor(index / 3);
  const col = index % 3;
  return {
    left: 26 + col * 46 + (row === 1 ? 22 : 0),
    bottom: 16 + row * 34,
    rotate: [-9, 5, -4, 8, -6][index % 5],
  };
}

export function BusyBasket({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const yardRef = useRef<HTMLDivElement>(null);
  const basketRef = useRef<HTMLDivElement>(null);
  const grab = useRef({ id: "", dx: 0, dy: 0, moved: false });
  const [packed, setPacked] = useState<string[]>([]);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [hover, setHover] = useState(false);

  const scatter = useCallback(() => {
    const yard = yardRef.current;
    if (!yard) return;
    const { width, height } = yard.getBoundingClientRect();
    setPos((prev) => {
      const next = { ...prev };
      for (const piece of PIECES) {
        if (next[piece.id]) continue;
        next[piece.id] = {
          x: piece.spot.x * (width - PIECE_SIZE),
          y: piece.spot.y * (height - PIECE_SIZE),
        };
      }
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    scatter();
    window.addEventListener("resize", scatter);
    return () => window.removeEventListener("resize", scatter);
  }, [scatter]);

  const pack = (id: string) => {
    setPacked((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      onChange(next.length);
      return next;
    });
  };

  const unpack = (id: string) => {
    setPacked((prev) => {
      const next = prev.filter((p) => p !== id);
      onChange(next.length);
      return next;
    });
    const yard = yardRef.current;
    const piece = PIECES.find((p) => p.id === id);
    if (yard && piece) {
      const { width, height } = yard.getBoundingClientRect();
      setPos((prev) => ({
        ...prev,
        [id]: { x: piece.spot.x * (width - PIECE_SIZE), y: piece.spot.y * (height - PIECE_SIZE) },
      }));
    }
  };

  const overBasket = (clientX: number, clientY: number) => {
    const basket = basketRef.current?.getBoundingClientRect();
    if (!basket) return false;
    return (
      clientX > basket.left &&
      clientX < basket.right &&
      clientY > basket.top - 10 &&
      clientY < basket.bottom
    );
  };

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    const yard = yardRef.current?.getBoundingClientRect();
    if (!yard) return;
    const current = pos[id] ?? { x: 0, y: 0 };
    grab.current = {
      id,
      dx: e.clientX - yard.left - current.x,
      dy: e.clientY - yard.top - current.y,
      moved: false,
    };
    setDragging(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const yard = yardRef.current?.getBoundingClientRect();
    if (!yard) return;
    const x = Math.min(Math.max(0, e.clientX - yard.left - grab.current.dx), yard.width - PIECE_SIZE);
    const y = Math.min(Math.max(0, e.clientY - yard.top - grab.current.dy), yard.height - PIECE_SIZE);
    grab.current.moved = true;
    setHover(overBasket(e.clientX, e.clientY));
    setPos((prev) => ({ ...prev, [dragging]: { x, y } }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    const id = dragging;
    setDragging(null);
    setHover(false);
    // A tap without movement counts as "toss it in" — dragging is not the only way.
    if (!grab.current.moved || overBasket(e.clientX, e.clientY)) pack(id);
  };

  const state = BUSY_LEVELS[Math.min(value, 5)];

  return (
    <div className="busy-basket" style={{ "--busy-color": state.color } as React.CSSProperties}>
      <div
        className="basket-yard"
        ref={yardRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {PIECES.filter((p) => !packed.includes(p.id)).map((piece) => (
          <button
            key={piece.id}
            type="button"
            className={`piece${dragging === piece.id ? " is-dragging" : ""}`}
            style={{
              color: piece.tone,
              transform: `translate(${pos[piece.id]?.x ?? 0}px, ${pos[piece.id]?.y ?? 0}px)`,
            }}
            onPointerDown={(e) => onPointerDown(e, piece.id)}
            aria-label={`Put the ${piece.id} in the basket`}
          >
            <PieceArt id={piece.id} />
          </button>
        ))}

        <div className={`basket${hover ? " is-hover" : ""}`} ref={basketRef}>
          <div className="basket-pile">
            {packed.map((id, i) => {
              const piece = PIECES.find((p) => p.id === id);
              const spot = pileSpot(i);
              return (
                <button
                  key={id}
                  type="button"
                  className="piece is-packed"
                  style={{
                    color: piece?.tone,
                    left: spot.left,
                    bottom: spot.bottom,
                    transform: `rotate(${spot.rotate}deg)`,
                  }}
                  onClick={() => unpack(id)}
                  aria-label={`Take the ${id} back out`}
                >
                  <PieceArt id={id} />
                </button>
              );
            })}
          </div>

          <svg className="basket-art" viewBox="0 0 220 132" aria-hidden>
            <path
              d="M14 34h192l-19 78a16 16 0 0 1-15.7 12.8H48.7A16 16 0 0 1 33 112z"
              fill="var(--basket-body)"
            />
            <g stroke="var(--basket-weave)" strokeWidth="2.4" strokeLinecap="round" opacity="0.75">
              <path d="M40 56h140M45 76h130M51 96h118M58 114h104" />
              <path d="M70 38v84M110 38v88M150 38v84" />
            </g>
            <rect x="6" y="24" width="208" height="20" rx="10" fill="var(--basket-rim)" />
          </svg>
        </div>
      </div>

      <div className="busy-readout">
        <strong>{state.label}</strong>
        <span>{state.note}</span>
      </div>
    </div>
  );
}
