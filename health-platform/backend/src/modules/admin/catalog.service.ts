import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** CRUD für admin-gepflegte Inhalte: Regeln, Produkte, Artikel (docs/26-27). */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Rules ---
  listRules() {
    return this.prisma.healthRule.findMany({ orderBy: { createdAt: 'desc' } });
  }
  createRule(data: Prisma.HealthRuleCreateInput) {
    return this.prisma.healthRule.create({ data });
  }
  updateRule(id: string, data: Prisma.HealthRuleUpdateInput) {
    return this.prisma.healthRule.update({ where: { id }, data });
  }
  deleteRule(id: string) {
    return this.prisma.healthRule.delete({ where: { id } });
  }

  // --- Products ---
  listProducts() {
    return this.prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
  }
  createProduct(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data });
  }
  updateProduct(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({ where: { id }, data });
  }
  deleteProduct(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }

  // --- Articles (CMS) ---
  listArticles() {
    return this.prisma.article.findMany({ orderBy: { updatedAt: 'desc' } });
  }
  createArticle(data: Prisma.ArticleCreateInput) {
    return this.prisma.article.create({ data });
  }
  updateArticle(id: string, data: Prisma.ArticleUpdateInput) {
    return this.prisma.article.update({ where: { id }, data });
  }
  deleteArticle(id: string) {
    return this.prisma.article.delete({ where: { id } });
  }
}
