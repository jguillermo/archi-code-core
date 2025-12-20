export class ProviderFactory {
  private static targetClass?: new (...args: any[]) => any; // <-- Aquí permitimos `undefined`

  /**
   * Defines the target class for the provider.
   * @param targetClass - The class to be provided as a provider
   * @returns The `ProviderFactory` itself to allow method chaining
   */
  static forClass<T>(targetClass: new (...args: any[]) => T): typeof ProviderFactory {
    this.targetClass = targetClass;
    return this;
  }

  /**
   * Defines the dependencies required for the target class.
   * @param deps - List of dependencies
   * @returns A `Provider` object ready to be registered in NestJS
   */
  // static withDependencies(deps: any[]): Provider {
  //   if (!this.targetClass) {
  //     throw new Error(
  //       `ProviderFactory Error: Target class must be set before defining dependencies.`,
  //     );
  //   }
  //
  //   const provider: Provider = {
  //     provide: this.targetClass,
  //     useFactory: (...resolvedDeps: any[]) => {
  //       // Validate if any dependency is undefined
  //       const missingDepsIndexes = resolvedDeps
  //         .map((dep, index) => (dep === undefined ? index : null))
  //         .filter((index) => index !== null);
  //
  //       if (missingDepsIndexes.length > 0) {
  //         const missingDeps = missingDepsIndexes.map(
  //           (index) => deps[index]?.name || `Dependency ${index + 1}`,
  //         );
  //         throw new Error(
  //           `ProviderFactory Error: Missing dependencies for ${this.targetClass.name}. Ensure the following dependencies are registered: ${missingDeps.join(
  //             ', ',
  //           )}`,
  //         );
  //       }
  //
  //       return new this.targetClass(...resolvedDeps);
  //     },
  //     inject: deps,
  //   };
  //
  //   // Reset static properties for future calls
  //   this.reset();
  //
  //   return provider;
  // }

  /**
   * Resets the static properties after generating the provider.
   */
  private static reset(): void {
    this.targetClass = undefined;
  }
}
