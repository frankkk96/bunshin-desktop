import { GoogleGenAI, Content, Part, FunctionDeclaration, PersonGeneration } from '@google/genai'
import { ConfigSchema } from '../../config/types'
import { Provider, ProviderMeta, Request } from '../base'
import { Message, QueryMessage, ResponseMessage } from '@/lib/core/messages/types'
import { ExtensionTool } from '@/lib/core/extensions/types'
import { mediaApi } from '@/lib/tauri/service/media'
import { mediaId } from '../../utils/random'
import { eventBus } from '../../events/event-bus'
import { ToolCallEventType } from '../../events/tool-call'

// Google 默认配置
const GOOGLE_META: ProviderMeta = {
  id: 'google',
  name: 'Google',
  avatar: 'gemini',
}

// TODO: 测试图片的时候限流了，换api key重新试试
export class GoogleProvider extends Provider {
  constructor(meta: ProviderMeta = GOOGLE_META) {
    super(meta)
  }

  get helpUrl(): string {
    return 'https://aistudio.google.com/apikey'
  }

  get configSchema(): ConfigSchema {
    return {
      apiKey: {
        type: 'string',
        label: 'API Key',
        required: true,
        description: 'Your Google API key',
      },
    }
  }

  get baseUrl(): string {
    return 'https://generativelanguage.googleapis.com/v1beta'
  }

  get configured(): boolean {
    return !!this.config.apiKey
  }

  private get apiKey(): string {
    if (!this.config.apiKey) {
      throw new Error('API key is required')
    }
    return this.config.apiKey as string
  }

  private createClient(): GoogleGenAI {
    return new GoogleGenAI({ apiKey: this.apiKey })
  }

  private getLastQueryMessage(messages: Message[]): QueryMessage | null {
    const lastMessage = [...messages].reverse().find((m) => m.type === 'query')
    return lastMessage?.type === 'query' ? lastMessage : null
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // ============ Image Generation (Imagen) ============

  private async runImageGeneration(request: Request): Promise<void> {
    let aspectRatio = '1:1'
    let imageSize = '1K'
    let numberOfImages = 1
    let personGeneration: PersonGeneration = PersonGeneration.ALLOW_ADULT

    const customConfig = request.customConfig
    if (customConfig) {
      if (customConfig.configs.aspectRatio) aspectRatio = customConfig.configs.aspectRatio as string
      if (customConfig.configs.imageSize) imageSize = customConfig.configs.imageSize as string
      if (customConfig.configs.numberOfImages)
        numberOfImages = Number(customConfig.configs.numberOfImages) || 1
      if (customConfig.configs.personGeneration) {
        const pg = customConfig.configs.personGeneration as string
        if (pg === 'dont_allow') personGeneration = PersonGeneration.DONT_ALLOW
        else if (pg === 'allow_adult') personGeneration = PersonGeneration.ALLOW_ADULT
        else if (pg === 'allow_all') personGeneration = PersonGeneration.ALLOW_ALL
      }
    }

    const lastMessage = this.getLastQueryMessage(request.messages)
    const prompt = lastMessage?.text || ''

    const client = this.createClient()

    const response = await client.models.generateImages({
      model: request.model,
      prompt,
      config: {
        numberOfImages,
        aspectRatio,
        imageSize,
        personGeneration,
      },
    })

    for (const generatedImage of response.generatedImages || []) {
      if (generatedImage.image?.imageBytes) {
        const fileName = `image_${mediaId()}.png`
        const saved = await mediaApi.saveBase64(generatedImage.image.imageBytes, fileName)

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

  // ============ Gemini Native Image Generation ============

  private async runGeminiImageGeneration(request: Request): Promise<void> {
    let aspectRatio = '1:1'
    let imageSize = '1K'

    const customConfig = request.customConfig
    if (customConfig) {
      if (customConfig.configs.aspectRatio) aspectRatio = customConfig.configs.aspectRatio as string
      if (customConfig.configs.imageSize) imageSize = customConfig.configs.imageSize as string
    }

    const lastMessage = this.getLastQueryMessage(request.messages)
    const prompt = lastMessage?.text || ''

    const client = this.createClient()

    const response = await client.models.generateContent({
      model: request.model,
      contents: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
    })

    // Extract text content
    const textContent = response.text
    if (textContent) {
      this.emitChunk(request.context, { type: 'content', text: textContent })
    }

    // Extract images from response
    const parts = response.candidates?.[0]?.content?.parts || []
    for (const part of parts) {
      if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
        const fileName = `image_${mediaId()}.png`
        const saved = await mediaApi.saveBase64(part.inlineData.data, fileName)

        this.emitChunk(request.context, {
          type: 'media',
          media: {
            localPath: saved.localPath,
            name: fileName,
            type: 'image',
            mimeType: part.inlineData.mimeType || 'image/png',
          },
        })
      }
    }
    request.hooks.onSuccess()
  }

  // ============ TTS (Text-to-Speech) ============

  private async runTTS(request: Request): Promise<void> {
    let voiceName = 'Kore'

    const customConfig = request.customConfig
    if (customConfig) {
      if (customConfig.configs.voice) voiceName = customConfig.configs.voice as string
    }

    const lastMessage = this.getLastQueryMessage(request.messages)
    const text = lastMessage?.text || ''

    if (!text) {
      throw new Error('No text provided for TTS')
    }

    const client = this.createClient()

    const response = await client.models.generateContent({
      model: request.model,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    })

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    if (audioData) {
      const fileName = `tts_${mediaId()}.wav`
      const saved = await mediaApi.saveBase64(audioData, fileName)

      this.emitChunk(request.context, {
        type: 'media',
        media: {
          localPath: saved.localPath,
          name: fileName,
          type: 'audio',
          mimeType: 'audio/wav',
        },
      })
    }
    request.hooks.onSuccess()
  }

  // ============ Video Generation (Veo) ============

  private async runVideoGeneration(request: Request): Promise<void> {
    let aspectRatio = '16:9'
    let resolution = '720p'
    let durationSeconds = 8

    const customConfig = request.customConfig
    if (customConfig) {
      if (customConfig.configs.aspectRatio) aspectRatio = customConfig.configs.aspectRatio as string
      if (customConfig.configs.resolution) resolution = customConfig.configs.resolution as string
      if (customConfig.configs.durationSeconds)
        durationSeconds = parseInt(customConfig.configs.durationSeconds as string) || 8
    }

    const lastMessage = this.getLastQueryMessage(request.messages)
    const prompt = lastMessage?.text || ''

    const client = this.createClient()

    this.emitChunk(request.context, { type: 'content', text: 'Starting video generation...' })

    // Start video generation
    let operation = await client.models.generateVideos({
      model: request.model,
      prompt,
      config: {
        aspectRatio,
        resolution,
        durationSeconds,
      },
    })

    // Poll for completion
    const maxPolls = 180 // 30 minutes with 10s interval
    for (let i = 0; i < maxPolls; i++) {
      if (operation.done) break

      await this.sleep(10000)

      if (i % 6 === 0) {
        this.emitChunk(request.context, {
          type: 'content',
          text: `Video generating... (${Math.round((i / maxPolls) * 100)}%)`,
        })
      }

      operation = await client.operations.getVideosOperation({ operation })
    }

    if (!operation.done) {
      throw new Error('Video generation timed out after 30 minutes')
    }

    // Download and save the video
    const generatedVideo = operation.response?.generatedVideos?.[0]
    if (generatedVideo?.video) {
      this.emitChunk(request.context, { type: 'content', text: 'Video generation completed!' })

      const fileName = `video_${mediaId()}.mp4`

      // Check if video bytes are available directly
      if (generatedVideo.video.videoBytes) {
        const saved = await mediaApi.saveBase64(generatedVideo.video.videoBytes, fileName)
        this.emitChunk(request.context, {
          type: 'media',
          media: {
            localPath: saved.localPath,
            name: fileName,
            type: 'video',
            mimeType: generatedVideo.video.mimeType || 'video/mp4',
          },
        })
      } else if (generatedVideo.video.uri) {
        // Download from URI if bytes not available
        const response = await fetch(generatedVideo.video.uri)
        const blob = await response.blob()
        const base64 = await this.blobToBase64(blob)
        const saved = await mediaApi.saveBase64(base64, fileName)

        this.emitChunk(request.context, {
          type: 'media',
          media: {
            localPath: saved.localPath,
            name: fileName,
            type: 'video',
            mimeType: generatedVideo.video.mimeType || 'video/mp4',
          },
        })
      }
    }
    request.hooks.onSuccess()
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

  // ============ Chat Completion (Streaming) ============

  private async runChatCompletion(request: Request): Promise<void> {
    let hasToolCall = false

    const client = this.createClient()
    const contents = await this.buildContents(request.messages)
    const tools = this.buildTools(request.tools)

    const response = await client.models.generateContentStream({
      model: request.model,
      contents,
      config: {
        systemInstruction: request.systemPrompt,
        tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
      },
    })

    let accumulatedText = ''
    const functionCalls: Array<{ id: string; name: string; args: string }> = []

    for await (const chunk of response) {
      // Handle text content
      const textDelta = chunk.text
      if (textDelta) {
        accumulatedText += textDelta
        this.emitChunk(request.context, { type: 'content.delta', delta: textDelta })
      }

      // Handle function calls
      const parts = chunk.candidates?.[0]?.content?.parts || []
      for (const part of parts) {
        if (part.functionCall) {
          hasToolCall = true
          const fc = part.functionCall
          functionCalls.push({
            id: `fc_${Date.now()}_${functionCalls.length}`,
            name: fc.name || '',
            args: JSON.stringify(fc.args || {}),
          })
        }
      }
    }

    // Emit all function calls
    for (const fc of functionCalls) {
      eventBus.emit(ToolCallEventType.ToolCallPending, {
        metadata: request.context,
        tc: { id: fc.id, function: { name: fc.name, arguments: fc.args } },
      })
    }

    if (hasToolCall) {
      request.hooks.onPendingApproval()
    } else {
      request.hooks.onSuccess()
    }
  }

  // ============ Message Building ============

  private async buildContents(messages: Message[]): Promise<Content[]> {
    const contents: Content[] = []

    for (const message of messages) {
      if (message.type === 'query') {
        const query = message as QueryMessage
        const parts: Part[] = []

        // Add media parts
        for (const mediaItem of query.medias) {
          const media = mediaItem.media
          const transferResult = await mediaApi.getDataUrl(media)

          if (transferResult.success && transferResult.dataUrl) {
            // Extract base64 data from data URL
            const base64Match = transferResult.dataUrl.match(/^data:([^;]+);base64,(.+)$/)
            if (base64Match) {
              const mimeType = base64Match[1]
              const data = base64Match[2]

              if (media.type === 'image') {
                parts.push({ inlineData: { mimeType, data } })
              } else if (media.type === 'audio') {
                parts.push({ inlineData: { mimeType, data } })
              } else if (media.type === 'video') {
                parts.push({ inlineData: { mimeType, data } })
              }
            }
          }
        }

        // Add text part
        if (query.text) {
          parts.push({ text: query.text })
        }

        contents.push({ role: 'user', parts })
      } else if (message.type === 'response') {
        const response = message as ResponseMessage
        const modelParts: Part[] = []
        const functionResponseParts: Part[] = []

        for (const item of response.data) {
          switch (item.type) {
            case 'content':
              if (item.content) {
                modelParts.push({ text: item.content })
              }
              break
            case 'tool_call':
              // Add function call to model message
              modelParts.push({
                functionCall: {
                  name: item.tc.function.name,
                  args: JSON.parse(item.tc.function.arguments || '{}'),
                },
              })
              // Add function response
              functionResponseParts.push({
                functionResponse: {
                  name: item.tc.function.name,
                  response: { result: item.text || '' },
                },
              })
              break
          }
        }

        if (modelParts.length > 0) {
          contents.push({ role: 'model', parts: modelParts })
        }
        if (functionResponseParts.length > 0) {
          contents.push({ role: 'user', parts: functionResponseParts })
        }
      }
    }

    return contents
  }

  private buildTools(tools: ExtensionTool[]): FunctionDeclaration[] {
    return tools.map((tool) => ({
      name: `mcp_${tool.extensionId}_${tool.name}`,
      description: tool.description || `Tool from ${tool.extensionName}`,
      parameters: tool.inputSchema || { type: 'object', properties: {} },
    }))
  }

  // ============ Main Run Method ============

  public async run(request: Request): Promise<void> {
    await this.ready

    // Imagen models (dedicated image generation)
    if (request.model.startsWith('imagen-')) {
      return this.runImageGeneration(request)
    }

    // Veo models (video generation)
    if (request.model.startsWith('veo-')) {
      return this.runVideoGeneration(request)
    }

    // Gemini TTS models
    if (request.model.includes('-tts')) {
      return this.runTTS(request)
    }

    // Gemini native image generation models
    if (request.model.includes('-image')) {
      return this.runGeminiImageGeneration(request)
    }

    // Default: streaming chat completion
    return this.runChatCompletion(request)
  }
}
