import { realpathSync, statSync } from "node:fs";
import path from "node:path";
import { findProjectRoot, getFileSearchPaths } from "./config";

// Resolve symlinks before checking containment; an absolute path is not permission.
export function findMediaFile(
  fileName: string,
  roots = getFileSearchPaths()
): string | null {
  const projectRoot = findProjectRoot();
  for (const root of roots) {
    try {
      const allowed = realpathSync(root);
      const candidates = path.isAbsolute(fileName)
        ? [fileName]
        : [
            path.resolve(root, fileName),
            path.resolve(projectRoot, fileName),
            path.resolve(projectRoot, "univa", fileName),
          ];
      for (const candidate of candidates) {
        try {
          const actual = realpathSync(candidate);
          const relative = path.relative(allowed, actual);
          if (
            relative === ".." ||
            relative.startsWith(`..${path.sep}`) ||
            path.isAbsolute(relative)
          )
            continue;
          if (statSync(actual).isFile()) return actual;
        } catch {
          /* Missing candidate; try the next supported path form. */
        }
      }
    } catch {
      /* Output directories may not exist before first generation. */
    }
  }
  return null;
}
