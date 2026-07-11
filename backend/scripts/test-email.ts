import 'reflect-metadata';
import { IsEmail } from 'class-validator';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

class TestDto {
  @IsEmail()
  email: string;
}

async function main() {
  const obj = plainToInstance(TestDto, { email: '[email protected]' });
  const errors = await validate(obj);
  console.log('Errors:', JSON.stringify(errors, null, 2));
}

main();
