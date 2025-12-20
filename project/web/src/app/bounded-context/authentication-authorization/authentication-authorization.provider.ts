import { Provider } from '@angular/core';

export const AUTHENTICATION_AUTHORIZATION_PROVIDERS: Provider[] = [
    // // Proveedor para la implementación de UserPersist usando la clase abstracta directamente
    // { provide: UserRepository, useClass: HttpUserRepository },
    // { provide: UserPasswordEncryptor, useClass: NotUserPasswordEncryptor },
    //
    // // Proveedor para AuthUser, usando useFactory directamente
    // {
    //     provide: UserRegister,
    //     useFactory: (
    //         userRepository: UserRepository,
    //         userPasswordEncryptor: UserPasswordEncryptor
    //     ) => new UserRegister(userRepository, userPasswordEncryptor),
    //     deps: [UserRepository, UserPasswordEncryptor],
    // },
];
