// Tiny external store so a page (the 404) can ask the layout Header for its
// solid, dark-text variant without prop drilling through the root layout.
let solid = false;
const listeners = new Set<() => void>();

export function subscribeSolidHeader(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getSolidHeader() {
  return solid;
}

export function setSolidHeader(value: boolean) {
  if (solid === value) return;
  solid = value;
  listeners.forEach((l) => l());
}
