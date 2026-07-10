import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { UserDocument } from '../users/schemas/user.schema';
export declare class AuthService {
    private readonly userModel;
    private readonly jwtService;
    constructor(userModel: Model<UserDocument>, jwtService: JwtService);
    signup(payload: {
        name: string;
        email: string;
        password: string;
        role: 'customer' | 'agent';
    }): Promise<{
        accessToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: "customer" | "agent";
        };
    }>;
    login(payload: {
        email: string;
        password: string;
    }): Promise<{
        accessToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: "customer" | "agent";
        };
    }>;
    private buildToken;
}
