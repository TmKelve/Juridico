type DraftInput = {
  templateId: string;
  processId: number;
  documentTitle: string;
  payload: Record<string, unknown>;
  promptVersion?: string;
  modelVersion?: string;
};

export type DraftOutput = {
  fileName: string;
  mimeType: string;
  contentBase64: string;
  previewUrl: string | null;
  metadata: Record<string, unknown>;
};

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1).toLowerCase())
    .join(' ');
}

function buildFactsBlock(payload: Record<string, unknown>) {
  return Object.entries(payload)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .slice(0, 8)
    .map(([key, value]) => `- ${titleCase(key)}: ${String(value)}`)
    .join('\n');
}

export class DocumentDraftingService {
  async generate(input: DraftInput): Promise<DraftOutput> {
    const title = normalizeText(input.documentTitle) || 'Rascunho';
    const factsBlock = buildFactsBlock(input.payload);
    const document = [
      `# ${title}`,
      '',
      `Processo: ${input.processId}`,
      `Template: ${input.templateId}`,
      '',
      '## Contexto',
      factsBlock || '- Sem fatos estruturados adicionais.',
      '',
      '## Estrutura sugerida',
      '1. Síntese objetiva dos fatos.',
      '2. Fundamentos jurídicos iniciais.',
      '3. Pedidos e providências recomendadas.',
      '',
      '## Observações',
      'Rascunho inicial gerado para revisão humana obrigatória.',
      '',
    ].join('\n');

    return {
      fileName: `${title.replace(/[^\w\- ]+/g, '').trim() || 'rascunho'}.md`,
      mimeType: 'text/markdown',
      contentBase64: Buffer.from(document, 'utf8').toString('base64'),
      previewUrl: null,
      metadata: {
        promptVersion: input.promptVersion ?? 'k-draft-v1',
        modelVersion: input.modelVersion ?? 'draft-fallback-v1',
        generator: 'deterministic-drafting',
      },
    };
  }
}
