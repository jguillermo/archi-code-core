import { decodeBase64 } from './base64';
import { WASM_GLUE, WASM_GZIP_BASE64 } from './wasm-assets.generated';

let compiled: Promise<WebAssembly.Module> | undefined;

export function wasmGlue(): string {
  return WASM_GLUE;
}

async function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
  const compressed = new Response(bytes).body as ReadableStream<BufferSource>;
  return new Response(compressed.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}

export function compileWasm(): Promise<WebAssembly.Module> {
  compiled ??= gunzip(decodeBase64(WASM_GZIP_BASE64))
    .then((bytes) => WebAssembly.compile(bytes))
    .catch((error: unknown) => {
      compiled = undefined;
      throw error;
    });
  return compiled;
}
