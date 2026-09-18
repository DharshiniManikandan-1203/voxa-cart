import { IPromptVariable } from '../../models/PromptVersion.js';
import { AppError } from '../../errors/AppError.js';

export interface PromptContextData {
  merchant_name?: string;
  industry?: string;
  currency?: string;
  language?: string;
  max_sentences?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_history?: string;
  product_context?: string;
  discount_context?: string;
  business_rules?: string;
  cart_summary?: string;
  order_status?: string;
  [key: string]: any;
}

export class DynamicPromptCompiler {
  /**
   * Compiles raw system prompt template by substituting dynamic variables.
   */
  public static compile(
    rawTemplate: string,
    variablesSchema: IPromptVariable[],
    contextData: PromptContextData
  ): { compiledPrompt: string; resolvedVariables: Record<string, string>; missingVariables: string[] } {
    const resolvedVariables: Record<string, string> = {};
    const missingVariables: string[] = [];

    // Check schema requirements
    for (const v of variablesSchema) {
      const providedValue = contextData[v.name];
      if (providedValue !== undefined && providedValue !== null && String(providedValue).trim() !== '') {
        resolvedVariables[v.name] = String(providedValue);
      } else if (v.default_value !== undefined && v.default_value !== null) {
        resolvedVariables[v.name] = v.default_value;
      } else if (v.required) {
        missingVariables.push(v.name);
      } else {
        resolvedVariables[v.name] = '';
      }
    }

    if (missingVariables.length > 0) {
      throw new AppError(
        `Prompt compilation failed: Missing required variables: [${missingVariables.join(', ')}]`,
        400,
        'INVALID_PROMPT_VARIABLE',
        { missingVariables }
      );
    }

    // Merge any additional keys from contextData into resolved map
    for (const key of Object.keys(contextData)) {
      if (!(key in resolvedVariables) && contextData[key] !== undefined) {
        resolvedVariables[key] = String(contextData[key]);
      }
    }

    // Token substitution regex: matches {{variable_name}}
    const compiledPrompt = rawTemplate.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, tokenName) => {
      if (tokenName in resolvedVariables) {
        return resolvedVariables[tokenName];
      }
      return ''; // remove unresolved optional tokens
    });

    return {
      compiledPrompt: compiledPrompt.trim(),
      resolvedVariables,
      missingVariables,
    };
  }
}
