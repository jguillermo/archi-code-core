import { Provider } from '@angular/core';
import { AUTHENTICATION_AUTHORIZATION_PROVIDERS } from './authentication-authorization/authentication-authorization.provider';

export const BOUNDED_CONTEXT_PROVIDERS: Provider[] = [
    ...AUTHENTICATION_AUTHORIZATION_PROVIDERS,
];
