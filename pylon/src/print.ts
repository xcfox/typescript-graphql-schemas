import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sourcePath = join(__dirname, '../.pylon/schema.graphql')
const targetPath = join(__dirname, '../schema.graphql')

const schemaContent = readFileSync(sourcePath, 'utf-8')
writeFileSync(targetPath, schemaContent)
console.log(`Schema printed to ${targetPath}`)

