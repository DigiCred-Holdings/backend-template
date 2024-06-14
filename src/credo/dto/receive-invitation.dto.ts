import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReceiveInvitationDto {
  @IsString()
  @ApiProperty({
    description: 'Name of the agent who wants to receive the link',
    example: 'agent1',
  })
  agentName: string;

  @IsString()
  @ApiProperty({
    description: 'URL of the invitation',
    example: 'https://example.com/invitation',
  })
  invitationUrl: string;
}
