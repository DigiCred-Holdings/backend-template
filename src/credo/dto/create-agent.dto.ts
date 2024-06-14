import { IsString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgentDto {
  @IsString()
  @ApiProperty({
    description: 'Name of the agent',
    example: 'agent1',
  })
  name: string;

  @IsString()
  @ApiProperty({
    description: 'Endpoint of the agent',
    example: 'http://localhost',
  })
  endpoint: string;

  @IsInt()
  @ApiProperty({
    description: 'Port number for the agent',
    example: 3000,
  })
  port: number;
}
