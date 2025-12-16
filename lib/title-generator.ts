/**
 * Generador de títulos únicos usando ChatGPT API
 * Mantiene cache por SKU para evitar duplicados dentro del mismo batch
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

const MAX_TITLE_LENGTH = 60

export class TitleGenerator {
  private skuTitleCache: Map<string, Set<string>> = new Map()
  private maxRetries = 5

  /**
   * Genera un título único para un SKU dado
   * @param sku - Identificador del producto
   * @param originalTitle - Título original a reescribir
   * @returns Título generado único
   */
  async generateUniqueTitle(sku: string, originalTitle: string): Promise<string> {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no está configurada')
    }

    const usedTitles = this.skuTitleCache.get(sku) ?? new Set<string>()
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const newTitle = await this.callChatGPT(originalTitle, Array.from(usedTitles), attempt)
      
      // Validar que no sea igual al original ni a uno ya usado para este SKU
      const normalizedNew = this.normalizeTitle(newTitle)
      const normalizedOriginal = this.normalizeTitle(originalTitle)
      
      const isDuplicate = normalizedNew === normalizedOriginal || 
        Array.from(usedTitles).some(t => this.normalizeTitle(t) === normalizedNew)
      
      const isTooLong = newTitle.length > MAX_TITLE_LENGTH
      
      if (!isDuplicate && !isTooLong && newTitle.trim().length > 0) {
        usedTitles.add(newTitle)
        this.skuTitleCache.set(sku, usedTitles)
        return newTitle
      }
    }

    // Fallback: agregar sufijo único si todos los reintentos fallan
    let fallback = `${originalTitle} - V${usedTitles.size + 1}`
    // Truncar fallback si excede el límite
    if (fallback.length > MAX_TITLE_LENGTH) {
      fallback = fallback.substring(0, MAX_TITLE_LENGTH - 3) + '...'
    }
    usedTitles.add(fallback)
    this.skuTitleCache.set(sku, usedTitles)
    return fallback
  }

  private normalizeTitle(title: string): string {
    return title.toLowerCase().trim().replace(/\s+/g, ' ')
  }

  private async callChatGPT(
    originalTitle: string, 
    usedTitles: string[], 
    attempt: number
  ): Promise<string> {
    const usedContext = usedTitles.length > 0 
      ? `\n\nTítulos YA USADOS para este SKU (NO puedes generar ninguno igual o muy similar a estos):\n${usedTitles.map(t => `- "${t}"`).join('\n')}`
      : ''

    const creativityHint = attempt > 0 
      ? `\n\nNota: Intento ${attempt + 1}, sé más creativo y diferente.` 
      : ''

    const prompt = `Eres un experto en copywriting para Mercado Libre. Tu tarea es reescribir el siguiente título de producto siguiendo las mejores prácticas de la plataforma.

Título original: "${originalTitle}"

Mejores prácticas de Mercado Libre:
- Estructura recomendada: [Producto] + [Marca] + [Modelo] + [Características clave]
- Usa palabras clave que los compradores buscan
- Evita mayúsculas innecesarias, signos de exclamación o palabras como "OFERTA", "PROMOCIÓN"
- No uses abreviaturas confusas
- Prioriza claridad y relevancia para el buscador

Reglas obligatorias:
1. El nuevo título debe ser DIFERENTE al original (no solo cambiar una palabra)
2. Mantén la esencia, marca y características del producto
3. Usa sinónimos, reordena palabras o reformula para mejor SEO
4. **MÁXIMO 60 CARACTERES** - esto es obligatorio, no lo excedas
5. No agregues información que no esté en el original
6. Responde SOLO con el nuevo título, sin comillas ni explicaciones${usedContext}${creativityHint}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'Eres un experto en SEO y copywriting para Mercado Libre. Responde únicamente con el título optimizado, máximo 60 caracteres.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8 + (attempt * 0.1), // Aumentar creatividad en reintentos
        max_tokens: 150
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const generatedTitle = data.choices?.[0]?.message?.content?.trim() || ''
    
    // Limpiar posibles comillas que el modelo pueda agregar
    return generatedTitle.replace(/^["']|["']$/g, '').trim()
  }

  /**
   * Limpia el cache (llamar al inicio de cada batch)
   */
  clearCache(): void {
    this.skuTitleCache.clear()
  }

  /**
   * Obtiene estadísticas del cache actual
   */
  getStats(): { skuCount: number; totalTitles: number } {
    let totalTitles = 0
    this.skuTitleCache.forEach(titles => {
      totalTitles += titles.size
    })
    return {
      skuCount: this.skuTitleCache.size,
      totalTitles
    }
  }
}

// Singleton para usar en el procesador
export const titleGenerator = new TitleGenerator()
