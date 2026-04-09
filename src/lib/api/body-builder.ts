import { FormData as UndiciFormData } from 'undici'

interface BodyConfig {
  type: string
  content?: string
  formData?: Array<{ key: string; value: string; enabled: boolean }>
  rawType?: string
}

export interface BuiltBody {
  body?: string
  formDataBody?: UndiciFormData
}

type BuildStrategy = (
  config: BodyConfig,
  headers: Record<string, string>,
  interpolate: (s: string) => string,
) => BuiltBody

const RAW_CONTENT_TYPE: Record<string, string> = {
  text: 'text/plain',
  json: 'application/json',
  javascript: 'application/javascript',
  html: 'text/html',
  xml: 'application/xml',
}

const formDataStrategy: BuildStrategy = (config, headers, interpolate) => {
  if (!config.formData?.length) return {}
  const fd = new UndiciFormData()
  for (const kv of config.formData) {
    if (kv.enabled && kv.key) {
      fd.append(interpolate(kv.key), interpolate(kv.value))
    }
  }
  delete headers['Content-Type']
  delete headers['content-type']
  return { formDataBody: fd }
}

const urlencodedStrategy: BuildStrategy = (config, headers, interpolate) => {
  if (!config.formData?.length) return {}
  const sp = new URLSearchParams()
  for (const kv of config.formData) {
    if (kv.enabled && kv.key) {
      sp.append(interpolate(kv.key), interpolate(kv.value))
    }
  }
  headers['Content-Type'] ??= 'application/x-www-form-urlencoded'
  return { body: sp.toString() }
}

const rawStrategy: BuildStrategy = (config, headers, interpolate) => {
  if (!config.content) return {}
  const rawType = config.rawType ?? 'json'
  headers['Content-Type'] ??= RAW_CONTENT_TYPE[rawType] ?? 'text/plain'
  return { body: interpolate(config.content) }
}

const jsonStrategy: BuildStrategy = (config, headers, interpolate) => {
  if (!config.content) return {}
  headers['Content-Type'] ??= 'application/json'
  return { body: interpolate(config.content) }
}

const noneStrategy: BuildStrategy = () => ({})

const BODY_STRATEGIES: Record<string, BuildStrategy> = {
  'form-data': formDataStrategy,
  'x-www-form-urlencoded': urlencodedStrategy,
  raw: rawStrategy,
  json: jsonStrategy,
  none: noneStrategy,
}

export function buildRequestBody(
  config: BodyConfig | undefined,
  headers: Record<string, string>,
  interpolate: (s: string) => string,
): BuiltBody {
  if (!config) return {}
  const strategy = BODY_STRATEGIES[config.type] ?? noneStrategy
  return strategy(config, headers, interpolate)
}
