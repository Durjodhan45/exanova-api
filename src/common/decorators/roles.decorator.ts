import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants/index.js';
import { UserRole } from '../../shared/enums/index.js';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
