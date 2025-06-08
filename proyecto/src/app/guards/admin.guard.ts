import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { map, catchError, of } from 'rxjs';

export const adminGuard = () => {
  const router = inject(Router);
  const apiService = inject(ApiService);
  
  return apiService.getUserProfile().pipe(
    map(user => {
      if (user.rol === 'administrador') {
        return true;
      }
      router.navigate(['/dashboard']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    })
  );
}; 