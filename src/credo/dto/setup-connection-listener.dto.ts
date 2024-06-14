import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetupConnectionListenerDto {
  @IsString()
  @ApiProperty({
    description: 'Name of the agent',
    example: 'agent1',
  })
  agentName: string;

  @IsString()
  @ApiProperty({
    description: 'ID of the Out-of-Band record',
    example: 'outOfBandRecordId123',
  })
  outOfBandRecordId: string;
}
