// Gera favicon.ico e apple-touch-icon.png a partir do mesmo desenho do favicon.svg.
// Node puro (só usa zlib), sem dependências npm. Correr à mão quando o ícone mudar:
//   node tools/make-icons.mjs
//
// O favicon.svg é o ícone principal; estes ficheiros são fallback para browsers
// sem suporte de SVG e para o ecrã principal do iOS (que não aceita SVG).

import zlib from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------- paleta (igual a css/style.css) ----------
const ASFALTO = [0x1c, 0x1b, 0x19];
const MARCO = [0xf1, 0xea, 0xd9];
const VERDE = [0x1f, 0x3a, 0x2d];
const VINHO = [0x7a, 0x2e, 0x2e];

// ---------- geometria, em unidades de desenho 0..64 ----------
// Silhueta do marco: os dois cantos Q do SVG aproximados por pontos.
const MARCO_POLY = [
  [32, 2], [48, 20], [48, 56], [47.6, 58.6], [46.5, 60.5], [44.6, 61.6],
  [42, 62], [22, 62], [19.4, 61.6], [17.5, 60.5], [16.4, 58.6], [16, 56], [16, 20],
];

// O "16" é rasterizado a partir dos mesmos traços do favicon.svg: as cúbicas são
// achatadas em segmentos e um ponto pertence ao traço se distar <= metade da
// espessura. Isso dá remates e junções redondas, como stroke-linecap="round".
const ESPESSURA = 5;
const RAIO_TRACO = ESPESSURA / 2;

function achatarCubica([p0, p1, p2, p3], n = 16) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([
      u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
      u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1],
    ]);
  }
  return pts;
}

// "1": M 22 38 L 26 34 L 26 56
const TRACO_1 = [[22, 38], [26, 34], [26, 56]];

// "6": os cinco segmentos cúbicos do SVG, em cadeia.
const TRACO_6 = [
  [[43, 36], [39, 35], [33, 40], [33, 47.5]],
  [[33, 47.5], [33, 52.5], [35.5, 56], [38.5, 56]],
  [[38.5, 56], [41.5, 56], [44, 53.5], [44, 50]],
  [[44, 50], [44, 46.5], [41.5, 44.5], [38.5, 44.5]],
  [[38.5, 44.5], [36, 44.5], [34, 46], [33, 47.5]],
].flatMap((c) => achatarCubica(c));

const TRACOS = [TRACO_1, TRACO_6];

// caixa envolvente dos dígitos, para rejeitar amostras depressa
const CAIXA = [18 - RAIO_TRACO, 34 - RAIO_TRACO, 44 + RAIO_TRACO, 56 + RAIO_TRACO];

function distanciaSegmento(px, py, [x1, y1], [x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function dentroPoligono(x, y, poly) {
  let dentro = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

function dentroRetanguloArredondado(x, y, lado, r) {
  if (x < 0 || y < 0 || x > lado || y > lado) return false;
  const cx = Math.min(Math.max(x, r), lado - r);
  const cy = Math.min(Math.max(y, r), lado - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function dentroDigito(x, y) {
  if (x < CAIXA[0] || y < CAIXA[1] || x > CAIXA[2] || y > CAIXA[3]) return false;
  for (const linha of TRACOS) {
    for (let i = 1; i < linha.length; i++) {
      if (distanciaSegmento(x, y, linha[i - 1], linha[i]) <= RAIO_TRACO) return true;
    }
  }
  return false;
}

// Devolve a cor de uma amostra, ou null se estiver fora do ícone (transparente).
function amostra(x, y, comDigitos) {
  if (!dentroRetanguloArredondado(x, y, 64, 10)) return null;
  if (!dentroPoligono(x, y, MARCO_POLY)) return ASFALTO;
  if (y >= 17 && y <= 29) return VERDE;
  if (comDigitos && dentroDigito(x, y)) return VINHO;
  return MARCO;
}

// Rasteriza para RGBA com supersampling; abaixo de 24 px os dígitos ficam ilegíveis
// e só atrapalham, por isso desenha-se apenas a silhueta com a faixa verde.
function rasterizar(lado) {
  const SS = 4, comDigitos = lado >= 24;
  const px = Buffer.alloc(lado * lado * 4);
  for (let py = 0; py < lado; py++) {
    for (let pxx = 0; pxx < lado; pxx++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const dx = ((pxx + (sx + 0.5) / SS) / lado) * 64;
          const dy = ((py + (sy + 0.5) / SS) / lado) * 64;
          const c = amostra(dx, dy, comDigitos);
          if (c) { r += c[0]; g += c[1]; b += c[2]; a += 255; }
        }
      }
      const n = SS * SS, i = (py * lado + pxx) * 4;
      // pré-multiplicação inversa: a média de cor só conta as amostras opacas
      const opacas = a / 255;
      px[i] = opacas ? Math.round(r / opacas) : 0;
      px[i + 1] = opacas ? Math.round(g / opacas) : 0;
      px[i + 2] = opacas ? Math.round(b / opacas) : 0;
      px[i + 3] = Math.round(a / n);
    }
  }
  return px;
}

// ---------- codificador PNG ----------
const TABELA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function bloco(tipo, dados) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, "latin1"), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([len, corpo, crc]);
}

function png(lado, rgba) {
  const passo = lado * 4;
  const bruto = Buffer.alloc(lado * (1 + passo));
  for (let y = 0; y < lado; y++) {
    bruto[y * (1 + passo)] = 0; // filtro None
    rgba.copy(bruto, y * (1 + passo) + 1, y * passo, (y + 1) * passo);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8; // 8 bits por canal
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco("IHDR", ihdr),
    bloco("IDAT", zlib.deflateSync(bruto, { level: 9 })),
    bloco("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- contentor ICO (com PNG embutido) ----------
function ico(tamanhos) {
  const imagens = tamanhos.map((s) => png(s, rasterizar(s)));
  const cab = Buffer.alloc(6);
  cab.writeUInt16LE(0, 0);
  cab.writeUInt16LE(1, 2); // tipo: ícone
  cab.writeUInt16LE(tamanhos.length, 4);
  let offset = 6 + 16 * tamanhos.length;
  const dir = tamanhos.map((s, i) => {
    const e = Buffer.alloc(16);
    e[0] = s >= 256 ? 0 : s;
    e[1] = s >= 256 ? 0 : s;
    e.writeUInt16LE(1, 4); // planos
    e.writeUInt16LE(32, 6); // bits por pixel
    e.writeUInt32LE(imagens[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += imagens[i].length;
    return e;
  });
  return Buffer.concat([cab, ...dir, ...imagens]);
}

// ---------- escrita ----------
mkdirSync(RAIZ, { recursive: true });
const alvos = [
  ["favicon.ico", ico([16, 32, 48])],
  ["apple-touch-icon.png", png(180, rasterizar(180))],
];
for (const [nome, buf] of alvos) {
  writeFileSync(join(RAIZ, nome), buf);
  console.log(`${nome.padEnd(22)} ${String(buf.length).padStart(7)} bytes`);
}
