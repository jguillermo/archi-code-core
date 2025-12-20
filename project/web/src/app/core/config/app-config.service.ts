import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from './app-config';

@Injectable({
    providedIn: 'root',
})
export class AppConfigService {
    private _config: AppConfig;

    constructor(private http: HttpClient) {}

    async loadConfig(): Promise<void> {
        try {
            this._config = (await firstValueFrom(
                this.http.get('/config.json')
            )) as AppConfig;
            console.log('Config loaded.');
            console.log(this.config);
        } catch (error) {
            console.error('Error al cargar la configuración:', error);
            return Promise.reject(error);
        }
    }

    get config(): AppConfig {
        return this._config;
    }

    get apiUrl() {
        return this._config.apiUrl;
    }
}
