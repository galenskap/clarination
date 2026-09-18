#!/usr/bin/env python3
"""Génère les SVG de doigtés à partir du template Wikimedia CC0.

Source : https://commons.wikimedia.org/wiki/File:Clarinet-fingering-template.svg
Licence : CC0 1.0

Doigtés écrits, clarinette soprano système Boehm (Sib, La ou Ut : mêmes
doigtés pour une même note écrite). Référence : Woodwind Fingering Guide
(wfg.woodwind.org) et tablatures Boehm francophones.

Les calques Inkscape sont activés selon le doigté. Les <use> sont résolus
en chemins concrets pour éviter les trous invisibles (référence dans un
calque display:none).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "public/fingerings/clarinet-fingering-template.svg"
OUT_DIR = ROOT / "public/fingerings/generated"
DATA_OUT = ROOT / "src/data/fingerings.json"

# Trous : pouce arrière + 3 main gauche + 3 main droite (haut → bas).
T, L1, L2, L3 = "f1", "fis1", "d1", "c1"
R1, R2, R3 = "bes", "a", "g"
LH = (T, L1, L2, L3)
ALL = (*LH, R1, R2, R3)
REG = "register key"
A_KEY = "a1"
BB_KEY = "ais1"
CS = "cis1"  # do♯ / sol♯, auriculaire gauche
GS = "gis"  # sol♯ / la♭ (auriculaire ; le template n’a pas de calque « sol♯ de gorge » distinct)
EB_SLIVER = "dis"  # clé sliver mi♭ entre L2 et L3
SIDE4 = "additional_right_1"  # 4e clé latérale (mi♭ / si♭)
B_SLIVER = "ais"  # sliver si / fa♯ main droite


def holes(*names: str) -> set[str]:
    return set(names)


def apply_brand_colors(svg: str) -> str:
    """Couleurs clarina (aplats, sans noir/blanc purs)."""
    replacements = [
        ("fill:#000000", "fill:#5d0045"),
        ("stroke:#000000", "stroke:#5d0045"),
        ("fill:#ffffff", "fill:#fbf6e5"),
        ("fill:#cccccc", "fill:#ffd4c8"),
        ('pagecolor="#ffffff"', 'pagecolor="#fbf6e5"'),
        ("fill:black", "fill:#5d0045"),
        ("stroke:black", "stroke:#5d0045"),
    ]
    for old, new in replacements:
        svg = svg.replace(old, new)
    return svg


def extract_layers(svg: str) -> tuple[str, dict[str, str]]:
    """Retourne (préambule, {label: contenu_interne_du_calque})."""
    parts = re.split(r'(?=<g[^>]*inkscape:groupmode="layer")', svg)
    preamble = parts[0]
    layers: dict[str, str] = {}
    for part in parts[1:]:
        label_match = re.search(r'inkscape:label="([^"]+)"', part)
        if not label_match:
            continue
        label = label_match.group(1)
        # Contenu après la balise g ouvrante jusqu'à la fin du fragment
        inner_match = re.match(r"<g[^>]*>(.*)$", part, re.S)
        layers[label] = inner_match.group(1) if inner_match else part
    return preamble, layers


def collect_defs(layers: dict[str, str]) -> dict[str, str]:
    """Index id → élément XML (path/use) pour résolution des références."""
    elements: dict[str, str] = {}
    for content in layers.values():
        for el in re.findall(r"<(?:path|use|circle|ellipse|rect)[^>]*?/(?:>|(?<=/))>", content):
            id_match = re.search(r'\bid="([^"]+)"', el)
            if id_match:
                elements[id_match.group(1)] = el
        for el in re.findall(
            r"<(?:path|use|circle|ellipse|rect)\b[^>]*\bid=\"[^\"]+\"[^>]*>.*?</(?:path|use|circle|ellipse|rect)>",
            content,
            re.S,
        ):
            id_match = re.search(r'\bid="([^"]+)"', el)
            if id_match:
                elements[id_match.group(1)] = el
    return elements


def resolve_uses(content: str, elements: dict[str, str], depth: int = 0) -> str:
    """Remplace les <use href="#id"> par une copie du chemin cible + transform."""
    if depth > 6:
        return content

    def repl(match: re.Match[str]) -> str:
        tag = match.group(0)
        href = re.search(r'(?:xlink:)?href="#([^"]+)"', tag)
        if not href:
            return tag
        target_id = href.group(1)
        target = elements.get(target_id)
        if not target:
            return tag
        # Si la cible est elle-même un use, résoudre d'abord
        if target.strip().startswith("<use"):
            target = resolve_uses(target, elements, depth + 1)
        transform = re.search(r'\btransform="([^"]*)"', tag)
        # Nettoyer id pour éviter les doublons
        cloned = re.sub(r'\bid="[^"]*"', "", target, count=1)
        if transform:
            if 'transform="' in cloned:
                cloned = re.sub(
                    r'\btransform="([^"]*)"',
                    lambda m: f'transform="{transform.group(1)} {m.group(1)}"',
                    cloned,
                    count=1,
                )
            else:
                cloned = cloned.replace(" ", f' transform="{transform.group(1)}" ', 1)
        # Forcer remplissage visible (clé/trou enfoncé)
        if "fill:" in cloned or "fill=" in cloned:
            cloned = re.sub(r"fill:#[0-9a-fA-F]{3,8}", "fill:#5d0045", cloned)
            cloned = re.sub(r'fill="[^"]*"', 'fill="#5d0045"', cloned)
        else:
            cloned = cloned.replace("<path", '<path style="fill:#5d0045;stroke:#5d0045"', 1)
        return cloned

    return re.sub(r"<use\b[^>]*?/?>", repl, content)


def build_svg(preamble: str, layers: dict[str, str], active: set[str], elements: dict[str, str]) -> str:
    chunks = [preamble.rstrip(), "\n"]
    # Toujours le calque de base
    order = list(layers.keys())
    for label in order:
        show = label == "Base layer" or label in active
        if not show:
            continue
        content = layers[label]
        if label != "Base layer":
            content = resolve_uses(content, elements)
            # Forcer les fills des calques actifs en prune
            content = re.sub(r"fill:#[0-9a-fA-F]{3,8}", "fill:#5d0045", content)
            content = re.sub(r"stroke:#[0-9a-fA-F]{3,8}", "stroke:#5d0045", content)
        chunks.append(
            f'<g inkscape:groupmode="layer" inkscape:label="{label}" '
            f'style="display:inline" id="layer-{label.replace(" ", "_")}">\n'
        )
        chunks.append(content)
        if not content.rstrip().endswith("</g>"):
            # Le fragment original incluait souvent la fermeture </g> et la suite ;
            # on ne garde que jusqu'au premier </g> de fermeture de calque.
            pass
    # Les contenus de calques extraits incluent déjà les </g> imbriqués et le </g> final
    # via le split — vérifier.
    body = "".join(chunks)
    if "</svg>" not in body:
        body += "\n</svg>\n"
    return apply_brand_colors(body)


def split_layer_inner(raw: str) -> str:
    """Le split garde tout jusqu'au prochain calque ; retirer le </g> de fermeture du calque en fin."""
    # Trouver le </g> qui ferme le calque : en pratique le contenu a des g imbriqués.
    # On garde tel quel depuis extract — le fragment part inclut jusqu'au prochain layer,
    # donc il se termine souvent juste avant le prochain <g layer. Le </g> fermant est
    # à la fin du fragment.
    return raw


FINGERINGS: dict[str, list[set[str]]] = {
    # Chalumeau
    "E3": [holes(*ALL, "e"), holes(*ALL, "e_left")],
    "F3": [holes(*ALL, "f"), holes(*ALL, "f_left")],
    "F#3": [holes(*ALL, "fis"), holes(*ALL, "fis_left")],
    "G3": [holes(*ALL)],
    "Ab3": [holes(*ALL, GS)],
    "A3": [holes(*LH, R1, R2)],
    "Bb3": [holes(*LH, R1)],
    "B3": [holes(*LH, R2)],  # fourche
    "C4": [holes(*LH)],
    "C#4": [holes(*LH, CS)],
    "D4": [holes(T, L1, L2)],
    "Eb4": [holes(T, L1, L2, SIDE4), holes(T, L1, L2, EB_SLIVER)],
    "E4": [holes(T, L1)],
    "F4": [holes(T)],
    "F#4": [holes(L1)],  # pouce levé
    # Notes de gorge
    "G4": [holes()],  # sol à vide
    "Ab4": [holes(GS)],
    "A4": [holes(A_KEY)],
    "Bb4": [holes(REG, A_KEY), holes(BB_KEY)],
    # Clairon = chalumeau + clé de douzième (pouce reste bouché)
    "B4": [holes(*ALL, "e", REG), holes(*ALL, "e_left", REG)],
    "C5": [holes(*ALL, "f", REG), holes(*ALL, "f_left", REG)],
    "C#5": [holes(*ALL, "fis", REG), holes(*ALL, "fis_left", REG)],
    "D5": [holes(*ALL, REG)],
    "Eb5": [holes(*ALL, GS, REG)],
    "E5": [holes(*LH, R1, R2, REG)],
    "F5": [holes(*LH, R1, REG)],
    "F#5": [holes(*LH, R2, REG)],  # fourche
    "G5": [holes(*LH, REG)],
    "Ab5": [holes(*LH, CS, REG)],
    "A5": [holes(T, L1, L2, REG)],
    "Bb5": [holes(T, L1, L2, SIDE4, REG), holes(T, L1, L2, EB_SLIVER, REG)],
    "B5": [holes(T, L1, REG)],
    "C6": [holes(T, REG)],
    # Suraigu (index gauche levé = évent)
    "C#6": [holes(T, L2, L3, R1, R2, REG)],
    "D6": [holes(T, L2, L3, R1, GS, REG)],
    "Eb6": [holes(T, L2, L3, R1, B_SLIVER, GS, REG)],
    "E6": [holes(T, L2, L3, GS, REG)],
    "F6": [holes(T, L2, L3, CS, GS, REG)],
    "F#6": [holes(T, L2, GS, REG)],
    "G6": [holes(T, L2, R1, R2, GS, REG)],
}


def folder_name(note_id: str) -> str:
    return note_id.replace("#", "s")


def main() -> None:
    raw = TEMPLATE.read_text(encoding="utf-8")
    # Découpe fiable des calques avec leurs balises fermantes
    layer_pattern = re.compile(
        r'(<g[^>]*inkscape:groupmode="layer"[^>]*inkscape:label="([^"]+)"[^>]*>|'
        r'<g[^>]*inkscape:label="([^"]+)"[^>]*inkscape:groupmode="layer"[^>]*>)',
    )
    matches = list(layer_pattern.finditer(raw))
    preamble = raw[: matches[0].start()] if matches else raw
    layers: dict[str, str] = {}
    for i, match in enumerate(matches):
        label = match.group(2) or match.group(3)
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else raw.rfind("</svg>")
        fragment = raw[start:end]
        # Extraire inner (sans le <g ...> ouvrant, avec les fermetures)
        inner = re.sub(r"^<g[^>]*>", "", fragment, count=1)
        # Retirer le </g> final du calque s'il est seul en fin
        inner = re.sub(r"</g>\s*$", "", inner)
        layers[label] = inner

    elements = collect_defs(layers)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    index: dict[str, dict[str, list[str]]] = {}

    for note_id, variants in FINGERINGS.items():
        folder = OUT_DIR / folder_name(note_id)
        folder.mkdir(parents=True, exist_ok=True)
        paths: list[str] = []
        for i, active in enumerate(variants[:2], start=1):
            # Assembler
            parts = [preamble]
            for label, inner in layers.items():
                show = label == "Base layer" or label in active
                if not show:
                    continue
                content = inner if label == "Base layer" else resolve_uses(inner, elements)
                if label != "Base layer":
                    content = re.sub(r"fill:#[0-9a-fA-F]{3,8}", "fill:#5d0045", content)
                    content = re.sub(r'style="display:none"', 'style="display:inline"', content)
                parts.append(
                    f'<g id="layer-{label.replace(" ", "_")}" style="display:inline">'
                    f"{content}</g>\n"
                )
            parts.append("</svg>\n")
            out_svg = apply_brand_colors("".join(parts))
            out = folder / f"{i}.svg"
            out.write_text(out_svg, encoding="utf-8")
            paths.append(f"/fingerings/generated/{folder_name(note_id)}/{i}.svg")
        for leftover in folder.glob("*.svg"):
            if leftover.stem not in {str(n) for n in range(1, len(paths) + 1)}:
                leftover.unlink()
        index[note_id] = {"variants": paths}

    DATA_OUT.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Généré {len(index)} notes → {OUT_DIR}")


if __name__ == "__main__":
    main()
