import { useCallback, useEffect, useState } from "react";

import { api } from "../api";
import type { BillingOptions, BillingStatus } from "../api";

const money = (paise: number | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((paise ?? 0) / 100);

export function BillingPage() {
  const [options, setOptions] = useState<BillingOptions | null>(null);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const [available, billing] = await Promise.all([
      api.billingOptions(),
      api.billingStatus(),
    ]);
    setOptions(available);
    setStatus(billing);
  }, []);

  useEffect(() => {
    void refresh().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Could not load billing details.");
    });
  }, [refresh]);

  const openCheckout = async (checkout: () => Promise<{ checkout_url: string }>) => {
    setBusy(true);
    setMessage("");
    try {
      const { checkout_url } = await checkout();
      if (window.lifeosDesktop?.openExternal) {
        await window.lifeosDesktop.openExternal(checkout_url);
      } else {
        window.open(checkout_url, "_blank", "noopener,noreferrer");
      }
      setMessage("Complete payment in the secure Razorpay checkout.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start checkout.");
    } finally {
      setBusy(false);
    }
  };

  const cancelSubscription = async () => {
    if (!window.confirm("Cancel renewal at the end of your current billing period?")) return;
    setBusy(true);
    setMessage("");
    try {
      await api.subscriptionCancel();
      if (status) setStatus({ ...status, subscription_cancel_at_period_end: true });
      setMessage("Cancellation scheduled. Your paid access remains until the current period ends.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not cancel subscription.");
    } finally {
      setBusy(false);
    }
  };

  const enabled = options?.enabled === true;
  const subscribed = status?.subscription_status === "active"
    || status?.subscription_status === "authenticated"
    || status?.subscription_status === "pending";
  const periodEnd = status?.subscription_current_period_end;
  const cancellationDate = (
    status?.subscription_cancel_at_period_end
    || status?.subscription_status === "cancelled"
  ) && periodEnd && new Date(periodEnd).getTime() > Date.now()
    ? new Date(periodEnd).toLocaleDateString()
    : null;

  const refreshStatus = async () => {
    setBusy(true);
    setMessage("");
    try {
      await refresh();
      setMessage("Billing status refreshed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not refresh billing status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-page billing-page fade-up">
      <div className="billing-inner">
        <div className="billing-intro">
          <h2 className="billing-title">Plans &amp; AI credits</h2>
          <p className="billing-lede">
            Start free. A subscription adds a fresh AI-credit allowance every week.
            Unused subscription credits reset weekly; one-time top-up credits do not expire.
          </p>
        </div>

        <div className="billing-tiers" role="list">
          <article className="billing-tier is-current" role="listitem">
            <header className="billing-tier-head">
              <div>
                <h3>Free access</h3>
                <span className="billing-badge">Available now</span>
              </div>
              <div className="billing-price">
                <strong>Free</strong>
                <span>no subscription</span>
              </div>
            </header>
            <ul className="billing-features">
              <li>Tasks, events, reminders, and planning</li>
              <li>50 starter AI credits</li>
              <li>Earn credits by completing tasks</li>
              <li>Optional Gemini key for provider-billed AI use</li>
            </ul>
          </article>

          <article className="billing-tier is-featured" role="listitem">
            <header className="billing-tier-head">
              <div>
                <h3>LifeOS Plus</h3>
                <span className="billing-badge">Monthly subscription</span>
              </div>
              <div className="billing-price">
                <strong>{enabled ? money(options.monthly_price_paise) : "Coming soon"}</strong>
                <span>per month</span>
              </div>
            </header>
            <ul className="billing-features">
              <li>{enabled ? options.weekly_credits : "Weekly"} AI credits each week</li>
              <li>Weekly refresh; unused subscription credits do not roll over</li>
              <li>Cancel renewal; keep access through the paid period</li>
            </ul>
            {subscribed && !status?.subscription_cancel_at_period_end ? (
              <button className="billing-action" disabled={busy} onClick={() => void cancelSubscription()}>
                Cancel renewal
              </button>
            ) : cancellationDate ? (
              <p className="billing-summary">
                Renewal cancelled. Access continues until{" "}
                {cancellationDate}.
              </p>
            ) : (
              <button
                className="billing-action"
                disabled={!enabled || busy}
                onClick={() => void openCheckout(api.subscriptionCheckout)}
              >
                Subscribe
              </button>
            )}
          </article>

          <article className="billing-tier" role="listitem">
            <header className="billing-tier-head">
              <div>
                <h3>Credit top-up</h3>
                <span className="billing-badge">One-time payment</span>
              </div>
              <div className="billing-price">
                <strong>{enabled ? money(options.topup_amount_paise) : "Coming soon"}</strong>
                <span>one time</span>
              </div>
            </header>
            <ul className="billing-features">
              <li>{enabled ? options.topup_credits : "Extra"} AI credits</li>
              <li>Available after verified payment</li>
              <li>Top-up credits do not expire</li>
            </ul>
            <button
              className="billing-action"
              disabled={!enabled || busy}
              onClick={() => void openCheckout(api.topupCheckout)}
            >
              Buy top-up
            </button>
          </article>
        </div>
        <p className="billing-note">
          Current balance: {status?.credit_balance ?? "—"} AI credits
          {status?.weekly_subscription_credits
            ? `, including ${status.weekly_subscription_credits} subscription credits`
            : ""}
        </p>
        <button className="billing-action" disabled={busy} onClick={() => void refreshStatus()}>
          Refresh balance
        </button>
        {!enabled && (
          <p className="billing-note">
            Paid plans are not available yet. No payment will be taken until checkout is enabled.
          </p>
        )}
        {message && <p className="billing-note" role="status">{message}</p>}
      </div>
    </div>
  );
}
