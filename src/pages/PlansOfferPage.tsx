import { useNavigate } from "react-router-dom";

import { markPlansOffered } from "../plansGate";
import { Button, Companion, Shell } from "../ui";

export function PlansOfferPage() {
  const navigate = useNavigate();

  const continueOn = () => {
    markPlansOffered();
    navigate("/attune", { replace: true });
  };

  return (
    <Shell>
      <div className="plans-offer-screen">
        <div className="plans-offer-card fade-up">
          <Companion size={42} />
          <h1 className="plans-offer-title">Start with free access</h1>
          <p className="plans-offer-lede">
            Your account starts with 50 AI credits. Earn more by completing tasks, or bring your
            own Gemini key. Paid plans are not available yet.
          </p>
          <Button variant="primary" full onClick={continueOn}>
            Continue with free access
          </Button>
        </div>
      </div>
    </Shell>
  );
}
