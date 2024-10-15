import m from "mithril";
import tagl, { style } from "tagl-mithril";

const { div, h1, p, input, br, img } = tagl(m);
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

let finalBase64Image_ = [];

m.mount(document.body, {
  view: () => [
    div.container(
      div.field(
        { style: `--cols: ${state.N}; --rows: ${state.M};` },
        state.items.map((item, i) =>
          item !== 0
            ? div.tile[state.sorted ? "green" : ""](
                { key: "" + item, onclick: () => handleClick(item, i),

                  style: `background-image: url(${finalBase64Image_[item-1]}); background-size: 100% 100%; background-repeat: no-repeat;`

                 },
//                img({ src: finalBase64Image_[item-1] }),
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
      ),
      br()
    ),
    input({
      type: "file",
      accept: "image/*",
      onchange: (e) => {
        const file = event.target.files[0];
        if (!file) return;

        finalBase64Image_ = [];

        const img = new Image();
        const reader = new FileReader();

        reader.onload = function (e) {
          img.src = e.target.result;

          img.onload = function () {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // Get square size from the smaller dimension
            const size = Math.min(img.width, img.height);

            // Set canvas dimensions to square size
            canvas.width = size;
            canvas.height = size;

            // Calculate cropping start points to center the crop
            const xOffset = (img.width - size) / 2;
            const yOffset = (img.height - size) / 2;

            // Draw cropped square onto the canvas
            ctx.drawImage(img, xOffset, yOffset, size, size, 0, 0, size, size);

            // Function to compress image and check size
            function compressAndCheckSize(quality, callback) {
              const base64Image = canvas.toDataURL("image/jpeg", quality); // Compress image
              const byteLength = Math.ceil((base64Image.length * 3) / 4); // Estimate byte size

              // Check if image is under 2000 bytes
              if (byteLength <= 2000) {
                callback(base64Image);
              } else if (quality > 0.1) {
                // Reduce quality and try again
                compressAndCheckSize(quality - 0.1, callback);
              } else {
                callback(base64Image); // Return the best we can do
              }
            }

            // Start compression process at 90% quality
            compressAndCheckSize(0.9, function (finalBase64Image) {
              // Display the cropped and compressed image

              const N = state.N; // Number of rows
              const M = state.M; // Number of columns

              const tileWidth = size / M;
              const tileHeight = size / N;

              // Create canvas for each tile
              for (let row = 0; row < N; row++) {
                for (let col = 0; col < M; col++) {
                  const tileCanvas = document.createElement("canvas");
                  const tileCtx = tileCanvas.getContext("2d");
                  tileCanvas.width = tileWidth;
                  tileCanvas.height = tileHeight;

                  // Draw the corresponding tile from the original cropped image
                  tileCtx.drawImage(
                    canvas,
                    col * tileWidth,
                    row * tileHeight,
                    tileWidth,
                    tileHeight, // Source
                    0,
                    0,
                    tileWidth,
                    tileHeight // Destination
                  );

                  // Convert each tile to Base64 and display it
                  const tileBase64 = tileCanvas.toDataURL("image/jpeg", 0.9);

                  finalBase64Image_.push(tileBase64);
                }
              }

              m.redraw();
              console.log("Final Base64 Image:", finalBase64Image); // Optional: Log Base64 string
            });
          };
        };

        reader.readAsDataURL(file);
      },
    }),
    //  finalBase64Image_ ? finalBase64Image_.map(imago =>  img({ src: imago })) : null,
  ],
});

window.addEventListener("keydown", (e) => {
  move(KEY_MAP.indexOf(e.key));
});
