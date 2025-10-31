import { promises as fs } from "fs"
import path from "path"

async function resolvePaths() {
  const cwd = process.cwd()
  const sourceDir = path.join(cwd, "registry/default/ui")
  // From apps/ui → ../../packages/ui/src/ui
  const targetDir = path.resolve(cwd, "../../packages/ui/src/ui")
  return { sourceDir, targetDir }
}

async function ensureDirExists(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

async function copyUiPrimitives() {
  const { sourceDir, targetDir } = await resolvePaths()

  // Validate source exists
  try {
    await fs.access(sourceDir)
  } catch {
    throw new Error(`Source directory not found: ${sourceDir}`)
  }

  // Ensure target directory exists
  await ensureDirExists(targetDir)

  // Copy and overwrite files (do not delete extras in target)
  await fs.cp(sourceDir, targetDir, { recursive: true, force: true })
}

async function getAllFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        return getAllFiles(fullPath)
      }
      return [fullPath]
    })
  )
  return files.flat()
}

function rewriteImports(code: string): string {
  let result = code
  // Rewrite paths according to rules
  // "@/lib/*"        → "@coss/ui/lib/*"
  // "@/hooks/*"      → "@coss/ui/hooks/*"
  // "@/registry/default/ui/*" → "@coss/ui/ui/*"
  result = result.replace(/(["'])@\/lib\//g, "$1@workspace/ui/lib/")
  result = result.replace(/(["'])@\/hooks\//g, "$1@workspace/ui/hooks/")
  result = result.replace(
    /(["'])@\/registry\/default\/ui\//g,
    "$1@workspace/ui/ui/"
  )
  return result
}

async function rewriteImportsInDir(dir: string): Promise<{ updated: number }> {
  const allFiles = await getAllFiles(dir)
  let updated = 0
  for (const file of allFiles) {
    if (!/(\.tsx|\.ts|\.mts|\.cts)$/.test(file)) continue
    const original = await fs.readFile(file, "utf8")
    const transformed = rewriteImports(original)
    if (transformed !== original) {
      await fs.writeFile(file, transformed)
      updated++
    }
  }
  return { updated }
}

try {
  console.log("📦 Propagating UI primitives → packages/ui/src/ui …")
  const { sourceDir, targetDir } = await resolvePaths()
  console.log(`├─ Source: ${sourceDir}`)
  console.log(`└─ Target: ${targetDir}`)

  await copyUiPrimitives()
  const { updated } = await rewriteImportsInDir(targetDir)

  console.log(
    `✅ UI primitives propagated successfully! (${updated} file(s) updated with rewritten imports)`
  )
} catch (error) {
  console.error(error)
  process.exit(1)
}


