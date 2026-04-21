import { PageRequest } from '../../../core/models/pagination.models';


export interface RoleResponse {
  roleId: number;
  roleName: string ;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}


export interface RoleRequest {
  roleName: string;
  description?: string | null;
}

export interface RoleSearchRequest extends PageRequest {
  keyword?: string;
}
