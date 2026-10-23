const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const standaloneRoot = path.join(projectRoot, ".next", "standalone");

for (const directory of ["public", path.join(".next", "static")]) {
  const source = path.join(projectRoot, directory);
  if (fs.existsSync(source)) {
    fs.cpSync(source, path.join(standaloneRoot, directory), {
      recursive: true,
      force: true
    });
  }
}
