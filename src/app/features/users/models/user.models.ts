import { PageRequest } from '../../../core/models/pagination.models';


export interface UserResponse {
  id: number;
  email: string;
  fullName: string;
  gsm: string;
  enabled: boolean;
  roles: Array<string>;
}




export interface CreateUserRequest {
  email: string;
  fullName: string;
  gsm: string;
  password: string;
  roleIds: number[];
}

export interface UpdateUserRequest {
  fullName: string;
  gsm?: string;
  password?: string | null;
  roleIds?: number[];
}


export interface UserSearchRequest extends PageRequest {
  keyword?: string;
  enabled?: boolean;
  role?:  string;
}
