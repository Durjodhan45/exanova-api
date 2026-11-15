import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionBank } from './entities/question-bank.entity.js';
import { QuestionBankItem } from './entities/question-bank-item.entity.js';
import { QuestionBanksService } from './question-banks.service.js';
import { QuestionBanksController } from './question-banks.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([QuestionBank, QuestionBankItem])],
  controllers: [QuestionBanksController],
  providers: [QuestionBanksService],
  exports: [QuestionBanksService],
})
export class QuestionBanksModule {}
