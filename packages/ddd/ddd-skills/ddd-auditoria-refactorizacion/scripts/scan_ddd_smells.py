#!/usr/bin/env python3
"""
Escaneo heurístico de síntomas DDD en un repositorio TypeScript.

Uso:
    python3 scan_ddd_smells.py <ruta> [--json salida.json] [--domain-dir domain]

Solo lee ficheros. Los hallazgos son indicios que hay que confirmar leyendo el código.
"""
import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

INFRA_PACKAGES = (
    "express", "fastify", "koa", "@nestjs/", "@prisma/client", "prisma", "typeorm", "sequelize",
    "mongoose", "mongodb", "pg", "mysql", "mysql2", "knex", "drizzle-orm", "@mikro-orm/", "axios",
    "node-fetch", "kafkajs", "amqplib", "@azure/", "aws-sdk", "@aws-sdk/", "redis", "ioredis",
)
IGNORED_DIRS = {"node_modules", "dist", "build", ".git", "coverage", ".next", ".tmp"}

IMPORT_RE = re.compile(r"""^\s*import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]""", re.M)
REQUIRE_RE = re.compile(r"""require\(\s*['"]([^'"]+)['"]\s*\)""")
SETTER_RE = re.compile(r"^\s*(?:public\s+)?set\s*([A-Z]\w*)\s*\(|^\s*(?:public\s+)?set\s+\w+\s*\(", re.M)
PUBLIC_MUTABLE_FIELD_RE = re.compile(r"^\s*public\s+(?!readonly)(?!static)\w+\??\s*:", re.M)
CLASS_RE = re.compile(r"\bclass\s+(\w+)")
ORM_DECORATOR_RE = re.compile(r"@(Entity|Column|PrimaryGeneratedColumn|OneToMany|ManyToOne|Table|Prop|Schema)\b")
PRIMITIVE_MONEY_RE = re.compile(r"\b(price|amount|total|importe|precio)\s*\??\s*:\s*number\b", re.I)
PRIMITIVE_STATUS_RE = re.compile(r"\b(status|estado|state)\s*\??\s*:\s*string\b", re.I)
SMELLY_NAME_RE = re.compile(r"\bclass\s+\w*(Manager|Helper|Utils?|Processor)\b")
REPO_CLASS_RE = re.compile(r"\b(?:class|interface)\s+(\w+)Repository\b")
# Cualquier receptor que guarde: this.orders.save(...), orderRepository.save(...), repo.persist(...)
SAVE_CALL_RE = re.compile(r"(?:this\.)?(\w+)\s*\.\s*(?:save|add|persist|remove)\s*\(")
NOT_A_REPOSITORY = {"events", "eventbus", "bus", "outbox", "inbox", "list", "set", "map", "array", "items", "tags"}
ARCHI_OUTER_LAYER_RE = re.compile(r"""['"]@archi-code/ddd/(application|infrastructure)['"]""")
NEW_DATE_RE = re.compile(r"\bnew\s+Date\s*\(\s*\)")
TRANSACTION_START_RE = re.compile(r"(\$transaction|\.transaction|\btx\.run|\.run|runInTransaction|withTransaction)\s*\(")


def iter_ts_files(root: Path):
    for p in root.rglob("*"):
        if p.is_dir() or any(part in IGNORED_DIRS for part in p.parts):
            continue
        if p.suffix in (".ts", ".tsx", ".mts", ".cts") and not p.name.endswith(".d.ts"):
            yield p


def zone_of(path: Path, domain_dir: str):
    parts = [p.lower() for p in path.parts]
    for zone in (domain_dir, "application", "infrastructure", "interfaces"):
        if zone in parts:
            return zone
    return None


def context_of(path: Path):
    parts = list(path.parts)
    for anchor in ("contexts", "bounded-contexts", "modules"):
        if anchor in parts:
            i = parts.index(anchor)
            if i + 1 < len(parts):
                return parts[i + 1]
    return None


def transaction_blocks(text: str):
    """Devuelve (posición, contenido) de cada llamada transaccional, emparejando paréntesis."""
    for m in TRANSACTION_START_RE.finditer(text):
        if m.group(1) == ".run" and not re.search(r"(tx|transaction|uow|unitOfWork)\w*\s*$", text[:m.start()], re.I):
            continue                                  # .run( de otra cosa
        i = m.end() - 1                               # posición del '('
        depth, j = 0, i
        while j < len(text):
            c = text[j]
            if c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
                if depth == 0:
                    break
            j += 1
        yield m.start(), text[i:j + 1]


def line_of(text: str, idx: int) -> int:
    return text.count("\n", 0, idx) + 1


def scan(root: Path, domain_dir: str):
    findings = []
    stats = defaultdict(int)
    repos = []

    def add(rule, severity, path, line, detail):
        findings.append({"rule": rule, "severity": severity, "file": str(path.relative_to(root)), "line": line, "detail": detail})

    for path in iter_ts_files(root):
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        stats["ficheros_ts"] += 1
        zone = zone_of(path, domain_dir)
        ctx = context_of(path)
        is_test = ".test." in path.name or ".spec." in path.name

        imports = [(m.group(1), m.start()) for m in IMPORT_RE.finditer(text)] + \
                  [(m.group(1), m.start()) for m in REQUIRE_RE.finditer(text)]

        if zone == domain_dir and not is_test:
            stats["ficheros_dominio"] += 1
            for mod, idx in imports:
                if any(mod == p or mod.startswith(p if p.endswith("/") else p + "/") or mod == p.rstrip("/") for p in INFRA_PACKAGES):
                    add("dominio-importa-infraestructura", "alta", path, line_of(text, idx), f"importa '{mod}'")
                if not mod.startswith("@archi-code/") and re.search(r"/(infrastructure|interfaces|application)(/|$)", mod):
                    add("dominio-importa-capa-exterior", "alta", path, line_of(text, idx), f"importa '{mod}'")
            for m in ARCHI_OUTER_LAYER_RE.finditer(text):
                add("dominio-importa-capa-exterior-del-paquete", "alta", path, line_of(text, m.start()),
                    f"importa @archi-code/ddd/{m.group(1)}")
            if "process.env" in text:
                add("dominio-lee-entorno", "media", path, line_of(text, text.index("process.env")), "usa process.env")
            for m in ORM_DECORATOR_RE.finditer(text):
                add("decorador-orm-en-dominio", "alta", path, line_of(text, m.start()), f"@{m.group(1)}")
            for m in SETTER_RE.finditer(text):
                add("setter-en-dominio", "media", path, line_of(text, m.start()), m.group(0).strip()[:60])
            for m in PUBLIC_MUTABLE_FIELD_RE.finditer(text):
                add("campo-publico-mutable", "media", path, line_of(text, m.start()), m.group(0).strip()[:60])
            for m in PRIMITIVE_MONEY_RE.finditer(text):
                add("dinero-como-number", "media", path, line_of(text, m.start()), m.group(0))
            for m in PRIMITIVE_STATUS_RE.finditer(text):
                add("estado-como-string", "baja", path, line_of(text, m.start()), m.group(0))

        if zone in (domain_dir, "application") and not is_test:
            for m in NEW_DATE_RE.finditer(text):
                add("new-date-en-dominio-o-aplicacion", "media", path, line_of(text, m.start()),
                    "usa new Date(); inyecta un Clock")

        if zone == "interfaces" and not is_test:
            if re.search(r"Repository\b", text):
                for m in re.finditer(r"\w+Repository\b", text):
                    add("interfaz-usa-repositorio", "media", path, line_of(text, m.start()), m.group(0))
                    break
            for m in re.finditer(r"\bprisma\.\w+\.(create|update|delete|upsert)", text):
                add("controlador-escribe-en-bd", "alta", path, line_of(text, m.start()), m.group(0))

        if ctx and not is_test:
            for mod, idx in imports:
                target_ctx = None
                if mod.startswith("."):
                    target_ctx = context_of((path.parent / mod).resolve())
                else:
                    m = re.search(r"contexts/([\w-]+)/", mod)
                    target_ctx = m.group(1) if m else None
                if target_ctx and target_ctx != ctx:
                    add("importacion-entre-contextos", "alta", path, line_of(text, idx), f"{ctx} importa de {target_ctx}")

        for m in SMELLY_NAME_RE.finditer(text):
            add("clase-con-nombre-generico", "baja", path, line_of(text, m.start()), m.group(0))

        for m in REPO_CLASS_RE.finditer(text):
            repos.append((m.group(1), str(path.relative_to(root))))

        if not is_test:
            for start, block in transaction_blocks(text):
                saved = {m.group(1).lower() for m in SAVE_CALL_RE.finditer(block)} - NOT_A_REPOSITORY
                if len(saved) >= 2:
                    add("varios-agregados-en-una-transaccion", "alta", path, line_of(text, start),
                        f"el mismo bloque transaccional guarda con {sorted(saved)}")

        if not is_test and zone in ("application", None):
            for cm in CLASS_RE.finditer(text):
                if cm.group(1).endswith("Service"):
                    methods = len(re.findall(r"^\s+(?:public\s+|async\s+)+\w+\s*\(", text, re.M))
                    loc = text.count("\n")
                    if methods > 15 or loc > 400:
                        add("servicio-grande", "media", path, line_of(text, cm.start()),
                            f"{cm.group(1)}: ~{methods} métodos, {loc} líneas")

    part_names = ("Line", "Item", "Detail", "Address", "Linea", "Detalle", "Direccion")
    for name, f in sorted(set(repos)):
        if name.endswith(part_names):
            findings.append({"rule": "repositorio-de-parte-interna", "severity": "media", "file": f, "line": 1,
                             "detail": f"{name}Repository: ¿es una parte de otro agregado?"})
    stats["repositorios"] = len(set(r[0] for r in repos))
    return findings, dict(stats)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("root")
    ap.add_argument("--json", dest="json_out")
    ap.add_argument("--domain-dir", default="domain")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f"No existe el directorio: {root}", file=sys.stderr)
        sys.exit(2)

    findings, stats = scan(root, args.domain_dir.lower())
    order = {"critica": 0, "alta": 1, "media": 2, "baja": 3}
    findings.sort(key=lambda f: (order.get(f["severity"], 9), f["rule"], f["file"], f["line"]))

    by_rule = defaultdict(int)
    for f in findings:
        by_rule[(f["severity"], f["rule"])] += 1

    print(f"Repositorio: {root}")
    print("Estadísticas: " + ", ".join(f"{k}={v}" for k, v in stats.items()))
    if stats.get("ficheros_dominio", 0) == 0:
        print("Aviso: no se ha encontrado ninguna carpeta 'domain'. Las reglas de dominio no se han aplicado;"
              " usa --domain-dir si se llama de otra forma, o revisa a mano.")
    print("\nResumen por regla:")
    for (sev, rule), n in sorted(by_rule.items(), key=lambda x: (order.get(x[0][0], 9), x[0][1])):
        print(f"  [{sev:5}] {rule}: {n}")
    print("\nPrimeros hallazgos:")
    for f in findings[:40]:
        print(f"  [{f['severity']:5}] {f['rule']}  {f['file']}:{f['line']}  {f['detail']}")
    if len(findings) > 40:
        print(f"  ... y {len(findings) - 40} más (usa --json para la lista completa)")

    if args.json_out:
        Path(args.json_out).write_text(json.dumps({"stats": stats, "findings": findings}, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\nJSON escrito en {args.json_out}")


if __name__ == "__main__":
    main()
