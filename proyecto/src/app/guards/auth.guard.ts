import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { map, catchError, of } from 'rxjs';

export const authGuard = () => {
  const router = inject(Router);
  const apiService = inject(ApiService);
  const token = localStorage.getItem('token');
  
  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  return apiService.getUserProfile().pipe(
    map(() => true),
    catchError(() => {
      localStorage.removeItem('token');
      router.navigate(['/login']);
      return of(false);
    })
  );
}; 