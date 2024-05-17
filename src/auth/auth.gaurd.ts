import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { TGBOT_SECRET } from 'config/constants';

@Injectable()
export class authGuard implements CanActivate {
  private readonly secretKey = TGBOT_SECRET;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['api_secret'];

    // Check if the API key is present and matches the secret key
    if (apiKey === this.secretKey) {
      return true;
    }

    // Return false if the API key is not present or does not match
    return false;
  }
}
