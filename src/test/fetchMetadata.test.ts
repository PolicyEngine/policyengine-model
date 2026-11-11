import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DASHBOARD_API_METADATA_URL = 'https://www.policyengine.org/api/metadata/uk';

const METADATA_RESULT = {
  version: '2.40.0',
  variables: { income_tax: { label: 'Income tax' } },
  parameters: { 'gov.hmrc.income_tax.rates.uk[0].rate': { label: 'Basic rate' } },
};

function jsonAnswer(body: unknown, statusCode = 200): Response {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Answers only the dashboard API; any other address is unreachable. */
function answerFromDashboardApi(answer: () => Response) {
  vi.mocked(fetch).mockImplementation(async (input) => {
    if (String(input) !== DASHBOARD_API_METADATA_URL) {
      throw new TypeError(`Failed to fetch ${String(input)}`);
    }
    return answer();
  });
}

describe('fetchMetadata through the dashboard API', () => {
  beforeEach(() => {
    // The module caches metadata per country, so each test loads a fresh copy.
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("given a country then it reads the variables and parameters from the dashboard API's metadata", async () => {
    // Given
    answerFromDashboardApi(() => jsonAnswer({ status: 'ok', message: null, result: METADATA_RESULT }));
    const { fetchMetadata } = await import('../data/fetchMetadata');

    // When
    const metadata = await fetchMetadata('uk').catch(() => null);

    // Then
    expect(metadata).toEqual({
      variables: METADATA_RESULT.variables,
      parameters: METADATA_RESULT.parameters,
    });
  });

  it('given two reads for one country then it asks the dashboard API once', async () => {
    // Given
    answerFromDashboardApi(() => jsonAnswer({ status: 'ok', message: null, result: METADATA_RESULT }));
    const { fetchMetadata, fetchMetadataRaw } = await import('../data/fetchMetadata');

    // When
    await fetchMetadata('uk').catch(() => null);
    await fetchMetadataRaw('uk').catch(() => null);

    // Then
    expect(vi.mocked(fetch).mock.calls.map(([input]) => String(input))).toEqual([
      DASHBOARD_API_METADATA_URL,
    ]);
  });

  it('given the dashboard API fails then the error carries its message', async () => {
    // Given
    answerFromDashboardApi(() =>
      jsonAnswer({ status: 'error', message: 'The Public API did not answer in time.', result: null }, 504),
    );
    const { fetchMetadata } = await import('../data/fetchMetadata');

    // When
    const reading = fetchMetadata('uk');

    // Then
    await expect(reading).rejects.toThrow('The Public API did not answer in time.');
  });
});
