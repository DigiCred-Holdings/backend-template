import { Controller, Post, Body, Param, Get, Logger } from '@nestjs/common';
import { CredoService } from './credo.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateAgentDto } from './dto/create-agent.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { ReceiveInvitationDto } from './dto/receive-invitation.dto';
import { SetupConnectionListenerDto } from './dto/setup-connection-listener.dto';

@Controller('credo')
@ApiTags('Credo')
export class CredoController {
  private readonly logger = new Logger(CredoController.name);

  constructor(private readonly credoService: CredoService) {}

  @Post('create-agent/:name/:endpoint/:port')
  @ApiOperation({ summary: 'Create Agent' })
  async createAgent(@Param() params: CreateAgentDto) {
    const { name, endpoint, port } = params;
    await this.credoService.createAgent(name, endpoint, port);
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

  @Post('receive-invitation')
  @ApiOperation({ summary: 'Receive Invitation' })
  async receiveInvitation(@Body() receiveInvitationDto: ReceiveInvitationDto) {
    const { agentName, invitationUrl } = receiveInvitationDto;
    await this.credoService.receiveInvitation(agentName, invitationUrl);
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
}
