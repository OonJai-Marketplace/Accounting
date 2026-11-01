// Preserve the deployed OAuth-only handler when updating company-account selection.
import {handler} from '../google-oauth-callback/legacy143150.ts';
Deno.serve(handler);
