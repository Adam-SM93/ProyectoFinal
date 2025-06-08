import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h2 class="text-center mb-4">Registro</h2>
              <form (ngSubmit)="onSubmit()">
                <div class="mb-3">
                  <label class="form-label">Nombre</label>
                  <input type="text" class="form-control" [(ngModel)]="name" name="name" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" [(ngModel)]="email" name="email" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Password</label>
                  <input type="password" class="form-control" [(ngModel)]="password" name="password" required>
                </div>
                <button type="submit" class="btn btn-primary w-100">Registrarse</button>
              </form>
              <div class="text-center mt-3">
                <a routerLink="/login">¿Ya tienes cuenta? Inicia sesión</a>
              </div>
              <div *ngIf="error" class="alert alert-danger mt-3">
                <pre class="mb-0" style="white-space: pre-wrap;">{{error}}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  name: string = '';
  email: string = '';
  password: string = '';
  error: string = '';

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  onSubmit() {
    if (!this.name || !this.email || !this.password) {
      this.error = 'Por favor, rellena todos los campos';
      return;
    }

    this.apiService.register({
      name: this.name,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        if (error.error && error.error.errors && Array.isArray(error.error.errors)) {
          this.error = error.error.errors.join('\n');
        } else if (error.error && error.error.error) {
          this.error = error.error.error;
        } else {
          this.error = 'Error al registrarse. Por favor, inténtalo de nuevo.';
        }
      }
    });
  }
} 