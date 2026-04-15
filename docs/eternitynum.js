/**
 * eternitynum.js
 * ─────────────────────────────────────────────────────────────
 * Formats large numbers using the EternityNum suffix system,
 * matching the Roblox EternityNum library up to MeHect.
 *
 * Suffix tiers:
 *   Standard: K, M, B, T, Qa, Qi, Sx, Sp, Oc, No
 *   -illion:  De, UnDe, DuDe, ... NoDe
 *   -illard:  Ce, UnCe, ... NoCe
 *   Higher:   Mill, BiMill, TriMill, ... (and so on)
 *   Special:  Hect, Bi+Hect, ..., MeHect (mega hect)
 *
 * This implementation covers the full EternityNum range as used
 * in Roblox games up to MeHect (10^309).
 */

(function (global) {
  'use strict';

  // ─── SUFFIX TABLES ──────────────────────────────────────────
  // Each entry: [suffix, exponent of 10]
  // We store them sorted ascending by exponent.

  const SUFFIXES = [
    // Standard
    ['',    0],
    ['K',   3],
    ['M',   6],
    ['B',   9],
    ['T',   12],
    ['Qa',  15],
    ['Qi',  18],
    ['Sx',  21],
    ['Sp',  24],
    ['Oc',  27],
    ['No',  30],
    // -illions (10^33 .. 10^62)
    ['De',      33],
    ['UnDe',    36],
    ['DuDe',    39],
    ['TrDe',    42],
    ['QuaDe',   45],
    ['QuiDe',   48],
    ['SxDe',    51],
    ['SpDe',    54],
    ['OcDe',    57],
    ['NoDe',    60],
    // -illard (hundreds)
    ['Ce',      63],
    ['UnCe',    66],
    ['DuCe',    69],
    ['TrCe',    72],
    ['QuaCe',   75],
    ['QuiCe',   78],
    ['SxCe',    81],
    ['SpCe',    84],
    ['OcCe',    87],
    ['NoCe',    90],
    // Mill group (10^93+)
    ['Mill',    93],
    ['UnMill',  96],
    ['DuMill',  99],
    ['TrMill',  102],
    ['QuaMill', 105],
    ['QuiMill', 108],
    ['SxMill',  111],
    ['SpMill',  114],
    ['OcMill',  117],
    ['NoMill',  120],
    // BiMill group (10^123+)
    ['BiMill',      123],
    ['UnBiMill',    126],
    ['DuBiMill',    129],
    ['TrBiMill',    132],
    ['QuaBiMill',   135],
    ['QuiBiMill',   138],
    ['SxBiMill',    141],
    ['SpBiMill',    144],
    ['OcBiMill',    147],
    ['NoBiMill',    150],
    // TriMill group (10^153+)
    ['TriMill',     153],
    ['UnTriMill',   156],
    ['DuTriMill',   159],
    ['TrTriMill',   162],
    ['QuaTriMill',  165],
    ['QuiTriMill',  168],
    ['SxTriMill',   171],
    ['SpTriMill',   174],
    ['OcTriMill',   177],
    ['NoTriMill',   180],
    // QuaMill group (10^183+)
    ['QuaMilli',    183],
    ['UnQuaMilli',  186],
    ['DuQuaMilli',  189],
    ['TrQuaMilli',  192],
    ['QuaQuaMilli', 195],
    ['QuiQuaMilli', 198],
    ['SxQuaMilli',  201],
    ['SpQuaMilli',  204],
    ['OcQuaMilli',  207],
    ['NoQuaMilli',  210],
    // QuiMill group (10^213+)
    ['QuiMilli',    213],
    ['UnQuiMilli',  216],
    ['DuQuiMilli',  219],
    ['TrQuiMilli',  222],
    ['QuaQuiMilli', 225],
    ['QuiQuiMilli', 228],
    ['SxQuiMilli',  231],
    ['SpQuiMilli',  234],
    ['OcQuiMilli',  237],
    ['NoQuiMilli',  240],
    // SxMill group (10^243+)
    ['SxMilli',     243],
    ['UnSxMilli',   246],
    ['DuSxMilli',   249],
    ['TrSxMilli',   252],
    ['QuaSxMilli',  255],
    ['QuiSxMilli',  258],
    ['SxSxMilli',   261],
    ['SpSxMilli',   264],
    ['OcSxMilli',   267],
    ['NoSxMilli',   270],
    // SpMill group (10^273+)
    ['SpMilli',     273],
    ['UnSpMilli',   276],
    ['DuSpMilli',   279],
    ['TrSpMilli',   282],
    ['QuaSpMilli',  285],
    ['QuiSpMilli',  288],
    ['SxSpMilli',   291],
    ['SpSpMilli',   294],
    ['OcSpMilli',   297],
    ['NoSpMilli',   300],
    // Hect group (10^303+)
    ['Hect',        303],
    ['UnHect',      306],
    // MeHect — the max in EternityNum
    ['MeHect',      309],
  ];

  // Build a sorted array ascending by exponent
  SUFFIXES.sort((a, b) => a[1] - b[1]);

  /**
   * Format a number (JS number or string representation) into
   * the EternityNum display format, e.g. "1.23 Mill" or "999.9 No".
   *
   * @param {number|string} value - The numeric value to format
   * @param {number} [decimals=2] - Decimal places to show (default 2)
   * @returns {string}
   */
  function formatEN(value, decimals = 2) {
    const n = typeof value === 'string' ? parseFloat(value) : value;

    if (!isFinite(n)) return String(n);
    if (isNaN(n))     return '???';
    if (n < 0)        return '-' + formatEN(-n, decimals);
    if (n < 1000)     return n.toFixed(n < 10 ? decimals : (n < 100 ? Math.max(0, decimals - 1) : 0));

    // Find the highest suffix that fits
    let best = SUFFIXES[0];
    for (const entry of SUFFIXES) {
      if (Math.pow(10, entry[1]) <= n) {
        best = entry;
      } else {
        break;
      }
    }

    const [suffix, exp] = best;
    if (exp === 0) return n.toFixed(0);

    const divisor = Math.pow(10, exp);
    const display = n / divisor;

    // Cap at MeHect
    if (exp >= 309) {
      return display.toFixed(decimals) + ' MeHect';
    }

    const formatted = display.toFixed(decimals);
    return suffix ? `${formatted} ${suffix}` : formatted;
  }

  /**
   * Parse a formatted EternityNum string back to a JS number.
   * Useful for sorting comparisons.
   *
   * @param {number|string} value
   * @returns {number}
   */
  function parseEN(value) {
    if (typeof value === 'number') return value;
    const str = String(value).trim();
    const num = parseFloat(str);
    for (const [suffix, exp] of SUFFIXES) {
      if (suffix && str.endsWith(suffix)) {
        return num * Math.pow(10, exp);
      }
    }
    return num;
  }

  // Expose globally
  global.EN = { format: formatEN, parse: parseEN };

})(typeof window !== 'undefined' ? window : global);
