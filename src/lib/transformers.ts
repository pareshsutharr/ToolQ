export async function loadTransformersPipeline() {
  const { pipeline, env } = await import("@huggingface/transformers");
  // Multi-threaded WASM needs crossOriginIsolated headers we don't set, and
  // the worker-proxied fallback path has been observed to hang silently in
  // some browser/bundler combinations — run single-threaded, in-thread.
  if (env.backends.onnx.wasm) {
    env.backends.onnx.wasm.numThreads = 1;
    env.backends.onnx.wasm.proxy = false;
  }
  return pipeline;
}
