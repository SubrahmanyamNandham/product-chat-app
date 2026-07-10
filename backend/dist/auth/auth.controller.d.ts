import { AuthService } from './auth.service';
declare class SignupDto {
    name: string;
    email: string;
    password: string;
    role: 'customer' | 'agent';
}
declare class LoginDto {
    email: string;
    password: string;
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signup(body: SignupDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: "customer" | "agent";
        };
    }>;
    login(body: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: "customer" | "agent";
        };
    }>;
}
export {};
