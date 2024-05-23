import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AUTH_KEY } from 'config/constants';

@Injectable()
export class authGuard implements CanActivate {
  private readonly secretKey = AUTH_KEY;

 async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    console.log("🚀 ~ authGuard ~ canActivate ~ request:", request.headers)
    const apiKey = request.headers['auth-key'];
    console.log("🚀 ~ authGuard ~ canActivate ~ apiKey:", apiKey)

    // Check if the API key is present and matches the secret key
    if (apiKey === this.secretKey) {
      return true;
    }

    // Return false if the API key is not present or does not match
    return false;
  }
}
