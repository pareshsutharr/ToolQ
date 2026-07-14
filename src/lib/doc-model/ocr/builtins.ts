// Side-effect module that registers the built-in OCR providers. Anything that
// runs OCR imports this for its side effect, so the default provider is always
// in the registry regardless of how the bundler tree-shakes the barrel exports.

import { registerOcrProvider } from "./provider";
import { tesseractFactory } from "./tesseract";

registerOcrProvider(tesseractFactory);
