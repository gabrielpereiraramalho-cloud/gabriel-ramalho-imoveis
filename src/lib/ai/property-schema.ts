/**
 * JSON Schema (OpenAI Structured Outputs) + system prompt da extração.
 * O enum de `features` é injetado em runtime a partir dos slugs REAIS do banco.
 */

export function buildPropertySchema(allowedSlugs: string[]) {
  const nullable = (type: string) => ({ type: [type, "null"] });
  return {
    name: "property_draft",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "title", "description", "property_type", "purpose", "sale_price",
        "rent_price", "condominium_fee", "iptu", "bedrooms", "suites",
        "bathrooms", "parking_spaces", "private_area", "total_area",
        "external_area", "floor", "solar_position", "city", "neighborhood",
        "address", "accepts_financing", "tag", "features", "confirmations",
      ],
      properties: {
        title: nullable("string"),
        description: nullable("string"),
        property_type: nullable("string"),
        purpose: { type: ["string", "null"], enum: ["sale", "rent", null] },
        sale_price: nullable("number"),
        rent_price: nullable("number"),
        condominium_fee: nullable("number"),
        iptu: nullable("number"),
        bedrooms: nullable("integer"),
        suites: nullable("integer"),
        bathrooms: nullable("integer"),
        parking_spaces: nullable("integer"),
        private_area: nullable("number"),
        total_area: nullable("number"),
        external_area: nullable("number"),
        floor: nullable("integer"),
        solar_position: {
          type: ["string", "null"],
          enum: ["nascente", "sul", "norte", "poente", "nascente_sul", "other", null],
        },
        city: nullable("string"),
        neighborhood: nullable("string"),
        address: nullable("string"),
        accepts_financing: { type: ["boolean", "null"] },
        tag: nullable("string"),
        features: {
          type: "array",
          items: allowedSlugs.length
            ? { type: "string", enum: allowedSlugs }
            : { type: "string" },
        },
        confirmations: { type: "array", items: { type: "string" } },
      },
    },
  };
}

export function buildSystemPrompt(allowedSlugs: string[]): string {
  return [
    "Você estrutura um anúncio imobiliário a partir de um texto livre em português do Brasil.",
    "Extraia SOMENTE o que está EXPLÍCITO no texto. NUNCA invente, deduza nem arredonde.",
    "Se uma informação não estiver no texto, use null (ou lista vazia em features).",
    "Converta números: '360 mil' = 360000; '2.600'/'2600' = 2600; '65m²' = 65.",
    "purpose: 'sale' só se venda; 'rent' só se aluguel. Se houver venda E aluguel, preencha",
    "sale_price e rent_price; defina purpose como a finalidade PRINCIPAL só se estiver clara,",
    "senão purpose=null e adicione uma confirmação.",
    "'condomínio incluso' NÃO é valor de condomínio: condominium_fee=null + confirmação.",
    "Quartos e suítes são independentes: se o texto só disser suítes, bedrooms=null + confirmação.",
    "Em CONFLITO (ex.: '2 quartos' e depois '3 quartos') ou FAIXA ('2 a 3 quartos'),",
    "deixe o campo null e adicione uma confirmação. Nunca chute.",
    `features: use APENAS estes slugs, e SÓ quando explícitos no texto: ${allowedSlugs.join(", ")}.`,
    "Exemplos do que NÃO vira feature: 'perto da praia', 'perto de tudo', 'lazer completo'.",
    "ÁREA: se o texto qualificar a área ('privativa', 'total', 'construída', 'externa', 'de varanda'),",
    "use o campo correspondente. Se disser apenas 'XX m²' sem qualificação: em apartamento/sala/kitnet",
    "sugira private_area; em casa/terreno sugira total_area; e SEMPRE adicione a confirmação de que a",
    "classificação da área foi presumida.",
    "PREÇO 'a partir de': preencha o valor numérico e adicione confirmação de que é preço inicial, não fechado.",
    "LOCAL: city, neighborhood e address só se estiverem escritos no texto. NUNCA presuma João Pessoa",
    "nem qualquer cidade; se a cidade não estiver no texto, city=null.",
    "property_type: com inicial maiúscula (ex.: 'Apartamento', 'Casa', 'Sala comercial').",
    "title e description: reescreva em português claro e organizado, FIEL ao conteúdo.",
    "É PROIBIDO acrescentar atributos, números, distâncias ou adjetivos comerciais que NÃO estejam no texto",
    "(ex.: luxuoso, exclusivo, excelente localização, alto padrão, vista privilegiada, acabamento premium).",
    "Se o próprio texto usar um desses termos, ele pode ser mantido.",
    "CONFLITOS e DÚVIDAS nunca aparecem em title nem description — vão EXCLUSIVAMENTE em confirmations.",
    "Em confirmations, liste em português curto tudo que precisa ser confirmado, sem repetir o mesmo assunto.",
  ].join(" ");
}
