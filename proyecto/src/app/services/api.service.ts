import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  User, Rally, Photo, LoginResponse, RegisterResponse,
  UpdateResponse, DeleteResponse, RallyConfig
} from '../interfaces/api.interfaces';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private getHttpOptions() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }),
      withCredentials: true
    };
  }

  // Auth endpoints
  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true
    });
  }

  register(userData: { name: string; email: string; password: string }): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, userData, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true
    });
  }

  // User endpoints
  getUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/user/profile`, { headers: this.getHeaders() });
  }

  updateUserProfile(userData: { name: string; email: string }): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/user/profile`, userData, { headers: this.getHeaders() });
  }

  deleteUserAccount(userId?: number): Observable<void> {
    const url = userId ? `${this.apiUrl}/admin/users/${userId}` : `${this.apiUrl}/user/profile`;
    return this.http.delete<void>(url, { headers: this.getHeaders() });
  }

  // Admin endpoints
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/admin/users`, { headers: this.getHeaders() });
  }

  // Rally endpoints
  getCurrentRally(): Observable<Rally> {
    return this.http.get<Rally>(`${this.apiUrl}/rally/current`);
  }

  getRallyConfig(): Observable<RallyConfig> {
    return this.http.get<RallyConfig>(`${this.apiUrl}/rally/config`, { headers: this.getHeaders() });
  }

  updateRallyConfig(config: RallyConfig): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/rally/config`, config, { headers: this.getHeaders() });
  }

  // Photo endpoints
  getPhotos(params?: { state?: string; rally_id?: number }): Observable<Photo[]> {
    let url = `${this.apiUrl}/photos`;
    if (params) {
      const queryParams = [];
      if (params.state) queryParams.push(`state=${params.state}`);
      if (params.rally_id) queryParams.push(`rally_id=${params.rally_id}`);
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
    }
    return this.http.get<Photo[]>(url, { withCredentials: false });
  }

  uploadPhoto(photoData: {
    id_user: number;
    title: string;
    description?: string;
    file: string;
    id_rally: number;
  }): Observable<Photo> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    });
    return this.http.post<Photo>(`${this.apiUrl}/photos`, photoData, { headers });
  }

  updatePhoto(photoId: number, data: { state?: string }): Observable<Photo> {
    return this.http.put<Photo>(`${this.apiUrl}/photos/${photoId}`, data, { headers: this.getHeaders() });
  }

  deletePhoto(photoId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/photos/${photoId}`, { headers: this.getHeaders() });
  }

  updateUserAsAdmin(user: User): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/users`, user, this.getHttpOptions());
  }

  deleteUserAsAdmin(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/users/${userId}`, this.getHttpOptions());
  }
} 