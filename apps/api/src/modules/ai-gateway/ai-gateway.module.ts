import { AiGatewayService, type AiGatewayCatalog } from "./ai-gateway.service.ts";
import {
  createOpenAICompatibleProviderClient,
  type OpenAICompatibleProviderClient,
} from "./provider-client.ts";

export interface AiGatewayModuleOptions {
  catalog: AiGatewayCatalog;
  providerClient?: OpenAICompatibleProviderClient;
}

export class AiGatewayModule {
  static create(options: AiGatewayModuleOptions) {
    return new AiGatewayService(
      options.catalog,
      options.providerClient ?? createOpenAICompatibleProviderClient(),
    );
  }
}

export { AiGatewayService, type AiGatewayCatalog } from "./ai-gateway.service.ts";
export type { AIScene } from "./provider-client.ts";
