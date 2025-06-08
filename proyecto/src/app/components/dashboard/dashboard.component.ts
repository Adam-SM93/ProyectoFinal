import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { User, Photo, Rally } from '../../interfaces/api.interfaces';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mt-4">
      <nav class="navbar navbar-expand-lg navbar-light bg-light mb-4">
        <div class="container-fluid">
          <a class="navbar-brand" href="#">Mi Panel</a>
          <div class="navbar-nav ms-auto">
            <button class="btn btn-outline-danger" (click)="logout()">Cerrar Sesión</button>
          </div>
        </div>
      </nav>

      <!-- User Profile -->
      <div class="row mb-4">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h3>Mi Perfil</h3>
              <div *ngIf="user">
                <form (ngSubmit)="updateProfile()">
                  <div class="mb-3">
                    <label class="form-label">Nombre</label>
                    <input type="text" class="form-control" [(ngModel)]="user.name" name="name">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" [(ngModel)]="user.email" name="email">
                  </div>
                  <button type="submit" class="btn btn-primary">Actualizar Perfil</button>
                  <button type="button" class="btn btn-danger ms-2" (click)="deleteAccount()">
                    Eliminar Cuenta
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <!-- Current Rally -->
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h3>Rally Actual</h3>
              <div *ngIf="currentRally">
                <h4>{{currentRally.name}}</h4>
                <p>{{currentRally.theme}}</p>
                <p>
                  <strong>Inicio:</strong> {{currentRally.start_date | date}}<br>
                  <strong>Fin:</strong> {{currentRally.end_date | date}}
                </p>
                <!-- Photo Upload -->
                <form (ngSubmit)="uploadPhoto()">
                  <div class="mb-3">
                    <label class="form-label">Título</label>
                    <input type="text" class="form-control" [(ngModel)]="newPhoto.title" name="title">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Descripción</label>
                    <textarea class="form-control" [(ngModel)]="newPhoto.description" name="description"></textarea>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Fotografía</label>
                    <input type="file" class="form-control" (change)="onFileSelected($event)" accept="image/*">
                  </div>
                  <button type="submit" class="btn btn-primary">Subir Fotografía</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- User's Photos -->
      <div class="card">
        <div class="card-body">
          <h3>Mis Fotografías</h3>
          <div class="row">
            <div *ngFor="let photo of userPhotos" class="col-md-4 mb-4">
              <div class="card h-100">
                <img [src]="photo.file" class="card-img-top" [alt]="photo.title">
                <div class="card-body">
                  <h5 class="card-title">{{photo.title}}</h5>
                  <p class="card-text">{{photo.description}}</p>
                  <p>
                    <small class="text-muted">Estado: {{photo.state}}</small>
                  </p>
                  <button class="btn btn-danger" (click)="deletePhoto(photo.id_photo)">
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  currentRally: Rally | null = null;
  userPhotos: Photo[] = [];
  newPhoto = {
    title: '',
    description: '',
    file: null as string | null
  };

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUserProfile();
    this.loadCurrentRally();
    this.loadUserPhotos();
  }

  loadUserProfile() {
    this.apiService.getUserProfile().subscribe({
      next: (user) => {
        if (this.user?.rol === 'administrador') {
          this.router.navigate(['/admin']);
          return;
        }
        this.user = user;
      },
      error: () => this.logout()
    });
  }

  loadCurrentRally() {
    this.apiService.getCurrentRally().subscribe({
      next: (rally) => {
        this.currentRally = rally;
      },
      error: (error: Error) => console.error('Error loading rally:', error)
    });
  }

  loadUserPhotos() {
    this.apiService.getPhotos().subscribe({
      next: (photos: Photo[]) => this.userPhotos = photos.filter(p => p.id_user === this.user?.id_user),
      error: (error: Error) => console.error('Error loading photos:', error)
    });
  }

  updateProfile() {
    if (!this.user) return;

    this.apiService.updateUserProfile({
      name: this.user.name,
      email: this.user.email
    }).subscribe({
      next: () => alert('Perfil actualizado correctamente'),
      error: (error: Error) => console.error('Error updating profile:', error)
    });
  }

  deleteAccount() {
    if (confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) {
      this.apiService.deleteUserAccount().subscribe({
        next: () => {
          localStorage.removeItem('token');
          this.router.navigate(['/login']);
        },
        error: (error: Error) => console.error('Error deleting account:', error)
      });
    }
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.newPhoto.file = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadPhoto() {
    if (!this.user || !this.currentRally || !this.newPhoto.file) return;

    const photoData = {
      id_user: this.user.id_user,
      title: this.newPhoto.title,
      description: this.newPhoto.description,
      file: this.newPhoto.file,
      id_rally: this.currentRally.id_rally
    };

    this.apiService.uploadPhoto(photoData).subscribe({
      next: () => {
        this.newPhoto = {
          title: '',
          description: '',
          file: null
        };
        this.loadUserPhotos();
      },
      error: (error: Error) => console.error('Error uploading photo:', error)
    });
  }

  deletePhoto(photoId: number) {
    if (confirm('¿Estás seguro de que quieres eliminar esta foto?')) {
      this.apiService.deletePhoto(photoId).subscribe({
        next: () => this.loadUserPhotos(),
        error: (error: Error) => console.error('Error deleting photo:', error)
      });
    }
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
} 