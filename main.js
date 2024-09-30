import m from "mithril";
import tagl from "tagl-mithril";

const { div, h1, p } = tagl(m);
const { random, trunc } = Math;
const KEY_MAP = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

const range = (n) => Array.from({ length: n }, (_, i) => i);
const randomInt = (min, max) => trunc(random() * (max - min + 1)) + min;
const isSolved = (items) => items.every((item, i) => !item || i === item - 1);

const state = {
  items: [],
  sorted: false,
  N: 4,
  M: 4,
  shuffle: 100,
};

const crds = (idx) => ({ x: idx % state.N, y: trunc(idx / state.N) });
const idx = ({ x, y }) => x + state.N * y;
const onBoard = ({ x, y }) => x >= 0 && y >= 0 && x < state.N && y < state.M;
const up = ({ x, y }) => ({ x, y: y - 1 });
const down = ({ x, y }) => ({ x, y: y + 1 });
const left = ({ x, y }) => ({ x: x - 1, y });
const right = ({ x, y }) => ({ x: x + 1, y });
const DIRECTIONS = [left, right, up, down];
const eqCol = (p1, p2) => p1.x === p2.x;
const eqRow = (p1, p2) => p1.y === p2.y;
const eq = (p1, p2) => eqRow(p1, p2) && eqCol(p1, p2);
const emptyIdx = () => state.items.indexOf(0);

const newGame = () => {
  state.items = range(state.N * state.M - 1)
    .map((i) => i + 1)
    .concat(0);
  range(state.shuffle).map(() => move(randomInt(0, KEY_MAP.length - 1)));
};

const shift = (empty, clicked) => {
  if (!eqCol(empty, clicked) && !eqRow(empty, clicked)) return;
  const direction = eqCol(empty, clicked)
    ? empty.y > clicked.y
      ? up
      : down
    : empty.x > clicked.x
    ? left
    : right;
  for (let p = direction(empty), last = empty; ; p = direction(p)) {
    state.items[idx(last)] = state.items[idx(p)];
    last = p;
    if (eq(p, clicked)) break;
  }
  state.items[idx(clicked)] = 0;
  state.sorted = isSolved(state.items);
  m.redraw();
};

const handleClick = (item, clicked_idx) => {
  if (item === 0) return;
  shift(crds(emptyIdx()), crds(clicked_idx));
};
const move = (key) => {
  const empty = crds(emptyIdx());
  const clicked = DIRECTIONS[key](empty);
  if (!onBoard(clicked)) return;
  shift(empty, clicked);
};

newGame();

m.mount(document.body, {
  view: () =>
    div.container(
      div.field(
        { style: `--cols: ${state.N}; --rows: ${state.M};` },
        state.items.map((item, i) =>
          item !== 0
            ? div.tile[state.sorted ? "green" : ""](
                { key: "" + item, onclick: () => handleClick(item, i) },
                item
              )
            : state.sorted
            ? div.tile.green(
                {
                  key: "" + item,
                  onclick: (e) => newGame(),
                },
                "×"
              )
            : div({ key: "" + item })
        )
      )
    ),
});

window.addEventListener("keydown", (e) => {
  move(KEY_MAP.indexOf(e.key));
});
