import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConfigDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
