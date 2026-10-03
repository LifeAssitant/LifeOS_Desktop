const KEY = "lifeos_plans_offered";

export function plansOffered() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markPlansOffered() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* private mode still lets them through */
  }
}
