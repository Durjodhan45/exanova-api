import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuestionBanksService } from './question-banks.service.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { DifficultyLevel, QuestionType, UserRole } from '../../shared/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Question Banks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('question-banks')
export class QuestionBanksController {
  constructor(private readonly questionBanksService: QuestionBanksService) {}

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post()
  @ApiOperation({ summary: 'Create question bank' })
  async create(
    @Body()
    dto: {
      title: string;
      description?: string;
      departmentId: string;
      subjectId: string;
    },
    @CurrentUser('facultyId') facultyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return await this.questionBanksService.create({
      ...dto,
      createdByFacultyId: facultyId || userId,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get()
  @ApiOperation({ summary: 'Get all question banks' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('departmentId') departmentId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return await this.questionBanksService.findAll({ ...query, departmentId, subjectId });
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Get(':id')
  @ApiOperation({ summary: 'Get question bank by ID' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.questionBanksService.findById(id);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Post(':id/items')
  @ApiOperation({ summary: 'Add item to question bank' })
  async addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    dto: {
      questionText: string;
      questionType: QuestionType;
      marks?: string;
      negativeMarks?: string;
      optionsJson?: Array<{ optionLabel: string; optionText: string; isCorrect: boolean }>;
      answerInstructions?: string;
      evaluationCriteria?: string;
      expectedAnswer?: string;
      topic?: string;
      difficulty?: DifficultyLevel;
    },
  ) {
    return await this.questionBanksService.addItem(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from question bank' })
  async removeItem(@Param('itemId', ParseUUIDPipe) itemId: string) {
    return await this.questionBanksService.removeItem(itemId);
  }
}
