import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { User, Photo, Rally, RallyConfig } from '../../interfaces/api.interfaces';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mt-4">
      <nav class="navbar navbar-expand-lg navbar-light bg-light mb-4">
        <div class="container-fluid">
          <a class="navbar-brand" href="#">Admin Panel</a>
          <div class="navbar-nav ms-auto">
            <button class="btn btn-outline-danger" (click)="logout()">Logout</button>
          </div>
        </div>
      </nav>

      <!-- Rally Configuration -->
      <div class="card mb-4">
        <div class="card-body">
          <h3>Rally Configuration</h3>
          <div *ngIf="currentRally">
            <form (ngSubmit)="updateRallyConfig()">
              <div class="mb-3">
                <label class="form-label">Maximum photos per user</label>
                <input type="number" class="form-control" [(ngModel)]="config.max_photos_user" name="max_photos_user">
              </div>
              <div class="mb-3">
                <label class="form-label">Upload deadline (days)</label>
                <input type="number" class="form-control" [(ngModel)]="config.upload_deadline" name="upload_deadline">
              </div>
              <div class="mb-3">
                <label class="form-label">Voting deadline (days)</label>
                <input type="number" class="form-control" [(ngModel)]="config.voting_deadline" name="voting_deadline">
              </div>
              <button type="submit" class="btn btn-primary">Update Configuration</button>
            </form>
          </div>
        </div>
      </div>

      <!-- Pending Photos -->
      <div class="card mb-4">
        <div class="card-body">
          <h3>Pending Photos</h3>
          <div class="row">
            <div *ngFor="let photo of pendingPhotos" class="col-md-4 mb-4">
              <div class="card h-100">
                <div class="image-container">
                  <img [src]="photo.file" class="card-img-top" [alt]="photo.title">
                </div>
                <div class="card-body">
                  <h5 class="card-title">{{photo.title}}</h5>
                  <p class="card-text">{{photo.description}}</p>
                  <div class="mb-3">
                    <label class="form-label">Status</label>
                    <select class="form-select" [(ngModel)]="photo.state" (change)="updatePhotoState(photo)">
                      <option value="pendiente">Pending</option>
                      <option value="aceptada">Accepted</option>
                      <option value="rechazada">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Users Management -->
      <div class="card">
        <div class="card-body">
          <h3>User Management</h3>
          
          <!-- User List -->
          <div *ngIf="!selectedUser" class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Registration Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of users">
                  <td>{{user.name}}</td>
                  <td>{{user.email}}</td>
                  <td>{{user.creation_date | date}}</td>
                  <td>
                    <button class="btn btn-info btn-sm me-2" (click)="selectUser(user)">View Details</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- User Details -->
          <div *ngIf="selectedUser" class="user-details">
            <button class="btn btn-secondary mb-3" (click)="selectedUser = null">← Back to list</button>
            
            <h4>User Details</h4>
            <form (ngSubmit)="updateUser()">
              <div class="mb-3">
                <label class="form-label">Name</label>
                <input type="text" class="form-control" [(ngModel)]="selectedUser.name" name="name">
              </div>
              <div class="mb-3">
                <label class="form-label">Email</label>
                <input type="email" class="form-control" [(ngModel)]="selectedUser.email" name="email">
              </div>
              <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary">Save Changes</button>
                <button type="button" class="btn btn-danger" (click)="deleteUser()">
                  Delete User
                </button>
              </div>
            </form>

            <h4 class="mt-4">User's Photos</h4>
            <div class="row">
              <div *ngFor="let photo of userPhotos" class="col-md-4 mb-4">
                <div class="card h-100">
                  <div class="image-container">
                    <img [src]="photo.file" class="card-img-top" [alt]="photo.title">
                  </div>
                  <div class="card-body">
                    <h5 class="card-title">{{photo.title}}</h5>
                    <p class="card-text">{{photo.description}}</p>
                    <p>
                      <small class="text-muted">Status: {{photo.state}}</small>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-details {
      animation: fadeIn 0.3s ease-in;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .image-container {
      position: relative;
      width: 100%;
      padding-top: 75%; /* 4:3 Aspect Ratio */
      overflow: hidden;
    }
    .image-container img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .card-body {
      flex: 1;
    }
  `]
})
export class AdminComponent implements OnInit {
  user: User | null = null;
  users: User[] = [];
  selectedUser: User | null = null;
  userPhotos: Photo[] = [];
  pendingPhotos: Photo[] = [];
  currentRally: Rally | null = null;
  config: RallyConfig = {
    max_photos_user: 0,
    upload_deadline: 0,
    voting_deadline: 0,
    id_rally: 0
  };

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit() {
    this.apiService.getUserProfile().subscribe({
      next: (user) => {
        this.user = user;
        if (this.user?.rol !== 'administrador') {
          this.router.navigate(['/dashboard']);
          return;
        }
        this.loadUsers();
        this.loadCurrentRally();
        this.loadConfig();
        this.loadPendingPhotos();
      },
      error: (error) => {
        console.error('Error getting user profile:', error);
        this.router.navigate(['/login']);
      }
    });
  }

  loadUsers() {
    this.apiService.getUsers().subscribe({
      next: (users) => this.users = users.filter(u => u.rol === 'participante'),
      error: (error) => console.error('Error loading users:', error)
    });
  }

  loadPendingPhotos() {
    this.apiService.getPhotos({ state: 'pendiente' }).subscribe({
      next: (photos) => this.pendingPhotos = photos,
      error: (error) => console.error('Error loading photos:', error)
    });
  }

  loadCurrentRally() {
    this.apiService.getCurrentRally().subscribe({
      next: (rally) => {
        this.currentRally = rally;
        if (this.config.id_rally === 0) {
          this.config.id_rally = rally.id_rally;
        }
      },
      error: (error) => console.error('Error loading rally:', error)
    });
  }

  loadConfig() {
    this.apiService.getRallyConfig().subscribe({
      next: (config) => this.config = config,
      error: (error) => console.error('Error loading config:', error)
    });
  }

  updateRallyConfig() {
    this.apiService.updateRallyConfig(this.config).subscribe({
      next: () => alert('Configuración actualizada correctamente'),
      error: (error) => console.error('Error updating config:', error)
    });
  }

  updatePhotoState(photo: Photo) {
    this.apiService.updatePhoto(photo.id_photo, { state: photo.state }).subscribe({
      next: () => {
        this.loadPendingPhotos();
        if (this.selectedUser) {
          this.loadUserPhotos(this.selectedUser.id_user);
        }
      },
      error: (error) => console.error('Error updating photo:', error)
    });
  }

  selectUser(user: User) {
    this.selectedUser = user;
    this.loadUserPhotos(user.id_user);
  }

  loadUserPhotos(userId: number) {
    this.apiService.getPhotos().subscribe({
      next: (photos) => this.userPhotos = photos.filter(p => p.id_user === userId),
      error: (error) => console.error('Error loading user photos:', error)
    });
  }

  updateUser() {
    if (!this.selectedUser) return;

    this.apiService.updateUserAsAdmin(this.selectedUser).subscribe({
      next: () => {
        alert('Usuario actualizado correctamente');
        this.loadUsers();
      },
      error: (error) => console.error('Error updating user:', error)
    });
  }

  deleteUser() {
    if (!this.selectedUser) return;

    if (confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
      this.apiService.deleteUserAsAdmin(this.selectedUser.id_user).subscribe({
        next: () => {
          this.selectedUser = null;
          this.loadUsers();
        },
        error: (error) => console.error('Error deleting user:', error)
      });
    }
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/']);
  }
} 