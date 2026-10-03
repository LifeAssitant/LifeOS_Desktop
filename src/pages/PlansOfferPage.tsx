import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { markPlansOffered } from "../plansGate";
import { Button, Companion, Shell } from "../ui";

type PaidTierId = "plus" | "pro";

type PaidTier = {
  id: PaidTierId;
  name: string;
  price: string;
  summary: string;
  features: string[];
  cta: string;
  featured?: boolean;
};

const PAID_TIERS: PaidTier[] = [
  {
    id: "plus",
    name: "Plus",
    price: "$15",
    summary: "Room to talk through the week and keep the plan moving.",
    features: [
      "Open chats whenever you need them",
      "100 AI task creations per month",
      "Google Calendar sync",
      "Voice replies after you speak",
    ],
    cta: "Start with Plus",
    featured: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$30",
    summary: "Full LifeOS for days that fill up fast.",
    features: [
      "Unlimited AI task creations",
      "Everything in Plus",
      "Faster companion replies",
      "First look at new garden extras",
    ],
    cta: "Go Pro",
  },
];

export function PlansOfferPage() {
  const navigate = useNavigate();
  const [note, setNote] = useState("");

  const continueOn = () => {
    markPlansOffered();
    navigate("/attune", { replace: true });
  };

  const pick = (tier: PaidTier) => {
    setNote(`${tier.name} checkout is not wired up yet — you can keep going on Free.`);
    window.setTimeout(continueOn, 700);
  };

  return (
    <Shell>
      <div className="plans-offer-screen">
        <div className="plans-offer-card fade-up">
          <Companion size={42} />
          <h1 className="plans-offer-title">Pick a plan that fits</h1>
          <p className="plans-offer-lede">
            Free gives you one chat and five AI task creations a month. If you want more room from day
            one, choose Plus or Pro — or skip and stay on Free.
          </p>

          <div className="plans-offer-tiers" role="list">
            {PAID_TIERS.map((tier) => (
              <article
                key={tier.id}
                className={`plans-offer-tier${tier.featured ? " is-featured" : ""}`}
                role="listitem"
              >
                <header className="plans-offer-tier-head">
                  <div>
                    <h2>{tier.name}</h2>
                    {tier.featured ? <span className="plans-offer-badge">Suggested</span> : null}
                  </div>
                  <div className="plans-offer-price">
                    <strong>{tier.price}</strong>
                    <span>per month</span>
                  </div>
                </header>
                <p className="plans-offer-summary">{tier.summary}</p>
                <ul className="plans-offer-features">
                  {tier.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Button
                  variant={tier.featured ? "primary" : "ghost"}
                  full
                  onClick={() => pick(tier)}
                >
                  {tier.cta}
                </Button>
              </article>
            ))}
          </div>

          {note ? <p className="plans-offer-note">{note}</p> : null}

          <button type="button" className="plans-offer-skip" onClick={continueOn}>
            Skip for now — continue on Free
          </button>
        </div>
      </div>
    </Shell>
  );
}
