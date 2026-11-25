// Ember & Sage Kitchen: keyboard and mouse. WASD or arrows walk the chef,
// E or Space interacts with the station in reach, P or Escape pauses, M
// mutes, Enter starts. A click walks the chef toward the point and, on
// arrival near a station, interacts there — so the mouse alone can play.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_INTERACT = 8;

export function createInput(canvas, toField) {
  const keys = new Set();
  let actions = 0;
  let click = null;
  let clickTarget = null;

  const KEY_ACTIONS = {
    Enter: ACTION_CONFIRM,
    ' ': ACTION_INTERACT,
    e: ACTION_INTERACT,
    E: ACTION_INTERACT,
    p: ACTION_PAUSE,
    P: ACTION_PAUSE,
    Escape: ACTION_PAUSE,
    m: ACTION_MUTE,
    M: ACTION_MUTE,
  };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    const action = KEY_ACTIONS[event.key];
    if (action) {
      actions |= action;
      event.preventDefault();
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const point = toField(event.clientX - rect.left, event.clientY - rect.top);
    click = point;
    clickTarget = point;
    event.preventDefault();
  });
  window.addEventListener('blur', () => keys.clear());

  function move() {
    let x = 0;
    let y = 0;
    if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('d') || keys.has('ArrowRight')) x += 1;
    if (keys.has('w') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('s') || keys.has('ArrowDown')) y += 1;
    if (x !== 0 || y !== 0) {
      clickTarget = null;
      return { x, y };
    }
    if (clickTarget) return { x: clickTarget.x, y: clickTarget.y, click: true };
    return { x: 0, y: 0 };
  }

  return {
    move,
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
    clearClickTarget() {
      clickTarget = null;
    },
    clickTarget() {
      return clickTarget;
    },
  };
}
