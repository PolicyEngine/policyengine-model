import 'server-only';
import { fetchTaxsimValidation } from '../../data/fetchTaxsimValidation';
import { TaxsimResults } from './ValidationPage';

/**
 * Loads the TAXSIM summaries on the server. Render it inside <Suspense> so the
 * rest of the validation page does not wait for the summary host.
 */
export default async function TaxsimResultsLoader() {
  const taxsim = await fetchTaxsimValidation();
  return <TaxsimResults taxsim={taxsim} />;
}
