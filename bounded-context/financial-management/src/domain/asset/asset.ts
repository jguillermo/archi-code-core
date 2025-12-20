import { AssetId } from './types/asset-id';
import { AssetName } from './types/asset-name';
import { AssetAcquisitionValue } from './types/asset-acquisition-value';
import { AssetAcquisitionDate } from './types/asset-acquisition-date';
import { AssetUsefulLife } from './types/asset-useful-life';
import { AssetDepreciationMethod } from './types/asset-depreciation-method';
import { AssetResidualValue } from './types/asset-residual-value';
import { AssetAssociatedCosts } from './types/asset-associated-costs';
import { AssetLastDepreciationDate } from './types/asset-last-depreciation-date';
import { AssetTypes } from './asset.types';

/*
 * Gestiona los activos financieros o tangibles de la entidad,
 * como propiedades, vehículos, o inversiones.
 * Incluye funcionalidades para calcular depreciaciones y asociar costos adicionales.
 * Este Aggregate permite gestionar y evaluar el valor de los activos en los reportes financieros,
 * asegurando que los cálculos sean precisos y consistentes con las reglas del dominio.
 */
export class Asset {
  constructor(
    private readonly id: AssetId, // Nivel 1: Identificador único del activo
    private readonly name: AssetName, // Nivel 1: Nombre descriptivo del activo
    private readonly acquisitionDate: AssetAcquisitionDate, // Nivel 1: Fecha de adquisición del activo
    private readonly acquisitionValue: AssetAcquisitionValue, // Nivel 1: Valor inicial del activo.
    private readonly usefulLife: AssetUsefulLife, // Nivel 2: Vida útil estimada en años.
    private readonly depreciationMethod: AssetDepreciationMethod, // Nivel 2: Método utilizado para calcular la depreciación (ej: "lineal", "saldoDecreciente")
    private readonly residualValue: AssetResidualValue, // Nivel 2: Valor estimado al final de la vida útil.
    private associatedCosts: AssetAssociatedCosts, // Nivel 3: Costos relacionados como seguros o mantenimiento.
    private lastDepreciationDate: AssetLastDepreciationDate, // Nivel 3: Fecha de la última depreciación
  ) {}

  static create(data: AssetTypes): Asset {
    return new Asset(
      data.id,
      data.name,
      data.acquisitionDate,
      data.acquisitionValue,
      data.usefulLife,
      data.depreciationMethod,
      data.residualValue,
      data.associatedCosts,
      data.lastDepreciationDate,
    );
  }

  /*
   * Calcula el monto anual de depreciación basado en el método y la vida útil.
   */
  calculateAnnualDepreciation(): number {
    return (this.acquisitionValue.value - this.residualValue.value) / this.usefulLife.value;
  }

  /*
   * Actualiza la información del activo con la última fecha de depreciación.
   */
  registerDepreciation(): void {
    this.lastDepreciationDate = new AssetLastDepreciationDate(new Date());
  }

  /*
   * Registra un costo relacionado con el activo.
   */
  addAssociatedCosts(cost: number): void {
    this.associatedCosts = new AssetAssociatedCosts(this.associatedCosts.value + cost);
  }
}
