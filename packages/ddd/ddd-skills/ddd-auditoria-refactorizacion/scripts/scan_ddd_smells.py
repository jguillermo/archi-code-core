#!/usr/bin/env python3
"""
Escaneo heurístico de síntomas DDD en un repositorio TypeScript.

Uso:
    python3 scan_ddd_smells.py <ruta> [--json salida.json] [--domain-dir domain]

Solo lee ficheros. Los hallazgos son indicios que hay que confirmar leyendo el código.

Además de los síntomas generales de DDD, aplica las convenciones de @archi-code/ddd (función package_rules):
clases base propias, imports del paquete sin capa, API de una capa exterior usada en una interior, estado
primitivo o sin conversión en un agregado, forma y nombre de eventos y errores de negocio, repositorios
(abstracto, verbos, adaptadores), casos de uso que usan otro, reacciones sin @ListensTo o que lanzan, puntos
de entrada, carpetas y nombres de fichero (el dominio va en domain/<agregado>/<tipo>/: bajo domain/ solo hay carpetas
de agregado), y puertos de dominio (interfaces o clases abstractas del dominio fuera de domain/<agregado>/repository/,
y capas exteriores que implementan algo del dominio que no es un repositorio). Las reconoce por nombre de clase, no por
la ruta del import.
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
SHARED_KERNEL = "shared-kernel"
# Con el paquete, la reacción a un evento es el propio caso de uso: un EventListener no llama a execute()
LISTENER_CLASS_RE = re.compile(r"class\s+(\w+)[^{]*\bextends\s+EventListener\b")
EXECUTE_CALL_RE = re.compile(r"\.execute\s*\(")
# eventName '<agregado>.<acción_en_pasado>' en snake_case; un nombre de clase como 'OrderPlaced' no sigue la convención
CLASS_EVENT_NAME_RE = re.compile(r"static\s+readonly\s+eventName\s*=\s*['\"]([^'\"]*)['\"]")
EVENT_NAME_FORMAT_RE = re.compile(r"^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$")
PUBLIC_MUTABLE_FIELD_RE = re.compile(r"^\s*public\s+(?!readonly)(?!static)\w+\??\s*:", re.M)
CLASS_RE = re.compile(r"\bclass\s+(\w+)")
ORM_DECORATOR_RE = re.compile(r"@(Entity|Column|PrimaryGeneratedColumn|OneToMany|ManyToOne|Table|Prop|Schema)\b")
PRIMITIVE_MONEY_RE = re.compile(r"\b_?(price|amount|total|importe|precio)\s*\??\s*:\s*number\b", re.I)
PRIMITIVE_STATUS_RE = re.compile(r"\b_?(status|estado|state)\s*\??\s*:\s*string\b", re.I)
SMELLY_NAME_RE = re.compile(r"\bclass\s+\w*(Manager|Helper|Utils?|Processor)\b")
REPO_CLASS_RE = re.compile(r"\b(?:class|interface)\s+(\w+)Repository\b")
# Cualquier receptor que guarde: this.orders.save(...), orderRepository.save(...), repo.persist(...)
SAVE_CALL_RE = re.compile(r"(?:this\.)?(\w+)\s*\.\s*(?:save|add|persist|remove)\s*\(")
NOT_A_REPOSITORY = {"events", "eventbus", "bus", "outbox", "inbox", "list", "set", "map", "array", "items", "tags"}
ARCHI_OUTER_LAYER_RE = re.compile(r"""['"]@archi-code/ddd/(application|infrastructure)['"]""")
NEW_DATE_RE = re.compile(r"\bnew\s+Date\s*\(\s*\)|\bDate\.now\s*\(\s*\)")
TRANSACTION_START_RE = re.compile(r"(\$transaction|\.transaction|\btx\.run|\.run|runInTransaction|withTransaction)\s*\(")
# La transacción es del adaptador del repositorio: dominio y aplicación no abren, reciben ni manejan transacciones
TRANSACTION_HANDLING_RE = re.compile(
    r"\b(TransactionRunner|TransactionManager|UnitOfWork|unitOfWork|startSession|startTransaction|commitTransaction|"
    r"abortTransaction|withTransaction|runInTransaction|inTransaction)\b|\$transaction\b|['\"`]\s*(BEGIN|COMMIT|ROLLBACK)\b"
)


# --- Reglas propias de @archi-code/ddd (convenciones del paquete, por nombre: valen con cualquier ruta de import) ---
EXTENDS_RE = re.compile(r"\bclass\s+(\w+)(?:<[^{]*?>)?\s+extends\s+([\w.]+)")
OWN_BASE_CLASS_RE = re.compile(
    r"\b(?:abstract\s+)?class\s+(ValueObject|Entity|AggregateRoot|DomainEvent|EventBase|UseCase|EventListener|"
    r"DomainException|ApplicationException|InfrastructureException|AggregateRepository|Specification|EventPublisher)\b"
)
PACKAGE_BAD_IMPORT_RE = re.compile(r"""['"]@archi-code/ddd(?:/(exceptions|dist|src)[^'"]*)?['"]""")
APPLICATION_API_RE = re.compile(
    r"(?<![\w.])(ValueObjectBuilder|UseCase|EventListener|ListensTo|EventBus|AggregateNotFoundException|"
    r"NotAllowedException|ConcurrencyException|UnexpectedErrorException|ApplicationException)\b"
)
INFRASTRUCTURE_API_RE = re.compile(
    r"(?<![\w.])(DomainEventBus|EventRegistry|InMemoryEventChannel|IndexedDbDatabase|IndexedDbSchema|IndexedDbException|"
    r"ExceptionClassifier|ExceptionKind|ConsoleLogger|InMemoryLogger|SilentLogger|InternalErrorException|"
    r"InfrastructureException)\b"
)
LOGGING_RE = re.compile(r"(?<![\w.])(Logger\b|console\.(?:log|debug|info|warn|error)\s*\()")
PRIMITIVE_FIELD_RE = re.compile(
    r"(?:(?<![\w.])(?:(?:private|protected|public)\s+(?:readonly\s+)?|readonly\s+)(_?\w+)\??\s*:\s*"
    r"(string|number|boolean|Date)(?:\[\])?(?:\s*\|\s*null)?\s*[;=,)]"
    r"|^[ \t]*(_\w+)\??\s*:\s*(string|number|boolean|Date)(?:\[\])?(?:\s*\|\s*null)?\s*[;=])",
    re.M,
)
EVENT_FIELD_RE = re.compile(r"^[ \t]*(?:public\s+)?readonly\s+(\w+)\??\s*:\s*(?:readonly\s+)?([A-Z]\w*)", re.M)
EVENT_FIELD_ALLOWED_TYPES = {"Array", "ReadonlyArray", "Record", "Readonly"}
EVENT_UNION_RE = re.compile(r"\btype\s+(\w+)\s*=\s*\|?\s*\w+DomainEvent\s*\|")
LISTENS_TO_RE = re.compile(r"@ListensTo\s*\(\s*(\w+)\s*(?:,\s*\{([^}]*)\})?\s*,?\s*\)")
CONSUMER_RE = re.compile(r"consumer\s*:\s*['\"]([^'\"]*)['\"]")
REACTION_ERROR_RE = re.compile(r"\b(AggregateNotFoundException|NotAllowedException)\b")
ABSTRACT_REPOSITORY_RE = re.compile(r"\babstract\s+class\s+\w+Repository\s+extends\s+AggregateRepository\b")
ABSTRACT_METHOD_RE = re.compile(r"^[ \t]*abstract\s+(\w+)\s*[(<]", re.M)
REPOSITORY_VERBS = {"findById", "search", "save", "remove"}
ADAPTER_REPOSITORY_RE = re.compile(r"\bclass\s+(\w+Repository)\b(?!\s+extends\s+\w+Repository\b)")
NEXT_ID_RE = re.compile(r"\bnextId\s*\(|\bnextIdentity\s*\(")
CRUD_USE_CASE_RE = re.compile(r"^(?:(?:Update|Delete|Get|Set|Save|Upsert|Crud)[A-Z]\w*|\w+(?:Service|UseCase|Handler|Manager))$")
PATTERN_FOLDERS = {"use-cases", "usecases", "use_cases", "listeners", "commands", "dtos", "handlers", "subscribers"}
DOMAIN_KIND_FOLDERS = {"aggregate", "entity", "value-object", "event", "exception", "repository", "service", "specification"}
PASCAL_FILE_RE = re.compile(r"^[A-Z][A-Za-z0-9]*$")
KEBAB_FILE_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
TYPE_SILENCING_RE = re.compile(r"@ts-ignore|@ts-expect-error|@ts-nocheck|\bas\s+any\b|\bas\s+unknown\s+as\b|:\s*any\b")
RAW_INDEXEDDB_RE = re.compile(r"\bindexedDB\s*\.\s*open\b|\bIDB(?:Database|ObjectStore|Transaction|OpenDBRequest)\b")
CATCH_RE = re.compile(r"\bcatch\s*[({]")
COMPOSITION_FILE = "composition"
# Regla más importante del paquete: del dominio solo se implementa el repositorio abstracto; no existen puertos de dominio
DOMAIN_CONTRACT_RE = re.compile(r"^[ \t]*(?:export\s+)?(?:declare\s+)?(abstract\s+class|interface)\s+(\w+)", re.M)
NAMED_IMPORT_RE = re.compile(r"import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['\"]([^'\"]+)['\"]")
CLASS_HERITAGE_RE = re.compile(
    r"\bclass\s+(\w+)(?:<[^{]*?>)?((?:\s+extends\s+[\w.]+(?:<[^{]*?>)?)?(?:\s+implements\s+[^{]+)?)\s*\{"
)
HERITAGE_NAME_RE = re.compile(r"(?:extends|implements|,)\s*([\w.]+)")


def import_target(path: Path, mod: str):
    """Fichero .ts al que apunta un import relativo, o None."""
    if not mod.startswith("."):
        return None
    base = (path.parent / mod)
    for candidate in (base.with_name(base.name + ".ts"), base / "index.ts"):
        if candidate.is_file():
            return candidate
    return None


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


def domain_location(path: Path, domain_dir: str):
    """(agregado, tipo) de un fichero de dominio, domain/<agregado>/<tipo>/Fichero.ts; None en lo que falte."""
    parts = [p.lower() for p in path.parts[:-1]]
    if domain_dir not in parts:
        return None, None
    rest = parts[parts.index(domain_dir) + 1:]
    if not rest:
        return None, None
    if len(rest) >= 2 and rest[1] in DOMAIN_KIND_FOLDERS:
        return rest[0], rest[1]
    if rest[0] in DOMAIN_KIND_FOLDERS:
        return None, rest[0]
    return rest[0], None


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


def class_spans(text: str):
    """Devuelve (inicio, fin, nombre) de cada clase: desde su declaración hasta la siguiente o el final."""
    starts = [(m.start(), m.group(1)) for m in CLASS_RE.finditer(text)]
    for k, (start, name) in enumerate(starts):
        end = starts[k + 1][0] if k + 1 < len(starts) else len(text)
        yield start, end, name


def line_of(text: str, idx: int) -> int:
    return text.count("\n", 0, idx) + 1


def package_rules(add, path, text, zone, ctx, domain_dir, imports, use_case_files):
    """Convenciones de @archi-code/ddd que no vienen de los libros: clases base, capas, formas y nombres."""
    classes = [(m.group(1), m.group(2).split(".")[-1], m.start()) for m in EXTENDS_RE.finditer(text)]
    extends = {base for _, base, _ in classes}
    folders = {part.lower() for part in path.parts[:-1]}
    aggregate, kind = domain_location(path, domain_dir) if zone == domain_dir else (None, None)
    in_context = ctx is not None
    is_composition = path.stem == COMPOSITION_FILE

    for m in OWN_BASE_CLASS_RE.finditer(text):
        add("clase-base-propia", "alta", path, line_of(text, m.start()),
            f"declara {m.group(1)}; las clases base vienen de @archi-code/ddd")
    for m in PACKAGE_BAD_IMPORT_RE.finditer(text):
        add("import-del-paquete-sin-capa", "alta", path, line_of(text, m.start()),
            f"{m.group(0)}; solo existen /domain, /application e /infrastructure")
    for m in TYPE_SILENCING_RE.finditer(text):
        entry_point_cast = zone == "interfaces" and "unknown" in m.group(0)   # el cuerpo recibido: lo valida toCommand
        if in_context and not entry_point_cast:
            add("tipos-silenciados", "media", path, line_of(text, m.start()), m.group(0).strip())

    if in_context and path.stem != COMPOSITION_FILE:
        for mod, idx in imports:
            if re.search(r"(^|/)composition(\.ts)?$", mod):
                add("capa-importa-composition", "alta", path, line_of(text, idx), f"importa '{mod}'")
        expected = PASCAL_FILE_RE if (zone == domain_dir or ctx == SHARED_KERNEL) else KEBAB_FILE_RE
        if not expected.match(path.stem):
            case = "PascalCase (el nombre de la clase)" if expected is PASCAL_FILE_RE else "kebab-case"
            add("nombre-de-fichero-fuera-de-convencion", "baja", path, 1, f"{path.name}: aquí los ficheros van en {case}")

    if zone == domain_dir:
        for m in APPLICATION_API_RE.finditer(text):
            add("dominio-usa-api-de-aplicacion", "alta", path, line_of(text, m.start()), m.group(1))
            break
        for m in LOGGING_RE.finditer(text):
            add("dominio-usa-logger", "media", path, line_of(text, m.start()), m.group(1).strip())
            break
        if in_context and aggregate is None:
            add("dominio-sin-carpeta-de-agregado", "media", path, 1,
                "bajo domain/ solo hay carpetas de agregado; va en domain/<agregado>/<tipo>/")
        if in_context and kind is None:
            add("dominio-sin-carpeta-por-tipo", "baja", path, 1,
                "va en domain/<agregado>/ dentro de aggregate/, entity/, value-object/, event/, exception/, "
                "repository/, service/ o specification/")

        if extends & {"AggregateRoot", "Entity"}:
            for m in PRIMITIVE_FIELD_RE.finditer(text):
                add("estado-primitivo-en-agregado", "media", path, line_of(text, m.start()),
                    f"{m.group(1) or m.group(3)}: {m.group(2) or m.group(4)}; el estado son value objects")
            for m in re.finditer(r"(?<![\w.])(\w+Repository|EventBus)\b", text):
                add("agregado-usa-repositorio-o-bus", "alta", path, line_of(text, m.start()), m.group(1))
                break
        if "AggregateRoot" in extends:
            if not re.search(r"\bstatic\s+fromPrimitives\s*\(", text) or not re.search(r"^\s*toPrimitives\s*\(", text, re.M):
                add("agregado-sin-conversion", "media", path, 1, "faltan static fromPrimitives() y/o toPrimitives()")
            if not re.search(r"\bstatic\s+create\s*\(", text):
                add("agregado-sin-create", "baja", path, 1, "falta static create(id, ...)")

        for name, base, start in classes:
            if base == "EventBase" and not name.endswith("DomainEvent"):
                add("evento-fuera-de-convencion", "baja", path, line_of(text, start),
                    f"{name}; usa <Agregado><AcciónEnPasado>DomainEvent")
            if base == "DomainException" and re.search(r"(Exception|Error)$", name):
                add("error-de-negocio-con-sufijo", "baja", path, line_of(text, start),
                    f"{name}; nombra lo que falló, sin sufijo Exception/Error")
        if "EventBase" in extends:
            for m in EVENT_FIELD_RE.finditer(text):
                if m.group(1) != "eventName" and m.group(2) not in EVENT_FIELD_ALLOWED_TYPES:
                    add("evento-con-campo-no-primitivo", "media", path, line_of(text, m.start()),
                        f"{m.group(1)}: {m.group(2)}; un evento solo lleva primitivos")

        if re.search(r"\b(?:class|interface)\s+\w+Repository\b", text):
            if not ABSTRACT_REPOSITORY_RE.search(text):
                add("repositorio-de-dominio-no-abstracto", "media", path, 1,
                    "debe ser 'abstract class <Agregado>Repository extends AggregateRepository<...>'")
            for m in ABSTRACT_METHOD_RE.finditer(text):
                if m.group(1) not in REPOSITORY_VERBS:
                    add("repositorio-con-verbo-no-estandar", "media", path, line_of(text, m.start()),
                        f"{m.group(1)}(); solo findById, search, save y remove")

    if zone == domain_dir and kind != "repository":
        in_service = kind == "service"
        for m in DOMAIN_CONTRACT_RE.finditer(text):
            contract = "interface" if m.group(1) == "interface" else "abstract class"
            if in_service:
                add("puerto-de-dominio", "alta", path, line_of(text, m.start()),
                    f"{contract} {m.group(2)} en domain/<agregado>/service/: no existen puertos de dominio; un servicio de dominio es "
                    "una clase concreta y del dominio solo se implementa el repositorio abstracto")
            elif contract == "abstract class":
                add("dominio-con-clase-abstracta", "alta", path, line_of(text, m.start()),
                    f"abstract class {m.group(2)}: en el dominio solo es abstracto el repositorio de un agregado")

    if zone in ("application", "infrastructure", "interfaces"):
        domain_names = {}
        for m in NAMED_IMPORT_RE.finditer(text):
            mod = m.group(2)
            if not mod.startswith(".") or not re.search(rf"/{re.escape(domain_dir)}/", mod):
                continue
            if re.search(rf"/{re.escape(domain_dir)}/(?:[^/]+/)?repository/", mod):
                continue
            for name in m.group(1).split(","):
                name = name.strip().removeprefix("type ").split(" as ")[-1].strip()
                if name:
                    domain_names[name] = mod
        for m in CLASS_HERITAGE_RE.finditer(text):
            for h in HERITAGE_NAME_RE.finditer(m.group(2) or ""):
                base = h.group(1).split(".")[-1]
                if base in domain_names:
                    add("capa-exterior-implementa-dominio", "alta", path, line_of(text, m.start()),
                        f"{m.group(1)} implementa o extiende {base} ('{domain_names[base]}'): del dominio solo se "
                        "implementa el repositorio abstracto de un agregado; no existen puertos de dominio")

    for m in EVENT_UNION_RE.finditer(text):
        add("union-de-eventos", "baja", path, line_of(text, m.start()), f"type {m.group(1)}; no hay tipos unión de eventos")
    for m in NEXT_ID_RE.finditer(text):
        add("repositorio-genera-ids", "media", path, line_of(text, m.start()), "nextId(); el id sale de <Agregado>Id.generate()")

    if zone in (domain_dir, "application"):
        for m in INFRASTRUCTURE_API_RE.finditer(text):
            add("capa-interior-usa-api-de-infraestructura", "alta", path, line_of(text, m.start()), m.group(1))
            break

    if zone == "application":
        for mod, idx in imports:
            if ARCHI_OUTER_LAYER_RE.search(f"'{mod}'") and mod.endswith("/infrastructure"):
                add("aplicacion-importa-infraestructura-del-paquete", "alta", path, line_of(text, idx), f"importa '{mod}'")
            elif mod.startswith(".") and re.search(r"/(infrastructure|interfaces)(/|$)", mod):
                add("aplicacion-importa-capa-exterior", "alta", path, line_of(text, idx), f"importa '{mod}'")
        pattern_folders = sorted(folders & PATTERN_FOLDERS)
        if pattern_folders:
            add("carpeta-de-aplicacion-por-patron", "baja", path, 1,
                f"{pattern_folders[0]}/; una carpeta por acción de negocio")

        is_use_case = bool(extends & {"UseCase", "EventListener"})
        if is_use_case:
            for mod, idx in imports:
                target = import_target(path, mod)
                if target is not None and target.resolve() in use_case_files and target.resolve() != path.resolve():
                    add("caso-de-uso-usa-otro-caso-de-uso", "alta", path, line_of(text, idx), f"importa '{mod}'")
        for name, base, start in classes:
            if base == "UseCase":
                if CRUD_USE_CASE_RE.match(name):
                    add("caso-de-uso-con-nombre-tecnico", "baja", path, line_of(text, start),
                        f"{name}; nómbralo con la acción de negocio")
                if EXECUTE_CALL_RE.search(text, start):
                    add("caso-de-uso-usa-otro-caso-de-uso", "alta", path, line_of(text, start),
                        f"{name} llama a execute()")
            if base == "EventListener":
                previous = max((other for _, _, other in classes if other < start), default=0)
                decorator = None
                for d in LISTENS_TO_RE.finditer(text, previous, start):
                    decorator = d
                consumer = CONSUMER_RE.search(decorator.group(2) or "") if decorator else None
                if decorator is None or consumer is None:
                    add("reaccion-sin-listens-to", "media", path, line_of(text, start),
                        f"{name}; falta @ListensTo(Evento, {{ consumer }})")
                elif in_context and consumer.group(1) != f"{ctx}.{path.stem}":
                    add("consumer-fuera-de-convencion", "baja", path, line_of(text, decorator.start()),
                        f"'{consumer.group(1)}'; usa '{ctx}.{path.stem}'")
                m = REACTION_ERROR_RE.search(text, start)
                if m:
                    add("reaccion-lanza-error-de-usuario", "media", path, line_of(text, m.start()),
                        f"{m.group(1)}; una reacción vuelve en silencio")

    if zone == "infrastructure":
        for m in ADAPTER_REPOSITORY_RE.finditer(text):
            add("adaptador-no-extiende-repositorio", "media", path, line_of(text, m.start()),
                f"{m.group(1)}; extiende el repositorio abstracto de su agregado")
    if in_context and RAW_INDEXEDDB_RE.search(text):
        m = RAW_INDEXEDDB_RE.search(text)
        add("indexeddb-sin-indexed-db-table", "media", path, line_of(text, m.start()),
            f"{m.group(0)}; IndexedDB solo a través de IndexedDbDatabase e IndexedDbSchema")

    if zone == "interfaces":
        for m in CATCH_RE.finditer(text):
            add("punto-de-entrada-captura-errores", "baja", path, line_of(text, m.start()),
                "catch; los errores los traduce el helper de protocolo")
            break
        for mod, idx in imports:
            if mod.startswith(".") and re.search(r"/(infrastructure|domain)(/|$)", mod):
                add("punto-de-entrada-importa-capa-interior", "media", path, line_of(text, idx), f"importa '{mod}'")
    if in_context and not is_composition and re.search(r"(?<![\w.])ExceptionClassifier\b", text):
        m = re.search(r"(?<![\w.])ExceptionClassifier\b", text)
        add("exception-classifier-fuera-del-helper", "media", path, line_of(text, m.start()),
            "solo el helper de protocolo (platform/<protocolo>/) usa ExceptionClassifier")


def scan(root: Path, domain_dir: str):
    findings = []
    stats = defaultdict(int)
    repos = []
    use_case_files = set()
    for path in iter_ts_files(root):
        if zone_of(path, domain_dir) != "application":
            continue
        try:
            head = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if any(m.group(2).split(".")[-1] in ("UseCase", "EventListener") for m in EXTENDS_RE.finditer(head)):
            use_case_files.add(path.resolve())

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
            carries_primitives = domain_location(path, domain_dir)[1] in ("event", "exception") or path.stem.endswith("DomainEvent")
            if not carries_primitives:
                for m in PRIMITIVE_MONEY_RE.finditer(text):
                    add("dinero-como-number", "media", path, line_of(text, m.start()), m.group(0))
                for m in PRIMITIVE_STATUS_RE.finditer(text):
                    add("estado-como-string", "baja", path, line_of(text, m.start()), m.group(0))

        if zone in (domain_dir, "application") and not is_test:
            for m in NEW_DATE_RE.finditer(text):
                add("new-date-en-dominio-o-aplicacion", "media", path, line_of(text, m.start()),
                    "usa new Date(); usa CreatedAt.now() / UpdatedAt.now()")

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
                if target_ctx and target_ctx != ctx and target_ctx != SHARED_KERNEL:
                    add("importacion-entre-contextos", "alta", path, line_of(text, idx), f"{ctx} importa de {target_ctx}")

        if zone == "application" and not is_test:
            for start, end, name in class_spans(text):
                header = LISTENER_CLASS_RE.match(text, start)
                if header and EXECUTE_CALL_RE.search(text, start, end):
                    add("reaccion-llama-a-caso-de-uso", "media", path, line_of(text, start),
                        f"{name} llama a execute(); la reacción es el caso de uso")

        if not is_test:
            for m in CLASS_EVENT_NAME_RE.finditer(text):
                if not EVENT_NAME_FORMAT_RE.match(m.group(1)):
                    add("event-name-fuera-de-convencion", "baja", path, line_of(text, m.start()),
                        f"eventName '{m.group(1)}'; usa '<agregado>.<acción_en_pasado>' en snake_case")

        if not is_test:
            package_rules(add, path, text, zone, ctx, domain_dir, imports, use_case_files)

        for m in SMELLY_NAME_RE.finditer(text):
            add("clase-con-nombre-generico", "baja", path, line_of(text, m.start()), m.group(0))

        for m in REPO_CLASS_RE.finditer(text):
            repos.append((m.group(1), str(path.relative_to(root))))

        multi_save_blocks = []
        if not is_test:
            for start, block in transaction_blocks(text):
                saved = {m.group(1).lower() for m in SAVE_CALL_RE.finditer(block)} - NOT_A_REPOSITORY
                if len(saved) >= 2:
                    multi_save_blocks.append(start)
                    add("varios-agregados-en-una-transaccion", "alta", path, line_of(text, start),
                        f"el mismo bloque transaccional guarda con {sorted(saved)}")

        if zone in (domain_dir, "application") and not is_test:
            m = TRANSACTION_HANDLING_RE.search(text)
            if m is None:
                m = next((TRANSACTION_START_RE.search(text, s) for s, _ in transaction_blocks(text)), None)
            if m is not None:
                rule = "transaccion-en-dominio" if zone == domain_dir else "transaccion-en-aplicacion"
                severity = "alta" if zone == domain_dir else "media"
                add(rule, severity, path, line_of(text, m.start()),
                    f"maneja transacciones ({m.group(0).strip()[:40]}); muévelo al adaptador del repositorio")

        if zone == "application" and not is_test:
            for start, end, name in class_spans(text):
                if any(start <= b < end for b in multi_save_blocks):
                    continue
                saved = {m.group(1).lower() for m in SAVE_CALL_RE.finditer(text, start, end)} - NOT_A_REPOSITORY
                if len(saved) >= 2:
                    add("caso-de-uso-guarda-varios-agregados", "alta", path, line_of(text, start),
                        f"{name} guarda con {sorted(saved)}")

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
