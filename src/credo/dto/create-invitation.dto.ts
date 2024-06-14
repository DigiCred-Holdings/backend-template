import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInvitationDto {
  @IsString()
  @ApiProperty({
    description: 'Name of the agent',
    example: 'agent1',
  })
  agentName: string;
}
