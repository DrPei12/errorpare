import fs from 'node:fs/promises';
import path from 'node:path';

import {
  createUserModelProfileClient,
  resolveTenantProviderCredentials,
  runOnboardingCli,
} from 'model-catlog-builder';

import { ERRORPARE_HOME_DIR, type LLMConfig } from '../config/config-manager.js';
import { getProviderCatalogEntry } from './catalog.js';
import bundledCatalog from './generated/errorpare-model-catalog.json';
import bundledRoutingConfig from './generated/errorpare-model-routing.config.json';

const DEFAULT_MODEL_CATALOG_TENANT = 'default';
const MODEL_CATALOG_STORAGE_DIR = path.join(ERRORPARE_HOME_DIR, 'model-catalog');
const ERRORPARE_SUPPORTED_MODEL_CATALOG_PROVIDER_IDS = [
  'openai',
  'anthropic',
  'openrouter',
  'google',
  'qwen',
  'deepseek',
  'moonshotai',
  'moonshot',
];

const MODEL_CATALOG_TO_ERRORPARE_PROVIDER_ID: Record<string, LLMConfig['provider']> = {
  openai: 'openai',
  anthropic: 'anthropic',
  openrouter: 'openrouter',
  google: 'gemini',
  qwen: 'bailian',
  deepseek: 'deepseek',
  moonshotai: 'moonshot',
  moonshot: 'moonshot',
};

const ERRORPARE_TO_MODEL_CATALOG_PROVIDER_ID: Partial<Record<LLMConfig['provider'], string>> = {
  openai: 'openai',
  anthropic: 'anthropic',
  openrouter: 'openrouter',
  gemini: 'google',
  bailian: 'qwen',
  deepseek: 'deepseek',
  moonshot: 'moonshotai',
};

export function supportsErrorPareModelCatalogProvider(providerId?: string | null) {
  const normalizedProviderId = normalizeCatalogProviderId(providerId || null);
  if (!normalizedProviderId) {
    return true;
  }

  return ERRORPARE_SUPPORTED_MODEL_CATALOG_PROVIDER_IDS.includes(normalizedProviderId);
}

export interface ErrorPareModelCatalogPaths {
  storageRoot: string;
  catalogPath: string;
  modelRoutingConfigPath: string;
  jsonStatePath: string;
  sqlitePath: string;
  userModelProfilePath: string;
  tenantId: string;
}

export interface ErrorPareOnboardingResult {
  tenantId: string;
  paths: ErrorPareModelCatalogPaths;
  llmConfig: LLMConfig;
  onboardingResult: Awaited<ReturnType<typeof runOnboardingCli>>;
}

export function createErrorPareModelCatalogPaths(options: { storageRoot?: string; tenantId?: string } = {}): ErrorPareModelCatalogPaths {
  const tenantId = normalizeTenantId(options.tenantId || DEFAULT_MODEL_CATALOG_TENANT);
  const storageRoot = path.resolve(options.storageRoot || MODEL_CATALOG_STORAGE_DIR);

  return {
    storageRoot,
    catalogPath: path.join(storageRoot, 'generated', 'errorpare-model-catalog.json'),
    modelRoutingConfigPath: path.join(storageRoot, 'generated', 'errorpare-model-routing.config.json'),
    jsonStatePath: path.join(storageRoot, 'runtime-state.json'),
    sqlitePath: path.join(storageRoot, 'runtime-state.sqlite'),
    userModelProfilePath: path.join(storageRoot, 'tenants', tenantId, 'user-model-profile.json'),
    tenantId,
  };
}

export async function ensureErrorPareModelCatalogWorkspace(paths: ErrorPareModelCatalogPaths, options: { refreshSeedFiles?: boolean } = {}) {
  await fs.mkdir(path.dirname(paths.catalogPath), { recursive: true });
  await writeSeedJson(paths.catalogPath, bundledCatalog, options.refreshSeedFiles);
  await writeSeedJson(paths.modelRoutingConfigPath, bundledRoutingConfig, options.refreshSeedFiles);
}

export async function runErrorPareAnalyzeOnboarding(
  options: {
    tenantId?: string;
    storageRoot?: string;
    providerId?: string;
    refreshSeedFiles?: boolean;
  } = {},
): Promise<ErrorPareOnboardingResult> {
  const paths = createErrorPareModelCatalogPaths({
    storageRoot: options.storageRoot,
    tenantId: options.tenantId,
  });
  await ensureErrorPareModelCatalogWorkspace(paths, {
    refreshSeedFiles: options.refreshSeedFiles,
  });

  const sourceProviderId = normalizeCatalogProviderId(options.providerId || null);
  const onboardingResult = await runOnboardingCli({
    rootDir: paths.storageRoot,
    tenantId: paths.tenantId,
    defaultTenantId: paths.tenantId,
    providerId: sourceProviderId,
    routeRole: 'model',
    catalogPath: paths.catalogPath,
    modelRoutingConfigPath: paths.modelRoutingConfigPath,
    jsonStatePath: paths.jsonStatePath,
    sqlitePath: paths.sqlitePath,
    storageMode: 'json',
    userModelProfilePath: paths.userModelProfilePath,
    allowedProviderIds: ERRORPARE_SUPPORTED_MODEL_CATALOG_PROVIDER_IDS,
  });

  const llmConfig = await buildErrorPareLlmConfigFromOnboarding({
    tenantId: paths.tenantId,
    paths,
    userModelProfile: onboardingResult.userModelProfile,
  });

  return {
    tenantId: paths.tenantId,
    paths,
    llmConfig,
    onboardingResult,
  };
}

export async function buildErrorPareLlmConfigFromOnboarding(options: {
  tenantId?: string;
  paths?: Partial<ErrorPareModelCatalogPaths>;
  userModelProfile: any;
}): Promise<LLMConfig> {
  const tenantId = normalizeTenantId(options.tenantId || DEFAULT_MODEL_CATALOG_TENANT);
  const paths = {
    ...createErrorPareModelCatalogPaths({
      storageRoot: options.paths?.storageRoot,
      tenantId,
    }),
    ...options.paths,
    tenantId,
  } satisfies ErrorPareModelCatalogPaths;
  const client = createUserModelProfileClient(options.userModelProfile);
  const primaryModel = client.getPrimaryModel('model');

  if (!primaryModel?.ref || !primaryModel.providerId || !primaryModel.modelId) {
    throw new Error('The onboarding result does not contain a configured primary text model.');
  }

  const errorPareProviderId = MODEL_CATALOG_TO_ERRORPARE_PROVIDER_ID[primaryModel.providerId];
  if (!errorPareProviderId) {
    throw new Error(
      `ErrorPare does not support model execution for provider "${primaryModel.providerId}" yet.`,
    );
  }

  const providerCatalogEntry = getProviderCatalogEntry(errorPareProviderId);
  if (!providerCatalogEntry) {
    throw new Error(`ErrorPare provider catalog is missing "${errorPareProviderId}".`);
  }

  const resolvedCredentials = await resolveTenantProviderCredentials({
    rootDir: paths.storageRoot,
    catalogPath: paths.catalogPath,
    jsonStatePath: paths.jsonStatePath,
    sqlitePath: paths.sqlitePath,
    storageMode: 'json',
    tenantId,
    providerId: primaryModel.providerId,
  });

  const apiKey = String(resolvedCredentials?.credentials?.apiKey || '').trim();
  if (!apiKey) {
    throw new Error(
      `Stored credentials for provider "${primaryModel.providerId}" do not expose an API key that ErrorPare can use.`,
    );
  }

  return {
    provider: errorPareProviderId,
    model: primaryModel.modelId,
    apiKey,
    baseUrl: providerCatalogEntry.baseUrl,
    maxTokens: 2000,
    temperature: 0.1,
    modelRef: primaryModel.ref,
    source: 'model-catalog',
    sourceProviderId: primaryModel.providerId,
    modelCatalogTenantId: tenantId,
    modelCatalogProfilePath: paths.userModelProfilePath,
  };
}

async function writeSeedJson(outputPath: string, payload: unknown, overwrite = false) {
  if (!overwrite) {
    const exists = await fileExists(outputPath);
    if (exists) {
      return;
    }
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizeTenantId(value: string) {
  return String(value || DEFAULT_MODEL_CATALOG_TENANT)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-') || DEFAULT_MODEL_CATALOG_TENANT;
}

function normalizeCatalogProviderId(providerId: string | null) {
  const normalizedProviderId = String(providerId || '').trim();
  if (!normalizedProviderId) {
    return null;
  }

  return (
    ERRORPARE_TO_MODEL_CATALOG_PROVIDER_ID[normalizedProviderId as LLMConfig['provider']] ||
    normalizedProviderId
  );
}
