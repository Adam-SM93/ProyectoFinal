import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h2 class="text-center mb-4">Login</h2>
              <form (ngSubmit)="onSubmit()">
                <div class="mb-3">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" [(ngModel)]="email" name="email" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Password</label>
                  <input type="password" class="form-control" [(ngModel)]="password" name="password" required>
                </div>
                <button type="submit" class="btn btn-primary w-100">Login</button>
              </form>
              <div class="text-center mt-3">
                <a routerLink="/register">¿No tienes cuenta? Regístrate</a>
              </div>
              <div *ngIf="error" class="alert alert-danger mt-3">
                {{error}}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  error: string = '';

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  onSubmit() {
    if (!this.email || !this.password) {
      this.error = 'Por favor, rellena todos los campos';
      return;
    }

    this.apiService.login({ email: this.email, password: this.password })
      .subscribe({
        next: (response) => {
          localStorage.setItem('token', response.token);
          this.apiService.getUserProfile().subscribe(user => {
            if (user.rol === 'administrador') {
              this.router.navigate(['/admin']);
            } else {
              this.router.navigate(['/dashboard']);
            }
          });
        },
        error: (error) => {
          this.error = error.error.error || 'Error al iniciar sesión';
        }
      });
  }
} 