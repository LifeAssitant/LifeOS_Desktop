import { useEffect, useRef, useState, type ReactNode } from "react";

type Piece = {
  id: string;
  min: number;
  arrived: string;
  next: string;
};

type TimeOfDay = "morning" | "afternoon" | "evening" | "night";
type FlowerKind = "daisy" | "poppy" | "lavender" | "tulip" | "rose" | "sunflower";

const PIECES: Piece[] = [
  { id: "tufts", min: 1, arrived: "Grass has covered the soil.", next: "grass covers the soil" },
  { id: "daisy", min: 2, arrived: "Daisies opened.", next: "daisies open" },
  { id: "mushroom", min: 3, arrived: "A mushroom settled in.", next: "a mushroom settles in" },
  { id: "can", min: 4, arrived: "A watering can waits by the bed.", next: "a watering can shows up" },
  { id: "stones", min: 5, arrived: "Stepping stones cross the grass.", next: "stepping stones cross the grass" },
  { id: "poppy", min: 6, arrived: "Poppies joined the bed.", next: "poppies join the bed" },
  { id: "lavender", min: 7, arrived: "Lavender lined the path.", next: "lavender lines the path" },
  { id: "butterflies", min: 8, arrived: "Butterflies found the blooms.", next: "butterflies find the blooms" },
  { id: "tulip", min: 9, arrived: "Tulips stood tall.", next: "tulips stand tall" },
  { id: "bench", min: 10, arrived: "There is a bench to sit on.", next: "a bench arrives" },
  { id: "bush", min: 11, arrived: "A rose bush filled out.", next: "a rose bush fills out" },
  { id: "fence", min: 12, arrived: "A picket fence holds the yard.", next: "a picket fence wraps the back" },
  { id: "vine", min: 13, arrived: "Vines climbed the fence.", next: "vines climb the fence" },
  { id: "lantern", min: 14, arrived: "The lantern is lit.", next: "a lantern lights" },
  { id: "fern", min: 15, arrived: "Ferns unfurled in the shade.", next: "ferns unfurl in the shade" },
  { id: "tree", min: 16, arrived: "An oak has taken root.", next: "an oak takes root" },
  { id: "pine", min: 18, arrived: "A pine stands by the path.", next: "a pine stands by the path" },
  { id: "cottage", min: 20, arrived: "A cottage sits at the back.", next: "a cottage lands at the back" },
  { id: "sunflower", min: 22, arrived: "Sunflowers turned to the light.", next: "sunflowers turn to the light" },
  { id: "pond", min: 24, arrived: "A pond gathered in front.", next: "a pond gathers" },
  { id: "hedge", min: 26, arrived: "A hedge rounded the edge.", next: "a hedge rounds the edge" },
  { id: "lights", min: 28, arrived: "Lights are strung for the evening.", next: "evening lights go up" },
];

function getTimeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "afternoon";
  if (hour >= 16 && hour < 20) return "evening";
  return "night";
}

function useTimeOfDay() {
  const [tod, setTod] = useState<TimeOfDay>(() => getTimeOfDay());

  useEffect(() => {
    const tick = () => setTod(getTimeOfDay());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return tod;
}

function gardenCopy(done: number, tod: TimeOfDay) {
  const todNote =
    tod === "morning"
      ? "Morning light softens the yard."
      : tod === "afternoon"
        ? "Afternoon sun warms the leaves."
        : tod === "evening"
          ? "Evening gold settles over the beds."
          : "Night hush holds the garden.";

  const title =
    done < 1
      ? "Quiet soil"
      : done < 5
        ? "First green"
        : done < 10
          ? "A small bed"
          : done < 16
            ? "Somewhere to sit"
            : done < 24
              ? "The cottage yard"
              : "A living garden";

  if (done < 1) {
    return {
      title,
      line: `A sprout is curled up. Finish a task and grass covers the soil. ${todNote}`,
    };
  }

  const arrived = [...PIECES].reverse().find((piece) => piece.min <= done);
  const upcoming = PIECES.find((piece) => piece.min > done);
  const count = done === 1 ? "One thing finished" : `${done} things finished`;
  const next = upcoming ? ` Next, ${upcoming.next}.` : " The yard is full, and it can stay this way.";
  return {
    title,
    line: `${count}. ${arrived?.arrived ?? "The yard keeps growing."}${next} ${todNote}`,
  };
}

function Anchor({
  x,
  y,
  pop,
  className,
  children,
}: {
  x: string;
  y: string;
  pop?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`g-anchor${className ? ` ${className}` : ""}`} style={{ left: x, top: y }}>
      <div className={`g-lift${pop ? " is-pop" : ""}`}>{children}</div>
    </div>
  );
}

function Flower({ kind, x, y }: { kind: FlowerKind; x: number; y: number }) {
  return (
    <div className={`g-flower is-${kind}`} style={{ left: x, top: y }}>
      <span className="g-stem">
        <span className="g-head" />
      </span>
    </div>
  );
}

function Butterfly({ className }: { className?: string }) {
  return (
    <span className={`g-butterfly${className ? ` ${className}` : ""}`} aria-hidden>
      <i />
      <i />
    </span>
  );
}

export function GardenScene({
  done,
  roomy = false,
  onOpenStore,
}: {
  done: number;
  roomy?: boolean;
  onOpenStore?: () => void;
}) {
  const tod = useTimeOfDay();
  const copy = gardenCopy(done, tod);
  const prevRef = useRef(done);
  const [popFrom, setPopFrom] = useState<number | null>(null);

  useEffect(() => {
    const before = prevRef.current;
    if (done > before && done - before <= 2) setPopFrom(before);
    prevRef.current = done;
  }, [done]);

  const popped = (min: number) => popFrom != null && min > popFrom && min <= done;
  const show = (min: number) => done >= min;

  return (
    <section
      className={`garden-scene${roomy ? " is-roomy" : ""}`}
      data-tod={tod}
      aria-label={`Garden, ${tod}`}
    >
      <div className="garden-stage">
        <div className={`garden-sky-disk is-${tod === "night" ? "moon" : "sun"}`} aria-hidden />
        {tod === "night" ? (
          <div className="garden-stars" aria-hidden>
            <span style={{ left: "12%", top: "18%" }} />
            <span style={{ left: "28%", top: "10%" }} />
            <span style={{ left: "46%", top: "22%" }} />
            <span style={{ left: "62%", top: "8%" }} />
            <span style={{ left: "78%", top: "16%" }} />
            <span style={{ left: "88%", top: "28%" }} />
          </div>
        ) : null}
        <div className="garden-veil" aria-hidden />

        {show(8) ? <Butterfly className={popped(8) ? "is-pop" : undefined} /> : null}
        {show(18) ? <Butterfly className="is-late" /> : null}

        {show(28) ? (
          <svg className="g-lights is-on" viewBox="0 0 300 70" aria-hidden>
            <path d="M8 26 Q 70 52 150 20 T 292 30" />
            <circle cx="36" cy="34" r="3.2" />
            <circle cx="78" cy="40" r="3.2" />
            <circle cx="122" cy="30" r="3.2" />
            <circle cx="166" cy="24" r="3.2" />
            <circle cx="210" cy="30" r="3.2" />
            <circle cx="254" cy="32" r="3.2" />
          </svg>
        ) : null}

        <div className="garden-world" aria-hidden>
          <div className="g-dirt" />
          <div className={`g-grass${show(1) ? " is-grown" : ""}`}>
            <span className="g-speck" style={{ left: "18%", top: "62%" }} />
            <span className="g-speck" style={{ left: "72%", top: "28%" }} />
          </div>

          {show(24) ? (
            <Anchor x="44%" y="78%" pop={popped(24)}>
              <div className="g-pond">
                <span className="g-lily" />
                <span className="g-lily g-lily-2" />
                <span className="g-reed" />
                <span className="g-reed g-reed-2" />
              </div>
            </Anchor>
          ) : null}

          {show(5) ? (
            <Anchor x="50%" y="58%" pop={popped(5)}>
              <span className="g-stone" style={{ left: -6, top: 18 }} />
              <span className="g-stone" style={{ left: 8, top: 2 }} />
              <span className="g-stone" style={{ left: 2, top: -16 }} />
              <span className="g-stone" style={{ left: 14, top: -32 }} />
            </Anchor>
          ) : null}

          <Anchor x="74%" y="74%">
            <span className="g-pebble" />
          </Anchor>

          {show(1) ? (
            <Anchor x="40%" y="76%" pop={popped(1)} className="g-tuft">
              <span />
              <span />
              <span />
            </Anchor>
          ) : null}
          {show(1) ? (
            <Anchor x="63%" y="46%" pop={popped(1)} className="g-tuft">
              <span />
              <span />
              <span />
            </Anchor>
          ) : null}

          <Anchor x="48%" y="78%" className={show(1) ? "g-sprout is-awake" : "g-sprout"}>
            <span className="g-stem">
              <span className="g-leaf-tip" />
            </span>
          </Anchor>

          {show(2) ? (
            <Anchor x="28%" y="50%" pop={popped(2)}>
              <Flower kind="daisy" x={0} y={0} />
              <Flower kind="daisy" x={-14} y={10} />
              <Flower kind="daisy" x={12} y={8} />
            </Anchor>
          ) : null}

          {show(6) ? (
            <Anchor x="56%" y="48%" pop={popped(6)}>
              <Flower kind="poppy" x={0} y={0} />
              <Flower kind="poppy" x={13} y={-6} />
            </Anchor>
          ) : null}

          {show(7) ? (
            <Anchor x="22%" y="62%" pop={popped(7)}>
              <Flower kind="lavender" x={0} y={0} />
              <Flower kind="lavender" x={8} y={6} />
              <Flower kind="lavender" x={-8} y={4} />
            </Anchor>
          ) : null}

          {show(9) ? (
            <Anchor x="68%" y="42%" pop={popped(9)}>
              <Flower kind="tulip" x={0} y={0} />
              <Flower kind="tulip" x={12} y={8} />
            </Anchor>
          ) : null}

          {show(11) ? (
            <Anchor x="34%" y="54%" pop={popped(11)}>
              <div className="g-bush">
                <span className="g-bush-leaf l1" />
                <span className="g-bush-leaf l2" />
                <span className="g-bush-leaf l3" />
                <Flower kind="rose" x={-4} y={-10} />
                <Flower kind="rose" x={10} y={-6} />
              </div>
            </Anchor>
          ) : null}

          {show(15) ? (
            <Anchor x="82%" y="62%" pop={popped(15)}>
              <div className="g-fern">
                <span />
                <span />
                <span />
                <span />
              </div>
            </Anchor>
          ) : null}

          {show(22) ? (
            <Anchor x="12%" y="52%" pop={popped(22)}>
              <Flower kind="sunflower" x={0} y={0} />
              <Flower kind="sunflower" x={16} y={10} />
            </Anchor>
          ) : null}

          {show(3) ? (
            <Anchor x="66%" y="68%" pop={popped(3)}>
              <div className="g-shroom">
                <span className="g-stem">
                  <span className="g-cap" />
                </span>
              </div>
            </Anchor>
          ) : null}

          {show(4) ? (
            <Anchor x="18%" y="58%" pop={popped(4)}>
              <div className="g-can">
                <span className="g-can-body" />
                <span className="g-can-spout" />
                <span className="g-can-handle" />
              </div>
            </Anchor>
          ) : null}


          {show(12) ? (
            <Anchor x="46%" y="22%" pop={popped(12)}>
              <div className="g-fence">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className="g-plank" style={{ left: i * 11 - 40 }} />
                ))}
                <span className="g-rail" />
                <span className="g-rail g-rail-low" />
              </div>
            </Anchor>
          ) : null}

          {show(13) ? (
            <Anchor x="46%" y="20%" pop={popped(13)}>
              <div className="g-vine">
                <span className="g-vine-stem s1" />
                <span className="g-vine-stem s2" />
                <span className="g-vine-leaf a" />
                <span className="g-vine-leaf b" />
                <span className="g-vine-leaf c" />
                <span className="g-vine-leaf d" />
              </div>
            </Anchor>
          ) : null}

          {show(26) ? (
            <Anchor x="86%" y="28%" pop={popped(26)}>
              <div className="g-hedge">
                <span />
                <span />
                <span />
              </div>
            </Anchor>
          ) : null}

          {show(16) ? (
            <Anchor x="18%" y="34%" pop={popped(16)}>
              <div className="g-tree is-oak">
                <span className="g-trunk">
                  <span className="g-canopy c1" />
                  <span className="g-canopy c2" />
                  <span className="g-canopy c3" />
                </span>
              </div>
            </Anchor>
          ) : null}

          {show(18) ? (
            <Anchor x="8%" y="44%" pop={popped(18)}>
              <div className="g-tree is-pine">
                <span className="g-trunk is-thin">
                  <span className="g-pine-tier t1" />
                  <span className="g-pine-tier t2" />
                  <span className="g-pine-tier t3" />
                </span>
              </div>
            </Anchor>
          ) : null}

          {show(20) ? (
            <Anchor x="70%" y="30%" pop={popped(20)}>
              <div className="g-house">
                <span className="g-house-front">
                  <i className="g-door" />
                  <i className="g-window" />
                </span>
                <span className="g-roof">
                  <i className="g-chimney" />
                </span>
                {show(13) ? (
                  <span className="g-cottage-vine">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : null}
              </div>
            </Anchor>
          ) : null}

          {show(10) ? (
            <Anchor x="38%" y="40%" pop={popped(10)}>
              <div className="g-bench">
                <span className="g-bench-leg l1" />
                <span className="g-bench-leg l2" />
                <span className="g-bench-seat" />
                <span className="g-bench-back" />
              </div>
            </Anchor>
          ) : null}

          {show(14) ? (
            <Anchor x="84%" y="42%" pop={popped(14)}>
              <div className={`g-lantern${tod === "night" || tod === "evening" ? " is-glow" : ""}`}>
                <span className="g-pole">
                  <span className="g-lamp" />
                </span>
              </div>
            </Anchor>
          ) : null}
        </div>
      </div>

      <div className="garden-caption">
        <div className="garden-caption-row">
          <h2>{copy.title}</h2>
          {onOpenStore ? (
            <button type="button" className="garden-store-btn" onClick={onOpenStore}>
              Store
            </button>
          ) : null}
        </div>
        <p aria-live="polite">{copy.line}</p>
      </div>
    </section>
  );
}
