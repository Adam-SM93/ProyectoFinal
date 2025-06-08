export interface RallyConfig {
  max_photos_user: number;
  upload_deadline: number;
  voting_deadline: number;
  id_rally: number;
}

export interface User {
  id_user: number;
  name: string;
  email: string;
  rol: 'participante' | 'administrador';
  creation_date: string;
}

export interface Rally {
  id_rally: number;
  name: string;
  theme: string;
  start_date: string;
  end_date: string;
}

export interface Photo {
  id_photo: number;
  id_user: number;
  title: string;
  description?: string;
  file: string;
  state: 'pendiente' | 'aceptada' | 'rechazada';
  upload_date: string;
  id_rally: number;
}

export interface LoginResponse {
  token: string;
}

export interface RegisterResponse {
  id_user: number;
}

export interface UpdateResponse {
  updated: boolean;
}

export interface DeleteResponse {
  deleted: boolean;
} 