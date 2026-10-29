export function BillingPage() {
  return (
    <div className="settings-page billing-page fade-up">
      <div className="billing-inner">
        <div className="billing-intro">
          <h2 className="billing-title">LifeOS is free to start</h2>
          <p className="billing-lede">
            Your account starts with 50 AI credits. Earn another credit for every 50 tasks you
            complete, or bring your own Gemini key.
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
            <p className="billing-summary">
              Paid credit packs and subscriptions are not available. You will not be charged.
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
