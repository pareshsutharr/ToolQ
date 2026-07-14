// OCR module barrel. Importing this registers the built-in Tesseract provider
// (via ./builtins) so it is available from the registry without callers having
// to wire it up.

import "./builtins";

export * from "./provider";
export * from "./map";
export * from "./run";
