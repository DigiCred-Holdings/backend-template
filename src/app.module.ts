import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { CredoModule } from './credo/credo.module';
import { QrcodeModule } from './qrcode/qrcode.module';

@Module({
  imports: [DbModule, CredoModule, QrcodeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
