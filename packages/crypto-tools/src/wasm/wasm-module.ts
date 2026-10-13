import { decodeBase64 } from './base64';
import { WASM_BASE64, WASM_GLUE } from './wasm-assets.generated';

let compiled: Promise<WebAssembly.Module> | undefined;

export function wasmGlue(): string {
  return WASM_GLUE;
}

export function compileWasm(): Promise<WebAssembly.Module> {
  compiled ??= WebAssembly.compile(decodeBase64(WASM_BASE64));
  return compiled;
}
