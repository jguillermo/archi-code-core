const path = require('path');

module.exports = {
  rules: {
    'validate-names': {
      create(context) {
        const folderRegex = /^[a-z0-9\-]+$/; // Carpetas: minúsculas y guion medio
        const fileRegex = /^[a-z0-9\-]+(\.[a-z0-9\-]+)?$/; // Archivos: minúsculas, guion medio, y extensiones opcionales

        return {
          Program() {
            const filePath = context.getFilename();
            const fileName = path.basename(filePath); // Nombre del archivo
            const dirName = path.basename(path.dirname(filePath)); // Nombre de la carpeta

            // Validar el nombre del archivo
            if (!fileRegex.test(fileName)) {
              context.report({
                message: `Archivo inválido: "${fileName}". Debe estar en minúsculas, usar guion medio, y opcionalmente tener una extensión.`,
                loc: { line: 1, column: 0 },
              });
            }

            // Validar el nombre de la carpeta
            if (!folderRegex.test(dirName)) {
              context.report({
                message: `Carpeta inválida: "${dirName}". Debe estar en minúsculas y usar guion medio.`,
                loc: { line: 1, column: 0 },
              });
            }
          },
        };
      },
    },
  },
};
