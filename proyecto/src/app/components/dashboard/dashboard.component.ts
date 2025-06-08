import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { User, Photo, Rally, RallyConfig } from '../../interfaces/api.interfaces';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mt-4">
      <nav class="navbar navbar-expand-lg navbar-light bg-light mb-4">
        <div class="container-fluid">
          <a class="navbar-brand" href="#">My Dashboard</a>
          <div class="navbar-nav ms-auto">
            <button class="btn btn-outline-danger" (click)="logout()">Logout</button>
          </div>
        </div>
      </nav>

      <!-- User Profile -->
      <div class="row mb-4">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h3>My Profile</h3>
              <div *ngIf="user">
                <form (ngSubmit)="updateProfile()">
                  <div class="mb-3">
                    <label class="form-label">Name</label>
                    <input type="text" class="form-control" [(ngModel)]="user.name" name="name">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" [(ngModel)]="user.email" name="email">
                  </div>
                  <button type="submit" class="btn btn-primary">Update Profile</button>
                  <button type="button" class="btn btn-danger ms-2" (click)="deleteAccount()">
                    Delete Account
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
              <h3>Current Rally</h3>
              <div *ngIf="currentRally">
                <h4>{{currentRally.name}}</h4>
                <p>{{currentRally.theme}}</p>
                <p>
                  <strong>Start:</strong> {{currentRally.start_date | date}}<br>
                  <strong>End:</strong> {{currentRally.end_date | date}}
                </p>
                <!-- Photo Upload -->
                <form (ngSubmit)="uploadPhoto()">
                  <div class="mb-3">
                    <label class="form-label">Title</label>
                    <input type="text" class="form-control" [(ngModel)]="newPhoto.title" name="title">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Description</label>
                    <textarea class="form-control" [(ngModel)]="newPhoto.description" name="description"></textarea>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Photo</label>
                    <input type="file" class="form-control" (change)="onFileSelected($event)" accept="image/*">
                    <!-- Alert for duplicate photo during selection -->
                    <div *ngIf="fileStatus.show" class="alert mt-2" [ngClass]="{'alert-warning': fileStatus.type === 'warning', 'alert-danger': fileStatus.type === 'error'}" role="alert">
                      {{ fileStatus.message }}
                    </div>
                  </div>
                  <button type="submit" class="btn btn-primary">Upload Photo</button>
                  
                  <!-- Upload Status Alert -->
                  <div *ngIf="uploadStatus.show" class="alert mt-3" [ngClass]="{'alert-success': uploadStatus.type === 'success', 'alert-danger': uploadStatus.type === 'error'}" role="alert">
                    {{ uploadStatus.message }}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- User's Photos -->
      <div class="card">
        <div class="card-body">
          <h3>My Photos</h3>
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
                  <button class="btn btn-danger" (click)="deletePhoto(photo.id_photo)">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
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
export class DashboardComponent implements OnInit {
  user: User | null = null;
  currentRally: Rally | null = null;
  userPhotos: Photo[] = [];
  rallyConfig: RallyConfig | null = null;
  newPhoto = {
    title: '',
    description: '',
    file: null as string | null
  };
  uploadStatus = {
    show: false,
    type: 'success',
    message: ''
  };
  fileStatus = {
    show: false,
    type: 'warning',
    message: ''
  };

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUserProfile();
    this.loadCurrentRally();
    this.loadUserPhotos();
    this.loadRallyConfig();
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
      next: (photos) => {
        this.userPhotos = photos.filter(p => this.user && p.id_user === this.user.id_user);
      },
      error: (error) => console.error('Error loading photos:', error)
    });
  }

  loadRallyConfig() {
    this.apiService.getRallyConfig().subscribe({
      next: (config) => this.rallyConfig = config,
      error: (error) => console.error('Error loading rally config:', error)
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
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      this.apiService.deleteUserAccount().subscribe({
        next: () => {
          localStorage.removeItem('token');
          this.router.navigate(['/']);
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
        const newFile = reader.result as string;
        
        // Check if the photo is already uploaded
        const isDuplicate = this.userPhotos.some(photo => photo.file === newFile);
        if (isDuplicate) {
          this.fileStatus = {
            show: true,
            type: 'warning',
            message: 'This photo already exists in your gallery'
          };
          // Clear the file input
          (event.target as HTMLInputElement).value = '';
          this.newPhoto.file = null;
        } else {
          this.fileStatus.show = false;
          this.newPhoto.file = newFile;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  uploadPhoto() {
    if (!this.user || !this.currentRally || !this.newPhoto.file) {
      this.showUploadStatus('error', 'Please fill in all fields and select a photo');
      return;
    }

    if (this.hasReachedMaxPhotos()) {
      this.showUploadStatus('error', `You have reached the maximum number of photos allowed for this rally (${this.rallyConfig?.max_photos_user} photos)`);
      return;
    }

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
        this.showUploadStatus('success', 'Photo uploaded successfully.');
      },
      error: (error: any) => {
        console.error('Error uploading photo:', error);
        this.showUploadStatus('error', error.error?.error || 'Error uploading photo. Please try again.');
      }
    });
  }

  showUploadStatus(type: 'success' | 'error', message: string) {
    this.uploadStatus = {
      show: true,
      type,
      message
    };
    // Hide the alert after 5 seconds
    setTimeout(() => {
      this.uploadStatus.show = false;
    }, 5000);
  }

  deletePhoto(photoId: number) {
    if (confirm('Are you sure you want to delete this photo?')) {
      this.apiService.deletePhoto(photoId).subscribe({
        next: () => this.loadUserPhotos(),
        error: (error: Error) => console.error('Error deleting photo:', error)
      });
    }
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/']);
  }

  hasReachedMaxPhotos(): boolean {
    if (!this.rallyConfig || !this.currentRally) return false;
    const currentRallyPhotos = this.userPhotos.filter(p => p.id_rally === this.currentRally?.id_rally);
    return currentRallyPhotos.length >= this.rallyConfig.max_photos_user;
  }
} 