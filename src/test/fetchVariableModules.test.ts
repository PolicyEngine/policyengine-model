import { gzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import { extractVariableModules } from '../../scripts/variable-modules.js';
import { fetchVariableTreeSnapshot } from '../../scripts/fetch-metadata.js';
import { variableArchive } from './fixtures/variableArchive';

const source = { repo: 'PolicyEngine/policyengine-uk', branch: 'main', commit: 'a'.repeat(40) };
const archivePrefix = 'policyengine-uk-commit/policyengine_uk/variables/';
const files = [
  { path: `${archivePrefix}gov/hmrc/income_tax/charges/child_benefit_hitc.py`, contents: 'class CB_HITC(Variable):\n    pass\n' },
  { path: `${archivePrefix}gov/hmrc/student_loans/student_loan_repayment.py`, contents: 'class student_loan_repayment(Variable):\n    pass\n\nclass has_student_loan(Variable):\n    pass\n\nclass student_loan_interest_rate(Variable):\n    pass\n' },
  { path: `${archivePrefix}gov/dwp/afip.py`, contents: 'class armed_forces_independence_payment(Variable):\n    pass\n' },
  { path: `${archivePrefix}gov/dwp/jsa.py`, contents: 'class jsa(Variable):\n    pass\n' },
  { path: `${archivePrefix}gov/dwp/multiline.py`, contents: 'class multiline_class(\n    Variable\n):\n    pass\n' },
  { path: `${archivePrefix}gov/dwp/__init__.py`, contents: '' },
  { path: 'policyengine-uk-commit/tests/example.py', contents: 'class not_a_model_variable(Variable):\n    pass\n' },
];

describe('UK class-to-module snapshot', () => {
  it('maps exact class names, multiple classes per file, and multiline declarations', () => {
    const tree = extractVariableModules('uk', variableArchive(files));
    expect(tree.modules).toEqual({
      CB_HITC: 'gov.hmrc.income_tax.charges.child_benefit_hitc',
      student_loan_repayment: 'gov.hmrc.student_loans.student_loan_repayment',
      has_student_loan: 'gov.hmrc.student_loans.student_loan_repayment',
      student_loan_interest_rate: 'gov.hmrc.student_loans.student_loan_repayment',
      armed_forces_independence_payment: 'gov.dwp.afip',
      jsa: 'gov.dwp.jsa',
      multiline_class: 'gov.dwp.multiline',
    });
    expect(tree.paths).toHaveLength(5);
    expect(tree.modules).not.toHaveProperty('JSA');
    expect(tree.modules).not.toHaveProperty('afip');
    expect(tree.modules).not.toHaveProperty('not_a_model_variable');
    for (const moduleName of Object.values(tree.modules) as string[]) {
      expect(tree.paths).toContain(`${moduleName.replace(/\./g, '/')}.py`);
    }
  });

  it('supports USTAR prefixes and PAX and GNU long file names', () => {
    const longPath = `${archivePrefix}gov/dwp/${'long_directory_'.repeat(6)}/example.py`;
    const record = `path=${longPath}\n`;
    let length = Buffer.byteLength(record) + 3;
    while (length !== Buffer.byteLength(record) + String(length).length + 1) {
      length = Buffer.byteLength(record) + String(length).length + 1;
    }
    const tree = extractVariableModules('uk', variableArchive([
      { path: 'example.py', prefix: `${archivePrefix}gov/hmrc`, contents: 'class prefix_variable(Variable):\n    pass\n' },
      { path: 'pax-header', type: 'x', contents: `${length} ${record}` },
      { path: 'placeholder.py', contents: 'class pax_variable(Variable):\n    pass\n' },
      { path: '././@LongLink', type: 'L', contents: longPath.replace('example.py', 'gnu.py') + '\0' },
      { path: 'placeholder.py', contents: 'class gnu_variable(Variable):\n    pass\n' },
    ]));
    expect(tree.paths).toContain('gov/hmrc/example.py');
    expect(tree.paths).toContain(longPath.slice(archivePrefix.length));
    expect(tree.paths).toContain(longPath.slice(archivePrefix.length).replace('example.py', 'gnu.py'));
    expect(tree.modules).toHaveProperty('prefix_variable', 'gov.hmrc.example');
    expect(tree.modules).toHaveProperty('pax_variable');
    expect(tree.modules).toHaveProperty('gnu_variable');
  });

  it('omits ambiguous names and rejects incomplete or unrelated archives', () => {
    const tree = extractVariableModules('uk', variableArchive([
      { path: `${archivePrefix}gov/a.py`, contents: 'class duplicate(Variable):\n    pass\n' },
      { path: `${archivePrefix}gov/b.py`, contents: 'class duplicate(Variable):\n    pass\n' },
    ]));
    expect(tree.modules).toEqual({});
    expect(() => extractVariableModules('uk', Buffer.alloc(100))).toThrow('Truncated');
    expect(() => extractVariableModules('uk', variableArchive(files).subarray(0, 520))).toThrow('Truncated');
    expect(() => extractVariableModules('us', variableArchive(files))).toThrow('no variable declarations');
  });

  it('fetches the commit archive and records the same source for classes and paths', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(gzipSync(variableArchive(files))));
    const tree = await fetchVariableTreeSnapshot('uk', source, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledExactlyOnceWith(
      `https://codeload.github.com/${source.repo}/tar.gz/${source.commit}`, expect.anything(),
    );
    expect(tree.source).toEqual(source);
    expect(tree).toMatchObject({ modules: { CB_HITC: 'gov.hmrc.income_tax.charges.child_benefit_hitc' } });
  });

  it('falls back to a commit-pinned file tree when the archive is unavailable', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async input => {
      const url = String(input);
      if (url.startsWith('https://codeload.github.com/')) throw new Error('Archive offline');
      if (url.endsWith(source.commit)) return new Response(JSON.stringify({ tree: [{ path: 'policyengine_uk', sha: 'package-tree' }] }));
      if (url.endsWith('package-tree')) return new Response(JSON.stringify({ tree: [{ path: 'variables', sha: 'variable-tree' }] }));
      if (url.endsWith('variable-tree?recursive=1')) return new Response(JSON.stringify({ tree: [{ type: 'blob', path: 'gov/dwp/afip.py' }] }));
      throw new Error(`Unexpected request: ${url}`);
    });
    const logger = { ...console, warn: vi.fn() };
    await expect(fetchVariableTreeSnapshot('uk', source, { fetchImpl, logger })).resolves.toEqual({
      source, paths: ['gov/dwp/afip.py'],
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Archive offline'));
  });
});
