// Ember & Sage Kitchen: everything the eye sees, painted on one canvas.
// The kitchen is drawn from shapes alone — no images, no fonts fetched —
// so the game looks the same offline as it does in the screenshots.
import {
  CHOP_SECONDS,
  COLOURS,
  FIELD,
  GRILL_SECONDS,
  BURN_SECONDS,
  INGREDIENTS,
  RECIPES,
  STATIONS,
  STATION_LIST,
} from './config.js';
import { nearestStation } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TILE = 64;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, size, colour, align = 'left', weight = 700) {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

/** One ingredient, drawn as a little piece of food art. */
export function drawIngredient(ctx, kind, x, y, size, state = 'raw') {
  const r = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'tomato') {
    if (state === 'chopped') {
      ctx.fillStyle = '#e5484d';
      ctx.beginPath();
      ctx.arc(-r * 0.45, 0, r * 0.55, 0, Math.PI * 2);
      ctx.arc(r * 0.45, 0, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f27d7d';
      ctx.beginPath();
      ctx.arc(-r * 0.45, 0, r * 0.3, 0, Math.PI * 2);
      ctx.arc(r * 0.45, 0, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#e5484d';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f27d7d';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.3, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3c8a2e';
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(-r * 0.35, -r * 0.55);
      ctx.lineTo(0, -r * 0.7);
      ctx.lineTo(r * 0.35, -r * 0.55);
      ctx.closePath();
      ctx.fill();
    }
  } else if (kind === 'lettuce') {
    ctx.fillStyle = '#5fbf4a';
    ctx.beginPath();
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const px = Math.cos(angle) * r * 0.85;
      const py = Math.sin(angle) * r * 0.85;
      ctx.moveTo(px + r * 0.45, py);
      ctx.arc(px, py, r * 0.45, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.fillStyle = '#8ed67a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    if (state === 'chopped') {
      ctx.strokeStyle = '#3c8a2e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, 0);
      ctx.lineTo(r * 0.6, 0);
      ctx.moveTo(0, -r * 0.6);
      ctx.lineTo(0, r * 0.6);
      ctx.stroke();
    }
  } else if (kind === 'onion') {
    ctx.fillStyle = '#b388eb';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e6d6ff';
    ctx.lineWidth = 2.5;
    for (let index = 1; index <= 3; index += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, (r * index) / 3.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (state === 'chopped') {
      ctx.strokeStyle = '#7d5ba6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.4);
      ctx.lineTo(r * 0.7, r * 0.4);
      ctx.stroke();
    }
  } else if (kind === 'cheese') {
    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.7);
    ctx.lineTo(r, r * 0.7);
    ctx.lineTo(r, -r * 0.2);
    ctx.lineTo(-r, r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c9931a';
    ctx.beginPath();
    ctx.arc(-r * 0.2, r * 0.25, r * 0.16, 0, Math.PI * 2);
    ctx.arc(r * 0.4, r * 0.4, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'bun') {
    ctx.fillStyle = '#e8b06a';
    ctx.beginPath();
    ctx.arc(0, r * 0.25, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c98d4b';
    ctx.fillRect(-r, r * 0.25, r * 2, r * 0.28);
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath();
    ctx.arc(-r * 0.4, -r * 0.35, r * 0.09, 0, Math.PI * 2);
    ctx.arc(0, -r * 0.55, r * 0.09, 0, Math.PI * 2);
    ctx.arc(r * 0.4, -r * 0.35, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'patty') {
    ctx.fillStyle = state === 'burnt' ? '#241a12' : state === 'cooked' ? '#6b4429' : '#8a5a3b';
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    if (state === 'cooked') {
      ctx.strokeStyle = '#4a2c16';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.2);
      ctx.lineTo(r * 0.5, r * 0.2);
      ctx.moveTo(-r * 0.5, r * 0.2);
      ctx.lineTo(r * 0.5, -r * 0.2);
      ctx.stroke();
    }
    if (state === 'burnt') {
      ctx.strokeStyle = '#5a4632';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 0.3);
      ctx.quadraticCurveTo(0, r * 0.4, r * 0.4, -r * 0.3);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A plate with the finished components stacked on it, readable at a glance. */
function drawPlate(ctx, items, x, y, size) {
  const r = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#fdf6e3';
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9c08a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#e8d9b0';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.68, r * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();
  const spread = Math.min(r * 0.9, items.length * 14);
  items.forEach((kind, index) => {
    const offset = items.length === 1 ? 0 : -spread / 2 + (spread * index) / (items.length - 1);
    const state = kind === 'patty' ? 'cooked' : kind === 'tomato' || kind === 'lettuce' || kind === 'onion' ? 'chopped' : 'raw';
    drawIngredient(ctx, kind, offset, -index * 2, size * 0.52, state);
  });
  ctx.restore();
}

function drawProgressRing(ctx, x, y, radius, fraction, colour) {
  ctx.save();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, fraction));
  ctx.stroke();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    const deviceRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * deviceRatio);
    canvas.height = Math.round(height * deviceRatio);
    scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    offsetX = (canvas.width - FIELD.width * scale) / 2;
    offsetY = (canvas.height - FIELD.height * scale) / 2;
  }

  function toField(clientX, clientY) {
    return { x: (clientX * (window.devicePixelRatio || 1) - offsetX) / scale, y: (clientY * (window.devicePixelRatio || 1) - offsetY) / scale };
  }

  function drawFloor() {
    for (let row = 0; row < Math.ceil(FIELD.height / TILE); row += 1) {
      for (let col = 0; col < Math.ceil(FIELD.width / TILE); col += 1) {
        ctx.fillStyle = (row + col) % 2 === 0 ? COLOURS.floorA : COLOURS.floorB;
        ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 108, FIELD.width, 8);
  }

  function drawOrderBoard(state) {
    ctx.fillStyle = COLOURS.board;
    roundRect(ctx, 8, 8, FIELD.width - 16, 100, 10);
    ctx.fill();
    ctx.strokeStyle = COLOURS.boardEdge;
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, 'ORDERS', 28, 40, 20, '#f5c542');
    if (state.orders.length === 0) {
      text(ctx, 'No orders yet — the lunch rush is coming…', 28, 76, 18, '#e8d9b0');
    }
    state.orders.forEach((order, index) => {
      const x = 140 + index * 228;
      const y = 16;
      const w = 216;
      const h = 84;
      const urgent = order.timeLeft < 12;
      const pulse = urgent ? 0.6 + 0.4 * Math.sin(state.anim * 6) : 1;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = COLOURS.ticket;
      roundRect(ctx, x, y, w, h, 8);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = urgent ? '#e5484d' : COLOURS.ticketEdge;
      ctx.lineWidth = urgent ? 3 : 2;
      roundRect(ctx, x, y, w, h, 8);
      ctx.stroke();
      const recipe = RECIPES[order.recipe];
      text(ctx, `#${order.id} ${recipe.name}`, x + 12, y + 24, 16, COLOURS.ink);
      recipe.needs.forEach((kind, ingredientIndex) => {
        const stateName = kind === 'patty' ? 'cooked' : kind === 'tomato' || kind === 'lettuce' || kind === 'onion' ? 'chopped' : 'raw';
        drawIngredient(ctx, kind, x + 24 + ingredientIndex * 34, y + 50, 26, stateName);
      });
      const fraction = Math.max(0, order.timeLeft / order.lifetime);
      ctx.fillStyle = '#e8d9b0';
      ctx.fillRect(x + 12, y + 68, w - 24, 8);
      ctx.fillStyle = fraction > 0.5 ? '#5fbf4a' : fraction > 0.25 ? '#f5c542' : '#e5484d';
      ctx.fillRect(x + 12, y + 68, (w - 24) * fraction, 8);
      text(ctx, `${Math.ceil(order.timeLeft)}s`, x + w - 14, y + 24, 15, urgent ? '#e5484d' : '#7a5c38', 'right');
    });
  }

  function drawHud(state, best) {
    const x = 1264;
    text(ctx, `DAY ${Math.ceil(state.dayLeft)}s`, x, 42, 26, '#fdf6e3', 'right');
    text(ctx, `SCORE ${state.score}`, x, 72, 20, '#f5c542', 'right');
    const comboText = state.combo > 1 ? `COMBO x${state.combo}` : 'COMBO —';
    text(ctx, comboText, x, 98, 16, state.combo > 1 ? '#8ed67a' : '#c9a37e', 'right');
    for (let index = 0; index < 3; index += 1) {
      ctx.fillStyle = index < state.hearts ? '#e5484d' : 'rgba(255,255,255,0.25)';
      const hx = 1064 + index * 28;
      const hy = 30;
      ctx.beginPath();
      ctx.moveTo(hx, hy + 8);
      ctx.bezierCurveTo(hx - 12, hy - 4, hx - 6, hy - 14, hx, hy - 6);
      ctx.bezierCurveTo(hx + 6, hy - 14, hx + 12, hy - 4, hx, hy + 8);
      ctx.fill();
    }
    if (best > 0) text(ctx, `BEST ${best}`, 1064, 96, 14, '#c9a37e');
  }

  function drawStation(state, station) {
    const { x, y, w, h } = station;
    ctx.fillStyle = '#8a5a3b';
    roundRect(ctx, x - 4, y - 4, w + 8, h + 8, 10);
    ctx.fill();
    ctx.fillStyle = station.kind === 'grill' ? '#3a3a3a' : '#a9713f';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 8);
    ctx.stroke();

    if (station.kind === 'crate') {
      drawIngredient(ctx, station.item, x + w / 2 - 34, y + h / 2 - 6, 44);
      drawIngredient(ctx, station.item, x + w / 2 + 8, y + h / 2 - 2, 40);
      drawIngredient(ctx, station.item, x + w / 2 + 38, y + h / 2 - 8, 36);
    } else if (station.kind === 'plates') {
      for (let index = 0; index < 3; index += 1) {
        drawPlate(ctx, [], x + 42 + index * 48, y + h / 2, 44);
      }
    } else if (station.kind === 'chop') {
      ctx.fillStyle = '#e8d9b0';
      roundRect(ctx, x + 24, y + 22, w - 48, h - 44, 8);
      ctx.fill();
      if (state.chop.kind) {
        drawIngredient(ctx, state.chop.kind, x + w / 2, y + h / 2, 52, state.chop.done ? 'chopped' : 'raw');
        if (!state.chop.done) {
          drawProgressRing(ctx, x + w / 2, y + h / 2, 40, state.chop.progress / CHOP_SECONDS, '#5fbf4a');
        } else {
          text(ctx, 'READY!', x + w / 2, y + h - 10, 15, '#3c8a2e', 'center');
        }
      } else {
        text(ctx, 'chop here', x + w / 2, y + h / 2 + 6, 16, '#8a7a5c', 'center');
      }
    } else if (station.kind === 'grill') {
      state.grill.forEach((slot, index) => {
        const cx = x + 62 + index * 96;
        const cy = y + h / 2;
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 44, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        if (slot.kind) {
          const grillState = slot.seconds >= BURN_SECONDS ? 'burnt' : slot.seconds >= GRILL_SECONDS ? 'cooked' : 'raw';
          drawIngredient(ctx, 'patty', cx, cy, 52, grillState);
          const fraction = Math.min(1, slot.seconds / GRILL_SECONDS);
          ctx.fillStyle = '#444';
          ctx.fillRect(cx - 34, cy + 34, 68, 7);
          ctx.fillStyle = grillState === 'burnt' ? '#e5484d' : grillState === 'cooked' ? '#5fbf4a' : '#f5c542';
          ctx.fillRect(cx - 34, cy + 34, 68 * fraction, 7);
          if (grillState === 'burnt') text(ctx, 'BURNT!', cx, cy - 36, 14, '#e5484d', 'center');
          else if (grillState === 'cooked') text(ctx, 'DONE!', cx, cy - 36, 14, '#8ed67a', 'center');
        }
      });
      const flames = state.grill.some((slot) => slot.kind);
      if (flames) {
        ctx.fillStyle = `rgba(245, 120, 40, ${0.25 + 0.15 * Math.sin(state.anim * 9)})`;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h - 6, w / 2 - 10, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (station.kind === 'plating') {
      if (state.plateOnCounter) {
        drawPlate(ctx, state.plateOnCounter.items, x + w / 2, y + h / 2, 92);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.setLineDash([8, 6]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, 46, 36, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        text(ctx, 'plate goes here', x + w / 2, y + h / 2 + 5, 15, '#e8d9b0', 'center');
      }
    } else if (station.kind === 'serve') {
      ctx.fillStyle = '#2d1f14';
      roundRect(ctx, x + 12, y + 30, w - 24, h - 90, 8);
      ctx.fill();
      ctx.fillStyle = '#f5c542';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + 58, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2d1f14';
      ctx.fillRect(x + w / 2 - 2, y + 44, 4, 12);
      ctx.fillStyle = '#fdf6e3';
      text(ctx, 'PICK UP', x + w / 2, y + 120, 15, '#fdf6e3', 'center');
      text(ctx, 'WINDOW', x + w / 2, y + 140, 15, '#fdf6e3', 'center');
      ctx.fillStyle = '#5fbf4a';
      roundRect(ctx, x + 10, y + h - 52, w - 20, 36, 6);
      ctx.fill();
      text(ctx, 'SERVE', x + w / 2, y + h - 27, 17, '#fff', 'center');
    } else if (station.kind === 'trash') {
      ctx.fillStyle = '#4a4a52';
      roundRect(ctx, x + 22, y + 30, w - 44, h - 52, 8);
      ctx.fill();
      ctx.fillStyle = '#33333a';
      ctx.fillRect(x + 14, y + 22, w - 28, 14);
      text(ctx, 'TOSS IT', x + w / 2, y + h / 2 + 8, 15, '#c9c9d1', 'center');
    }
    text(ctx, station.label, x + w / 2, y + h + 20, 15, '#fdf6e3', 'center');
  }

  function drawChef(state) {
    const player = state.player;
    const bob = player.moving ? Math.sin(player.walkPhase) * 3 : Math.sin(state.anim * 2) * 1.5;
    ctx.save();
    ctx.translate(player.x, player.y + bob);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 22 - bob, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Apron body.
    ctx.fillStyle = '#fdf6e3';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7fb3d5';
    ctx.beginPath();
    ctx.moveTo(-14, 4);
    ctx.quadraticCurveTo(0, 14, 14, 4);
    ctx.lineTo(10, 20);
    ctx.lineTo(-10, 20);
    ctx.closePath();
    ctx.fill();
    // Face and toque.
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(0, -6, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fdf6e3';
    ctx.beginPath();
    ctx.arc(-8, -18, 9, 0, Math.PI * 2);
    ctx.arc(0, -22, 10, 0, Math.PI * 2);
    ctx.arc(8, -18, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-14, -18, 28, 6);
    ctx.fillStyle = '#3a2417';
    ctx.beginPath();
    ctx.arc(-5 * player.facing, -6, 1.8, 0, Math.PI * 2);
    ctx.arc(5 * player.facing, -6, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // What the chef is carrying, held high so it reads at a glance.
    const carrying = player.carrying;
    if (carrying) {
      const cy = player.y - 46 + bob;
      if (carrying.kind === 'plate') {
        drawPlate(ctx, carrying.items, player.x, cy, 64);
      } else {
        drawIngredient(ctx, carrying.kind, player.x, cy, 44, carrying.state);
      }
    }
  }

  function drawHint(state) {
    const station = nearestStation(state);
    if (!station) return;
    ctx.save();
    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 4;
    roundRect(ctx, station.x - 6, station.y - 6, station.w + 12, station.h + 12, 12);
    ctx.stroke();
    ctx.restore();
    const player = state.player;
    let hint = '';
    if (station.kind === 'crate') hint = player.carrying ? '' : `E — Take ${INGREDIENTS[station.item].name}`;
    else if (station.kind === 'plates') hint = player.carrying ? '' : 'E — Take a plate';
    else if (station.kind === 'chop') hint = state.chop.kind && state.chop.done ? 'E — Take chopped food' : 'E — Chop it';
    else if (station.kind === 'grill') hint = 'E — Grill / take patty';
    else if (station.kind === 'plating') hint = 'E — Plate it';
    else if (station.kind === 'serve') hint = 'E — Serve the dish!';
    else if (station.kind === 'trash') hint = 'E — Throw it away';
    if (hint) {
      const width = ctx.measureText(hint).width + 28;
      ctx.fillStyle = 'rgba(40,24,12,0.9)';
      roundRect(ctx, player.x - width / 2, player.y + 34, width, 30, 8);
      ctx.fill();
      text(ctx, hint, player.x, player.y + 55, 15, '#fdf6e3', 'center');
    }
  }

  function drawToasts(state) {
    state.toasts.forEach((toast, index) => {
      const alpha = Math.min(1, toast.ttl);
      ctx.save();
      ctx.globalAlpha = alpha;
      const y = 140 + index * 36;
      ctx.fillStyle = 'rgba(40,24,12,0.85)';
      const width = ctx.measureText(toast.text).width + 28;
      roundRect(ctx, FIELD.width / 2 - width / 2, y, width, 30, 8);
      ctx.fill();
      text(ctx, toast.text, FIELD.width / 2, y + 21, 16, toast.colour, 'center');
      ctx.restore();
    });
  }

  function drawParticles(state) {
    state.particles.forEach((particle) => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, particle.ttl * 1.5);
      ctx.fillStyle = particle.colour;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(30,16,8,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'EMBER & SAGE', FIELD.width / 2, 300, 84, '#f5c542', 'center');
    text(ctx, 'R U S H   H O U R   K I T C H E N', FIELD.width / 2, 348, 26, '#fdf6e3', 'center');
    text(ctx, 'Take orders. Chop, grill and plate. Serve before the ticket runs out.', FIELD.width / 2, 410, 20, '#e8d9b0', 'center');
    text(ctx, 'WASD / arrows to walk  ·  E or click to use a station  ·  P pause  ·  M mute', FIELD.width / 2, 448, 18, '#e8d9b0', 'center');
    const pulse = 0.7 + 0.3 * Math.sin(state.anim * 4);
    ctx.save();
    ctx.globalAlpha = pulse;
    text(ctx, 'Press Enter or click to start the lunch rush', FIELD.width / 2, 520, 24, '#8ed67a', 'center');
    ctx.restore();
    if (best > 0) text(ctx, `Best score: ${best}`, FIELD.width / 2, 566, 18, '#f5c542', 'center');
    text(ctx, 'A 150-second day. Three strikes and the kitchen closes early.', FIELD.width / 2, 610, 16, '#c9a37e', 'center');
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(30,16,8,0.66)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'PAUSED', FIELD.width / 2, 380, 64, '#fdf6e3', 'center');
    text(ctx, 'Press P or Enter to get back to the stove', FIELD.width / 2, 430, 20, '#e8d9b0', 'center');
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(30,16,8,0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = COLOURS.ticket;
    roundRect(ctx, FIELD.width / 2 - 300, 170, 600, 430, 16);
    ctx.fill();
    ctx.strokeStyle = COLOURS.ticketEdge;
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, 'DAY OVER', FIELD.width / 2, 240, 48, COLOURS.ink, 'center');
    text(ctx, `Score  ${state.score}`, FIELD.width / 2, 310, 30, COLOURS.ink, 'center');
    text(ctx, `Dishes served  ${state.served}`, FIELD.width / 2, 356, 22, '#7a5c38', 'center');
    text(ctx, `Best combo  x${state.bestCombo}`, FIELD.width / 2, 392, 22, '#7a5c38', 'center');
    text(ctx, `Tips earned  ${state.tips}`, FIELD.width / 2, 428, 22, '#7a5c38', 'center');
    text(ctx, `Best score  ${best}`, FIELD.width / 2, 464, 22, '#7a5c38', 'center');
    const verdict = state.served >= 8 ? 'A rush to remember — the regulars are already back!' : state.served >= 4 ? 'A solid service. The grill is still warm.' : 'A quiet day. Tomorrow, faster hands!';
    text(ctx, verdict, FIELD.width / 2, 516, 18, '#3c8a2e', 'center');
    const pulse = 0.7 + 0.3 * Math.sin(state.anim * 4);
    ctx.save();
    ctx.globalAlpha = pulse;
    text(ctx, 'Press Enter to cook another day', FIELD.width / 2, 566, 20, '#3c8a2e', 'center');
    ctx.restore();
  }

  return {
    resize,
    toField,
    draw(screen, state, best) {
      resize();
      ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
      ctx.fillStyle = '#241608';
      ctx.fillRect(-offsetX / scale, -offsetY / scale, FIELD.width + (2 * offsetX) / scale, FIELD.height + (2 * offsetY) / scale);
      drawFloor();
      drawOrderBoard(state);
      drawHud(state, best);
      STATION_LIST.forEach((station) => drawStation(state, station));
      drawChef(state);
      if (screen === SCREEN_PLAY) drawHint(state);
      drawParticles(state);
      drawToasts(state);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawOver(state, best);
    },
  };
}
