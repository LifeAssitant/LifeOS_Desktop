import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api";
import { GardenScene } from "../garden";
import { markGardenEntered } from "../gardenGate";
import { Shell } from "../ui";

export function GardenLanding() {
  const navigate = useNavigate();
  const [done, setDone] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void api
      .tasks("done")
      .then((tasks) => {
        if (!cancelled) setDone(tasks.length);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const openChat = () => {
    markGardenEntered();
    navigate("/", { replace: true });
  };

  return (
    <Shell>
      <div className="garden-entry">
        <GardenScene done={done} roomy onOpenStore={() => navigate("/garden/store")} />
        <button type="button" className="garden-entry-go" onClick={openChat}>
          Open chat
          <span className="garden-entry-arrow" aria-hidden>
            →
          </span>
        </button>
      </div>
    </Shell>
  );
}
