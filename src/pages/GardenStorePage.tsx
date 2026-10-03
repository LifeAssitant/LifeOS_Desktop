import { useNavigate } from "react-router-dom";

import { Shell } from "../ui";

export function GardenStorePage() {
  const navigate = useNavigate();

  return (
    <Shell>
      <div className="garden-store-page garden-store-soon">
        <div className="garden-store-atmosphere" aria-hidden />
        <header className="garden-store-page-head">
          <button type="button" className="garden-store-back" onClick={() => navigate(-1)}>
            ← Back to garden
          </button>
        </header>
        <div className="garden-store-soon-body">
          <p className="garden-store-soon-eyebrow">Garden store</p>
          <h1>Coming soon</h1>
          <p>Seeds, benches, and little yard extras will land here later.</p>
          <button type="button" className="garden-store-credits" onClick={() => navigate(-1)}>
            Back to garden
          </button>
        </div>
      </div>
    </Shell>
  );
}
