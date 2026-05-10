import { memo } from 'react'
import type { IconType } from '@lobehub/icons/es/types'

// Import Color variants (preferred)
import AdobeColor from '@lobehub/icons/es/Adobe/components/Color'
import AdobeFireflyColor from '@lobehub/icons/es/AdobeFirefly/components/Color'
import Ai302Color from '@lobehub/icons/es/Ai302/components/Color'
import Ai360Color from '@lobehub/icons/es/Ai360/components/Color'
import AiHubMixColor from '@lobehub/icons/es/AiHubMix/components/Color'
import AiMassColor from '@lobehub/icons/es/AiMass/components/Color'
import AionLabsColor from '@lobehub/icons/es/AionLabs/components/Color'
import AkashChatColor from '@lobehub/icons/es/AkashChat/components/Color'
import AlibabaColor from '@lobehub/icons/es/Alibaba/components/Color'
import AlibabaCloudColor from '@lobehub/icons/es/AlibabaCloud/components/Color'
import AntGroupColor from '@lobehub/icons/es/AntGroup/components/Color'
import AnyscaleColor from '@lobehub/icons/es/Anyscale/components/Color'
import AssemblyAIColor from '@lobehub/icons/es/AssemblyAI/components/Color'
import AutomaticColor from '@lobehub/icons/es/Automatic/components/Color'
import AwsColor from '@lobehub/icons/es/Aws/components/Color'
import AyaColor from '@lobehub/icons/es/Aya/components/Color'
import AzureColor from '@lobehub/icons/es/Azure/components/Color'
import AzureAIColor from '@lobehub/icons/es/AzureAI/components/Color'
import BaichuanColor from '@lobehub/icons/es/Baichuan/components/Color'
import BaiduColor from '@lobehub/icons/es/Baidu/components/Color'
import BaiduCloudColor from '@lobehub/icons/es/BaiduCloud/components/Color'
import BailianColor from '@lobehub/icons/es/Bailian/components/Color'
import BedrockColor from '@lobehub/icons/es/Bedrock/components/Color'
import BilibiliColor from '@lobehub/icons/es/Bilibili/components/Color'
import BingColor from '@lobehub/icons/es/Bing/components/Color'
import BurnCloudColor from '@lobehub/icons/es/BurnCloud/components/Color'
import ByteDanceColor from '@lobehub/icons/es/ByteDance/components/Color'
import CentMLColor from '@lobehub/icons/es/CentML/components/Color'
import CerebrasColor from '@lobehub/icons/es/Cerebras/components/Color'
import ChatGLMColor from '@lobehub/icons/es/ChatGLM/components/Color'
import CivitaiColor from '@lobehub/icons/es/Civitai/components/Color'
import ClaudeColor from '@lobehub/icons/es/Claude/components/Color'
import CloudflareColor from '@lobehub/icons/es/Cloudflare/components/Color'
import CodeGeeXColor from '@lobehub/icons/es/CodeGeeX/components/Color'
import CogVideoColor from '@lobehub/icons/es/CogVideo/components/Color'
import CogViewColor from '@lobehub/icons/es/CogView/components/Color'
import CohereColor from '@lobehub/icons/es/Cohere/components/Color'
import ColabColor from '@lobehub/icons/es/Colab/components/Color'
import CometAPIColor from '@lobehub/icons/es/CometAPI/components/Color'
import ComfyUIColor from '@lobehub/icons/es/ComfyUI/components/Color'
import CommandAColor from '@lobehub/icons/es/CommandA/components/Color'
import CopilotColor from '@lobehub/icons/es/Copilot/components/Color'
import CopilotKitColor from '@lobehub/icons/es/CopilotKit/components/Color'
import CoquiColor from '@lobehub/icons/es/Coqui/components/Color'
import CrewAIColor from '@lobehub/icons/es/CrewAI/components/Color'
import CrusoeColor from '@lobehub/icons/es/Crusoe/components/Color'
import DalleColor from '@lobehub/icons/es/Dalle/components/Color'
import DbrxColor from '@lobehub/icons/es/Dbrx/components/Color'
import DeepInfraColor from '@lobehub/icons/es/DeepInfra/components/Color'
import DeepLColor from '@lobehub/icons/es/DeepL/components/Color'
import DeepMindColor from '@lobehub/icons/es/DeepMind/components/Color'
import DeepSeekColor from '@lobehub/icons/es/DeepSeek/components/Color'
import DifyColor from '@lobehub/icons/es/Dify/components/Color'
import Doc2XColor from '@lobehub/icons/es/Doc2X/components/Color'
import DocSearchColor from '@lobehub/icons/es/DocSearch/components/Color'
import DoubaoColor from '@lobehub/icons/es/Doubao/components/Color'
import ExaColor from '@lobehub/icons/es/Exa/components/Color'
import FalColor from '@lobehub/icons/es/Fal/components/Color'
import FastGPTColor from '@lobehub/icons/es/FastGPT/components/Color'
import FeatherlessColor from '@lobehub/icons/es/Featherless/components/Color'
import FigmaColor from '@lobehub/icons/es/Figma/components/Color'
import FireworksColor from '@lobehub/icons/es/Fireworks/components/Color'
import GLMVColor from '@lobehub/icons/es/GLMV/components/Color'
import GeminiColor from '@lobehub/icons/es/Gemini/components/Color'
import GemmaColor from '@lobehub/icons/es/Gemma/components/Color'
import GoogleColor from '@lobehub/icons/es/Google/components/Color'
import GoogleCloudColor from '@lobehub/icons/es/GoogleCloud/components/Color'
import GradioColor from '@lobehub/icons/es/Gradio/components/Color'
import GreptileColor from '@lobehub/icons/es/Greptile/components/Color'
import HailuoColor from '@lobehub/icons/es/Hailuo/components/Color'
import HigressColor from '@lobehub/icons/es/Higress/components/Color'
import HuaweiColor from '@lobehub/icons/es/Huawei/components/Color'
import HuaweiCloudColor from '@lobehub/icons/es/HuaweiCloud/components/Color'
import HuggingFaceColor from '@lobehub/icons/es/HuggingFace/components/Color'
import HunyuanColor from '@lobehub/icons/es/Hunyuan/components/Color'
import HyperbolicColor from '@lobehub/icons/es/Hyperbolic/components/Color'
import IFlyTekCloudColor from '@lobehub/icons/es/IFlyTekCloud/components/Color'
import InfermaticColor from '@lobehub/icons/es/Infermatic/components/Color'
import InfinigenceColor from '@lobehub/icons/es/Infinigence/components/Color'
import InternLMColor from '@lobehub/icons/es/InternLM/components/Color'
import JimengColor from '@lobehub/icons/es/Jimeng/components/Color'
import KimiColor from '@lobehub/icons/es/Kimi/components/Color'
import KlingColor from '@lobehub/icons/es/Kling/components/Color'
import KlusterColor from '@lobehub/icons/es/Kluster/components/Color'
import KolorsColor from '@lobehub/icons/es/Kolors/components/Color'
import KwaipilotColor from '@lobehub/icons/es/Kwaipilot/components/Color'
import LGColor from '@lobehub/icons/es/LG/components/Color'
import LLaVAColor from '@lobehub/icons/es/LLaVA/components/Color'
import LangChainColor from '@lobehub/icons/es/LangChain/components/Color'
import LangGraphColor from '@lobehub/icons/es/LangGraph/components/Color'
import LangSmithColor from '@lobehub/icons/es/LangSmith/components/Color'
import LangfuseColor from '@lobehub/icons/es/Langfuse/components/Color'
import LeptonAIColor from '@lobehub/icons/es/LeptonAI/components/Color'
import LiveKitColor from '@lobehub/icons/es/LiveKit/components/Color'
import LlamaIndexColor from '@lobehub/icons/es/LlamaIndex/components/Color'
import LobeHubColor from '@lobehub/icons/es/LobeHub/components/Color'
import LongCatColor from '@lobehub/icons/es/LongCat/components/Color'
import LovableColor from '@lobehub/icons/es/Lovable/components/Color'
import LumaColor from '@lobehub/icons/es/Luma/components/Color'
import MakeColor from '@lobehub/icons/es/Make/components/Color'
import McpSoColor from '@lobehub/icons/es/McpSo/components/Color'
import MenloColor from '@lobehub/icons/es/Menlo/components/Color'
import MetaColor from '@lobehub/icons/es/Meta/components/Color'
import MetaAIColor from '@lobehub/icons/es/MetaAI/components/Color'
import MicrosoftColor from '@lobehub/icons/es/Microsoft/components/Color'
import MinimaxColor from '@lobehub/icons/es/Minimax/components/Color'
import MistralColor from '@lobehub/icons/es/Mistral/components/Color'
import ModelScopeColor from '@lobehub/icons/es/ModelScope/components/Color'
import MonicaColor from '@lobehub/icons/es/Monica/components/Color'
import MyShellColor from '@lobehub/icons/es/MyShell/components/Color'
import N8nColor from '@lobehub/icons/es/N8n/components/Color'
import NPLCloudColor from '@lobehub/icons/es/NPLCloud/components/Color'
import NewAPIColor from '@lobehub/icons/es/NewAPI/components/Color'
import NovaColor from '@lobehub/icons/es/Nova/components/Color'
import NovitaColor from '@lobehub/icons/es/Novita/components/Color'
import NvidiaColor from '@lobehub/icons/es/Nvidia/components/Color'
import OpenChatColor from '@lobehub/icons/es/OpenChat/components/Color'
import PPIOColor from '@lobehub/icons/es/PPIO/components/Color'
import PaLMColor from '@lobehub/icons/es/PaLM/components/Color'
import PerplexityColor from '@lobehub/icons/es/Perplexity/components/Color'
import PhidataColor from '@lobehub/icons/es/Phidata/components/Color'
import PixVerseColor from '@lobehub/icons/es/PixVerse/components/Color'
import Player2Color from '@lobehub/icons/es/Player2/components/Color'
import PoeColor from '@lobehub/icons/es/Poe/components/Color'
import PydanticAIColor from '@lobehub/icons/es/PydanticAI/components/Color'
import QingyanColor from '@lobehub/icons/es/Qingyan/components/Color'
import QiniuColor from '@lobehub/icons/es/Qiniu/components/Color'
import QwenColor from '@lobehub/icons/es/Qwen/components/Color'
import RSSHubColor from '@lobehub/icons/es/RSSHub/components/Color'
import ReplitColor from '@lobehub/icons/es/Replit/components/Color'
import RwkvColor from '@lobehub/icons/es/Rwkv/components/Color'
import SambaNovaColor from '@lobehub/icons/es/SambaNova/components/Color'
import Search1APIColor from '@lobehub/icons/es/Search1API/components/Color'
import SenseNovaColor from '@lobehub/icons/es/SenseNova/components/Color'
import SiliconCloudColor from '@lobehub/icons/es/SiliconCloud/components/Color'
import SkyworkColor from '@lobehub/icons/es/Skywork/components/Color'
import SmitheryColor from '@lobehub/icons/es/Smithery/components/Color'
import SnowflakeColor from '@lobehub/icons/es/Snowflake/components/Color'
import SophNetColor from '@lobehub/icons/es/SophNet/components/Color'
import SoraColor from '@lobehub/icons/es/Sora/components/Color'
import SparkColor from '@lobehub/icons/es/Spark/components/Color'
import StabilityColor from '@lobehub/icons/es/Stability/components/Color'
import StateCloudColor from '@lobehub/icons/es/StateCloud/components/Color'
import StepfunColor from '@lobehub/icons/es/Stepfun/components/Color'
import StraicoColor from '@lobehub/icons/es/Straico/components/Color'
import SubModelColor from '@lobehub/icons/es/SubModel/components/Color'
import TIIColor from '@lobehub/icons/es/TII/components/Color'
import TargonColor from '@lobehub/icons/es/Targon/components/Color'
import TavilyColor from '@lobehub/icons/es/Tavily/components/Color'
import TencentColor from '@lobehub/icons/es/Tencent/components/Color'
import TencentCloudColor from '@lobehub/icons/es/TencentCloud/components/Color'
import TiangongColor from '@lobehub/icons/es/Tiangong/components/Color'
import TogetherColor from '@lobehub/icons/es/Together/components/Color'
import TraeColor from '@lobehub/icons/es/Trae/components/Color'
import TripoColor from '@lobehub/icons/es/Tripo/components/Color'
import UdioColor from '@lobehub/icons/es/Udio/components/Color'
import UnstructuredColor from '@lobehub/icons/es/Unstructured/components/Color'
import UpstageColor from '@lobehub/icons/es/Upstage/components/Color'
import VertexAIColor from '@lobehub/icons/es/VertexAI/components/Color'
import ViduColor from '@lobehub/icons/es/Vidu/components/Color'
import VllmColor from '@lobehub/icons/es/Vllm/components/Color'
import VolcengineColor from '@lobehub/icons/es/Volcengine/components/Color'
import VoyageColor from '@lobehub/icons/es/Voyage/components/Color'
import WenxinColor from '@lobehub/icons/es/Wenxin/components/Color'
import WorkersAIColor from '@lobehub/icons/es/WorkersAI/components/Color'
import XinferenceColor from '@lobehub/icons/es/Xinference/components/Color'
import XuanyuanColor from '@lobehub/icons/es/Xuanyuan/components/Color'
import YiColor from '@lobehub/icons/es/Yi/components/Color'
import YuanbaoColor from '@lobehub/icons/es/Yuanbao/components/Color'
import ZapierColor from '@lobehub/icons/es/Zapier/components/Color'
import ZeaburColor from '@lobehub/icons/es/Zeabur/components/Color'
import ZeroOneColor from '@lobehub/icons/es/ZeroOne/components/Color'
import ZhipuColor from '@lobehub/icons/es/Zhipu/components/Color'

// Import Mono variants (for providers without Color variant)
import AguiMono from '@lobehub/icons/es/Agui/components/Mono'
import Ai21Mono from '@lobehub/icons/es/Ai21/components/Mono'
import AiStudioMono from '@lobehub/icons/es/AiStudio/components/Mono'
import AlephAlphaMono from '@lobehub/icons/es/AlephAlpha/components/Mono'
import AnthropicMono from '@lobehub/icons/es/Anthropic/components/Mono'
import BAAIMono from '@lobehub/icons/es/BAAI/components/Mono'
import BasetenMono from '@lobehub/icons/es/Baseten/components/Mono'
import BflMono from '@lobehub/icons/es/Bfl/components/Mono'
import BilibiliIndexMono from '@lobehub/icons/es/BilibiliIndex/components/Mono'
import CapCutMono from '@lobehub/icons/es/CapCut/components/Mono'
import ClineMono from '@lobehub/icons/es/Cline/components/Mono'
import ClipdropMono from '@lobehub/icons/es/Clipdrop/components/Mono'
import CozeMono from '@lobehub/icons/es/Coze/components/Mono'
import CursorMono from '@lobehub/icons/es/Cursor/components/Mono'
import DeepAIMono from '@lobehub/icons/es/DeepAI/components/Mono'
import DolphinMono from '@lobehub/icons/es/Dolphin/components/Mono'
import DreamMachineMono from '@lobehub/icons/es/DreamMachine/components/Mono'
import ElevenLabsMono from '@lobehub/icons/es/ElevenLabs/components/Mono'
import ElevenXMono from '@lobehub/icons/es/ElevenX/components/Mono'
import FishAudioMono from '@lobehub/icons/es/FishAudio/components/Mono'
import FloraMono from '@lobehub/icons/es/Flora/components/Mono'
import FlowithMono from '@lobehub/icons/es/Flowith/components/Mono'
import FluxMono from '@lobehub/icons/es/Flux/components/Mono'
import FriendliMono from '@lobehub/icons/es/Friendli/components/Mono'
import GiteeAIMono from '@lobehub/icons/es/GiteeAI/components/Mono'
import GithubMono from '@lobehub/icons/es/Github/components/Mono'
import GithubCopilotMono from '@lobehub/icons/es/GithubCopilot/components/Mono'
import GlamaMono from '@lobehub/icons/es/Glama/components/Mono'
import GlifMono from '@lobehub/icons/es/Glif/components/Mono'
import GooseMono from '@lobehub/icons/es/Goose/components/Mono'
import GrokMono from '@lobehub/icons/es/Grok/components/Mono'
import GroqMono from '@lobehub/icons/es/Groq/components/Mono'
import HaiperMono from '@lobehub/icons/es/Haiper/components/Mono'
import HedraMono from '@lobehub/icons/es/Hedra/components/Mono'
import IBMMono from '@lobehub/icons/es/IBM/components/Mono'
import IdeogramMono from '@lobehub/icons/es/Ideogram/components/Mono'
import InferenceMono from '@lobehub/icons/es/Inference/components/Mono'
import InflectionMono from '@lobehub/icons/es/Inflection/components/Mono'
import JinaMono from '@lobehub/icons/es/Jina/components/Mono'
import KeraMono from '@lobehub/icons/es/Kera/components/Mono'
import LambdaMono from '@lobehub/icons/es/Lambda/components/Mono'
import LightricksMono from '@lobehub/icons/es/Lightricks/components/Mono'
import LiquidMono from '@lobehub/icons/es/Liquid/components/Mono'
import LmStudioMono from '@lobehub/icons/es/LmStudio/components/Mono'
import MCPMono from '@lobehub/icons/es/MCP/components/Mono'
import MagicMono from '@lobehub/icons/es/Magic/components/Mono'
import ManusMono from '@lobehub/icons/es/Manus/components/Mono'
import MastraMono from '@lobehub/icons/es/Mastra/components/Mono'
import MetaGPTMono from '@lobehub/icons/es/MetaGPT/components/Mono'
import MidjourneyMono from '@lobehub/icons/es/Midjourney/components/Mono'
import MoonshotMono from '@lobehub/icons/es/Moonshot/components/Mono'
import NebiusMono from '@lobehub/icons/es/Nebius/components/Mono'
import NotebookLMMono from '@lobehub/icons/es/NotebookLM/components/Mono'
import NotionMono from '@lobehub/icons/es/Notion/components/Mono'
import NousResearchMono from '@lobehub/icons/es/NousResearch/components/Mono'
import NovelAIMono from '@lobehub/icons/es/NovelAI/components/Mono'
import OllamaMono from '@lobehub/icons/es/Ollama/components/Mono'
import OpenAIMono from '@lobehub/icons/es/OpenAI/components/Mono'
import OpenRouterMono from '@lobehub/icons/es/OpenRouter/components/Mono'
import OpenWebUIMono from '@lobehub/icons/es/OpenWebUI/components/Mono'
import ParasailMono from '@lobehub/icons/es/Parasail/components/Mono'
import PhindMono from '@lobehub/icons/es/Phind/components/Mono'
import PikaMono from '@lobehub/icons/es/Pika/components/Mono'
import PollinationsMono from '@lobehub/icons/es/Pollinations/components/Mono'
import RailwayMono from '@lobehub/icons/es/Railway/components/Mono'
import RecraftMono from '@lobehub/icons/es/Recraft/components/Mono'
import ReplicateMono from '@lobehub/icons/es/Replicate/components/Mono'
import RunwayMono from '@lobehub/icons/es/Runway/components/Mono'
import SearchApiMono from '@lobehub/icons/es/SearchApi/components/Mono'
import SunoMono from '@lobehub/icons/es/Suno/components/Mono'
import SyncMono from '@lobehub/icons/es/Sync/components/Mono'
import TopazLabsMono from '@lobehub/icons/es/TopazLabs/components/Mono'
import TuriXMono from '@lobehub/icons/es/TuriX/components/Mono'
import V0Mono from '@lobehub/icons/es/V0/components/Mono'
import VectorizerAIMono from '@lobehub/icons/es/VectorizerAI/components/Mono'
import VercelMono from '@lobehub/icons/es/Vercel/components/Mono'
import ViggleMono from '@lobehub/icons/es/Viggle/components/Mono'
import WindsurfMono from '@lobehub/icons/es/Windsurf/components/Mono'
import XAIMono from '@lobehub/icons/es/XAI/components/Mono'
import YandexMono from '@lobehub/icons/es/Yandex/components/Mono'
import YouMindMono from '@lobehub/icons/es/YouMind/components/Mono'
import ZAIMono from '@lobehub/icons/es/ZAI/components/Mono'

// Provider icons mapping - all available lobehub icons
// Color variants are preferred when available, otherwise Mono
const PROVIDER_ICONS: Record<string, IconType> = {
  // Color variants
  adobe: AdobeColor,
  adobefirefly: AdobeFireflyColor,
  ai302: Ai302Color,
  ai360: Ai360Color,
  aihubmix: AiHubMixColor,
  aimass: AiMassColor,
  aionlabs: AionLabsColor,
  akashchat: AkashChatColor,
  alibaba: AlibabaColor,
  alibabacloud: AlibabaCloudColor,
  antgroup: AntGroupColor,
  anyscale: AnyscaleColor,
  assemblyai: AssemblyAIColor,
  automatic: AutomaticColor,
  aws: AwsColor,
  aya: AyaColor,
  azure: AzureColor,
  azureai: AzureAIColor,
  baichuan: BaichuanColor,
  baidu: BaiduColor,
  baiducloud: BaiduCloudColor,
  bailian: BailianColor,
  bedrock: BedrockColor,
  'amazon-bedrock': BedrockColor,
  bilibili: BilibiliColor,
  bing: BingColor,
  burncloud: BurnCloudColor,
  bytedance: ByteDanceColor,
  centml: CentMLColor,
  cerebras: CerebrasColor,
  chatglm: ChatGLMColor,
  civitai: CivitaiColor,
  claude: ClaudeColor,
  cloudflare: CloudflareColor,
  codegeex: CodeGeeXColor,
  cogvideo: CogVideoColor,
  cogview: CogViewColor,
  cohere: CohereColor,
  colab: ColabColor,
  cometapi: CometAPIColor,
  comfyui: ComfyUIColor,
  commanda: CommandAColor,
  copilot: CopilotColor,
  copilotkit: CopilotKitColor,
  coqui: CoquiColor,
  crewai: CrewAIColor,
  crusoe: CrusoeColor,
  dalle: DalleColor,
  dbrx: DbrxColor,
  deepinfra: DeepInfraColor,
  deepl: DeepLColor,
  deepmind: DeepMindColor,
  deepseek: DeepSeekColor,
  dify: DifyColor,
  doc2x: Doc2XColor,
  docsearch: DocSearchColor,
  doubao: DoubaoColor,
  exa: ExaColor,
  fal: FalColor,
  fastgpt: FastGPTColor,
  featherless: FeatherlessColor,
  figma: FigmaColor,
  fireworks: FireworksColor,
  glmv: GLMVColor,
  gemini: GeminiColor,
  gemma: GemmaColor,
  google: GoogleColor,
  googlecloud: GoogleCloudColor,
  gradio: GradioColor,
  greptile: GreptileColor,
  hailuo: HailuoColor,
  higress: HigressColor,
  huawei: HuaweiColor,
  huaweicloud: HuaweiCloudColor,
  huggingface: HuggingFaceColor,
  hunyuan: HunyuanColor,
  hyperbolic: HyperbolicColor,
  iflytekcloud: IFlyTekCloudColor,
  infermatic: InfermaticColor,
  infinigence: InfinigenceColor,
  internlm: InternLMColor,
  jimeng: JimengColor,
  kimi: KimiColor,
  kling: KlingColor,
  kluster: KlusterColor,
  kolors: KolorsColor,
  kwaipilot: KwaipilotColor,
  lg: LGColor,
  llava: LLaVAColor,
  langchain: LangChainColor,
  langgraph: LangGraphColor,
  langsmith: LangSmithColor,
  langfuse: LangfuseColor,
  leptonai: LeptonAIColor,
  livekit: LiveKitColor,
  llamaindex: LlamaIndexColor,
  lobehub: LobeHubColor,
  longcat: LongCatColor,
  lovable: LovableColor,
  luma: LumaColor,
  make: MakeColor,
  mcpso: McpSoColor,
  menlo: MenloColor,
  meta: MetaColor,
  metaai: MetaAIColor,
  microsoft: MicrosoftColor,
  minimax: MinimaxColor,
  mistral: MistralColor,
  modelscope: ModelScopeColor,
  monica: MonicaColor,
  myshell: MyShellColor,
  n8n: N8nColor,
  nplcloud: NPLCloudColor,
  newapi: NewAPIColor,
  nova: NovaColor,
  novita: NovitaColor,
  nvidia: NvidiaColor,
  openchat: OpenChatColor,
  ppio: PPIOColor,
  palm: PaLMColor,
  perplexity: PerplexityColor,
  phidata: PhidataColor,
  pixverse: PixVerseColor,
  player2: Player2Color,
  poe: PoeColor,
  pydanticai: PydanticAIColor,
  qingyan: QingyanColor,
  qiniu: QiniuColor,
  qwen: QwenColor,
  rsshub: RSSHubColor,
  replit: ReplitColor,
  rwkv: RwkvColor,
  sambanova: SambaNovaColor,
  search1api: Search1APIColor,
  sensenova: SenseNovaColor,
  siliconcloud: SiliconCloudColor,
  skywork: SkyworkColor,
  smithery: SmitheryColor,
  snowflake: SnowflakeColor,
  sophnet: SophNetColor,
  sora: SoraColor,
  spark: SparkColor,
  stability: StabilityColor,
  statecloud: StateCloudColor,
  stepfun: StepfunColor,
  straico: StraicoColor,
  submodel: SubModelColor,
  tii: TIIColor,
  targon: TargonColor,
  tavily: TavilyColor,
  tencent: TencentColor,
  tencentcloud: TencentCloudColor,
  tiangong: TiangongColor,
  together: TogetherColor,
  trae: TraeColor,
  tripo: TripoColor,
  udio: UdioColor,
  unstructured: UnstructuredColor,
  upstage: UpstageColor,
  vertexai: VertexAIColor,
  vidu: ViduColor,
  vllm: VllmColor,
  volcengine: VolcengineColor,
  voyage: VoyageColor,
  wenxin: WenxinColor,
  workersai: WorkersAIColor,
  xinference: XinferenceColor,
  xuanyuan: XuanyuanColor,
  yi: YiColor,
  yuanbao: YuanbaoColor,
  zapier: ZapierColor,
  zeabur: ZeaburColor,
  zeroone: ZeroOneColor,
  zhipu: ZhipuColor,

  // Mono variants (no Color available)
  agui: AguiMono,
  ai21: Ai21Mono,
  aistudio: AiStudioMono,
  alephalpha: AlephAlphaMono,
  anthropic: AnthropicMono,
  baai: BAAIMono,
  baseten: BasetenMono,
  bfl: BflMono,
  bilibiliindex: BilibiliIndexMono,
  capcut: CapCutMono,
  cline: ClineMono,
  clipdrop: ClipdropMono,
  coze: CozeMono,
  cursor: CursorMono,
  deepai: DeepAIMono,
  dolphin: DolphinMono,
  dreammachine: DreamMachineMono,
  elevenlabs: ElevenLabsMono,
  elevenx: ElevenXMono,
  fishaudio: FishAudioMono,
  flora: FloraMono,
  flowith: FlowithMono,
  flux: FluxMono,
  friendli: FriendliMono,
  giteeai: GiteeAIMono,
  github: GithubMono,
  githubcopilot: GithubCopilotMono,
  glama: GlamaMono,
  glif: GlifMono,
  goose: GooseMono,
  grok: GrokMono,
  groq: GroqMono,
  haiper: HaiperMono,
  hedra: HedraMono,
  ibm: IBMMono,
  ideogram: IdeogramMono,
  inference: InferenceMono,
  inflection: InflectionMono,
  jina: JinaMono,
  kera: KeraMono,
  lambda: LambdaMono,
  lightricks: LightricksMono,
  liquid: LiquidMono,
  lmstudio: LmStudioMono,
  mcp: MCPMono,
  magic: MagicMono,
  manus: ManusMono,
  mastra: MastraMono,
  metagpt: MetaGPTMono,
  midjourney: MidjourneyMono,
  moonshot: MoonshotMono,
  nebius: NebiusMono,
  notebooklm: NotebookLMMono,
  notion: NotionMono,
  nousresearch: NousResearchMono,
  novelai: NovelAIMono,
  ollama: OllamaMono,
  openai: OpenAIMono,
  openrouter: OpenRouterMono,
  openwebui: OpenWebUIMono,
  parasail: ParasailMono,
  phind: PhindMono,
  pika: PikaMono,
  pollinations: PollinationsMono,
  railway: RailwayMono,
  recraft: RecraftMono,
  replicate: ReplicateMono,
  runway: RunwayMono,
  searchapi: SearchApiMono,
  suno: SunoMono,
  sync: SyncMono,
  topazlabs: TopazLabsMono,
  turix: TuriXMono,
  v0: V0Mono,
  vectorizerai: VectorizerAIMono,
  vercel: VercelMono,
  viggle: ViggleMono,
  windsurf: WindsurfMono,
  xai: XAIMono,
  yandex: YandexMono,
  youmind: YouMindMono,
  zai: ZAIMono,
}

interface ProviderIconProps {
  provider: string
  size?: number
  className?: string
}

export const ProviderIcon = memo(({ provider, size = 16, className }: ProviderIconProps) => {
  const Icon = PROVIDER_ICONS[provider]

  if (Icon) {
    return <Icon size={size} className={className} />
  }

  // Fallback: show first letter
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.6,
        fontWeight: 500,
      }}
    >
      {provider.charAt(0).toUpperCase()}
    </div>
  )
})

ProviderIcon.displayName = 'ProviderIcon'

// Export the mapping for external use
export { PROVIDER_ICONS }
