import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { AdminAuthGuard } from './auth/admin-auth.guard';
import { Roles } from './auth/roles.decorator';
import { AdminPrincipal, CurrentAdmin } from './auth/admin-principal';
import { CatalogService } from './catalog.service';
import { AuditService } from './audit.service';
import {
  CreateArticleDto,
  CreateProductDto,
  CreateRuleDto,
  UpdateArticleDto,
  UpdateProductDto,
  UpdateRuleDto,
} from './admin.dtos';

@Public()
@UseGuards(AdminAuthGuard)
@Controller('admin')
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly audit: AuditService,
  ) {}

  // ---- Rules (health_ops) ----
  @Roles('health_ops')
  @Get('rules')
  listRules() {
    return this.catalog.listRules();
  }

  @Roles('health_ops')
  @Post('rules')
  async createRule(
    @CurrentAdmin() admin: AdminPrincipal,
    @Body() dto: CreateRuleDto,
  ) {
    const rule = await this.catalog.createRule({
      metric: dto.metric,
      definition: dto.definition as Prisma.InputJsonValue,
      severity: dto.severity,
      notify: dto.notify ?? false,
      contentKey: dto.contentKey as Prisma.InputJsonValue,
      scope: dto.scope as Prisma.InputJsonValue | undefined,
      active: dto.active ?? true,
    });
    await this.audit.log({
      actor: admin.adminId,
      action: 'rule.create',
      targetType: 'health_rule',
      targetId: rule.id,
    });
    return rule;
  }

  @Roles('health_ops')
  @Patch('rules/:id')
  async updateRule(@Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.catalog.updateRule(id, {
      definition: dto.definition as Prisma.InputJsonValue | undefined,
      severity: dto.severity,
      notify: dto.notify,
      contentKey: dto.contentKey as Prisma.InputJsonValue | undefined,
      scope: dto.scope as Prisma.InputJsonValue | undefined,
      active: dto.active,
    });
  }

  @Roles('health_ops')
  @Delete('rules/:id')
  @HttpCode(204)
  async deleteRule(@Param('id') id: string): Promise<void> {
    await this.catalog.deleteRule(id);
  }

  // ---- Products (product_manager) ----
  @Roles('product_manager')
  @Get('products')
  listProducts() {
    return this.catalog.listProducts();
  }

  @Roles('product_manager')
  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.catalog.createProduct({ ...dto });
  }

  @Roles('product_manager')
  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.catalog.updateProduct(id, { ...dto });
  }

  @Roles('product_manager')
  @Delete('products/:id')
  @HttpCode(204)
  async deleteProduct(@Param('id') id: string): Promise<void> {
    await this.catalog.deleteProduct(id);
  }

  // ---- Articles (content_manager) ----
  @Roles('content_manager')
  @Get('articles')
  listArticles() {
    return this.catalog.listArticles();
  }

  @Roles('content_manager')
  @Post('articles')
  createArticle(@Body() dto: CreateArticleDto) {
    return this.catalog.createArticle({ ...dto });
  }

  @Roles('content_manager')
  @Patch('articles/:id')
  updateArticle(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.catalog.updateArticle(id, { ...dto });
  }

  @Roles('content_manager')
  @Delete('articles/:id')
  @HttpCode(204)
  async deleteArticle(@Param('id') id: string): Promise<void> {
    await this.catalog.deleteArticle(id);
  }
}
