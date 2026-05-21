import { FinanceDomainError } from '../shared';

export interface FinanceCategoryRecord {
  code: string;
  label: string;
  type: string;
  active: boolean;
  sortOrder: number;
}

export interface FinanceCategoryRepository {
  findByCode(code: string): Promise<FinanceCategoryRecord | null>;
  listActiveByType(type?: string): Promise<FinanceCategoryRecord[]>;
}

export class InMemoryFinanceCategoryRepository implements FinanceCategoryRepository {
  constructor(private readonly categories: FinanceCategoryRecord[] = []) {}

  async findByCode(code: string) {
    return this.categories.find((category) => category.code === code && category.active) ?? null;
  }

  async listActiveByType(type?: string) {
    return this.categories
      .filter((category) => category.active && (!type || category.type === type))
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }
}

export class PrismaFinanceCategoryRepository implements FinanceCategoryRepository {
  constructor(private readonly prisma: { financeCategory: { findUnique: (args: any) => Promise<any>; findMany: (args: any) => Promise<any[]> } }) {}

  async findByCode(code: string) {
    const category = await this.prisma.financeCategory.findUnique({ where: { code } });
    return category && category.active ? category : null;
  }

  async listActiveByType(type?: string) {
    return this.prisma.financeCategory.findMany({
      where: {
        active: true,
        ...(type ? { type } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
  }
}

export function assertCategoryMatchesType(category: FinanceCategoryRecord | null, type: string) {
  if (!category || category.type !== type || !category.active) {
    throw new FinanceDomainError('Categoria financeira inválida para o tipo do lançamento', 404, 'FIN_CATEGORY_NOT_FOUND', {
      categoryCode: category?.code ?? null,
      expectedType: type,
    });
  }
}
