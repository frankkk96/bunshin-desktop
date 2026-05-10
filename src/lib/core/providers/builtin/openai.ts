import { Provider, ProviderMeta, Request } from '../base'
import { Message, QueryMessage, ResponseMessage } from '@/lib/core/messages/types'
import { ConfigSchema } from '@/lib/core/config/types'
import { ExtensionTool } from '@/lib/core/extensions/types'
import { mediaApi } from '@/lib/tauri/service/media'
import { logger } from '@/lib/core/utils/logger'
import { http } from '@/lib/tauri/system/http'
import { mediaId } from '../../utils/random'
import OpenAI from 'openai'
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions'
import { eventBus } from '../../events/event-bus'
import { ToolCallEventType } from '../../events/tool-call'

// OpenAI 默认配置
const OPENAI_META: ProviderMeta = {
  id: 'openai',
  name: 'OpenAI',
  avatar: 'openai',
}

export class OpenAIProvider extends Provider {
  constructor(meta: ProviderMeta = OPENAI_META) {
    super(meta)
  }

  get helpUrl(): string {
    return 'https://platform.openai.com/apikey'
  }

  get configSchema(): ConfigSchema {
    return {
      apiKey: {
        type: 'string',
        label: 'API Key',
        placeholder: 'sk-...',
        required: true,
        description: 'Your OpenAI API key',
      },
    }
  }

  get baseUrl(): string {
    return 'https://api.openai.com/v1'
  }

  get configured(): boolean {
    return !!this.config.apiKey
  }

  protected get apiKey(): string {
    if (!this.config.apiKey) {
      throw new Error('API key is required')
    }
    return this.config.apiKey as string
  }

  private createClient(): OpenAI {
    return new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
      dangerouslyAllowBrowser: true,
      fetch: http.fetch,
    })
  }

  private getLastQueryMessage(messages: Message[]): QueryMessage | null {
    const lastMessage = [...messages].reverse().find((m) => m.type === 'query')
    return lastMessage?.type === 'query' ? lastMessage : null
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    return btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
    const response = await http.fetch(dataUrl)
    const blob = await response.blob()
    return new File([blob], fileName, { type: blob.type })
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // ============ Generation Methods ============

  private async runImageGeneration(request: Request): Promise<void> {
    let size: '1024x1024' | '1536x1024' | '1024x1536' = '1024x1024'
    let quality: 'auto' | 'high' | 'medium' | 'low' = 'auto'

    const customConfig = request.customConfig
    if (customConfig) {
      size = customConfig.configs.size as typeof size
      quality = customConfig.configs.quality as typeof quality
    }

    const lastMessage = this.getLastQueryMessage(request.messages)
    const prompt = lastMessage?.text || ''

    const client = this.createClient()

    // Check if there's an input image for editing
    let inputImage: File | undefined
    if (lastMessage?.medias?.length) {
      const imageMedia = lastMessage.medias.find((m) => m.media.type === 'image')
      if (imageMedia) {
        const transferResult = await mediaApi.getDataUrl(imageMedia.media)
        if (transferResult.success && transferResult.dataUrl) {
          inputImage = await this.dataUrlToFile(transferResult.dataUrl, imageMedia.media.name)
        }
      }
    }

    let response: OpenAI.Images.ImagesResponse

    if (inputImage) {
      // Use images.edit when there's an input image
      response = await client.images.edit(
        {
          model: request.model,
          image: inputImage,
          prompt,
          n: 1,
          size,
        },
        { signal: request.signal },
      )
    } else {
      // Use images.generate for text-to-image
      response = await client.images.generate(
        {
          model: request.model,
          prompt,
          n: 1,
          size,
          quality,
        },
        { signal: request.signal },
      )
    }

    for (const imageData of response.data ?? []) {
      if (imageData.b64_json) {
        const fileName = `image_${mediaId()}.png`
        const saved = await mediaApi.saveBase64(imageData.b64_json, fileName)

        this.emitChunk(request.context, {
          type: 'media',
          media: {
            localPath: saved.localPath,
            name: fileName,
            type: 'image',
            mimeType: 'image/png',
          },
        })
      }
    }
    request.hooks.onSuccess()
  }

  private async runAudioGeneration(request: Request): Promise<void> {
    type Voice = 'alloy' | 'ash' | 'coral' | 'echo' | 'fable' | 'onyx' | 'nova' | 'sage' | 'shimmer'
    type AudioFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm'

    let voice: Voice = 'alloy'
    let speed = 1.0
    let responseFormat: AudioFormat = 'mp3'

    const customConfig = request.customConfig
    if (customConfig) {
      if (customConfig.configs.voice) voice = customConfig.configs.voice as Voice
      if (customConfig.configs.speed) speed = Number(customConfig.configs.speed) || 1.0
      if (customConfig.configs.response_format)
        responseFormat = customConfig.configs.response_format as AudioFormat
    }

    const lastMessage = this.getLastQueryMessage(request.messages)
    const input = lastMessage?.text || ''

    if (!input) {
      throw new Error('No text provided for TTS')
    }

    const client = this.createClient()

    // gpt-4o-mini-tts supports instructions, tts-1/tts-1-hd don't
    const isAdvancedTTS = request.model === 'gpt-4o-mini-tts'

    const response = await client.audio.speech.create(
      {
        model: request.model,
        voice,
        input,
        speed,
        response_format: responseFormat,
        ...(isAdvancedTTS && request.systemPrompt ? { instructions: request.systemPrompt } : {}),
      },
      { signal: request.signal },
    )

    const base64 = this.arrayBufferToBase64(await response.arrayBuffer())

    const extMap: Record<string, { ext: string; mime: string }> = {
      mp3: { ext: 'mp3', mime: 'audio/mpeg' },
      opus: { ext: 'opus', mime: 'audio/opus' },
      aac: { ext: 'aac', mime: 'audio/aac' },
      flac: { ext: 'flac', mime: 'audio/flac' },
      wav: { ext: 'wav', mime: 'audio/wav' },
      pcm: { ext: 'pcm', mime: 'audio/pcm' },
    }
    const { ext, mime } = extMap[responseFormat] || extMap.mp3

    const fileName = `tts_${mediaId()}.${ext}`
    const saved = await mediaApi.saveBase64(base64, fileName)

    this.emitChunk(request.context, {
      type: 'media',
      media: {
        localPath: saved.localPath,
        name: fileName,
        type: 'audio',
        mimeType: mime,
      },
    })
    request.hooks.onSuccess()
  }

  private async runTranscription(request: Request): Promise<void> {
    const lastMessage = this.getLastQueryMessage(request.messages)
    if (!lastMessage?.medias?.length) {
      throw new Error('No audio file provided for transcription')
    }

    const audioMedia = lastMessage.medias.find((m) => m.media.type === 'audio')
    if (!audioMedia) {
      throw new Error('No audio file found in the message')
    }

    const transferResult = await mediaApi.getDataUrl(audioMedia.media)
    if (!transferResult.success || !transferResult.dataUrl) {
      throw new Error('Failed to get audio file for transcription')
    }

    const audioFile = await this.dataUrlToFile(transferResult.dataUrl, audioMedia.media.name)
    const client = this.createClient()
    const prompt = lastMessage.text || undefined

    const response = await client.audio.transcriptions.create(
      {
        model: request.model,
        file: audioFile,
        ...(prompt ? { prompt } : {}),
      },
      { signal: request.signal },
    )

    this.emitChunk(request.context, {
      type: 'content',
      text: response.text,
    })
    request.hooks.onSuccess()
  }

  private async runVideoGeneration(request: Request): Promise<void> {
    let size: '720x1280' | '1280x720' | '1024x1792' | '1792x1024' = '720x1280'
    let seconds: '4' | '8' | '12' = '4'

    const customConfig = request.customConfig
    if (customConfig) {
      if (customConfig.configs.size) size = customConfig.configs.size as typeof size
      if (customConfig.configs.seconds) seconds = customConfig.configs.seconds as typeof seconds
    }

    const lastMessage = this.getLastQueryMessage(request.messages)
    const prompt = lastMessage?.text || ''

    // Check if there's an input image (for image-to-video)
    let inputImage: File | undefined
    if (lastMessage?.medias?.length) {
      const firstMedia = lastMessage.medias[0]
      if (firstMedia.media.type === 'image') {
        const transferResult = await mediaApi.getDataUrl(firstMedia.media)
        if (transferResult.success && transferResult.dataUrl) {
          inputImage = await this.dataUrlToFile(transferResult.dataUrl, firstMedia.media.name)
        }
      }
    }

    const headers = { Authorization: `Bearer ${this.apiKey}` }

    this.emitChunk(request.context, { type: 'context', text: 'Starting video generation...' })

    // Step 1: Create video generation job
    const formData = new FormData()
    formData.append('model', request.model)
    formData.append('prompt', prompt)
    formData.append('size', size)
    formData.append('seconds', seconds)
    if (inputImage) formData.append('input_reference', inputImage)

    const createResponse = await http.fetch(`${this.baseUrl}/videos`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      throw new Error(`Failed to create video job: HTTP ${createResponse.status} - ${errorText}`)
    }

    const { id: videoId } = (await createResponse.json()) as { id: string }
    this.emitChunk(request.context, { type: 'context', text: `Video job created: ${videoId}` })

    // Step 2: Poll for completion
    const pollInterval = 2000
    const maxPolls = 900 // 30 minutes

    for (let i = 0; i < maxPolls; i++) {
      await this.sleep(pollInterval)

      const statusResponse = await fetch(`${this.baseUrl}/videos/${videoId}`, { headers })
      if (!statusResponse.ok) continue

      const statusResult = (await statusResponse.json()) as {
        status: string
        progress?: number
        error?: { message: string }
      }

      switch (statusResult.status) {
        case 'completed': {
          this.emitChunk(request.context, { type: 'context', text: 'Video generation completed!' })

          const videoResponse = await http.fetch(`${this.baseUrl}/videos/${videoId}/content`, {
            headers,
          })
          if (!videoResponse.ok) {
            throw new Error(`Failed to download video: HTTP ${videoResponse.status}`)
          }

          const base64 = await this.blobToBase64(await videoResponse.blob())
          const fileName = `video_${mediaId()}.mp4`
          const saved = await mediaApi.saveBase64(base64, fileName)

          this.emitChunk(request.context, {
            type: 'media',
            media: {
              localPath: saved.localPath,
              name: fileName,
              type: 'video',
              mimeType: 'video/mp4',
            },
          })
          request.hooks.onSuccess()
          return
        }

        case 'failed':
          throw new Error(`Video generation failed: ${statusResult.error?.message || 'Unknown'}`)

        case 'queued':
        case 'in_progress':
          if (i % 15 === 0) {
            this.emitChunk(request.context, {
              type: 'context',
              text: `Video generating... (${statusResult.progress || 0}%)`,
            })
          }
          break
      }
    }

    throw new Error('Video generation timed out after 30 minutes')
  }

  // ============ Chat Completion Methods ============

  private async runChatCompletion(request: Request): Promise<void> {
    let hasToolCall = false

    const client = this.createClient()
    const messages = await this.buildChatMessages(request.systemPrompt, request.messages)
    const tools = this.buildChatTools(request.tools)

    const stream = await client.chat.completions.create(
      {
        model: request.model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        stream: true,
      },
      { signal: request.signal },
    )

    const toolCallAccumulator = new Map<number, { id: string; name: string; arguments: string }>()

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta
      if (!delta) continue

      if (delta.content) {
        this.emitChunk(request.context, { type: 'content.delta', delta: delta.content })
      }

      if (delta.tool_calls) {
        hasToolCall = true
        for (const tc of delta.tool_calls) {
          const index = tc.index
          if (!toolCallAccumulator.has(index)) {
            toolCallAccumulator.set(index, {
              id: tc.id || '',
              name: tc.function?.name || '',
              arguments: tc.function?.arguments || '',
            })
          } else {
            const existing = toolCallAccumulator.get(index)!
            if (tc.id) existing.id = tc.id
            if (tc.function?.name) existing.name += tc.function.name
            if (tc.function?.arguments) existing.arguments += tc.function.arguments
          }
        }
      }
    }

    toolCallAccumulator.forEach((tc) => {
      eventBus.emit(ToolCallEventType.ToolCallPending, {
        metadata: request.context,
        tc: { id: tc.id, function: { name: tc.name, arguments: tc.arguments } },
      })
    })

    if (hasToolCall) {
      request.hooks.onPendingApproval()
    } else {
      request.hooks.onSuccess()
    }
  }

  private async runResponse(request: Request): Promise<void> {
    let hasToolCall = false

    const client = this.createClient()
    const input = await this.buildResponseInput(request.systemPrompt, request.messages)
    const tools = this.buildResponseTools(request.tools)

    const response = await client.responses.create(
      {
        model: request.model,
        input,
        tools: tools.length > 0 ? tools : undefined,
      },
      { signal: request.signal },
    )

    const text = this.extractTextFromResponse(response)
    if (text) {
      this.emitChunk(request.context, { type: 'content', text })
    }

    if (response.output) {
      for (const item of response.output) {
        if (item.type === 'function_call') {
          eventBus.emit(ToolCallEventType.ToolCallPending, {
            metadata: request.context,
            tc: { id: item.call_id, function: { name: item.name, arguments: item.arguments } },
          })
          hasToolCall = true
        }
      }
    }

    if (hasToolCall) {
      request.hooks.onPendingApproval()
    } else {
      request.hooks.onSuccess()
    }
  }

  // ============ Message Building Methods ============

  private async buildChatMessages(
    systemPrompt: string | undefined,
    messages: Message[],
  ): Promise<ChatCompletionMessageParam[]> {
    const result: ChatCompletionMessageParam[] = []

    if (systemPrompt?.trim()) {
      result.push({ role: 'system', content: systemPrompt })
    }

    for (const message of messages) {
      if (message.type === 'query') {
        const query = message as QueryMessage
        const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = []
        for (const media of query.medias) {
          if (media.media.type === 'image') {
            const transferResult = await mediaApi.getDataUrl(media.media)
            if (transferResult.success && transferResult.dataUrl) {
              content.push({ type: 'image_url', image_url: { url: transferResult.dataUrl } })
            }
          }
          if (media.media.type === 'audio') {
            const transferResult = await mediaApi.getDataUrl(media.media)
            if (transferResult.success && transferResult.dataUrl) {
              const format = media.media.mimeType === 'audio/wav' ? 'wav' : 'mp3'
              content.push({
                type: 'input_audio',
                input_audio: { data: transferResult.dataUrl, format },
              })
            }
          }
          if (media.media.type === 'pdf') {
            const transferResult = await mediaApi.getDataUrl(media.media)
            if (transferResult.success && transferResult.dataUrl) {
              content.push({
                type: 'file',
                file: { file_data: transferResult.dataUrl, filename: media.media.name },
              } as OpenAI.Chat.Completions.ChatCompletionContentPart.File)
            }
          }
        }
        content.push({ type: 'text', text: query.text || ' ' })
        result.push({ role: 'user', content })
      } else if (message.type === 'response') {
        const response = message as ResponseMessage
        for (const item of response.data) {
          switch (item.type) {
            case 'content':
              if (item.content) result.push({ role: 'assistant', content: item.content })
              break
            case 'media':
              result.push({
                role: 'assistant',
                content: `[Media: ${JSON.stringify(item.media)}]`,
              })
              break
            case 'tool_call':
              result.push({
                role: 'assistant',
                content: ' ',
                tool_calls: [
                  {
                    id: item.tc.id,
                    type: 'function',
                    function: {
                      name: item.tc.function.name,
                      arguments: item.tc.function.arguments,
                    },
                  },
                ],
              })
              result.push({ role: 'tool', tool_call_id: item.tc.id, content: item.text || ' ' })
              break
          }
        }
      }
    }

    return result
  }

  private buildChatTools(tools: ExtensionTool[]): ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: `mcp_${tool.extensionId}_${tool.name}`,
        description: tool.description || `Tool from ${tool.extensionName}`,
        parameters: tool.inputSchema || { type: 'object', properties: {} },
      },
    }))
  }

  private async buildResponseInput(
    systemPrompt: string | undefined,
    messages: Message[],
  ): Promise<OpenAI.Responses.ResponseInputItem[]> {
    const items: OpenAI.Responses.ResponseInputItem[] = []

    if (systemPrompt?.trim()) {
      items.push({ role: 'system', content: systemPrompt })
    }

    for (const message of messages) {
      if (message.type === 'query') {
        const query = message as QueryMessage
        const content: OpenAI.Responses.ResponseInputContent[] = []
        for (const media of query.medias) {
          if (media.media.type === 'image') {
            const transferResult = await mediaApi.getDataUrl(media.media)
            if (transferResult.success && transferResult.dataUrl) {
              content.push({
                type: 'input_image',
                image_url: transferResult.dataUrl,
                detail: 'auto',
              })
            }
          }
          if (media.media.type === 'audio') {
            const transferResult = await mediaApi.getDataUrl(media.media)
            if (transferResult.success && transferResult.dataUrl) {
              content.push({
                type: 'input_file',
                file_data: transferResult.dataUrl,
                filename: media.media.name,
              })
            }
          }
          if (media.media.type === 'pdf') {
            const transferResult = await mediaApi.getDataUrl(media.media)
            if (transferResult.success && transferResult.dataUrl) {
              content.push({
                type: 'input_file',
                file_data: transferResult.dataUrl,
                filename: media.media.name,
              })
            }
          }
        }
        content.push({ type: 'input_text', text: query.text || ' ' })
        items.push({ role: 'user', content })
      } else if (message.type === 'response') {
        const response = message as ResponseMessage
        for (const item of response.data) {
          switch (item.type) {
            case 'content':
              if (item.content) items.push({ role: 'assistant', content: item.content })
              break
            case 'media':
              items.push({
                role: 'assistant',
                content: `[Media: ${JSON.stringify(item.media)}]`,
              })
              break
            case 'tool_call':
              items.push({
                type: 'function_call',
                call_id: item.tc.id,
                name: item.tc.function.name,
                arguments: item.tc.function.arguments,
              })
              items.push({
                type: 'function_call_output',
                call_id: item.tc.id,
                output: item.text || ' ',
              })
              break
          }
        }
      }
    }

    return items
  }

  private buildResponseTools(tools: ExtensionTool[]): OpenAI.Responses.Tool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      name: `mcp_${tool.extensionId}_${tool.name}`,
      description: tool.description || `Tool from ${tool.extensionName}`,
      parameters: tool.inputSchema || { type: 'object', properties: {} },
      strict: false,
    }))
  }

  private extractTextFromResponse(response: OpenAI.Responses.Response): string {
    const texts: string[] = []
    if (response.output) {
      for (const item of response.output) {
        if (item.type === 'message' && item.content) {
          for (const contentItem of item.content) {
            if (contentItem.type === 'output_text' && contentItem.text) {
              texts.push(contentItem.text)
            }
          }
        }
      }
    }
    return texts.join('')
  }

  public async run(request: Request): Promise<void> {
    await this.ready

    // Image generation models
    if (request.model === 'gpt-image-1' || request.model === 'gpt-image-1-mini') {
      return this.runImageGeneration(request)
    }

    // Video generation models (Sora)
    if (request.model === 'sora-2' || request.model === 'sora-2-pro') {
      return this.runVideoGeneration(request)
    }

    // TTS models
    if (['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts'].includes(request.model)) {
      return this.runAudioGeneration(request)
    }

    // Transcription models (STT)
    if (['whisper-1', 'gpt-4o-transcribe', 'gpt-4o-mini-transcribe'].includes(request.model)) {
      return this.runTranscription(request)
    }

    // Default: chat/completions API, fallback to responses API
    try {
      return await this.runChatCompletion(request)
    } catch (completionError) {
      logger.warn(`chat/completions failed, trying responses API: ${completionError}`)
      try {
        return await this.runResponse(request)
      } catch {
        throw completionError
      }
    }
  }
}
