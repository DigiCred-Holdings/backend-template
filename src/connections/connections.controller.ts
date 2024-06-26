import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { API_VERSION } from 'src/constants';
import { CredoService } from 'src/credo/credo.service';
import {
  CreateAgentDto,
  CreateInvitationDto,
  IssueCredentialDto,
  ReceiveInvitationDto,
  SetupConnectionListenerDto,
} from 'src/credo/dto/credo.dto';

@ApiTags('Connections')
@Controller(`${API_VERSION}/connections`)
export class ConnectionsController {
  constructor(
    private readonly connectionsService: ConnectionsService,
    private readonly credoService: CredoService,
  ) {}

  @Get()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'next', required: false, type: String })
  @ApiQuery({ name: 'previous', required: false, type: String })
  findAll(
    @Query('limit') limit: number = 50,
    @Query('next') next?: string,
    @Query('previous') previous?: string,
  ) {
    if (next) {
      const decodedNext = JSON.parse(
        Buffer.from(next, 'base64').toString('utf-8'),
      );
      if (!decodedNext.pagination) {
        decodedNext.pagination = {};
      }
      decodedNext.pagination.direction = 'next';
      decodedNext.pagination.limit = limit;
      return this.connectionsService.findAll(decodedNext);
    } else if (previous) {
      const decodedPrevious = JSON.parse(
        Buffer.from(previous, 'base64').toString('utf-8'),
      );
      if (!decodedPrevious.pagination) {
        decodedPrevious.pagination = {};
      }
      decodedPrevious.pagination.direction = 'previous';
      decodedPrevious.pagination.limit = limit;
      return this.connectionsService.findAll(decodedPrevious);
    } else {
      return this.connectionsService.findAll({ pagination: { limit } });
    }
  }

  @Get('/state/:state')
  findByState(@Param('state') state: string) {
    return this.connectionsService.findAll({ filter: { state } });
  }

  @Get('/label/:theirLabel')
  findByLabel(@Param('theirLabel') theirLabel: string) {
    return this.connectionsService.findAll({ filter: { theirLabel } });
  }

  @Get('/role/:role')
  findByRole(@Param('role') role: string) {
    return this.connectionsService.findAll({ filter: { role } });
  }

  @Get('/connection_id/:id')
  findByConnectionId(@Param('id') id: string) {
    return this.connectionsService.findAll({ filter: { id } });
  }

  @Get('/did/:did')
  findByDid(@Param('did') did: string) {
    return this.connectionsService.findAll({ filter: { did } });
  }

  @Get('/thread_id/:threadId')
  findByThreadId(@Param('threadId') threadId: string) {
    return this.connectionsService.findAll({ filter: { threadId } });
  }

  @Get('/metadata/:key/:value')
  findByMetadata(@Param('key') key: string, @Param('value') value: string) {
    return this.connectionsService.findAll({
      filter: { metadata: { key, value } },
    });
  }

  @Get('setup-connection-listener/:agentName/:outOfBandRecordId')
  @ApiOperation({ summary: 'Setup Connection Listener' })
  async setupConnectionListener(@Param() params: SetupConnectionListenerDto) {
    const { agentName, outOfBandRecordId } = params;
    const agent = this.credoService.getAgentByName(agentName);
    const outOfBandRecord =
      await this.credoService.getOutOfBandRecordById(outOfBandRecordId);
    if (agent && outOfBandRecord) {
      this.credoService.setupConnectionListener(
        agent,
        outOfBandRecord,
        () => {},
      );
    }
  }

  @Post('create-new-invitation')
  @ApiOperation({ summary: 'Create New Invitation' })
  @ApiOkResponse({ description: 'Successfully created new invitation' })
  async createNewInvitation(@Body() createInvitationDto: CreateInvitationDto) {
    const { agentName } = createInvitationDto;
    const agent = await this.credoService.createNewInvitation(agentName);
    if (agent) {
      const { invitationUrlQRcode } = agent;
      return { invitationUrlQRcode };
    }
  }

  @Post('create-legacy-invitation')
  @ApiOperation({ summary: 'Create Legacy Invitation' })
  @ApiOkResponse({ description: 'Successfully created legacy invitation' })
  async createLegacyInvitation(
    @Body() createInvitationDto: CreateInvitationDto,
  ) {
    const { agentName } = createInvitationDto;
    const agent = await this.credoService.createLegacyInvitation(agentName);
    if (agent) {
      const { invitationUrl } = agent;
      return { invitationUrl };
    }
  }

  @Post('receive-invitation')
  @ApiOperation({ summary: 'Receive Invitation' })
  async receiveInvitation(@Body() receiveInvitationDto: ReceiveInvitationDto) {
    const { agentName, invitationUrl } = receiveInvitationDto;
    await this.credoService.receiveInvitation(agentName, invitationUrl);
  }

  @Post('issue-credential')
  @ApiOperation({ summary: 'Issue Credential' })
  @ApiOkResponse({ description: 'Successfully issued credential' })
  async issueCredential(@Body() issueCredentialDto: IssueCredentialDto) {
    const credentialExchangeRecord = await this.credoService.issueCredential(
      issueCredentialDto.connectionId,
      issueCredentialDto.credentialDefinitionId,
      issueCredentialDto.attributes,
    );
    return { credentialExchangeRecord };
  }

  @Post('create-agent/:name/:endpoint/:port')
  @ApiOperation({ summary: 'Create Agent' })
  async createAgent(@Param() params: CreateAgentDto) {
    const { name, endpoint, port } = params;
    await this.credoService.createAgent(name, endpoint, port);
  }
}
