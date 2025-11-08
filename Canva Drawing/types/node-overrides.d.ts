// Type override to suppress NonSharedBuffer deprecation warning
// This is a known issue in @types/node v24.x that will be fixed in future versions
// The warning is cosmetic and doesn't affect runtime behavior

/// <reference types="node" />

// Override to suppress deprecation - NonSharedBuffer is an internal type
declare module "node:buffer" {
    export type NonSharedBuffer = Buffer;
}

