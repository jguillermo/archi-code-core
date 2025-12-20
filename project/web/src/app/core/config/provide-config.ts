import { HttpClient } from '@angular/common/http';
import { inject, provideAppInitializer } from '@angular/core';
import { AppConfigService } from './app-config.service';

export const provideConfig = () =>
    provideAppInitializer(() => {
        const http = inject(HttpClient);
        const configService = inject(AppConfigService);
        return configService.loadConfig();
    });
