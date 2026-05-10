import { extensionId } from '@/lib/core/utils/random'
import { BraveSearchBuilder } from './builtins/brave-search'
import { ChromeDevToolsBuilder } from './builtins/chrome-devtools'
import { ElevenLabsBuilder } from './builtins/eleven-labs'
import { FileSystemBuilder } from './builtins/file-system'
import { FirecrawlBuilder } from './builtins/firecrawl'
import { NotionBuilder } from './builtins/notion'
import { ReplicateBuilder } from './builtins/replicate'
import { MCPServerConfigType } from '../types'
import { CustomStdioMCPServerBuilder } from './custom-stdio'
import { CustomHttpMCPServerBuilder } from './custom-http'

export function getBuiltinMCPServerBuilders() {
  return [
    new BraveSearchBuilder({ id: extensionId() }),
    new FileSystemBuilder({ id: extensionId() }),
    new FirecrawlBuilder({ id: extensionId() }),
    new ChromeDevToolsBuilder({ id: extensionId() }),
    new NotionBuilder({ id: extensionId() }),
    new ElevenLabsBuilder({ id: extensionId() }),
    new ReplicateBuilder({ id: extensionId() }),
  ]
}

export function getBuilderByType(id: string, type: MCPServerConfigType) {
  switch (type) {
    case 'brave-search':
      return new BraveSearchBuilder({ id: id })
    case 'file-system':
      return new FileSystemBuilder({ id: id })
    case 'firecrawl':
      return new FirecrawlBuilder({ id: id })
    case 'chrome-devtools':
      return new ChromeDevToolsBuilder({ id: id })
    case 'notion':
      return new NotionBuilder({ id: id })
    case 'eleven-labs':
      return new ElevenLabsBuilder({ id: id })
    case 'replicate':
      return new ReplicateBuilder({ id: id })
    case 'custom-stdio':
      return new CustomStdioMCPServerBuilder({ id: id })
    case 'custom-http':
      return new CustomHttpMCPServerBuilder({ id: id })
    default:
      throw new Error(`Unknown server type: ${id}`)
  }
}
