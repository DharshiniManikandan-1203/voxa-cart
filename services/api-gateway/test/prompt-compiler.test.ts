import test from 'node:test';
import assert from 'node:assert/strict';
import { DynamicPromptCompiler } from '../src/modules/prompts/prompt.compiler.js';

test('DynamicPromptCompiler - interpolates template tokens accurately', () => {
  const rawTemplate =
    'You are a shopping assistant for {{merchant_name}} in the {{industry}} industry. Language: {{language}}. Max sentences: {{max_sentences}}. Rules: {{business_rules}}';

  const variablesSchema = [
    { name: 'merchant_name', description: 'Store Name', required: true },
    { name: 'industry', description: 'Industry', required: false, default_value: 'Retail' },
    { name: 'language', description: 'Language', required: false, default_value: 'Hinglish' },
    { name: 'max_sentences', description: 'Max sentences', required: false, default_value: '2' },
    { name: 'business_rules', description: 'Policies', required: false },
  ];

  const contextData = {
    merchant_name: 'Apex Athletics',
    industry: 'Fashion',
    business_rules: 'Free shipping on orders above ₹999.',
  };

  const { compiledPrompt, resolvedVariables } = DynamicPromptCompiler.compile(rawTemplate, variablesSchema, contextData);

  assert.match(compiledPrompt, /Apex Athletics/);
  assert.match(compiledPrompt, /Fashion/);
  assert.match(compiledPrompt, /Hinglish/);
  assert.match(compiledPrompt, /Free shipping on orders above ₹999/);
  assert.equal(resolvedVariables.language, 'Hinglish'); // used default_value
});

test('DynamicPromptCompiler - throws error if required variable is missing', () => {
  const rawTemplate = 'Welcome to {{merchant_name}}!';
  const variablesSchema = [{ name: 'merchant_name', description: 'Store Name', required: true }];

  assert.throws(
    () => {
      DynamicPromptCompiler.compile(rawTemplate, variablesSchema, {});
    },
    {
      name: 'AppError',
      message: /Missing required variables: \[merchant_name\]/,
    }
  );
});
