// scripts/brace-check.mjs
// Vérifie l'équilibre des accolades / parenthèses d'un fichier — diagnostic
// rapide quand tsc ne dit que « '}' expected » sans designer le vrai coupable.
// Usage : node scripts/brace-check.mjs lib/product/inventory/reservation.service.ts
import { readFileSync } from "node:fs";

const file = process.argv[2];
const src = readFileSync(file, "utf8");

const PAIRS = { "}": "{", ")": "(", "]": "[" };
const stack = [];
let line = 1;

for (let i = 0; i < src.length; i++) {
  const c = src[i];
  if (c === "\n") line++;
  if (c === "/" && src[i + 1] === "/") {
    while (i < src.length && src[i] !== "\n") i++;
    line++;
    continue;
  }
  if (c === "/" && src[i + 1] === "*") {
    i += 2;
    while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
      if (src[i] === "\n") line++;
      i++;
    }
    i++;
    continue;
  }
  if (c === '"' || c === "'" || c === "`") {
    const quote = c;
    i++;
    while (i < src.length && src[i] !== quote) {
      if (src[i] === "\\") i++;
      if (src[i] === "\n") line++;
      i++;
    }
    continue;
  }
  if (c === "{" || c === "(" || c === "[") {
    stack.push({ c, line });
  } else if (c === "}" || c === ")" || c === "]") {
    const top = stack.pop();
    if (!top || top.c !== PAIRS[c]) {
      console.log(
        `DÉSÉQUILIBRE ligne ${line} : '${c}' encountered, ` +
          (top ? `attendait la fermeture de '${top.c}' ouverte ligne ${top.line}` : "aucun ouvrant"),
      );
      process.exit(1);
    }
  }
}

if (stack.length > 0) {
  console.log(
    `${stack.length} ouvrant(s) jamais fermé(s) : ` +
      stack.map((s) => `'${s.c}' ligne ${s.line}`).join(", "),
  );
  process.exit(1);
}

console.log("Accolades équilibrées.");
