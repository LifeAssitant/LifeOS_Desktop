import { useState } from "react";

import { Button } from "../ui";

type TierId = "free" | "plus" | "pro";

type Tier = {
  id: TierId;
  name: string;
  price: string;
  cadence: string;
  summary: string;
  features: string[];
  cta: string;
};

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    summary: "A gentle start — one chat, a few planned tasks each month.",
    features: [
      "One chat with your companion",
      "5 AI task creations per month",
      "Garden that grows with finished work",
      "Local reminders on this device",
    ],
    cta: "Current plan",
  },
  {
    id: "plus",
    name: "Plus",
    price: "$15",
    cadence: "per month",
    summary: "Room to talk through the week and keep the plan moving.",
    features: [
      "Open chats whenever you need them",
      "100 AI task creations per month",
      "Google Calendar sync",
      "Voice replies after you speak",
    ],
    cta: "Choose Plus",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$30",
    cadence: "per month",
    summary: "Full LifeOS for days that fill up fast.",
    features: [
      "Unlimited AI task creations",
      "Everything in Plus",
      "Faster companion replies",
      "First look at new garden extras",
    ],
    cta: "Choose Pro",
  },
];

export function BillingPage() {
  const current: TierId = "free";
  const [note, setNote] = useState("");

  const pick = (tier: Tier) => {
    if (tier.id === current) return;
    setNote(`${tier.name} checkout is not wired up yet — backend next.`);
  };

  return (
    <div className="settings-page billing-page fade-up">
      <div className="billing-inner">
        <div className="billing-intro">
          <h2 className="billing-title">Plans</h2>
          <p className="billing-lede">
            Start free with one chat and five AI task creations a month. Step up when you want more room.
          </p>
        </div>

        <div className="billing-tiers" role="list">
          {TIERS.map((tier) => {
            const active = tier.id === current;
            return (
              <article
                key={tier.id}
                className={`billing-tier${active ? " is-current" : ""}${tier.id === "plus" ? " is-featured" : ""}`}
                role="listitem"
              >
                <header className="billing-tier-head">
                  <div>
                    <h3>{tier.name}</h3>
                    {active ? <span className="billing-badge">Your plan</span> : null}
                  </div>
                  <div className="billing-price">
                    <strong>{tier.price}</strong>
                    <span>{tier.cadence}</span>
                  </div>
                </header>
                <p className="billing-summary">{tier.summary}</p>
                <ul className="billing-features">
                  {tier.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Button
                  variant={active ? "ghost" : tier.id === "plus" ? "primary" : "ghost"}
                  disabled={active}
                  full
                  onClick={() => pick(tier)}
                >
                  {tier.cta}
                </Button>
              </article>
            );
          })}
        </div>

        {note ? <p className="billing-note">{note}</p> : null}
      </div>
    </div>
  );
}
