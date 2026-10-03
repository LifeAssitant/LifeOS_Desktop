const KEY = "lifeos_garden_entered";

export function gardenEntered() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markGardenEntered() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* private mode still lets them through this launch */
  }
}

export function clearGardenEntered() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
