import { Injectable, Logger } from '@nestjs/common';
import {
  Agent,
  HttpOutboundTransport,
  WsOutboundTransport,
  InitConfig,
  OutOfBandRecord,
  ConnectionStateChangedEvent,
  ConnectionEventTypes,
  DidExchangeState,
  ConnectionsModule,
} from '@credo-ts/core';
import { HttpInboundTransport, agentDependencies } from '@credo-ts/node';
import { AskarModule } from '@credo-ts/askar';
import { ariesAskar } from '@hyperledger/aries-askar-nodejs';
import { IndyVdrModule } from '@credo-ts/indy-vdr';
import { indyVdr } from '@hyperledger/indy-vdr-nodejs';
import ledgers from '../config/ledgers/indy/index';
import { QrcodeService } from 'src/qrcode/qrcode.service';
import type { IndyVdrPoolConfig } from '@credo-ts/indy-vdr';

@Injectable()
export class CredoService {
  private readonly logger = new Logger(CredoService.name);
  private agent: Agent;
  private config: InitConfig;
  private agents: Map<string, Agent> = new Map();

  constructor(private readonly qrCodeService: QrcodeService) {}

  async createAgent(name: string, endpoint: string, port: number) {
    if (this.agents.has(name)) {
      this.logger.log(`Agent ${name} is already initialized on port ${port}`);
      return this.agents.get(name);
    }

    // Agent configuration
    this.config = {
      label: name,
      walletConfig: {
        id: name,
        key: name,
      },
      endpoints: [`${endpoint}:${port}`],
    };

    this.agent = new Agent({
      config: this.config,
      dependencies: agentDependencies,
      modules: {
        // Register the indyVdr module on the agent
        indyVdr: new IndyVdrModule({
          indyVdr,
          networks: ledgers as [IndyVdrPoolConfig],
        }),

        // Register the Askar module on the agent
        askar: new AskarModule({
          ariesAskar,
        }),
        connections: new ConnectionsModule({ autoAcceptConnections: true }),
      },
    });

    // Register a simple `WebSocket` outbound transport
    this.agent.registerOutboundTransport(new WsOutboundTransport());
    // Register a simple `Http` outbound transport
    this.agent.registerOutboundTransport(new HttpOutboundTransport());
    // Register a simple `Http` inbound transport
    this.agent.registerInboundTransport(
      new HttpInboundTransport({ port: port }),
    );

    // Initialize the agent
    try {
      await this.agent.initialize();
      this.agents.set(name, this.agent);
      this.logger.log(
        `Agent ${name} initialized on endpoint ${endpoint}:${port}`,
      );
    } catch (e) {
      this.logger.error(
        `Something went wrong while setting up the agent! Message: ${e}`,
      );
      throw e;
    }
    return this.agent;
  }

  // This method will create an invitation using the legacy method according to 0160: Connection Protocol.
  async createLegacyInvitation(agentName: string) {
    const agent: Agent | undefined = this.getAgentByName(agentName);
    if (agent) {
      this.logger.log(`Creating legacy invitation for agent: ${agentName}`);
      try {
        // Creating a Legacy Invitation
        const { invitation } = await agent.oob.createLegacyInvitation();
        const invitationUrl = invitation.toUrl({
          domain: agent.config?.endpoints[0] ?? 'https://example.org',
        });
        this.logger.log(`Legacy Invitation link created: ${invitationUrl}`);
        return { invitationUrl };
      } catch (error) {
        this.logger.error(`Error creating legacy invitation: ${error}`);
        throw error;
      }
    } else {
      this.logger.error(`Agent ${agentName} not found`);
    }
  }

  // This method will create an invitation using the legacy method according to 0434: Out-of-Band Protocol 1.1.
  async createNewInvitation(agentName: string) {
    const agent: Agent | undefined = this.getAgentByName(agentName);
    if (agent) {
      this.logger.log(`Creating new invitation for agent: ${agentName}`);
      try {
        const outOfBandRecord = await agent.oob.createInvitation();
        const invitationUrl = outOfBandRecord.outOfBandInvitation.toUrl({
          domain: agent.config?.endpoints[0] ?? 'https://example.org',
        });
        const invitationUrlQRcode =
          await this.qrCodeService.generateQrCode(invitationUrl);
        this.logger.log(`New Invitation link created: ${invitationUrl}`);
        // Listener
        this.setupConnectionListener(agent, outOfBandRecord, () => {});
        return {
          invitationUrlQRcode,
        };
      } catch (error) {
        this.logger.error(`Error creating new invitation: ${error}`);
        throw error;
      }
    } else {
      this.logger.error(`Agent ${agentName} not found`);
    }
  }

  async receiveInvitation(agentName: string, invitationUrl: string) {
    const agent: Agent | undefined = this.getAgentByName(agentName);
    if (agent) {
      try {
        const { outOfBandRecord } =
          await agent.oob.receiveInvitationFromUrl(invitationUrl);
        this.logger.log(`Received invitation for agent ${agentName}`);
        this.logger.log(
          `OutOfBandRecord received: ${JSON.stringify(outOfBandRecord)}`,
        );
      } catch (error) {
        this.logger.error(
          `Error receiving invitation for agent ${agentName}: ${error}`,
        );
        throw error;
      }
    } else {
      this.logger.error(`Agent ${agentName} not found`);
    }
  }

  setupConnectionListener(
    agent: Agent,
    outOfBandRecord: OutOfBandRecord,
    cb: (...args: any) => void,
  ) {
    agent.events.on<ConnectionStateChangedEvent>(
      ConnectionEventTypes.ConnectionStateChanged,
      ({ payload }) => {
        if (payload.connectionRecord.outOfBandId !== outOfBandRecord.id) return;
        if (payload.connectionRecord.state === DidExchangeState.Completed) {
          // the connection is now ready for usage in other protocols!
          this.logger.log(
            `Connection for out-of-band id ${outOfBandRecord.id} completed.`,
          );

          // Custom business logic can be included here
          // In this example we can send a basic message to the connection, but
          // anything is possible
          cb();

          // We exit the flow
          process.exit(0);
        }
      },
    );
  }

  getAgentByName(name: string) {
    return this.agents.get(name);
  }

  getOutOfBandRecordById(id: string): Promise<OutOfBandRecord | null> {
    return this.agent.oob.findById(id);
  }
}
