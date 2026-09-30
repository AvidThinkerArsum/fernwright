/// <reference lib="webworker" />
import { linework, type LineworkInput } from "./linework";

type Req = { id: number } & Omit<LineworkInput, "rgba"> & { rgba: ArrayBuffer };

self.onmessage = (e: MessageEvent<Req>) => {
  const { id, rgba, ...rest } = e.data;
  try {
    const out = linework({ ...rest, rgba: new Uint8ClampedArray(rgba) });
    const transfer: Transferable[] = out.roughin ? [out.roughin.buffer as ArrayBuffer] : [];
    (self as unknown as Worker).postMessage({ id, out }, transfer);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String(err) });
  }
};
