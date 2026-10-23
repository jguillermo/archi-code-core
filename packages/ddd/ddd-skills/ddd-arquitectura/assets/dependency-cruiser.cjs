/**
 * Reglas de dependencia DDD para dependency-cruiser, adaptadas a @archi-code/ddd.
 * Uso: npx depcruise src --config .dependency-cruiser.cjs
 * Funciona con src/contexts/<contexto>/ y con src/app/contexts/<contexto>/ (proyectos con la lógica en src/app/).
 * Probado con dependency-cruiser 16.10.0 y TypeScript 5.6, con un paquete simulado que expone
 * @archi-code/ddd/{domain,application,infrastructure}. Si la estructura publicada del
 * paquete difiere, ajusta ARCHI_LAYER.
 * Cada subpath exporta las excepciones de su capa: cada capa importa solo el subpath de su capa y
 * los interiores (domain → /domain; application → /domain y /application; infraestructura → todos).
 */
// Grupo no capturante para app/: así $1 en las reglas es siempre el nombre del contexto.
const CTX = '^src/(?:app/)?contexts/([^/]+)/';
// Ruta resuelta de un punto de entrada del paquete: node_modules/@archi-code/ddd/<...>/<capa>/...
const ARCHI_LAYER = (layers) => `node_modules/@archi-code/ddd/.*(?:${layers})[/.]`;

module.exports = {
  forbidden: [
    {
      name: 'domain-solo-paquetes-permitidos',
      comment:
        'El dominio solo usa @archi-code/ddd/domain (también sus excepciones) y @archi-code/validation; nada más de npm.',
      severity: 'error',
      from: { path: CTX + 'domain/' },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer'],
        pathNot: ['node_modules/@archi-code/(?:ddd|validation)/'],
      },
    },
    {
      name: 'domain-sin-capas-exteriores-del-paquete',
      comment:
        'El dominio nunca importa @archi-code/ddd/application ni @archi-code/ddd/infrastructure ' +
        '(tampoco sus excepciones).',
      severity: 'error',
      from: { path: CTX + 'domain/' },
      to: { path: ARCHI_LAYER('application|infrastructure') },
    },
    {
      name: 'domain-no-mira-afuera',
      severity: 'error',
      from: { path: CTX + 'domain/' },
      to: { path: CTX + '(?:application|infrastructure|interfaces)/' },
    },
    {
      name: 'application-sin-infraestructura',
      comment:
        'La aplicación no conoce adaptadores propios ni @archi-code/ddd/infrastructure ' +
        '(tampoco InternalErrorException; un error ajeno lo envuelve UseCase en UnexpectedErrorException).',
      severity: 'error',
      from: { path: CTX + 'application/' },
      to: { path: [CTX + '(?:infrastructure|interfaces)/', ARCHI_LAYER('infrastructure')] },
    },
    {
      name: 'interfaces-no-saltan-a-infraestructura',
      comment:
        'Los puntos de entrada llaman a casos de uso; no importan repositorios ni adaptadores propios. ' +
        'De @archi-code/ddd/infrastructure solo usan ExceptionClassifier y ExceptionKind para traducir ' +
        'los errores (dependency-cruiser no distingue nombres importados: revísalo en la revisión de código).',
      severity: 'error',
      from: { path: CTX + 'interfaces/' },
      to: { path: CTX + 'infrastructure/' },
    },
    {
      name: 'nadie-importa-composition',
      comment: 'El composition root construye y conecta todo; ninguna capa lo importa.',
      severity: 'error',
      from: { path: CTX },
      to: { path: CTX + 'composition\\.ts$' },
    },
    {
      name: 'contextos-aislados',
      comment: 'Un contexto no importa código de otro. Se integra por API, mensajes o shared-kernel acordado.',
      severity: 'error',
      from: { path: '^src/(?:app/)?contexts/([^/]+)/' },
      to: {
        path: '^src/(?:app/)?contexts/',
        pathNot: '^src/(?:app/)?contexts/$1/', // $1 = contexto del fichero de origen
      },
    },
    {
      name: 'sin-ciclos',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    // Imprescindible en TypeScript: sin esto se ignoran los imports usados solo como tipos
    // (import type { AggregateSaver } ...), y un dominio que importa un tipo prohibido pasaría.
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
    // Resolver los subpaths del campo "exports" del paquete (@archi-code/ddd/domain, etc.).
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
  },
};
