import { Injectable } from '@nestjs/common';
import { BRANDING } from './common/constants/branding.constants.js';

@Injectable()
export class AppService {
  getAppInfo() {
    return {
      name: BRANDING.appName,
      tagline: BRANDING.tagline,
      developer: BRANDING.developer,
      organization: BRANDING.organization,
      github: BRANDING.github,
      email: BRANDING.email,
      address: BRANDING.address,
      version: '1.0.0',
      status: 'active',
      docs: '/api/docs',
    };
  }
}
