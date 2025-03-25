import { Buffer } from "buffer";
export let process = require("process/browser")
globalThis.Buffer = Buffer;