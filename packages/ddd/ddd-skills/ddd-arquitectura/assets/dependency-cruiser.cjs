/**
 * Reglas de dependencia DDD para dependency-cruiser.
 * Uso: npx depcruise src --config .dependency-cruiser.cjs
 * Probado con dependency-cruiser 16.10.0 y TypeScript 5.6.
 * Acepta src/contexts y src/app/contexts; ajusta las rutas si el proyecto usa otra carpeta.
 */
// Grupo no capturante para app/: así $1 en las reglas es siempre el nombre del contexto.
const CTX = '^src/(?:app/)?contexts/([^/]+)/';
// [Fuera de los libros: convención de @archi-code/ddd] El dominio solo importa sus módulos domain y exceptions y @archi-code/validation; la aplicación, además, application; ninguno de los dos importa infrastructure.
const ARCHI_CODE_DDD = 'node_modules/@archi-code/ddd/dist/(cjs|esm)/';

module.exports = {
  forbidden: [
    {
      name: 'domain-sin-dependencias-externas',
      comment: 'El dominio no depende de paquetes de npm (salvo los permitidos) ni de otras zonas.',
      severity: 'error',
      from: { path: CTX + 'domain/' },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer'],
        pathNot: [
          'node_modules/(uuid|decimal\\.js)/',
          ARCHI_CODE_DDD + '(domain|exceptions)/',
          'node_modules/@archi-code/validation/',
        ],
      },
    },
    {
      name: 'domain-no-mira-afuera',
      severity: 'error',
      from: { path: CTX + 'domain/' },
      to: { path: CTX + '(application|infrastructure|interfaces)/' },
    },
    {
      name: 'application-no-conoce-adaptadores',
      severity: 'error',
      from: { path: CTX + 'application/' },
      to: { path: CTX + '(infrastructure|interfaces)/' },
    },
    {
      name: 'archi-code-ddd-infraestructura-fuera-del-nucleo',
      comment: 'Con @archi-code/ddd, ni el dominio ni la aplicación importan su módulo infrastructure; eso lo cablea el composition root.',
      severity: 'error',
      from: { path: CTX + '(domain|application)/' },
      to: { path: ARCHI_CODE_DDD + 'infrastructure/' },
    },
    {
      name: 'nadie-importa-el-composition-root',
      comment: 'Con @archi-code/ddd, composition.ts solo lo importa el arranque del proceso, nunca una capa.',
      severity: 'error',
      from: { path: CTX + '(domain|application|infrastructure|interfaces)/' },
      to: { path: '^src/(?:app/)?contexts/[^/]+/composition\\.[cm]?[jt]s$' },
    },
    {
      name: 'interfaces-no-saltan-a-infraestructura',
      comment: 'Los controladores usan casos de uso, no repositorios concretos.',
      severity: 'error',
      from: { path: CTX + 'interfaces/' },
      to: { path: CTX + 'infrastructure/' },
    },
    {
      name: 'contextos-aislados',
      comment: 'Un contexto no importa código de otro. Se integra por API, mensajes o shared-kernel acordado.',
      severity: 'error',
      from: { path: '^src/(?:app/)?contexts/([^/]+)/' },
      to: {
        path: '^src/(?:app/)?contexts/',
        pathNot: '^src/(?:app/)?contexts/$1/',   // $1 = contexto del fichero de origen
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
    // Imprescindible en TypeScript: sin esto se ignoran los imports usados solo como tipos,
    // y un dominio que importa un tipo de infraestructura pasaría la comprobación.
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
  },
};
