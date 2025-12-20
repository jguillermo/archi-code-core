import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { User } from 'app/core/user/user.types';
import { map, Observable, of, ReplaySubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
    private _httpClient = inject(HttpClient);
    private _user: ReplaySubject<User> = new ReplaySubject<User>(1);

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for user
     *
     */
    set user(token: string) {
        const user = this.getUserByToken(token);
        // Store the value
        this._user.next(user);
    }

    get user$(): Observable<User> {
        return this._user.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get the current signed-in user data
     */
    get(): Observable<User> {
        const token = localStorage.getItem('accessToken') ?? '';
        const user = this.getUserByToken(token);
        this._user.next(user);
        return of(user);
    }

    /**
     * Update the user
     *
     * @param user
     */
    update(user: User): Observable<any> {
        return this._httpClient.patch<User>('api/common/user', { user }).pipe(
            map((response) => {
                this._user.next(response);
            })
        );
    }

    private getUserByToken(token: string): User {
        const parts = token.split('.');

        if (parts.length !== 3) {
            throw new Error('Invalid JWT format');
        }

        const payloadB64 = parts[1];

        try {
            const payloadJson = atob(payloadB64);
            const data = JSON.parse(payloadJson);

            return {
                id: data.id,
                name: data.name,
                email: data.email ?? '',
            };
        } catch (error) {
            throw new Error('Failed to parse JWT payload');
        }
    }
}
